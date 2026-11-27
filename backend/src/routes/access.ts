import { Router } from 'express';
import { randomBytes,randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../db/store';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { hash } from '../services/security';
const router=Router();router.use(authenticateToken,requireRoles(['ORGANIZATION_OWNER']));
export const apiScopes=['read:agents','execute:agents','read:workflows','execute:workflows','read:knowledge','read:usage'] as const;
router.get('/keys',async(req,res)=>res.json((await db.list('api_keys',req.user!.organizationId)).map(({tokenHash,...key})=>key)));
router.post('/keys',validate(z.object({name:z.string().trim().min(1).max(100),scopes:z.array(z.enum(apiScopes)).min(1),expiresInDays:z.number().int().min(1).max(90).default(30)}).strict()),async(req,res)=>{
 const id=randomUUID(),token=`as_${id}.${randomBytes(32).toString('hex')}`;
 const key={id,organizationId:req.user!.organizationId,userId:req.user!.id,name:req.body.name,scopes:req.body.scopes,tokenHash:hash(token),revoked:false,expiresAt:Date.now()+req.body.expiresInDays*86400000,createdAt:new Date().toISOString()};
 await db.put('api_keys',key);const {tokenHash,...publicKey}=key;return res.status(201).json({...publicKey,token});
});
router.delete('/keys/:id',async(req,res)=>{
 const key=await db.get('api_keys',req.params.id,req.user!.organizationId);
 if(!key)return res.status(404).json({error:'API key not found'});
 await db.update('api_keys',key.id,{revoked:true},req.user!.organizationId);return res.json({success:true});
});
export default router;
