"use client";

import React, { useState } from "react";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Sidebar } from "../components/Sidebar";
import { Navbar } from "../components/Navbar";
import { CommandPalette } from "../components/CommandPalette";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>AgentSphere – Advanced Multi-Tenant AI Agent & Workflow Platform</title>
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isPublicPage = pathname === "/" || pathname.startsWith("/auth");

  if (isPublicPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
