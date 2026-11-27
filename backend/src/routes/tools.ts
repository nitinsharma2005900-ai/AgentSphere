import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import Ajv from 'ajv';
import { db } from '../db/store';
import { authenticateToken } from '../middleware/auth';
import { enforceTenantIsolation } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { ToolExecutor } from '../services/toolExecutor';
import { encrypt } from '../services/security';
const router=Router();router.use(authenticateToken,enforceTenantIsolation);
const builder=requireRoles(['ORGANIZATION_OWNER','AI_BUILDER']);
const schema=z.object({name:z.string().regex(/^[a-z][a-z0-9_]{2,60}$/),description:z.string().trim().min(1).max(2000),category:z.enum(['utility','knowledge','api','transform']).optional(),parameters:z.record(z.unknown()),endpointUrl:z.string().url().max(2000).optional(),timeoutMs:z.number().int().min(500).max(15000).optional()}).strict();
router.get('/',async(req,res)=>res.json(await db.getTools(req.user!.organizationId)));
router.post('/',builder,validate(schema),async(req,res)=>{
 const orgId=req.user!.organizationId;
 if(await db.getToolByName(orgId,req.body.name))return res.status(409).json({error:'A tool with this name already exists'});
 try{new Ajv({strict:false}).compile(req.body.parameters);}catch{return res.status(400).json({error:'Invalid JSON parameter schema'});}
 if(!req.body.endpointUrl)return res.status(400).json({error:'Custom tools require an HTTPS endpoint'});
 const url=new URL(req.body.endpointUrl);
 if(url.protocol!=='https:'||url.username||url.password||!(process.env.TOOL_ALLOWED_HOSTS||'api.open-meteo.com').split(',').includes(url.hostname))return res.status(400).json({error:'Endpoint must use HTTPS on a server-allowed host without credentials'});
 const now=new Date().toISOString();
 return res.status(201).json(await db.createTool({id:randomUUID(),organizationId:orgId,...req.body,isEnabled:true,isSystemTool:false,timeoutMs:req.body.timeoutMs||5000,createdAt:now,schemaVersions:[{version:1,parameters:req.body.parameters,createdAt:now}]} as any));
});
router.put('/:id',builder,validate(schema.omit({name:true}).partial()),async(req,res)=>{
 const tool=(await db.getTools(req.user!.organizationId)).find(t=>t.id===req.params.id);
 if(!tool)return res.status(404).json({error:'Tool not found'});
 if(req.body.parameters){try{new Ajv({strict:false}).compile(req.body.parameters);}catch{return res.status(400).json({error:'Invalid JSON schema'});}}
 if(req.body.endpointUrl){const u=new URL(req.body.endpointUrl);if(u.protocol!=='https:'||u.username||u.password||!(process.env.TOOL_ALLOWED_HOSTS||'api.open-meteo.com').split(',').includes(u.hostname))return res.status(400).json({error:'Endpoint is outside the HTTPS host allowlist'});}
 const history=(tool as any).schemaVersions||[{version:1,parameters:tool.parameters,createdAt:tool.createdAt}];
 if(req.body.parameters)history.push({version:history.length+1,parameters:req.body.parameters,createdAt:new Date().toISOString()});
 return res.json(await db.updateTool(req.user!.organizationId,tool.id,{...req.body,schemaVersions:history} as any));
});
router.patch('/:id/toggle',builder,async(req,res)=>{
 const tool=(await db.getTools(req.user!.organizationId)).find(t=>t.id===req.params.id);
 if(!tool)return res.status(404).json({error:'Tool not found'});
 return res.json(await db.updateTool(req.user!.organizationId,tool.id,{isEnabled:!tool.isEnabled}));
});
router.put('/:id/credential',requireRoles(['ORGANIZATION_OWNER']),validate(z.object({value:z.string().min(1).max(8000)}).strict()),async(req,res)=>{
 const tool=(await db.getTools(req.user!.organizationId)).find(t=>t.id===req.params.id);
 if(!tool)return res.status(404).json({error:'Tool not found'});
 await db.put('secrets',{id:tool.id,organizationId:req.user!.organizationId,toolId:tool.id,encryptedValue:encrypt(req.body.value)});
 return res.json({success:true,message:'Credential encrypted and stored. It cannot be read through the API.'});
});
router.post('/:id/test',requireRoles(['ORGANIZATION_OWNER','AI_BUILDER','WORKFLOW_OPERATOR']),validate(z.object({args:z.record(z.unknown()).optional()}).strict()),async(req,res)=>{
 const tool=(await db.getTools(req.user!.organizationId)).find(t=>t.id===req.params.id);
 if(!tool)return res.status(404).json({error:'Tool not found'});
 const start=Date.now(),result=await ToolExecutor.executeTool(req.user!.organizationId,tool.name,req.body.args||{});
 return res.json({toolName:tool.name,result,status:'SUCCESS',durationMs:Date.now()-start});
});
export default router;
