import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import Ajv from 'ajv';
import { db } from '../db/store';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { enforceTenantIsolation } from '../middleware/tenant';
import { validate } from '../middleware/validation';
import { ExecutionEngine } from '../services/executionEngine';
const router=Router();router.use(authenticateToken,enforceTenantIsolation);
const builder=requireRoles(['ORGANIZATION_OWNER','AI_BUILDER']);
router.get('/',async(req,res)=>res.json(await db.getPromptVersions(req.user!.organizationId,typeof req.query.agentId==='string'?req.query.agentId:undefined)));
router.post('/',builder,validate(z.object({agentId:z.string().max(150).optional(),title:z.string().trim().min(1).max(200),templateText:z.string().trim().min(1).max(16000),inputVariables:z.array(z.string().regex(/^[a-zA-Z]\w*$/)).optional(),changeSummary:z.string().max(2000).optional(),isPublished:z.boolean().optional(),outputSchema:z.record(z.string(),z.unknown()).optional()}).strict()),async(req,res)=>{
 const orgId=req.user!.organizationId;
 if(req.body.agentId&&!await db.getAgentById(orgId,req.body.agentId))return res.status(404).json({error:'Agent not found in organization'});
 const version=await db.transaction('prompts:'+orgId,async()=>{
  const existing=(await db.getPromptVersions(orgId)).filter(version=>(version.agentId||null)===(req.body.agentId||null)),now=new Date().toISOString();
  if(req.body.isPublished)for(const old of existing)if(old.isPublished)await db.update('prompt_versions',old.id,{isPublished:false},orgId);
  return db.createPromptVersion({id:randomUUID(),organizationId:orgId,agentId:req.body.agentId,title:req.body.title,templateText:req.body.templateText,inputVariables:req.body.inputVariables||Array.from(req.body.templateText.matchAll(/{{\s*(\w+)\s*}}/g),(m:any)=>m[1]),changeSummary:req.body.changeSummary||'Prompt revision',isPublished:!!req.body.isPublished,versionNumber:Math.max(0,...existing.map(v=>v.versionNumber))+1,createdAt:now});
 });return res.status(201).json(version);
});
router.post('/:id/publish',builder,async(req,res)=>{
 const orgId=req.user!.organizationId;
 const result=await db.transaction('prompts:'+orgId,async()=>{
  const versions=await db.getPromptVersions(orgId),target=versions.find(v=>v.id===req.params.id);
  if(!target)return null;
  for(const version of versions.filter(v=>v.agentId===target.agentId&&v.isPublished))await db.update('prompt_versions',version.id,{isPublished:false},orgId);
  await db.update('prompt_versions',target.id,{isPublished:true},orgId);return target;
 });if(!result)return res.status(404).json({error:'Prompt version not found'});
 return res.json({success:true,message:`Published version ${result.versionNumber}`});
});
router.post('/test',builder,validate(z.object({templateText:z.string().trim().min(1).max(16000),variables:z.record(z.string(),z.string()).optional(),provider:z.enum(['gemini','mock']).optional(),temperature:z.number().min(0).max(2).optional()}).strict()),async(req,res)=>{
 const variables=req.body.variables||{},missing:string[]=[];
 const rendered=req.body.templateText.replace(/{{\s*(\w+)\s*}}/g,(_match:string,key:string)=>{if(!Object.hasOwn(variables,key))missing.push(key);return variables[key]||'';});
 if(missing.length)return res.status(400).json({error:`Missing prompt variables: ${missing.join(', ')}`});
 const result=await ExecutionEngine.runPrompt(req.user!.organizationId,rendered,req.body.provider||'gemini',req.body.temperature??0.7);
 if(result.status==='FAILED')return res.status(503).json({error:result.error,executionId:result.id});
 return res.json({renderedPrompt:rendered,response:result.output?.text,usage:{total_tokens:result.totalTokens,estimated_cost_usd:result.estimatedCostUsd},provider:result.provider,model:result.model,isFallback:result.isFallback,executionId:result.id});
});
export default router;
