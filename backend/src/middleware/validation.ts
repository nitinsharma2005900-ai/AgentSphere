import { RequestHandler } from "express";
import { z, ZodTypeAny } from "zod";
const text=z.string().trim().min(1).max(200), id=z.string().min(1).max(150);
export const agentSchema=z.object({
 name:text,description:z.string().max(4000).optional(),systemPrompt:z.string().trim().min(1).max(16000),
 avatar:z.string().max(50).optional(), color:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
 modelProvider:z.enum(["gemini","mock"]).optional(),modelName:z.string().min(1).max(100).optional(),
 temperature:z.number().min(0).max(2).optional(),maxTokens:z.number().int().min(16).max(4096).optional(),
 maxSteps:z.number().int().min(1).max(30).optional(),timeoutSeconds:z.number().int().min(5).max(120).optional(),
 knowledgeBaseIds:z.array(id).max(50).optional(),toolPermissions:z.array(text).max(20).optional(),
 humanApprovalRequired:z.boolean().optional(),isDraft:z.boolean().optional(),isArchived:z.boolean().optional()
}).strict();
const node=z.object({id,type:z.enum(["start","knowledgeRetrieval","aiAgent","humanApproval","output","tool","externalTool","condition"]),position:z.object({x:z.number(),y:z.number()}),data:z.record(z.unknown())}).passthrough();
export const workflowSchema=z.object({name:text,description:z.string().max(4000).optional(),nodes:z.array(node).min(2).max(30).optional(),
 edges:z.array(z.object({id,source:id,target:id}).passthrough()).max(60).optional(),isPublished:z.boolean().optional()}).strict();
export const validate=(schema:ZodTypeAny):RequestHandler=>(req,res,next)=>{
 const result=schema.safeParse(req.body);
 if(!result.success)return res.status(400).json({error:"Validation Error",message:result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});
 req.body=result.data; next();
};
