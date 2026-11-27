import https from 'https';
import dns from 'dns/promises';
import net from 'net';
import Ajv from 'ajv';
import { db } from '../db/store';
import { AiGatewayClient } from './aiGatewayClient';
import { AppError } from './errors';
import { decrypt } from './security';
const ajv=new Ajv({allErrors:true,strict:false});
export class ToolExecutor {
 static async executeTool(orgId:string,toolName:string,args:Record<string,any>):Promise<any>{
  const tool=await db.getToolByName(orgId,toolName);
  if(!tool||!tool.isEnabled)throw new AppError(403,'Tool is disabled or unauthorized for this organization.');
  let validate;try{validate=ajv.compile(tool.parameters);}catch{throw new AppError(400,'Tool parameter schema is invalid');}
  if(!validate(args))throw new AppError(400,'Tool arguments do not match the registered schema');
  switch(toolName){
   case 'calculator':return {expression:args.expression,result:this.calculate(args.expression)};
   case 'date_time':{const date=new Date();return {format:args.format||'iso',timestamp:args.format==='timestamp'?String(date.getTime()):args.format==='human'?date.toUTCString():date.toISOString(),timezone:'UTC'};}
   case 'json_transform':if(!args.inputJson||!Array.isArray(args.targetKeys))throw new AppError(400,'JSON input and targetKeys are required');return Object.fromEntries(args.targetKeys.filter((k:string)=>Object.hasOwn(args.inputJson,k)&&!['__proto__','constructor','prototype'].includes(k)).map((k:string)=>[k,args.inputJson[k]]));
   case 'knowledge_search':return this.search(orgId,args.query,args.top_k||4,args.filter_doc_ids);
   default:
    if(!tool.endpointUrl)throw new AppError(400,'This tool requires an HTTPS endpoint');
    let credential:string|undefined;
    const secret=(await db.list('secrets',orgId)).find(s=>s.toolId===tool.id);
    if(secret)credential=decrypt(secret.encryptedValue);
    return this.external(tool.endpointUrl,tool.timeoutMs,credential);
  }
 }
 static async search(orgId:string,query:string,topK=4,docIds?:string[]){
  if(typeof query!=='string'||!query.trim()||query.length>8000)throw new AppError(400,'A search query of 1–8000 characters is required');
  return AiGatewayClient.request('/documents/search',{query,tenant_id:orgId,top_k:Math.min(10,Math.max(1,topK)),filter_doc_ids:docIds},orgId);
 }
 static calculate(expression:string):number {
  if(typeof expression!=='string'||expression.length>500||!/^[0-9+*/().\s-]+$/.test(expression))throw new AppError(400,'Use a valid arithmetic expression');
  const tokens=expression.match(/\d+(?:\.\d+)?|\.\d+|[()+*/-]/g)||[];let i=0;
  const atom=():number=>{const t=tokens[i++];if(t==='-')return -atom();if(t==='+')return atom();if(t==='('){const n=sum();if(tokens[i++]!==')')throw new Error();return n;}if(t===undefined||!/^\d|^\./.test(t))throw new Error();return Number(t);};
  const product=():number=>{let n=atom();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],r=atom();n=op==='*'?n*r:n/r;}return n;};
  const sum=():number=>{let n=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],r=product();n=op==='+'?n+r:n-r;}return n;};
  try{const result=sum();if(i!==tokens.length||!Number.isFinite(result))throw new Error();return result;}catch{throw new AppError(400,'Invalid arithmetic expression or non-finite result');}
 }
 static async external(endpoint:string,timeoutMs:number,credential?:string):Promise<any>{
  let url:URL;try{url=new URL(endpoint);}catch{throw new AppError(400,'Invalid tool endpoint');}
  const hosts=(process.env.TOOL_ALLOWED_HOSTS||'api.open-meteo.com').split(',').map(s=>s.trim());
  if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||net.isIP(url.hostname)||!hosts.includes(url.hostname))throw new AppError(403,'Tool endpoint is outside the server HTTPS host allowlist');
  const answers=await dns.lookup(url.hostname,{all:true,family:4});
  const privateIp=(ip:string)=>/^(?:0\.|10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|224\.|::|fc|fd|fe80|ff)/i.test(ip)||ip.includes(':');
  if(!answers.length||answers.some(a=>privateIp(a.address)))throw new AppError(403,'Private and local tool destinations are prohibited');
  const selected=answers[0];
  return new Promise((resolve,reject)=>{
   const request=https.get(url,{headers:{Accept:'application/json',...(credential?{Authorization:`Bearer ${credential}`}:{})},lookup:((_host:any,options:any,cb:any)=>options.all?cb(null,[{address:selected.address,family:selected.family}]):cb(null,selected.address,selected.family)) as any,timeout:Math.min(timeoutMs,15000)},response=>{
    if(response.statusCode!==200){response.resume();return reject(new AppError(502,`External tool returned HTTP ${response.statusCode}; redirects are prohibited`));}
    let body='';response.on('data',chunk=>{body+=chunk;if(Buffer.byteLength(body)>1024*1024){request.destroy();reject(new AppError(502,'External response exceeds 1 MB'));}});
    response.on('end',()=>{try{resolve(JSON.parse(body));}catch{reject(new AppError(502,'External tool returned invalid JSON'));}});
   });
   request.on('timeout',()=>request.destroy());request.on('error',()=>reject(new AppError(503,'External tool unavailable or timed out')));
  });
 }
}
