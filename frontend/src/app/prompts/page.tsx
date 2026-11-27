"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Terminal,
  Plus,
  Play,
  History,
  CheckCircle2,
  Sparkles,
  GitCommit,
  RotateCcw,
  Sliders,
  Send,
} from "lucide-react";
import { notify, apiFetch } from "../../lib/api";
import { Dialog } from "../../components/Feedback";

export default function PromptsPage() {
  const queryClient = useQueryClient();

  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({
    transactions: '[{"id": 101, "amount": 6250.0}]',
    threshold: "10",
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // New version form state
  const [agentId,setAgentId]=useState("");
  const {data:agents}=useQuery({queryKey:["agents"],queryFn:()=>apiFetch("/agents")});
  const [newTitle, setNewTitle] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  // Queries
  const { data: versions, isLoading } = useQuery({
    queryKey: ["promptVersions"],
    queryFn: () => apiFetch("/prompts"),
  });

  // Publish / Rollback mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/prompts/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promptVersions"] });
      notify("Prompt version set as active published release.");
    },
  });

  // Create version mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/prompts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promptVersions"] });
      setShowNewModal(false);
      setNewTitle("");
      setNewTemplate("");
      setNewSummary("");
    },
  });

  // Run Prompt Test
  const handleRunTest = async () => {
    const selected=activeVersion || versions?.[0];
    if (!selected) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await apiFetch("/prompts/test", {
        method: "POST",
        body: JSON.stringify({
          templateText: selected.templateText,
          variables: testVariables,
          provider: "gemini",
        }),
      });
      setTestResult(res);
    } catch (err: any) {
      notify(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const currentSelection = versions?.find((v:any)=>v.id===activeVersion?.id) || versions?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-violet-400" />
            <span>Prompt Studio & Version Governance</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Prompt templates, dynamic variables, regression comparisons, rollbacks, and evaluations.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 rounded-lg text-xs font-semibold glow-btn text-white flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Prompt Version</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Version History Sidebar List */}
        <div className="glass-panel p-5 rounded-2xl">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-violet-400" />
            <span>Version History Releases</span>
          </h2>

          <div className="space-y-2.5">
            {isLoading ? (
              <div className="text-xs text-gray-400 text-center py-6">Loading versions...</div>
            ) : (
              versions?.map((v: any) => {
                const isSelected = currentSelection?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setActiveVersion(v)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? "bg-violet-950/40 border-violet-500/50 shadow-md shadow-violet-950/40"
                        : "bg-obsidian-850 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5 text-violet-400" />
                        <span>v{v.versionNumber} â€“ {v.title}</span>
                      </span>
                      {v.isPublished && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-1">{v.changeSummary}</p>
                    <span className="text-[10px] text-gray-500 mt-1 block font-mono">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Version Detail & Live Evaluation Playground */}
        <div className="lg:col-span-2 space-y-5">
          {currentSelection ? (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      v{currentSelection.versionNumber}: {currentSelection.title}
                    </h3>
                    {currentSelection.isPublished ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Active In Production
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400">
                        Draft / Historical
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{currentSelection.changeSummary}</p>
                </div>

                {!currentSelection.isPublished && (
                  <button
                    onClick={() => publishMutation.mutate(currentSelection.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback / Publish</span>
                  </button>
                )}
              </div>

              {/* Template Editor / Viewer */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Prompt Template</label>
                <div className="p-3 rounded-xl bg-obsidian-900 border border-white/10 font-mono text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {currentSelection.templateText}
                </div>
              </div>

              {/* Dynamic Variables Input Form */}
              <div className="p-4 rounded-xl bg-obsidian-850 border border-white/5 space-y-3">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-violet-400" />
                  <span>Evaluation Playground Variable Bindings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-400 font-mono text-[11px] mb-1">
                      {"{{transactions}}"}
                    </label>
                    <input
                      type="text"
                      value={testVariables.transactions || ""}
                      onChange={(e) =>
                        setTestVariables({ ...testVariables, transactions: e.target.value })
                      }
                      className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2 text-white font-mono text-[11px] focus:outline-none" aria-label="Prompt Template"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-mono text-[11px] mb-1">
                      {"{{threshold}}"}
                    </label>
                    <input
                      type="text"
                      value={testVariables.threshold || ""}
                      onChange={(e) =>
                        setTestVariables({ ...testVariables, threshold: e.target.value })
                      }
                      className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2 text-white font-mono text-[11px] focus:outline-none" aria-label="Field"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="w-full py-2 rounded-lg glow-btn text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isTesting ? "Evaluating..." : "Run Playground Evaluation"}</span>
                </button>
              </div>

              {/* Test Result Output */}
              {testResult && (
                <div className="p-4 rounded-xl bg-obsidian-850 border border-violet-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-violet-300">Execution Output</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      Tokens: {testResult.usage?.total_tokens} â€¢ Est: ${testResult.usage?.estimated_cost_usd}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-obsidian-900 font-mono text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {testResult.response}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-gray-400 text-xs">
              Select a prompt version to inspect or evaluate.
            </div>
          )}
        </div>
      </div>

      {/* New Version Modal */}
      {showNewModal && (
        <Dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClose={()=>setShowNewModal(false)} label="New prompt release">
          <div className="w-full max-w-lg glass-panel-elevated p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create New Prompt Release</h3>
            <div className="space-y-3 text-xs">
              <label className="block">Associated agent<select aria-label="Prompt agent" value={agentId} onChange={e=>setAgentId(e.target.value)} className="block w-full p-2 mt-1 bg-obsidian-900 rounded border border-white/10"><option value="">Standalone prompt</option>{agents?.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <div>
                <label className="block text-gray-300 mb-1">Version Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Optimized Financial Auditor Prompt"
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2 text-white" aria-label="Version Title"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Prompt Template Text</label>
                <textarea
                  rows={4}
                  required
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="Include dynamic variables like {{data}} or {{threshold}}..."
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2 text-white font-mono text-[11px]" aria-label="Prompt Template Text"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Change Summary / Governance Notes</label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Describe regression changes or security additions"
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2 text-white" aria-label="Change Summary / Governance Notes"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-2 rounded-lg bg-obsidian-850 text-gray-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createMutation.mutate({
                    agentId:agentId||undefined,
                    title: newTitle,
                    templateText: newTemplate,
                    changeSummary: newSummary,
                    isPublished: false,
                  })
                }
                className="flex-1 py-2 rounded-lg glow-btn text-white text-xs font-semibold"
              >
                Save Version
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
