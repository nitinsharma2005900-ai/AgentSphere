"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Zap,
  Filter,
  Search,
  AlertTriangle,
} from "lucide-react";
import { notify, apiFetch } from "../../lib/api";

export default function ExecutionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  useEffect(()=>{setExpandedTraceId(new URLSearchParams(window.location.search).get("id"));},[]);
  // Queries
  const { data: executions, isLoading } = useQuery({
    queryKey: ["allExecutions"],
    queryFn: () => apiFetch("/executions"),
    refetchInterval:3000,
  });

  // Cancel execution mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/executions/${id}/cancel`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allExecutions"] }),
  });

  // Retry failed step mutation
  const retryMutation = useMutation({
    mutationFn: ({ id, stepIndex }: { id: string; stepIndex: number }) =>
      apiFetch(`/executions/${id}/retry`, {
        method: "POST",
        body: JSON.stringify({ stepIndex }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allExecutions"] });
      notify("Step retry initiated successfully.");
    },
  });

  const filtered = executions?.filter((e: any) => {
    const matchesSearch =
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-fuchsia-400" />
          <span>Execution Observatory & Step Telemetry</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Deep observability trace: inspection of node transitions, tool invocations, tokens, dollar costs, and failure diagnostics.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl glass-panel text-xs">
        <div className="flex items-center gap-2.5 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by execution ID or title..."
            className="w-full bg-obsidian-900 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none" aria-label="Filter by execution ID or title..."
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-400">Status:</span>
          {["ALL", "COMPLETED", "PAUSED_APPROVAL", "RUNNING", "FAILED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                statusFilter === st
                  ? "bg-violet-600 text-white"
                  : "bg-obsidian-850 hover:bg-obsidian-800 text-gray-300 border border-white/5"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Execution Items List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-gray-400">Loading execution records...</div>
        ) : filtered?.length === 0 ? (
          <div className="glass-panel p-12 text-center text-xs text-gray-400">
            No execution traces match your search.
          </div>
        ) : (
          filtered?.map((exec: any) => {
            const isExpanded = expandedTraceId === exec.id;
            return (
              <div
                key={exec.id}
                className="glass-panel rounded-2xl overflow-hidden border border-white/5 transition"
              >
                {/* Main Card Summary */}
                <div
                  onClick={() => setExpandedTraceId(isExpanded ? null : exec.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{exec.title}</span>
                        <span className="font-mono text-[10px] text-gray-400">({exec.id})</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-3">
                        <span>Started: {new Date(exec.startTime).toLocaleTimeString()}</span>
                        <span>â€¢</span>
                        <span>Provider: <strong className="text-gray-300 capitalize">{exec.provider}</strong></span>
                        <span>â€¢</span>
                        <span>Steps: <strong className="text-gray-300">{exec.stepsTimeline?.length || 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-violet-300">
                        {exec.totalTokens} tokens
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        ${(exec.estimatedCostUsd || 0).toFixed(5)}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        exec.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : exec.status === "PAUSED_APPROVAL"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : exec.status === "FAILED"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      }`}
                    >
                      {exec.status}
                    </span>

                    {exec.status === "RUNNING" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelMutation.mutate(exec.id);
                        }}
                        className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Step-by-Step Timeline */}
                {isExpanded && (
                  <div className="p-5 border-t border-white/5 bg-obsidian-900/60 space-y-3 animate-in fade-in">
                    <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                      Granular Step Transitions & Tool Events
                    </div>

                    <div className="space-y-2">
                      {exec.stepsTimeline?.map((step: any) => (
                        <div
                          key={step.stepIndex}
                          className="p-3 rounded-xl bg-obsidian-850 border border-white/5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                Step #{step.stepIndex}
                              </span>
                              <span className="font-semibold text-white">{step.name}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  step.status === "SUCCESS"
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : step.status === "FAILED"
                                    ? "text-red-400 bg-red-500/10"
                                    : "text-amber-400 bg-amber-500/10"
                                }`}
                              >
                                {step.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400">
                              <span>Duration: {step.durationMs}ms</span>
                              <span>Tokens: {step.tokensUsed || 0}</span>
                              {step.status === "FAILED" && (
                                <button
                                  onClick={() =>
                                    retryMutation.mutate({ id: exec.id, stepIndex: step.stepIndex })
                                  }
                                  className="px-2 py-0.5 rounded bg-violet-600/30 hover:bg-violet-600 text-violet-200 text-[10px] flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry Step</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Safe Observable Inputs and Outputs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                            <div className="p-2 rounded-lg bg-obsidian-950 border border-white/5 overflow-x-auto">
                              <span className="text-gray-500 block text-[9px] uppercase">Input Data:</span>
                              <pre className="text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(step.inputData, null, 2)}
                              </pre>
                            </div>
                            <div className="p-2 rounded-lg bg-obsidian-950 border border-white/5 overflow-x-auto">
                              <span className="text-gray-500 block text-[9px] uppercase">Output Telemetry:</span>
                              <pre className="text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(step.outputData, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
