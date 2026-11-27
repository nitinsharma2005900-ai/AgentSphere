"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  Sliders,
  Sparkles,
  ExternalLink,
  Code,
  ShieldAlert,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function ToolsPage() {
  const queryClient = useQueryClient();

  const [testingTool, setTestingTool] = useState<any>(null);
  const [testArgsJson, setTestArgsJson] = useState('{"expression": "4500 * 1.18"}');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Queries
  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => apiFetch("/tools"),
  });

  // Toggle tool mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/tools/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tools"] }),
  });

  // Run Test Tool
  const handleTestTool = async () => {
    if (!testingTool) return;
    setIsTesting(true);
    setTestResult(null);

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(testArgsJson);
    } catch {
      alert("Invalid JSON format for arguments.");
      setIsTesting(false);
      return;
    }

    try {
      const res = await apiFetch(`/tools/${testingTool.id}/test`, {
        method: "POST",
        body: JSON.stringify({ args: parsedArgs }),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: "FAILED", error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const openTestDialog = (tool: any) => {
    setTestingTool(tool);
    setTestResult(null);
    if (tool.name === "calculator") setTestArgsJson('{"expression": "7500 * 1.15"}');
    else if (tool.name === "date_time") setTestArgsJson('{"format": "iso"}');
    else if (tool.name === "knowledge_search") setTestArgsJson('{"query": "quarterly policy travel caps", "top_k": 2}');
    else if (tool.name === "json_transform") setTestArgsJson('{"inputJson": {"id": 1, "secret": "abc", "amount": 500}, "targetKeys": ["id", "amount"]}');
    else setTestArgsJson('{}');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Wrench className="w-6 h-6 text-emerald-400" />
          <span>External Tool Marketplace & Sandboxed Integrations</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Registered deterministic utilities and safe read-only external APIs with strict SSRF defense.
        </p>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-xs text-gray-400">Loading tools...</div>
        ) : (
          tools?.map((tool: any) => (
            <div
              key={tool.id}
              className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
                        Category: {tool.category}
                      </span>
                    </div>
                  </div>

                  {/* Enable / Disable Toggle Switch */}
                  <button
                    onClick={() => toggleMutation.mutate(tool.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                      tool.isEnabled
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"
                    }`}
                  >
                    {tool.isEnabled ? "ACTIVE" : "DISABLED"}
                  </button>
                </div>

                <p className="text-xs text-gray-400 mb-4 leading-relaxed line-clamp-3">
                  {tool.description}
                </p>

                {tool.endpointUrl && (
                  <div className="p-2 rounded bg-obsidian-850 border border-white/5 text-[10px] font-mono text-gray-400 truncate mb-4">
                    Endpoint: {tool.endpointUrl}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-mono">Timeout: {tool.timeoutMs}ms</span>
                <button
                  onClick={() => openTestDialog(tool)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Test Tool</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interactive Tool Test Modal */}
      {testingTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel-elevated p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Test Tool: {testingTool.name}</span>
              </h3>
              <button
                onClick={() => setTestingTool(null)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                JSON Arguments Payload
              </label>
              <textarea
                rows={4}
                value={testArgsJson}
                onChange={(e) => setTestArgsJson(e.target.value)}
                className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleTestTool}
              disabled={isTesting}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isTesting ? "Executing Sandbox..." : "Run Test Execution"}</span>
            </button>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Execution Result</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      testResult.status === "SUCCESS"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {testResult.status} ({testResult.durationMs || 0}ms)
                  </span>
                </div>
                <pre className="p-2 rounded bg-obsidian-950 text-gray-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(testResult.result || testResult.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
