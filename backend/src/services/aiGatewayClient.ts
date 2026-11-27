import { config } from '../config';
import { z } from 'zod';
import { AppError } from './errors';
const resultSchema=z.object({content:z.string(),tool_calls:z.array(z.object({tool_name:z.string(),arguments:z.record(z.string(),z.unknown())})).nullable().optional(),finish_reason:z.string().optional(),
 usage:z.object({prompt_tokens:z.number().int().nonnegative(),completion_tokens:z.number().int().nonnegative(),total_tokens:z.number().int().nonnegative(),estimated_cost_usd:z.number().nonnegative()}),provider:z.string(),model:z.string(),is_fallback:z.boolean().optional()});
export interface GatewayGenerationResult {content:string;toolCalls?:Array<{tool_name:string;arguments:Record<string,any>}>;finishReason:string;usage:{prompt_tokens:number;completion_tokens:number;total_tokens:number;estimated_cost_usd:number};provider:string;model:string;isFallback:boolean;}
export class AiGatewayClient {
 static headers(tenantId?:string):Record<string,string> {return {'Content-Type':'application/json','X-Service-Key':config.serviceSecret,...(tenantId?{'X-Tenant-Id':tenantId}:{})};}
 static async request(path:string,body?:unknown,tenantId?:string,method='POST',signal?:AbortSignal):Promise<any>{
  try {
   const response=await fetch(`${config.aiServiceUrl}${path}`,{method,headers:this.headers(tenantId),...(body===undefined?{}:{body:JSON.stringify(body)}),signal:signal||AbortSignal.timeout(45000)});
   if(!response.ok)throw new AppError(response.status===400||response.status===422?400:503,response.status<500?'The AI service rejected the input. Check document format and prompt content.':'AI service unavailable. Check provider configuration and retry.');
   return await response.json();
  }catch(error){if(error instanceof AppError)throw error;throw new AppError(503,'AI gateway unavailable or timed out. Check service health and retry.');}
 }
 static async generate(params:{messages:Array<{role:string;content:string}>;provider?:string;model?:string;systemInstruction?:string;temperature?:number;maxTokens?:number;tools?:any[];responseSchema?:any;tenantId?:string;signal?:AbortSignal}):Promise<GatewayGenerationResult>{
  if(params.provider==='mock'&&!config.allowMock)throw new AppError(400,'Mock provider is disabled. Configure a real Gemini API key.');
  const raw=await this.request('/ai/generate',{messages:params.messages,provider:params.provider||'gemini',model:params.model,system_instruction:params.systemInstruction,temperature:params.temperature??0.7,max_tokens:params.maxTokens??2048,tools:params.tools,response_schema:params.responseSchema,tenant_id:params.tenantId},params.tenantId,'POST',params.signal);
  const parsed=resultSchema.safeParse(raw);
  if(!parsed.success)throw new AppError(502,'AI provider returned malformed output. Execution stopped safely.');
  const data=parsed.data;
  if(data.provider==='mock'&&!config.allowMock)throw new AppError(503,'The real model provider is unavailable; mock fallback is disabled.');
  return {content:data.content,toolCalls:data.tool_calls||undefined,finishReason:data.finish_reason||'stop',usage:data.usage,provider:data.provider,model:data.model,isFallback:!!data.is_fallback};
 }
 static async getHealth(){try{return await this.request('/health/',undefined,undefined,'GET',AbortSignal.timeout(8000));}catch{return {status:'unavailable',active_provider:'unavailable',providers:{gemini:{status:'unavailable',configured:false}}};}}
}
