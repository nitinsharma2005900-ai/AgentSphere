import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/store';
import { config } from '../config';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
const router=Router();
router.use(authenticateToken);
router.get('/current',async(req,res)=>res.json(await db.getOrganization(req.user!.organizationId)));
router.get('/all',async(req,res)=>res.json(req.user!.role==='PLATFORM_ADMINISTRATOR'?await db.getAllOrganizations():[await db.getOrganization(req.user!.organizationId)]));
router.post('/switch',async(req,res)=>{
 const target=req.body.targetOrganizationId;
 if(typeof target!=='string')return res.status(400).json({error:'targetOrganizationId is required'});
 if(target!==req.user!.organizationId&&req.user!.role!=='PLATFORM_ADMINISTRATOR')return res.status(403).json({error:'You are not a member of this organization'});
 const org=await db.getOrganization(target);
 if(!org)return res.status(404).json({error:'Organization not found'});
 const {id,email,role,sid}=req.user!;
 return res.json({token:jwt.sign({id,email,role,sid,organizationId:target},config.jwtSecret,{expiresIn:config.jwtExpiresIn as any}),organization:org});
});
router.get('/members',async(req,res)=>res.json((await db.getUsers(req.user!.organizationId)).map(({passwordHash,...user})=>user)));
router.post('/members',requireRoles(['ORGANIZATION_OWNER']),validate(z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(10).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),role:z.enum(['ORGANIZATION_OWNER','AI_BUILDER','WORKFLOW_OPERATOR','AUDITOR'])}).strict()),async(req,res)=>{
 const result=await db.transaction('signup:'+req.body.email,async()=>{
  if(await db.findUserByEmail(req.body.email))return null;
  const now=new Date().toISOString();return db.createUser({id:randomUUID(),email:req.body.email,name:req.body.name,passwordHash:await bcrypt.hash(req.body.password,12),role:req.body.role,organizationId:req.user!.organizationId,createdAt:now,updatedAt:now});
 });if(!result)return res.status(409).json({error:'An account with that email already exists'});
 const {passwordHash,...user}=result;return res.status(201).json(user);
});
export default router;
