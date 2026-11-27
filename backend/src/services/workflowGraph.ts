import { Workflow } from '../types';
import { AppError } from './errors';
export function validateGraph(wf:Pick<Workflow,'nodes'|'edges'>) {
 const {nodes,edges}=wf,ids=new Set(nodes.map(n=>n.id));
 if(ids.size!==nodes.length||nodes.length<2||nodes.length>30)throw new AppError(400,'Workflow requires 2–30 uniquely identified nodes');
 const starts=nodes.filter(n=>n.type==='start');
 if(starts.length!==1)throw new AppError(400,'Workflow requires exactly one start node');
 if(edges.some(e=>!ids.has(e.source)||!ids.has(e.target)))throw new AppError(400,'Workflow edge references an unknown node');
 const visited=new Set<string>(),stack=new Set<string>();
 const walk=(id:string)=>{if(stack.has(id))throw new AppError(400,'Workflow cycles are prohibited');if(visited.has(id))return;stack.add(id);
  const node=nodes.find(n=>n.id===id)!,out=edges.filter(e=>e.source===id);
  if(node.type==='output'&&out.length)throw new AppError(400,'Output nodes must be terminal');
  if(node.type!=='output'&&(out.length!==1&&!(node.type==='condition'&&out.length===2)))throw new AppError(400,'Connect each non-output node to its next step; conditions require two branches');
  if(node.type==='condition'&&(out.length!==2||!out.some(e=>e.label==='true')||!out.some(e=>e.label==='false')))throw new AppError(400,'Condition branches must be labelled true and false');
  for(const edge of out)walk(edge.target);stack.delete(id);visited.add(id);
 };walk(starts[0].id);
 if(visited.size!==nodes.length)throw new AppError(400,'All workflow nodes must be reachable from start');
 return starts[0].id;
}
