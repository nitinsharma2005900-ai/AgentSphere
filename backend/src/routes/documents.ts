import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { db } from '../db/store';
import { config } from '../config';
import { authenticateToken } from '../middleware/auth';
import { enforceTenantIsolation } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import { DocumentRecord } from '../types';
import { AiGatewayClient } from '../services/aiGatewayClient';
import { AppError } from '../services/errors';
import { encrypt,decrypt,hash } from '../services/security';
const router=Router();router.use(authenticateToken,enforceTenantIsolation);
const builder=requireRoles(['ORGANIZATION_OWNER','AI_BUILDER']);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:4*1024*1024,files:1},fileFilter:(_req,file,cb)=>{
 if(!/\.(pdf|txt|docx|csv|md)$/i.test(file.originalname))return cb(new AppError(400,'Supported formats: PDF, TXT, DOCX, CSV, MD'));
 cb(null,true);
}});
const publicDocument=({sourceBase64,...doc}:DocumentRecord)=>doc;
router.get('/',async(req,res)=>res.json((await db.getDocuments(req.user!.organizationId)).map(publicDocument)));
async function indexDocument(doc:DocumentRecord,bytes:Buffer){
 const form=new FormData();form.append('file',new Blob([new Uint8Array(bytes)]),doc.filename);form.append('tenant_id',doc.organizationId);form.append('document_id',doc.id);
 try{
  const response=await fetch(`${config.aiServiceUrl}/documents/upload`,{method:'POST',headers:{'X-Service-Key':config.serviceSecret,'X-Tenant-Id':doc.organizationId},body:form,signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new AppError(response.status<500?400:503,response.status<500?'Document could not be parsed. Check format, encoding, and readable text.':'Document indexing service unavailable. Re-index after service recovery.');
  const result:any=await response.json();
  if(!Number.isInteger(result.total_chunks)||result.total_chunks<1)throw new AppError(502,'Document index returned no chunks');
  doc.status='INDEXED';doc.totalChunks=result.total_chunks;doc.totalCharacters=result.total_characters;doc.embeddingModel=result.embedding_model;doc.error=undefined;
 }catch(error){doc.status='FAILED';doc.error=error instanceof AppError?error.message:'Indexing service unavailable or timed out. Retry re-indexing.';}
 doc.updatedAt=new Date().toISOString();await db.put('documents',doc);return doc;
}
router.post('/upload',builder,upload.single('file'),async(req,res)=>{
 if(!req.file||!req.file.size)return res.status(400).json({error:'A non-empty document is required'});
 const contentHash=hash(req.file.buffer.toString('base64'));
 const prior=(await db.getDocuments(req.user!.organizationId)).find(d=>d.contentHash===contentHash);
 if(prior?.status==='INDEXED')return res.json(publicDocument(prior));
 const now=new Date().toISOString();
 const doc:DocumentRecord=prior||{id:randomUUID(),organizationId:req.user!.organizationId,filename:req.file.originalname.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,200),fileType:req.file.originalname.split('.').pop()!.toLowerCase(),fileSizeBytes:req.file.size,totalChunks:0,totalCharacters:0,status:'PROCESSING',uploadedByUserId:req.user!.id,createdAt:now,updatedAt:now,sourceBase64:encrypt(req.file.buffer.toString('base64')),contentHash};
 await db.put('documents',doc);const result=await indexDocument(doc,req.file.buffer);
 return res.status(result.status==='INDEXED'?201:503).json({...publicDocument(result),...(result.error?{message:result.error}:{})});
});
router.post('/:id/reindex',builder,async(req,res)=>{
 const doc=await db.getDocumentById(req.user!.organizationId,req.params.id);
 if(!doc)return res.status(404).json({error:'Document not found'});
 if(!doc.sourceBase64)return res.status(409).json({error:'Original upload is unavailable. Upload this document again.'});
 doc.status='PROCESSING';await db.put('documents',doc);
 const result=await indexDocument(doc,Buffer.from(decrypt(doc.sourceBase64),'base64'));
 return res.status(result.status==='INDEXED'?200:503).json({success:result.status==='INDEXED',document:publicDocument(result),message:result.error||'Document re-indexed from original source'});
});
router.delete('/:id',builder,async(req,res)=>{
 const orgId=req.user!.organizationId,doc=await db.getDocumentById(orgId,req.params.id);
 if(!doc)return res.status(404).json({error:'Document not found'});
 await AiGatewayClient.request(`/documents/${encodeURIComponent(orgId)}/${encodeURIComponent(doc.id)}`,undefined,orgId,'DELETE');
 await db.deleteDocument(orgId,doc.id);
 for(const agent of await db.getAgents(orgId))if(agent.knowledgeBaseIds.includes(doc.id))await db.updateAgent(orgId,agent.id,{knowledgeBaseIds:agent.knowledgeBaseIds.filter(id=>id!==doc.id)});
 return res.json({success:true});
});
router.post('/search',async(req,res)=>{
 const {query,top_k}=req.body;
 if(typeof query!=='string'||!query.trim()||query.length>8000||top_k!==undefined&&(!Number.isInteger(top_k)||top_k<1||top_k>10))return res.status(400).json({error:'Provide a search query of 1–8000 characters and top_k of 1–10'});
 const docs=await db.getDocuments(req.user!.organizationId);
 const results=await AiGatewayClient.request('/documents/search',{query,top_k:top_k??4,tenant_id:req.user!.organizationId,filter_doc_ids:docs.filter(d=>d.status==='INDEXED').map(d=>d.id)},req.user!.organizationId);
 return res.json(results);
});
export default router;
