export const API_BASE_URL=process.env.NEXT_PUBLIC_API_URL||'/api/backend';
let refreshInFlight:Promise<boolean>|null=null;
function saveSession(data:any){if(data.token)localStorage.setItem('agentsphere_token',data.token);if(data.refreshToken)sessionStorage.setItem('agentsphere_refresh_token',data.refreshToken);}
async function refresh(){
 if(!refreshInFlight)refreshInFlight=(async()=>{
  const refreshToken=sessionStorage.getItem('agentsphere_refresh_token');if(!refreshToken)return false;
  try{const response=await fetch(`${API_BASE_URL}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken}),credentials:'same-origin'});if(!response.ok)return false;saveSession(await response.json());return true;}catch{return false;}
 })().finally(()=>{refreshInFlight=null;});
 return refreshInFlight;
}
export async function apiRequest(endpoint:string,options:RequestInit={},retried=false):Promise<Response>{
 const headers=new Headers(options.headers),token=typeof window!=='undefined'?localStorage.getItem('agentsphere_token'):null;
 if(!(options.body instanceof FormData)&&options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 if(token)headers.set('Authorization',`Bearer ${token}`);
 const response=await fetch(`${API_BASE_URL}${endpoint.startsWith('/')?endpoint:'/'+endpoint}`,{...options,headers,credentials:'same-origin',signal:options.signal||AbortSignal.timeout(90000)});
 if(response.status===401&&typeof window!=='undefined'&&!endpoint.startsWith('/auth/')){
  if(!retried&&await refresh())return apiRequest(endpoint,options,true);
  localStorage.removeItem('agentsphere_token');localStorage.removeItem('agentsphere_user');sessionStorage.removeItem('agentsphere_refresh_token');
  window.dispatchEvent(new CustomEvent('agentsphere:session-expired'));
 }
 if(!response.ok){const text=await response.text();let detail;try{const data=JSON.parse(text);detail=data.message||data.error;}catch{}throw new Error(detail||`Request failed (HTTP ${response.status})`);}
 return response;
}
export async function apiFetch<T=any>(endpoint:string,options:RequestInit={}):Promise<T>{return (await apiRequest(endpoint,options)).json();}
export async function waitExecution(execution:any){
 const started=Date.now();
 while(['PENDING','RUNNING'].includes(execution.status)&&Date.now()-started<150000){await new Promise(resolve=>setTimeout(resolve,1000));execution=await apiFetch(`/executions/${execution.id}`);}
 return execution;
}
export function notify(message:string){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('agentsphere:notice',{detail:message}));}
export {saveSession};
