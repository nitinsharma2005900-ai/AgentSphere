"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import { CommandPalette } from "../components/CommandPalette";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>AgentSphere â€“ Advanced Multi-Tenant AI Agent & Workflow Platform</title>
        <meta
          name="description"
          content="Next-generation enterprise AI SaaS platform for autonomous agents, knowledge RAG, and visual workflow automation."
        />
      </head>
      <body className="bg-obsidian-950 text-gray-100 antialiased min-h-screen flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {user,isLoading}=useAuth();const router=useRouter();
  const [mobileNav,setMobileNav]=useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isPublicPage = pathname === "/" || pathname.startsWith("/auth");

  useEffect(()=>{if(!isPublicPage&&!isLoading&&!user)router.replace("/auth/login");},[isPublicPage,isLoading,user,router]);
  useEffect(()=>setMobileNav(false),[pathname]);
  if(!isPublicPage&&(isLoading||!user))return <main className="p-10 text-violet-300" role="status">Loading your workspace?</main>;
  if (isPublicPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      {mobileNav&&<button aria-label="Close navigation" className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={()=>setMobileNav(false)} />}
      <div className={`${mobileNav?"fixed inset-y-0 left-0 z-50":"hidden"} md:block`}><Sidebar /></div>
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleNavigation={()=>setMobileNav(v=>!v)} onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
