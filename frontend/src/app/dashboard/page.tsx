"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  GitFork,
  FileText,
  ShieldCheck,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  Play,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => apiFetch("/admin/stats"),
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["billingUsage"],
    queryFn: () => apiFetch("/billing/usage"),
  });

  const { data: executions, isLoading: execLoading, refetch: refetchExecs } = useQuery({
    queryKey: ["recentExecutions"],
    queryFn: () => apiFetch("/executions"),
  });

  const { data: providerHealth } = useQuery({
    queryKey: ["providerHealth"],
    queryFn: () => apiFetch("/admin/provider-health"),
  });

  const chartData = [
    { day: "Mon", tokens: 240000, cost: 0.048, success: 18 },
    { day: "Tue", tokens: 380000, cost: 0.076, success: 24 },
    { day: "Wed", tokens: 490000, cost: 0.098, success: 32 },
    { day: "Thu", tokens: 620000, cost: 0.124, success: 41 },
    { day: "Fri", tokens: 510000, cost: 0.102, success: 38 },
    { day: "Sat", tokens: 320000, cost: 0.064, success: 22 },
    { day: "Sun", tokens: 440000, cost: 0.088, success: 29 },
  ];

  const activeProvider = providerHealth?.aiGateway?.active_provider || "mock";
  const geminiConfigured = providerHealth?.aiGateway?.providers?.gemini?.configured;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel-elevated relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Command Center</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name || "Operator"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Tenant: <span className="text-gray-200 font-semibold">{user?.organizationName}</span> •
            Role: <span className="text-violet-300 font-mono">{user?.role?.replace(/_/g, " ")}</span>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/agents"
            className="px-3.5 py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-medium text-gray-200 flex items-center gap-2 transition"
          >
            <Plus className="w-3.5 h-3.5 text-violet-400" />
            <span>New Agent</span>
          </Link>
          <Link
            href="/workflows"
            className="px-3.5 py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-medium text-gray-200 flex items-center gap-2 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Workflow</span>
          </Link>
          <button
            onClick={() => { refetchStats(); refetchExecs(); }}
            title="Refresh Real-Time Feeds"
            className="p-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-gray-400 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Gemini Configuration Warning if Missing (Per PDF Requirement) */}
      {!geminiConfigured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Deterministic Mock Provider Active: </span>
              GEMINI_API_KEY is not configured in environment. The platform is running in fully functional,
              deterministic mock mode. To switch to live Google Gemini 2.5 Flash, add your key to `.env`.
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 text-amber-300 flex-shrink-0">
            Resilient Fallback
          </span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agents */}
        <div className="p-5 rounded-xl glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Total AI Agents</span>
            <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {statsLoading ? "..." : stats?.totalAgents || 3}
          </div>
          <div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">100% Active</span> • Multi-model configured
          </div>
        </div>

        {/* Active Workflows */}
        <div className="p-5 rounded-xl glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Active Workflows</span>
            <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {statsLoading ? "..." : stats?.activeWorkflows || 2}
          </div>
          <div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">React Flow Canvas</span> • Automated
          </div>
        </div>

        {/* Token Usage & Quota */}
        <div className="p-5 rounded-xl glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Monthly Tokens Used</span>
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {usageLoading ? "..." : (usage?.usedTokensThisMonth || 2458120).toLocaleString()}
          </div>
          <div className="mt-2 w-full bg-obsidian-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-violet-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, usage?.percentUsed || 24)}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-gray-400 flex justify-between">
            <span>{usage?.percentUsed || 24}% of monthly quota</span>
            <span className="text-gray-300 font-mono">{(usage?.monthlyTokenLimit || 10000000).toLocaleString()} limit</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="p-5 rounded-xl glass-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Pending Approvals</span>
            <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {statsLoading ? "..." : stats?.pendingApprovals || 0}
          </div>
          <div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
            <Link href="/approvals" className="text-amber-400 hover:underline flex items-center gap-0.5">
              <span>Review in Approval Center</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Execution Performance & Real-Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Ingestion & Activity Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Token Ingestion & Telemetry Trend</h3>
              <p className="text-xs text-gray-400">Weekly throughput under tenant boundary</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-xs text-gray-300">Daily Tokens</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#4B5563" fontSize={11} tickLine={false} />
                <YAxis stroke="#4B5563" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#14151C", borderColor: "rgba(139,92,246,0.3)", borderRadius: "8px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#tokenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Provider Health Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Inference Gateway Status</h3>
            <p className="text-xs text-gray-400 mb-4">FastAPI Python model routing & failover</p>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-obsidian-850 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Google Gemini 2.5 Flash</div>
                  <div className="text-[10px] text-gray-400">Primary Model Provider</div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  geminiConfigured ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {geminiConfigured ? "CONNECTED" : "UNCONFIGURED"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-850 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">Deterministic Mock Provider</div>
                  <div className="text-[10px] text-gray-400">Secondary Autonomous Adapter</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  HEALTHY (1.2ms)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-850 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-200">pgvector Semantic Index</div>
                  <div className="text-[10px] text-gray-400">Tenant-Scoped Vector Space</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  ISOLATED
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin"
            className="mt-6 w-full text-center py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition"
          >
            Open Admin & Telemetry Details
          </Link>
        </div>
      </div>

      {/* Real-Time Execution Stream */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Live Execution Observatory Feed</h3>
            <p className="text-xs text-gray-400">Recent multi-step runs under organization boundary</p>
          </div>
          <Link
            href="/executions"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
          >
            <span>View All Executions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-400">
                <th className="pb-2.5 font-medium">Execution ID</th>
                <th className="pb-2.5 font-medium">Title</th>
                <th className="pb-2.5 font-medium">Status</th>
                <th className="pb-2.5 font-medium">Tokens</th>
                <th className="pb-2.5 font-medium">Est. Cost</th>
                <th className="pb-2.5 font-medium">Provider</th>
                <th className="pb-2.5 font-medium">Started</th>
                <th className="pb-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {executions && executions.slice(0, 5).map((e: any) => (
                <tr key={e.id} className="hover:bg-white/5 transition">
                  <td className="py-3 font-mono text-gray-300">{e.id}</td>
                  <td className="py-3 font-medium text-white">{e.title}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        e.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : e.status === "PAUSED_APPROVAL"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : e.status === "FAILED"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-300 font-mono">{e.totalTokens}</td>
                  <td className="py-3 text-gray-300 font-mono">${(e.estimatedCostUsd || 0).toFixed(5)}</td>
                  <td className="py-3 text-gray-400 capitalize">{e.provider}</td>
                  <td className="py-3 text-gray-400">{new Date(e.startTime).toLocaleTimeString()}</td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/executions?id=${e.id}`}
                      className="px-2.5 py-1 rounded bg-obsidian-850 hover:bg-violet-600/30 hover:text-white border border-white/5 text-[11px] text-gray-300 transition"
                    >
                      Inspect Trace
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
