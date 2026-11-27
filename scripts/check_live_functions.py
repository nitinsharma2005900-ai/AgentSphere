"""Exercise deployed functions against an isolated synthetic QA tenant. Never logs tokens/passwords."""
import io,json,secrets,time,uuid,zipfile
from datetime import datetime,timezone
from pathlib import Path
import requests
BASE='https://agentsphere-api-nitinsharma.onrender.com/api/v1'
results=[];session=requests.Session();run=uuid.uuid4().hex[:10];password=secrets.token_urlsafe(20)+'Aa1!'
def record(name,passed,detail=''):
 results.append({'function':name,'passed':bool(passed),'detail':str(detail)[:250]});print(('PASS ' if passed else 'FAIL ')+name+' '+str(detail)[:100],flush=True)
def request(method,path,expected=200,name=None,headers=None,**kwargs):
 response=session.request(method,BASE+path,headers=headers,timeout=70,**kwargs)
 try:data=response.json()
 except ValueError:data={'text':response.text}
 if name:record(name,response.status_code in ([expected] if isinstance(expected,int) else expected),f'HTTP {response.status_code}')
 return response,data
def wait(data):
 deadline=time.monotonic()+90
 while data.get('status') in ['PENDING','RUNNING'] and time.monotonic()<deadline:
  time.sleep(.8);_,data=request('GET','/executions/'+data['id'])
 return data
def workflow(name,nodes,edges):
 _,data=request('POST','/workflows',201,name,json={'name':'QA '+name+' '+run,'nodes':[dict(id=i,type=t,position={'x':n*180,'y':0},data=d) for n,(i,t,d) in enumerate(nodes)],'edges':[dict(id=str(n),source=a,target=b,**({'label':label} if label else {})) for n,(a,b,label) in enumerate(edges)]})
 return data
