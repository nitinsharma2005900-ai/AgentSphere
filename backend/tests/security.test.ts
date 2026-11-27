import request from 'supertest';
import {app} from '../src/index';
import {db} from '../src/db/store';
import {ToolExecutor} from '../src/services/toolExecutor';
import {ExecutionEngine} from '../src/services/executionEngine';
import {AiGatewayClient} from '../src/services/aiGatewayClient';
import {encrypt,decrypt} from '../src/services/security';
let token:string,refreshToken:string;
beforeAll(async()=>{await db.ready;const login=await request(app).post('/api/v1/auth/login').send({email:'owner@agentsphere.ai',password:'Password123!'});token=login.body.token;refreshToken=login.body.refreshToken;});
afterAll(async()=>db.close());
test('public signup cannot assign platform administrator',async()=>{const result=await request(app).post('/api/v1/auth/signup').send({email:'privilege@test.example',name:'Attacker',password:'StrongPassword123!',role:'PLATFORM_ADMINISTRATOR'});expect(result.status).toBe(400);});
test('organization switching cannot cross membership boundary',async()=>{const result=await request(app).post('/api/v1/organizations/switch').set('Authorization',`Bearer ${token}`).send({targetOrganizationId:'org-cyberdyne-2'});expect(result.status).toBe(403);});
test('organization list excludes other tenants',async()=>{const result=await request(app).get('/api/v1/organizations/all').set('Authorization',`Bearer ${token}`);expect(result.body).toHaveLength(1);expect(result.body[0].id).toBe('org-acme-1');});
test('agent updates reject identity reassignment',async()=>{const result=await request(app).put('/api/v1/agents/agent-concierge-1').set('Authorization',`Bearer ${token}`).send({id:'stolen'});expect(result.status).toBe(400);});
test('tool lookup cannot borrow a system tool from another tenant',async()=>{expect(await db.getToolByName('org-cyberdyne-2','calculator')).toBeUndefined();});
test.each(['1 / 0','process.exit()','1;2','2 ** 8'])('calculator rejects unsafe or malformed expression %s',expression=>{expect(()=>ToolExecutor.calculate(expression)).toThrow();});
test('encrypted credentials round trip without plaintext at rest',()=>{const encrypted=encrypt('test-secret-value');expect(encrypted).not.toContain('test-secret-value');expect(decrypt(encrypted)).toBe('test-secret-value');});
test('refresh rotates and rejects replay',async()=>{const first=await request(app).post('/api/v1/auth/refresh').send({refreshToken});expect(first.status).toBe(200);const replay=await request(app).post('/api/v1/auth/refresh').send({refreshToken});expect(replay.status).toBe(401);token=first.body.token;});
test('API key scope and revocation are enforced',async()=>{const created=await request(app).post('/api/v1/access/keys').set('Authorization',`Bearer ${token}`).send({name:'test reader',scopes:['read:agents']});expect(created.status).toBe(201);const key=created.body.token;expect((await request(app).get('/api/v1/agents').set('Authorization',`Bearer ${key}`)).status).toBe(200);expect((await request(app).post('/api/v1/agents').set('Authorization',`Bearer ${key}`).send({name:'Denied',systemPrompt:'Denied'})).status).toBe(403);await request(app).delete(`/api/v1/access/keys/${created.body.id}`).set('Authorization',`Bearer ${token}`);expect((await request(app).get('/api/v1/agents').set('Authorization',`Bearer ${key}`)).status).toBe(401);});
test('approval continues downstream tool nodes and rejects duplicate decisions',async()=>{
 const now=new Date().toISOString();const wf=await db.createWorkflow({id:'security-workflow',organizationId:'org-acme-1',name:'Approval regression',description:'',versionNumber:1,isPublished:true,createdAt:now,updatedAt:now,nodes:[{id:'start',type:'start',position:{x:0,y:0},data:{}},{id:'gate',type:'humanApproval',position:{x:1,y:0},data:{}},{id:'tool',type:'tool',position:{x:2,y:0},data:{toolName:'calculator',args:{expression:'6*7'}}},{id:'end',type:'output',position:{x:3,y:0},data:{}}],edges:[{id:'a',source:'start',target:'gate'},{id:'b',source:'gate',target:'tool'},{id:'c',source:'tool',target:'end'}]});
 const paused=await ExecutionEngine.runWorkflow('org-acme-1',wf.id,{});expect(paused.status).toBe('PAUSED_APPROVAL');const completed=await ExecutionEngine.resumeExecution('org-acme-1',paused.id,true,'Approved','owner@agentsphere.ai');expect(completed.status).toBe('COMPLETED');expect(completed.output.toolResult.result).toBe(42);await expect(ExecutionEngine.resumeExecution('org-acme-1',paused.id,true)).rejects.toThrow();
});
test('provider outage records failure and does not fabricate output',async()=>{jest.spyOn(AiGatewayClient,'generate').mockRejectedValueOnce(new Error('offline'));const result=await ExecutionEngine.runAgent('org-acme-1','agent-concierge-1','Explain uptime');expect(result.status).toBe('FAILED');expect(result.output).toBeUndefined();});
test('runaway tool loop stops at the configured step budget',async()=>{
 const original=(await db.getAgentById('org-acme-1','agent-concierge-1'))!;
 await db.updateAgent('org-acme-1',original.id,{maxSteps:2,toolPermissions:['date_time']});
 const generate=jest.spyOn(AiGatewayClient,'generate').mockResolvedValue({content:'[TEST MOCK] tool call',toolCalls:[{tool_name:'date_time',arguments:{format:'iso'}}],finishReason:'tool_calls',provider:'mock',model:'test',isFallback:false,usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2,estimated_cost_usd:0}});
 try{const result=await ExecutionEngine.runAgent('org-acme-1',original.id,'Use the time tool repeatedly');expect(result.status).toBe('FAILED');expect(result.error).toContain('step');expect(generate).toHaveBeenCalledTimes(1);}finally{await db.updateAgent('org-acme-1',original.id,original);}
});
test('token quota blocks the provider call before spending',async()=>{
 const org=(await db.getOrganization('org-acme-1'))!;
 await db.updateOrganization(org.id,{usedTokensThisMonth:org.monthlyTokenLimit-1,usageMonth:new Date().toISOString().slice(0,7)});
 const generate=jest.spyOn(AiGatewayClient,'generate');
 try{const result=await ExecutionEngine.runAgent(org.id,'agent-concierge-1','Explain quota limits');expect(result.status).toBe('FAILED');expect(result.error).toContain('quota');expect(generate).not.toHaveBeenCalled();}finally{await db.updateOrganization(org.id,org);}
});
test('daily execution limit blocks new work',async()=>{
 const org=(await db.getOrganization('org-acme-1'))!;
 await db.updateOrganization(org.id,{usedExecutionsToday:org.dailyExecutionLimit,usageDay:new Date().toISOString().slice(0,10)});
 try{await expect(ExecutionEngine.runAgent(org.id,'agent-concierge-1','Explain quotas')).rejects.toThrow('Daily execution quota');}finally{await db.updateOrganization(org.id,org);}
});
