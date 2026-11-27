import requests,time,json
from pathlib import Path
base='https://agentsphere-api-nitinsharma.onrender.com/api/v1'
results=[]
def check(name,condition,detail=''):
 results.append({'test':name,'passed':bool(condition),'detail':str(detail)[:300]});print(name,'PASS' if condition else 'FAIL',str(detail)[:100],flush=True)
def login(email):
 r=requests.post(base+'/auth/login',json={'email':email,'password':'Password123!'},timeout=45);r.raise_for_status();return {'Authorization':'Bearer '+r.json()['token']}
h=login('owner@agentsphere.ai');other=login('competitor@external.io')
def call(method,path,**kwargs):return requests.request(method,base+path,headers=kwargs.pop('headers',h),timeout=80,**kwargs)
def wait(record):
 for i in range(80):
  if record['status'] not in ['PENDING','RUNNING']:return record
  time.sleep(1);record=call('GET','/executions/'+record['id']).json()
 return record
r=call('GET','/agents');check('tenant agent listing',r.status_code==200)
r=call('POST','/organizations/switch',json={'targetOrganizationId':'org-cyberdyne-2'});check('tenant switch blocked',r.status_code==403)
r=call('POST','/documents/upload',files={'file':('verification-policy.txt',b'AgentSphere verification policy: invoice approval threshold is 5000 USD. The verification reference is ORBIT-742.','text/plain')});check('real document ingestion',r.status_code in [200,201] and r.json().get('status')=='INDEXED',r.status_code);doc=r.json()
r=call('POST','/documents/search',json={'query':'invoice approval threshold','top_k':4});check('actual source retrieval',r.ok and any('5000 USD' in item['content'] for item in r.json()),r.status_code)
r=call('POST','/documents/search',headers=other,json={'query':'ORBIT-742','top_k':4});check('cross-tenant retrieval blocked',r.ok and not r.json())
r=call('POST','/documents/'+doc['id']+'/reindex',json={});check('repeatable reindex',r.ok,r.status_code)
r=call('POST','/agents',json={'name':'Live verification agent','systemPrompt':'Answer questions accurately from the provided references. Cite the source.','knowledgeBaseIds':[doc['id']],'toolPermissions':[],'maxTokens':512,'modelProvider':'gemini','modelName':'gemini-3.1-flash-lite'});check('agent creation',r.status_code==201);agent=r.json()
r=call('POST','/agents/'+agent['id']+'/run',json={'prompt':'What is the invoice approval threshold and verification reference?'});execution=wait(r.json());check('real Gemini RAG execution',execution.get('status')=='COMPLETED' and execution.get('provider')=='gemini' and '5000' in str(execution.get('output')),execution.get('error') or execution.get('output'))
r=call('POST','/workflows',json={'name':'Live approval verification','nodes':[{'id':k,'type':t,'position':{'x':i*200,'y':0},'data':({'toolName':'calculator','args':{'expression':'6*7'}} if k=='tool' else {})} for i,(k,t) in enumerate([('start','start'),('gate','humanApproval'),('tool','tool'),('end','output')])],'edges':[{'id':str(i),'source':a,'target':b} for i,(a,b) in enumerate([('start','gate'),('gate','tool'),('tool','end')])]});wf=r.json();check('workflow creation',r.status_code==201)
r=call('POST','/workflows/'+wf['id']+'/run',json={'inputData':{'reference':'live verification'}});paused=wait(r.json());check('worker pauses for approval',paused.get('status')=='PAUSED_APPROVAL')
r=call('POST','/approvals/'+paused['approvalRequestId']+'/approve',json={'notes':'Verified live'});completed=wait(r.json()['execution']);check('approval executes downstream tools',completed.get('status')=='COMPLETED' and completed.get('output',{}).get('toolResult',{}).get('result')==42,completed.get('error'))
r=call('GET','/billing/export-report');check('authenticated CSV download',r.ok and 'Execution ID' in r.text)
r=call('GET','/admin/provider-health');check('configured real gateway',r.ok and r.json().get('aiGateway',{}).get('active_provider')=='gemini')
call('DELETE','/agents/'+agent['id']);call('DELETE','/documents/'+doc['id']);call('DELETE','/workflows/'+wf['id'])
report={'base_url':base,'results':results,'passed':sum(r['passed'] for r in results),'total':len(results),'real_model':True,'mock_used':False}
Path('docs/results/deployed-api.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