try:
 request('GET','/agents',401,'Unauthenticated API access is denied')
 request('POST','/auth/signup',400,'Weak signup password is rejected',json={'email':'weak-'+run+'@example.test','password':'weak','name':'QA'})
 _,signup=request('POST','/auth/signup',201,'Signup creates isolated organization',json={'email':'qa-'+run+'@example.test','password':password,'name':'Live QA '+run,'organizationName':'Live QA '+run})
 session.headers['Authorization']='Bearer '+signup['token'];org=signup['user']['organizationId']
 request('GET','/auth/me',200,'Current session profile')
 request('POST','/auth/signup',409,'Duplicate account is rejected',json={'email':'qa-'+run+'@example.test','password':password,'name':'QA'})
 _,organizations=request('GET','/organizations/all',200,'Organization listing');record('Organization listing is tenant scoped',len(organizations)==1 and organizations[0]['id']==org)
 request('POST','/organizations/switch',403,'Foreign organization switch denied',json={'targetOrganizationId':'org-acme-1'})
 request('GET','/agents/agent-concierge-1',404,'Foreign agent cannot be read')
 request('GET','/agents?organizationId=org-acme-1',403,'Tenant query spoofing rejected')
 _,tools=request('GET','/tools',200,'System tools provisioned for new tenant');by_name={t['name']:t for t in tools}
 for tool,args,validate in [('calculator',{'expression':'(17 + 3) * 4'},lambda d:d['result']['result']==80),('date_time',{'format':'iso'},lambda d:'timestamp' in d['result']),('json_transform',{'inputJson':{'keep':42,'drop':9},'targetKeys':['keep']},lambda d:d['result']=={'keep':42})]:
  r,d=request('POST','/tools/'+by_name[tool]['id']+'/test',200,'Execute '+tool,json={'args':args});record(tool+' returns correct result',r.ok and validate(d))
 request('POST','/tools/'+by_name['calculator']['id']+'/test',400,'Malformed calculator input rejected',json={'args':{'expression':'process.exit()'}})
 request('POST','/tools/'+by_name['calculator']['id']+'/test',400,'Division by zero rejected',json={'args':{'expression':'1/0'}})
 request('PATCH','/tools/'+by_name['calculator']['id']+'/toggle',200,'Disable tool')
 request('POST','/tools/'+by_name['calculator']['id']+'/test',403,'Disabled tool cannot execute',json={'args':{'expression':'1+1'}})
 request('PATCH','/tools/'+by_name['calculator']['id']+'/toggle',200,'Re-enable tool')
 request('POST','/tools',400,'Unsafe external endpoint rejected',json={'name':'qa_unsafe','description':'QA invalid endpoint','parameters':{'type':'object'},'endpointUrl':'http://127.0.0.1'})
 _,custom=request('POST','/tools',201,'Register allowed HTTPS tool',json={'name':'qa_external_'+run,'description':'QA tool','parameters':{'type':'object'},'endpointUrl':'https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.41&current_weather=true'})
 request('PUT','/tools/'+custom['id'],200,'Update tool schema',json={'parameters':{'type':'object','properties':{'city':{'type':'string'}}}})
 _,listing=request('GET','/tools');record('Tool schema revisions retained',len(next(t for t in listing if t['id']==custom['id']).get('schemaVersions',[]))==2)
 request('PUT','/tools/'+custom['id']+'/credential',200,'Store encrypted synthetic tool credential',json={'value':secrets.token_urlsafe(24)})
 _,agent=request('POST','/agents',201,'Create agent',json={'name':'QA agent '+run,'systemPrompt':'Use supplied reference data.','toolPermissions':['calculator']})
 request('PUT','/agents/'+agent['id'],200,'Edit agent',json={'temperature':0,'description':'Updated QA description'})
 _,persisted=request('GET','/agents/'+agent['id'],200,'Read persisted agent');record('Zero temperature persists correctly',persisted['temperature']==0)
 request('PUT','/agents/'+agent['id'],400,'Agent identity reassignment rejected',json={'id':'foreign'})
 request('PUT','/agents/'+agent['id'],400,'Invalid agent token limit rejected',json={'maxTokens':-1})
 _,duplicate=request('POST','/agents/'+agent['id']+'/duplicate',201,'Duplicate agent');record('Duplicated agent has distinct identity',duplicate['id']!=agent['id'])
 _,p1=request('POST','/prompts',201,'Create published prompt version',json={'agentId':agent['id'],'title':'QA first','templateText':'Explain {{topic}}','isPublished':True})
 _,p2=request('POST','/prompts',201,'Create second prompt version',json={'agentId':agent['id'],'title':'QA second','templateText':'Summarize {{topic}}','isPublished':False})
 record('Prompt versions increment',p2['versionNumber']==p1['versionNumber']+1)
 request('POST','/prompts/'+p2['id']+'/publish',200,'Publish second prompt')
 _,versions=request('GET','/prompts?agentId='+agent['id']);record('Exactly one active agent prompt',sum(v['isPublished'] for v in versions)==1)
 request('POST','/prompts/'+p1['id']+'/publish',200,'Rollback active prompt version')
 _,standalone=request('POST','/prompts',201,'Create standalone published prompt',json={'title':'QA standalone','templateText':'Standalone QA','isPublished':True})
 _,versions=request('GET','/prompts?agentId='+agent['id']);record('Standalone prompt does not unpublish agent prompt',any(v['isPublished'] for v in versions))
 request('POST','/prompts/test',400,'Missing template variables rejected',json={'templateText':'Summarize {{topic}}','variables':{}})
 docs=[]
 for extension,payload in [('txt',b'QA alpha policy reference ALPHA-'+run.encode()),('md',b'# QA policy\nMarkdown reference BETA-'+run.encode()),('csv',b'policy,amount\nqa,5000')]:
  _,doc=request('POST','/documents/upload',201,'Upload and index '+extension,files={'file':('qa-'+run+'.'+extension,payload,'application/octet-stream')});docs.append(doc)
 from reportlab.pdfgen import canvas
 pdf=io.BytesIO();c=canvas.Canvas(pdf);c.drawString(50,750,'QA PDF reference GAMMA '+run);c.save()
 _,doc=request('POST','/documents/upload',201,'Upload and index PDF',files={'file':('qa-'+run+'.pdf',pdf.getvalue(),'application/pdf')});docs.append(doc)
 docx=io.BytesIO()
 with zipfile.ZipFile(docx,'w') as z:z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>QA DOCX reference DELTA '+run+'</w:t></w:r></w:p></w:body></w:document>')
 _,doc=request('POST','/documents/upload',201,'Upload and index DOCX',files={'file':('qa-'+run+'.docx',docx.getvalue(),'application/octet-stream')});docs.append(doc)
 _,listing=request('GET','/documents',200,'List tenant documents');record('All five document formats indexed',len(listing)==5 and all(d['status']=='INDEXED' for d in listing));record('Encrypted upload source is not exposed',all('sourceBase64' not in d for d in listing))
 request('POST','/documents/upload',400,'Unsupported upload rejected',files={'file':('bad.exe',b'test','application/octet-stream')})
 request('POST','/documents/upload',400,'Empty upload rejected',files={'file':('empty.txt',b'','text/plain')})
 request('POST','/documents/search',400,'Empty knowledge query rejected',json={'query':''})
 _,hits=request('POST','/documents/search',200,'Knowledge search',json={'query':'ALPHA '+run,'top_k':4});record('Retrieved content comes from uploaded source',any('ALPHA-'+run in h['content'] for h in hits))
 request('POST','/documents/'+docs[0]['id']+'/reindex',200,'Re-index original upload')
 gate=workflow('Create approval workflow',[('start','start',{}),('gate','humanApproval',{}),('tool','tool',{'toolName':'calculator','args':{'expression':'6*7'}}),('end','output',{})],[('start','gate',None),('gate','tool',None),('tool','end',None)])
 _,execution=request('POST','/workflows/'+gate['id']+'/run',200,'Queue approval workflow',json={'inputData':{}});paused=wait(execution);record('Worker pauses at human gate',paused['status']=='PAUSED_APPROVAL')
 _,approved=request('POST','/approvals/'+paused['approvalRequestId']+'/approve',200,'Approve queued execution',json={'notes':'QA approval'});done=wait(approved['execution']);record('Approved execution performs downstream tool',done['status']=='COMPLETED' and done.get('output',{}).get('toolResult',{}).get('result')==42)
 request('POST','/approvals/'+paused['approvalRequestId']+'/approve',409,'Duplicate approval rejected',json={})
 _,execution=request('POST','/workflows/'+gate['id']+'/run',json={'inputData':{}});paused=wait(execution)
 _,rejected=request('POST','/approvals/'+paused['approvalRequestId']+'/reject',200,'Reject queued execution',json={'notes':'QA rejection'});record('Rejected execution fails safely',rejected['execution']['status']=='FAILED')
 _,execution=request('POST','/workflows/'+gate['id']+'/run',json={'inputData':{}});paused=wait(execution)
 _,cancelled=request('POST','/executions/'+paused['id']+'/cancel',200,'Cancel paused execution',json={});record('Cancelled state persists',cancelled['status']=='CANCELLED')
 request('POST','/executions/'+done['id']+'/cancel',409,'Completed execution cannot be cancelled',json={})
 failing=workflow('Create failure-path workflow',[('start','start',{}),('tool','tool',{'toolName':'calculator','args':{'expression':'1/0'}}),('end','output',{})],[('start','tool',None),('tool','end',None)])
 _,execution=request('POST','/workflows/'+failing['id']+'/run',json={'inputData':{}});failed=wait(execution);record('Invalid tool fails workflow honestly',failed['status']=='FAILED')
 step=next(s['stepIndex'] for s in failed['stepsTimeline'] if s['status']=='FAILED')
 _,retry=request('POST','/executions/'+failed['id']+'/retry',200,'Retry failed step',json={'stepIndex':step});retried=wait(retry);record('Retry really re-executes instead of fabricating success',retried['id']!=failed['id'] and retried['status']=='FAILED' and retried.get('retryOf')==failed['id'])
 request('GET','/executions/'+done['id'],200,'Read saved execution trace')
 request('GET','/approvals',200,'List approval history')
 request('GET','/billing/usage',200,'Read usage counters')
 request('POST','/billing/plan',400,'Invalid billing plan rejected',json={'plan':'invalid'})
 request('POST','/billing/plan',200,'Switch simulated plan',json={'plan':'pro'})
 _,invoices=request('GET','/billing/invoices',200,'Read simulated invoices');record('Simulated plan produces invoice',len(invoices)==1 and invoices[0]['plan']=='pro')
 r,_=request('GET','/billing/export-report',200,'Download usage CSV');record('CSV is a real attachment','attachment' in r.headers.get('Content-Disposition','') and 'Execution ID' in r.text)
 request('GET','/admin/stats',200,'Read tenant dashboard statistics');request('GET','/admin/audit-logs',200,'Read audit history');request('GET','/admin/provider-health',200,'Read provider health')
 _,key=request('POST','/access/keys',201,'Create scoped API key',json={'name':'QA reader','scopes':['read:agents']});kh={'Authorization':'Bearer '+key['token']}
 request('GET','/agents',200,'Scoped API key can read allowed resource',headers=kh)
 request('POST','/agents',403,'Scoped API key cannot write',headers=kh,json={'name':'Denied','systemPrompt':'Denied'})
 request('DELETE','/access/keys/'+key['id'],200,'Revoke API key')
 request('GET','/agents',401,'Revoked key is rejected',headers=kh)
 for role in ['AI_BUILDER','AUDITOR']:
  email='qa-'+role.lower()+'-'+run+'@example.test'
  request('POST','/organizations/members',201,'Create '+role+' member',json={'name':'QA '+role,'email':email,'password':password,'role':role})
  r= requests.post(BASE+'/auth/login',json={'email':email,'password':password},timeout=40);record(role+' login',r.status_code==200);rh={'Authorization':'Bearer '+r.json()['token']}
  request('GET','/agents',200,role+' reads tenant agents',headers=rh)
  if role=='AUDITOR':request('POST','/agents',403,'Auditor cannot create agents',headers=rh,json={'name':'Denied','systemPrompt':'Denied'})
 request('GET','/organizations/members',200,'List team members')
 for doc in docs:request('DELETE','/documents/'+doc['id'],200,'Delete uploaded '+doc['fileType'])
 request('DELETE','/agents/'+agent['id'],200,'Archive created agent');request('DELETE','/agents/'+duplicate['id'],200,'Archive duplicated agent')
 request('DELETE','/workflows/'+gate['id'],200,'Delete approval workflow');request('DELETE','/workflows/'+failing['id'],200,'Delete failed workflow')
 _,rotated=request('POST','/auth/refresh',200,'Refresh rotates session',json={'refreshToken':signup['refreshToken']})
 request('POST','/auth/refresh',401,'Refresh replay rejected',json={'refreshToken':signup['refreshToken']})
 session.headers['Authorization']='Bearer '+rotated['token']
 request('POST','/auth/password',400,'Incorrect current password rejected',json={'currentPassword':'incorrect','newPassword':'AnotherStrongPassword123!'})
 request('POST','/auth/password',200,'Change synthetic QA account password',json={'currentPassword':password,'newPassword':'AnotherStrongPassword123!'})
 request('GET','/auth/me',401,'Password change revokes old session')
except Exception as error:
 record('Suite completed without unexpected exception',False,type(error).__name__+': '+str(error)[:150])
finally:
 report={'checked_at':datetime.now(timezone.utc).isoformat(),'base_url':BASE,'isolation':'Synthetic QA tenant; demo accounts and existing user records preserved','results':results,'passed':sum(r['passed'] for r in results),'failed':sum(not r['passed'] for r in results),'total':len(results)}
 Path('docs/results/live-function-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({'passed':report['passed'],'failed':report['failed'],'total':report['total']}),flush=True)
