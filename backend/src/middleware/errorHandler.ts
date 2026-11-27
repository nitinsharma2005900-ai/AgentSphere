import { Request,Response,NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
export const requestCorrelation=(req:Request,res:Response,next:NextFunction)=>{
 const supplied=req.get('X-Request-Id');req.correlationId=supplied&&/^[a-zA-Z0-9_-]{1,80}$/.test(supplied)?supplied:randomUUID();res.setHeader('X-Request-Id',req.correlationId);next();
};
export const errorHandler=(err:any,req:Request,res:Response,_next:NextFunction)=>{
 let status=err instanceof ZodError?400:err.code==='LIMIT_FILE_SIZE'?413:err.code==='23505'?409:err.status||err.statusCode||500;
 if(status<400||status>599)status=500;
 const message=err instanceof ZodError?err.issues.map((i:any)=>`${i.path.join('.')}: ${i.message}`).join('; '):status===413?'Upload exceeds the 4 MB limit':err.code==='23505'?'A record with these unique values already exists':status>=500?'Service operation failed. Check health and retry.':err.message;
 console.error(JSON.stringify({event:'request_failed',requestId:req.correlationId,method:req.method,path:req.path,status,errorType:err.name}));
 if(!res.headersSent)res.status(status).json({error:status>=500?'Service Error':'Request Error',message,correlationId:req.correlationId});
};
