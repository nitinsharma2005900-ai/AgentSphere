import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { db } from "../db/store";
import { config } from "../config";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { issueSession } from "../services/sessions";
import { hash } from "../services/security";
const router=Router();
const credentials=z.object({email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(1).max(128)});
router.post('/login',validate(credentials),async(req,res)=>{
 const user=await db.findUserByEmail(req.body.email);
 if(!user||!await bcrypt.compare(req.body.password,user.passwordHash))return res.status(401).json({error:'Invalid credentials'});
 const org=await db.getOrganization(user.organizationId);
 const tokens=await issueSession(user);
 await db.logAudit({id:randomUUID(),organizationId:user.organizationId,userId:user.id,userEmail:user.email,action:'USER_LOGGED_IN',resourceType:'auth',resourceId:user.id,details:{},ipAddress:req.ip||'',timestamp:new Date().toISOString()});
 const {passwordHash,...profile}=user;
 return res.json({...tokens,user:{...profile,organizationName:org?.name}});
});
router.post('/signup',validate(credentials.extend({password:z.string().min(10).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),name:z.string().trim().min(2).max(100),organizationName:z.string().trim().min(2).max(200).optional()}).strict()),async(req,res)=>{
 const {email,password,name,organizationName}=req.body;
 const result=await db.transaction('signup:'+email,async()=>{
  if(await db.findUserByEmail(email))return null;
  const now=new Date().toISOString(),organizationId=randomUUID();
  const org=await db.createOrganization({id:organizationId,name:organizationName||`${name}'s Organization`,plan:'free',monthlyTokenLimit:1_000_000,usedTokensThisMonth:0,dailyExecutionLimit:200,usedExecutionsToday:0,createdAt:now,updatedAt:now});
  const user=await db.createUser({id:randomUUID(),email,name,passwordHash:await bcrypt.hash(password,12),role:'ORGANIZATION_OWNER',organizationId,createdAt:now,updatedAt:now});
  const templates=await db.getTools('org-acme-1');
  for(const tool of templates.filter(t=>t.isSystemTool))await db.createTool({...tool,id:randomUUID(),organizationId});
  return {org,user};
 });
 if(!result)return res.status(409).json({error:'An account already exists with this email'});
 const {passwordHash,...user}=result.user;
 return res.status(201).json({...await issueSession(result.user),user:{...user,organizationName:result.org.name}});
});
router.post('/refresh',validate(z.object({refreshToken:z.string().min(20).max(4096)})),async(req,res)=>{
 try {
  const decoded=jwt.verify(req.body.refreshToken,config.jwtRefreshSecret,{algorithms:['HS256']}) as any;
  const result=await db.transaction('session:'+decoded.sid,async()=>{
   const session=await db.get('sessions',decoded.sid),user=await db.findUserById(decoded.id);
   if(decoded.type!=='refresh'||!session||session.revoked||session.expiresAt<Date.now()||session.refreshHash!==hash(req.body.refreshToken)||!user)return null;
   return issueSession(user,decoded.sid);
  });
  if(result)return res.json(result);
 }catch{}
 return res.status(401).json({error:'Session expired. Sign in again.'});
});
router.post('/logout',authenticateToken,async(req,res)=>{
 if(req.user!.sid)await db.update('sessions',req.user!.sid,{revoked:true});
 return res.json({success:true});
});
router.get('/me',authenticateToken,async(req,res)=>{
 const current=await db.findUserById(req.user!.id);
 if(!current)return res.status(401).json({error:'User no longer exists'});
 const {passwordHash,...user}=current,org=await db.getOrganization(req.user!.organizationId);
 return res.json({user:{...user,organizationId:req.user!.organizationId,organizationName:org?.name},organization:org});
});
router.post('/password',authenticateToken,validate(z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(10).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/)}).strict()),async(req,res)=>{
 const user=await db.findUserById(req.user!.id);
 if(!user||!await bcrypt.compare(req.body.currentPassword,user.passwordHash))return res.status(400).json({error:'Current password is incorrect'});
 await db.transaction('user:'+user.id,async()=>{
  await db.updateUser(user.id,{passwordHash:await bcrypt.hash(req.body.newPassword,12)});
  for(const session of await db.list('sessions',user.organizationId))if(session.userId===user.id)await db.update('sessions',session.id,{revoked:true});
 });return res.json({success:true,message:'Password changed. Sign in again.'});
});
router.post('/forgot-password',(_req,res)=>res.status(503).json({error:'Password recovery delivery is not configured. Contact the workspace owner.'}));
export default router;
