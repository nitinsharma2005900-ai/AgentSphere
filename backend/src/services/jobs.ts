import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { ExecutionRecord } from '../types';
import { db } from '../db/store';
import { ExecutionEngine } from './executionEngine';
let connection:IORedis|undefined,queue:Queue|undefined,worker:Worker|undefined,timer:NodeJS.Timeout|undefined;
function getQueue(){
 if(!config.redisUrl)throw new Error('REDIS_URL is required for the queue');
 if(!connection){connection=new IORedis(config.redisUrl,{maxRetriesPerRequest:null,enableReadyCheck:false});connection.on('error',()=>console.error(JSON.stringify({event:'redis_unavailable'})));}
 return queue||(queue=new Queue('agentsphere-executions',{connection:connection as any}));
}
export async function enqueue(record:ExecutionRecord){
 await getQueue().add('execute',{organizationId:record.organizationId,executionId:record.id},{jobId:record.id,attempts:3,backoff:{type:'exponential',delay:1500},removeOnComplete:100,removeOnFail:100});
}
export async function queueHealth(){if(!config.redisUrl)return {status:'not_configured',mode:'inline'};try{await getQueue().waitUntilReady();return {status:await connection!.ping()==='PONG'?'healthy':'unhealthy',counts:await getQueue().getJobCounts('waiting','active','failed')};}catch{return {status:'unhealthy'};}}
export async function startWorker(){
 if(!config.redisUrl)return;
 getQueue();
 worker=new Worker('agentsphere-executions',async job=>ExecutionEngine.process(job.data.organizationId,job.data.executionId),{connection:connection as any,concurrency:2,lockDuration:120000,maxStalledCount:1});
 worker.on('failed',(job)=>console.error(JSON.stringify({event:'job_failed',id:job?.id})));
 worker.on('error',()=>console.error(JSON.stringify({event:'worker_error'})));
 const reconcile=async()=>{for(const org of await db.getAllOrganizations())for(const record of await db.getExecutions(org.id))if(record.status==='PENDING')await enqueue(record);};
 await reconcile();timer=setInterval(()=>void reconcile().catch(()=>{}),30000);timer.unref();
}
export async function stopJobs(){if(timer)clearInterval(timer);await worker?.close();await queue?.close();await connection?.quit();}
