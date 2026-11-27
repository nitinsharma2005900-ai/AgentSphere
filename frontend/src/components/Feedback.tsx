"use client";
import React,{useEffect,useRef,useState} from 'react';
export function Feedback(){
 const [message,setMessage]=useState('');
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const handler=(event:Event)=>{setMessage((event as CustomEvent).detail);clearTimeout(timer);timer=setTimeout(()=>setMessage(''),9000);};window.addEventListener('agentsphere:notice',handler);return()=>{clearTimeout(timer);window.removeEventListener('agentsphere:notice',handler);};},[]);
 return message?<div role="status" className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-[420px] z-[100] rounded-xl border border-violet-400/40 bg-obsidian-900 p-4 text-sm text-violet-100 shadow-2xl flex gap-4"><span className="flex-1">{message}</span><button aria-label="Dismiss notification" onClick={()=>setMessage('')} className="text-violet-300">×</button></div>:null;
}
export function Dialog({children,onClose,label,className}:{children:React.ReactNode;onClose:()=>void;label:string;className?:string}){
 const root=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const prior=document.activeElement as HTMLElement;const node=root.current;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const controls=()=>Array.from(node?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')||[]).filter(e=>e.offsetParent!==null);
  (controls()[0]||node)?.focus();
  const handler=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}if(event.key==='Tab'){const list=controls(),first=list[0],last=list[list.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);document.body.style.overflow=previousOverflow;prior?.focus();};
 },[]);
 return <div ref={root} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={className} onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>{children}</div>;
}
