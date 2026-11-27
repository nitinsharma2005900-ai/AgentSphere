import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UserRole } from "../types";
import { db } from "../db/store";
import { hash } from '../services/security';
export interface AuthenticatedUser { id:string;email:string;role:UserRole;organizationId:string;sid?:string;apiKeyScopes?:string[]; }
declare global { namespace Express { interface Request {user?:AuthenticatedUser;correlationId?:string;} } }
export const authenticateToken=async(req:Request,res:Response,next:NextFunction)=>{
 const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;
 if(!token)return res.status(401).json({error:'Authentication required'});
 try {
  if(token.startsWith('as_')){
   const keyId=token.slice(3).split('.')[0],key=await db.get('api_keys',keyId);
   if(!key||key.revoked||key.expiresAt<Date.now()||hash(token)!==key.tokenHash)throw new Error();
   const user=await db.findUserById(key.userId);if(!user||user.organizationId!==key.organizationId)throw new Error();
   const path=req.baseUrl+req.path;
   const scope=path.startsWith('/api/v1/agents')?(req.method==='GET'?'read:agents':req.method==='POST'&&path.endsWith('/run')?'execute:agents':''):
    path.startsWith('/api/v1/workflows')?(req.method==='GET'?'read:workflows':req.method==='POST'&&path.endsWith('/run')?'execute:workflows':''):
    path.startsWith('/api/v1/documents')&&(req.method==='GET'||path.endsWith('/search'))?'read:knowledge':
    path.startsWith('/api/v1/billing')&&req.method==='GET'?'read:usage':'';
   if(!scope||!key.scopes.includes(scope))return res.status(403).json({error:'API key scope does not permit this operation'});
   req.user={id:user.id,email:user.email,role:user.role,organizationId:key.organizationId,apiKeyScopes:key.scopes};return next();
  }
  const decoded=jwt.verify(token,config.jwtSecret,{algorithms:['HS256']}) as AuthenticatedUser;
  const session=decoded.sid?await db.get('sessions',decoded.sid):undefined;
  const user=await db.findUserById(decoded.id);
  if(!user||!session||session.revoked||session.expiresAt<Date.now()||session.userId!==user.id||user.role!==decoded.role)throw new Error();
  if(decoded.organizationId!==user.organizationId&&user.role!=='PLATFORM_ADMINISTRATOR')throw new Error();
  req.user=decoded; next();
 }catch{return res.status(401).json({error:'Invalid or expired session. Sign in again.'});}
};
