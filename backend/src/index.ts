import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { config } from './config';
import { db } from './db/store';
import { requestCorrelation,errorHandler } from './middleware/errorHandler';
import { queueHealth,startWorker,stopJobs } from './services/jobs';
import { ExecutionEngine } from './services/executionEngine';
import authRoutes from './routes/auth';
import orgRoutes from './routes/organizations';
import agentRoutes from './routes/agents';
import promptRoutes from './routes/prompts';
import workflowRoutes from './routes/workflows';
import executionRoutes from './routes/executions';
import approvalRoutes from './routes/approvals';
import toolRoutes from './routes/tools';
import documentRoutes from './routes/documents';
import billingRoutes from './routes/billing';
import adminRoutes from './routes/admin';
import accessRoutes from './routes/access';
export const app=express();
app.disable('x-powered-by');app.set('trust proxy',1);
app.use(requestCorrelation);
app.use(helmet());
const origins=config.corsOrigin.split(',').map(s=>s.trim());
app.use(cors({origin:(origin,callback)=>callback(null,!origin||origins.includes(origin)),credentials:false,exposedHeaders:['X-Request-Id','Content-Disposition']}));
app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:false,limit:'1mb'}));
app.use(async(_req,_res,next)=>{await db.ready;next();});
if(config.nodeEnv!=='test'){
 app.use('/api/v1',rateLimit({windowMs:60000,limit:240,standardHeaders:'draft-7',legacyHeaders:false}));
 app.use('/api/v1/auth/login',rateLimit({windowMs:15*60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}));
 app.use('/api/v1/auth/signup',rateLimit({windowMs:3600000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}));
}
app.use((req,res,next)=>{
 const start=Date.now();
 res.on('finish',()=>{
  if(config.nodeEnv!=='test')console.log(JSON.stringify({event:'http_request',requestId:req.correlationId,method:req.method,path:req.path,status:res.statusCode,durationMs:Date.now()-start}));
  if(req.user&&res.statusCode<400&&!['GET','OPTIONS'].includes(req.method))void db.logAudit({id:randomUUID(),organizationId:req.user.organizationId,userId:req.user.id,userEmail:req.user.email,action:`${req.method} ${req.path}`,resourceType:req.path.split('/')[3]||'api',resourceId:req.path.split('/')[4]||'',details:{requestId:req.correlationId,status:res.statusCode},ipAddress:req.ip||'',timestamp:new Date().toISOString()}).catch(()=>console.error('{"event":"audit_write_failed"}'));
 });next();
});
app.get('/health',async(_req,res)=>res.json({status:'healthy',service:'AgentSphere Core API',version:'1.1.0',database:await db.ping(),timestamp:new Date().toISOString()}));
app.get('/ready',async(_req,res)=>{
 try{await db.ping();const redis=await Promise.race([queueHealth(),new Promise<{status:string}>(resolve=>setTimeout(()=>resolve({status:'unhealthy'}),3000))]);return res.status(redis.status==='unhealthy'?503:200).json({database:'healthy',redis});}
 catch{return res.status(503).json({status:'not_ready'});}
});
for(const [path,router] of Object.entries({auth:authRoutes,organizations:orgRoutes,agents:agentRoutes,prompts:promptRoutes,workflows:workflowRoutes,executions:executionRoutes,approvals:approvalRoutes,tools:toolRoutes,documents:documentRoutes,billing:billingRoutes,admin:adminRoutes,access:accessRoutes}))app.use(`/api/v1/${path}`,router);
app.use((_req,res)=>res.status(404).json({error:'Endpoint not found'}));app.use(errorHandler);
if(require.main===module){
 void (async()=>{
  await db.ready;
  if(!config.redisUrl||process.env.RUN_WORKER==='true')await ExecutionEngine.recoverInterrupted();
  if(process.env.RUN_WORKER==='true')await startWorker();
  const server=app.listen(config.port,'0.0.0.0',()=>console.log(JSON.stringify({event:'server_started',port:config.port})));
  const shutdown=()=>{server.close(()=>void stopJobs().then(()=>db.close()).then(()=>process.exit(0)));setTimeout(()=>process.exit(1),15000).unref();};
  process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
 })().catch(()=>{console.error('{"event":"startup_failed"}');process.exit(1);});
}
