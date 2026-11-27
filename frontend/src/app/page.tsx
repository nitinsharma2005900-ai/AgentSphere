"use client";

import React from "react";
import Link from "next/link";
import {
  Bot,
  GitFork,
  FileText,
  ShieldCheck,
  Activity,
  Sparkles,
  ArrowRight,
  Cpu,
  Layers,
  Lock,
  Zap,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-gray-100 flex flex-col selection:bg-violet-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-20 border-b border-white/5 backdrop-blur-xl bg-obsidian-950/70 fixed top-0 left-0 right-0 z-50 px-6 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-violet-600/40 blur-md animate-pulse-glow" />
            <div className="w-7 h-7 rounded-full border border-violet-400 bg-obsidian-900 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            </div>
            <div className="absolute inset-0 border border-violet-500/50 rounded-full animate-orbit-slow" />
          </div>
          <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
            AgentSphere
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#architecture" className="hover:text-white transition">Architecture</a>
          <a href="#workflows" className="hover:text-white transition">Workflow Canvas</a>
          <a href="#pricing" className="hover:text-white transition">Pricing (Simulated)</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-xs font-medium text-gray-300 hover:text-white transition px-3 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-xs font-semibold glow-btn text-white flex items-center gap-2"
          >
            <span>Explore Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-20 px-6 lg:px-16 max-w-7xl mx-auto flex flex-col items-center text-center relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          <span>Next-Generation Multi-Tenant AI Agent & Workflow Engine</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl text-balance">
          Orchestrate Autonomous AI Agents with{" "}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
            Mathematical Precision
          </span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-gray-400 max-w-2xl text-balance">
          Enterprise multi-tenant platform for visual workflow automation, pgvector RAG knowledge retrieval,
          Google Gemini SDK intelligence, and human approval checkpoints.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl font-semibold text-sm glow-btn text-white flex items-center gap-2 shadow-lg shadow-violet-900/40"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 rounded-xl font-semibold text-sm bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-gray-200 transition"
          >
            Quick 1-Click Role Logins
          </Link>
        </div>

        {/* Animated Orbital Sphere Visualization */}
        <div className="mt-16 relative w-full max-w-4xl h-80 lg:h-96 flex items-center justify-center">
          {/* Outer ring */}
          <div className="absolute w-72 h-72 md:w-80 md:h-80 rounded-full border border-violet-500/20 animate-orbit-slow" />
          {/* Inner ring */}
          <div className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full border border-violet-400/30 animate-orbit-reverse border-dashed" />
          {/* Center Sphere */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-tr from-violet-900 via-violet-700 to-indigo-500 flex items-center justify-center shadow-[0_0_80px_rgba(139,92,246,0.6)]">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-obsidian-950 flex flex-col items-center justify-center border border-violet-400/50">
              <Bot className="w-8 h-8 text-violet-300 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-violet-200 mt-1">
                AGENTSPHERE
              </span>
            </div>
          </div>
          {/* Satellite nodes */}
          <div className="absolute top-8 left-1/4 p-2.5 rounded-xl bg-obsidian-900/90 border border-violet-500/40 flex items-center gap-2 shadow-xl animate-float">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-medium">pgvector RAG</span>
          </div>
          <div className="absolute bottom-8 right-1/4 p-2.5 rounded-xl bg-obsidian-900/90 border border-violet-500/40 flex items-center gap-2 shadow-xl animate-float">
            <GitFork className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-mono font-medium">React Flow Engine</span>
          </div>
          <div className="absolute top-12 right-1/5 p-2.5 rounded-xl bg-obsidian-900/90 border border-amber-500/40 flex items-center gap-2 shadow-xl animate-float">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-medium">Human Gate</span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="py-20 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Built for Mission-Critical Enterprise Autonomy</h2>
          <p className="mt-3 text-sm text-gray-400">Strict tenant isolation, zero data cross-leakage, and verifiable governance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl hover:border-violet-500/40 transition">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Visual AI Agent Studio</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Create, customize, test, and version autonomous agents. Configure temperature, token limits, system instructions, and tool permissions.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-violet-500/40 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <GitFork className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Visual Workflow Editor</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Drag-and-drop React Flow canvas connecting Start, Knowledge Retrieval, AI Agents, Conditions, Tools, and Human Approval gates.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-violet-500/40 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Knowledge Hub & pgvector</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Ingest PDF, TXT, DOCX, CSV, and Markdown. Automatic chunking, vector indexing, and isolated semantic cosine retrieval.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-violet-500/40 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Human Approval Center</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Pause executions automatically when high-risk actions or budget thresholds are triggered. Operators review and resume in 1 click.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-violet-500/40 transition">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Execution Observatory</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Granular node traces, real-time token tracking, dollar cost computation, safe retries, and comprehensive audit logging.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl hover:border-violet-500/40 transition">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">5-Role RBAC & Multi-Tenancy</h3>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              Organization Owner, AI Builder, Workflow Operator, Auditor, and Platform Administrator. Proven cross-tenant isolation.
            </p>
          </div>
        </div>
      </section>

      <section id="architecture" className="py-16 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5"><h2 className="text-2xl font-bold text-white mb-6">Built around your organization</h2><div className="grid md:grid-cols-3 gap-5"><div className="glass-panel p-6 rounded-2xl"><h3 className="text-violet-300 font-semibold">Isolated workspaces</h3><p className="text-sm text-gray-400 mt-3">Scoped sessions and roles protect agents, tools, documents, and execution history.</p></div><div className="glass-panel p-6 rounded-2xl"><h3 className="text-violet-300 font-semibold">Connected knowledge</h3><p className="text-sm text-gray-400 mt-3">Upload documents, retrieve source passages, and attach them to agents for grounded answers.</p></div><div className="glass-panel p-6 rounded-2xl"><h3 className="text-violet-300 font-semibold">Durable execution</h3><p className="text-sm text-gray-400 mt-3">Saved checkpoints and token budgets keep automation reviewable and bounded.</p></div></div></section>
      <section id="workflows" className="py-16 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5"><h2 className="text-2xl font-bold text-white mb-6">From a request to a reviewed result</h2><div className="glass-panel p-6 rounded-2xl flex flex-wrap gap-4 items-center text-sm text-violet-200"><span>Input</span><span aria-hidden="true">?</span><span>Knowledge retrieval</span><span aria-hidden="true">?</span><span>AI agent & tools</span><span aria-hidden="true">?</span><span>Human approval</span><span aria-hidden="true">?</span><span>Saved output</span></div><Link href="/workflows" className="inline-block mt-5 text-violet-300 hover:underline">Open Workflow Builder ?</Link></section>
      {/* Simulated Pricing Section */}
      <section id="pricing" className="py-20 px-6 lg:px-16 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-widest text-amber-400 font-mono font-semibold mb-2">
            Simulated Billing Plans
          </div>
          <h2 className="text-3xl font-bold">Predictable, Transparent SaaS Tiers</h2>
          <p className="mt-3 text-sm text-gray-400">All pricing and subscriptions in this demonstration environment are fully simulated.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Starter</div>
              <div className="mt-3 text-3xl font-extrabold text-white">$0 <span className="text-xs font-normal text-gray-400">/ mo</span></div>
              <p className="mt-2 text-xs text-gray-400">For prototyping and small experiments.</p>
              <div className="mt-6 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1M Monthly Tokens</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3 AI Agents</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 2 Active Workflows</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 200 Executions / day</div>
              </div>
            </div>
            <Link
              href="/billing"
              className="mt-8 block text-center py-2.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-gray-200 transition"
            >
              Select Free Tier
            </Link>
          </div>

          {/* Pro */}
          <div className="glass-panel-elevated p-6 rounded-2xl flex flex-col justify-between relative border-violet-500/50">
            <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-400">Professional</div>
              <div className="mt-3 text-3xl font-extrabold text-white">$99 <span className="text-xs font-normal text-gray-400">/ mo (Simulated)</span></div>
              <p className="mt-2 text-xs text-gray-400">For scaling AI teams and automations.</p>
              <div className="mt-6 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 10M Monthly Tokens</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 20 AI Agents</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited Workflows</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Human Approval Gates</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 2,000 Executions / day</div>
              </div>
            </div>
            <Link
              href="/billing"
              className="mt-8 block text-center py-2.5 rounded-lg glow-btn text-xs font-semibold text-white"
            >
              Upgrade to Pro
            </Link>
          </div>

          {/* Enterprise */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Enterprise</div>
              <div className="mt-3 text-3xl font-extrabold text-white">$499 <span className="text-xs font-normal text-gray-400">/ mo (Simulated)</span></div>
              <p className="mt-2 text-xs text-gray-400">For high-throughput multi-org clusters.</p>
              <div className="mt-6 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100M Monthly Tokens</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Unlimited Agents & Workflows</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dedicated pgvector partition</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 10,000 Executions / day</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Full Audit Log Export</div>
              </div>
            </div>
            <Link
              href="/billing"
              className="mt-8 block text-center py-2.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-gray-200 transition"
            >
              Enterprise Deployment
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 px-6 lg:px-16 border-t border-white/5 bg-obsidian-900 text-xs text-gray-400 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-white">AgentSphere</span> – Multi-Tenant AI Agent, Knowledge & Workflow Automation Platform
        </div>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="hover:text-white transition">Sign In</Link>
          <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
          <Link href="/billing" className="hover:text-white transition">Billing</Link>
        </div>
      </footer>
    </div>
  );
}
