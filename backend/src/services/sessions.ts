import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { db } from "../db/store";
import { config } from "../config";
import { hash } from "./security";
import { User } from "../types";
export async function issueSession(user:User, oldSessionId?:string) {
  const id=randomUUID(), now=Date.now();
  const payload={id:user.id,email:user.email,role:user.role,organizationId:user.organizationId,sid:id};
  const token=jwt.sign(payload,config.jwtSecret,{expiresIn:config.jwtExpiresIn as any,algorithm:"HS256"});
  const refreshToken=jwt.sign({...payload,type:"refresh",jti:randomUUID()},config.jwtRefreshSecret,{expiresIn:config.jwtRefreshExpiresIn as any,algorithm:"HS256"});
  await db.put("sessions",{id,organizationId:user.organizationId,userId:user.id,refreshHash:hash(refreshToken),revoked:false,expiresAt:now+7*86400000});
  if(oldSessionId) await db.update("sessions",oldSessionId,{revoked:true});
  return {token,refreshToken};
}
