"use client";
import React,{useState} from 'react';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {Search,Bell,Menu} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {apiFetch} from '../lib/api';
export function Navbar({onOpenCommandPalette,onToggleNavigation}:{onOpenCommandPalette:()=>void;onToggleNavigation:()=>void}){
 const {user}=useAuth();const [showNotifications,setShowNotifications]=useState(false);
 const {data:health}=useQuery({queryKey:['providerHealth'],queryFn:()=>apiFetch('/admin/provider-health'),enabled:!!user,refetchInterval:30000});
 const {data:approvals}=useQuery({queryKey:['approvals'],queryFn:()=>apiFetch('/approvals'),enabled:!!user,refetchInterval:10000});
 const active=health?.aiGateway?.active_provider||'checking',configured=health?.aiGateway?.providers?.gemini?.configured;
 const pending=approvals?.filter((a:any)=>a.status==='PENDING').length||0;
 return <header className="h-16 border-b border-white/5 bg-obsidian-900/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between gap-3 sticky top-0 z-40">
  <div className="flex items-center gap-2 min-w-0"><button aria-label="Open navigation" onClick={onToggleNavigation} className="md:hidden p-2 text-violet-300"><Menu size={20}/></button>
   <button onClick={onOpenCommandPalette} aria-label="Search commands" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-obsidian-850 border border-white/5 text-xs text-gray-300 w-36 sm:w-64"><Search size={14} className="text-violet-400"/><span className="truncate">Search commands…</span><kbd className="ml-auto hidden sm:block text-[10px]">Ctrl+K</kbd></button>
  </div>
  <div className="flex items-center gap-3"><div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-obsidian-850 border border-white/5 text-xs" role="status"><span className={`w-2 h-2 rounded-full animate-pulse ${configured?'bg-emerald-400':'bg-amber-400'}`}/><span className="hidden sm:block">{active==='gemini'?'Gemini configured':active==='mock'?'Development mock':active==='checking'?'Checking provider':'AI unavailable'}</span></div>
   <div className="relative"><button onClick={()=>setShowNotifications(v=>!v)} aria-label="Notifications" aria-expanded={showNotifications} className="relative p-2 rounded-lg border border-white/5 bg-obsidian-850"><Bell size={16}/>{pending>0&&<span className="absolute -top-1 -right-1 rounded-full bg-violet-600 text-[10px] px-1">{pending}</span>}</button>
    {showNotifications&&<div className="absolute right-0 mt-2 w-64 sm:w-80 bg-obsidian-850 border border-white/10 rounded-xl shadow-2xl p-4 z-50 text-xs"><h2 className="font-semibold mb-3">Workspace notifications</h2><p className="text-gray-400 mb-3">{user?.organizationName}</p><Link href="/approvals" onClick={()=>setShowNotifications(false)} className="text-violet-300">{pending?`${pending} approval request${pending===1?'':'s'} awaiting review`:'No approvals awaiting review'}</Link></div>}
   </div>
  </div>
 </header>;
}
