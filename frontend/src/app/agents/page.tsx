"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Plus,
  Play,
  Copy,
  Trash2,
  Edit,
  Sliders,
  Send,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AgentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);

  // Playground test state
  const [testPrompt, setTestPrompt] = useState("");
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Agent Form State
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formTemp, setFormTemp] = useState(0.7);
  const [formMaxTokens, setFormMaxTokens] = useState(2048);
  const [formApproval, setFormApproval] = useState(false);
  const [formTools, setFormTools] = useState<string[]>(["knowledge_search"]);

  // Queries
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch("/agents"),
  });

  const { data: availableTools } = useQuery({
    queryKey: ["tools"],
    queryFn: () => apiFetch("/tools"),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newAgent: any) =>
      apiFetch("/agents", { method: "POST", body: JSON.stringify(newAgent) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setIsEditing(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/agents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      if (selectedAgent) setSelectedAgent(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/agents/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormPrompt("");
    setFormTemp(0.7);
    setFormMaxTokens(2048);
    setFormApproval(false);
    setFormTools(["knowledge_search"]);
  };

  const handleOpenEdit = (agent: any) => {
    setSelectedAgent(agent);
    setFormName(agent.name);
    setFormDesc(agent.description);
    setFormPrompt(agent.systemPrompt);
    setFormTemp(agent.temperature);
    setFormMaxTokens(agent.maxTokens);
    setFormApproval(agent.humanApprovalRequired);
    setFormTools(agent.toolPermissions || []);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      description: formDesc,
      systemPrompt: formPrompt,
      temperature: Number(formTemp),
      maxTokens: Number(formMaxTokens),
      humanApprovalRequired: formApproval,
      toolPermissions: formTools,
      modelProvider: "gemini",
      modelName: "gemini-2.5-flash",
    };

    if (selectedAgent && isEditing) {
      updateMutation.mutate({ id: selectedAgent.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleRunPlayground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim() || !selectedAgent) return;

    const userMsg = { role: "user", text: testPrompt };
    setTestHistory((prev) => [...prev, userMsg]);
    setTestPrompt("");
    setIsRunningTest(true);

    try {
      const exec = await apiFetch(`/agents/${selectedAgent.id}/run`, {
        method: "POST",
        body: JSON.stringify({ prompt: userMsg.text }),
      });

      const lastStep = exec.stepsTimeline?.[exec.stepsTimeline.length - 1];
      const botResponse =
        lastStep?.outputData?.text ||
        lastStep?.outputData?.response ||
        "Execution completed successfully.";

      setTestHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: botResponse,
          tokens: exec.totalTokens,
          cost: exec.estimatedCostUsd,
          tools: exec.stepsTimeline?.filter((s: any) => s.name?.startsWith("Tool Call")),
        },
      ]);
    } catch (err: any) {
      setTestHistory((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${err.message}`, isError: true },
      ]);
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-violet-400" />
            <span>AI Agent Studio</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Build, configure instructions, permission tools, and test autonomous agents.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedAgent(null);
            resetForm();
            setIsEditing(true);
          }}
          className="px-4 py-2 rounded-lg text-xs font-semibold glow-btn text-white flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Agent</span>
        </button>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-xs text-gray-400">Loading agents...</div>
        ) : (
          agents?.map((agent: any) => (
            <div
              key={agent.id}
              className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-violet-500/40 transition group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
                      style={{
                        backgroundColor: `${agent.color || "#8B5CF6"}20`,
                        borderColor: `${agent.color || "#8B5CF6"}60`,
                        color: agent.color || "#8B5CF6",
                      }}
                    >
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition">
                        {agent.name}
                      </h3>
                      <span className="text-[10px] font-mono text-gray-400">
                        {agent.modelName}
                      </span>
                    </div>
                  </div>
                  {agent.humanApprovalRequired && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Approval Gate
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                  {agent.description}
                </p>

                {/* Configuration Specs */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-obsidian-850 border border-white/5 mb-4">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Temperature</span>
                    <span className="text-gray-200 font-mono">{agent.temperature}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Max Tokens</span>
                    <span className="text-gray-200 font-mono">{agent.maxTokens}</span>
                  </div>
                </div>

                {/* Tool Permissions */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {agent.toolPermissions?.map((tool: string) => (
                    <span
                      key={tool}
                      className="px-2 py-0.5 rounded text-[10px] bg-violet-950/60 text-violet-300 border border-violet-500/30 font-mono"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedAgent(agent);
                    setTestHistory([]);
                    setShowPlayground(true);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Test Run</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(agent)}
                  title="Edit Agent"
                  className="p-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-gray-400 hover:text-white border border-white/5 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => duplicateMutation.mutate(agent.id)}
                  title="Duplicate Agent"
                  className="p-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-gray-400 hover:text-white border border-white/5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(agent.id)}
                  title="Delete Agent"
                  className="p-1.5 rounded-lg bg-obsidian-850 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl glass-panel-elevated p-6 rounded-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <h3 className="text-base font-bold text-white">
                {selectedAgent ? "Edit Agent Settings" : "Create New Autonomous Agent"}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Autonomous Customer Concierge"
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Purpose & Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Summarize the core role and domain responsibility"
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">System Instructions & Behavior Prompt</label>
                <textarea
                  required
                  rows={4}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="You are an enterprise AI agent. Analyze queries, verify policy guidelines, and cite references..."
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-gray-300 font-medium">Temperature</label>
                    <span className="font-mono text-violet-400">{formTemp}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formTemp}
                    onChange={(e) => setFormTemp(parseFloat(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Max Output Tokens</label>
                  <input
                    type="number"
                    value={formMaxTokens}
                    onChange={(e) => setFormMaxTokens(parseInt(e.target.value))}
                    className="w-full bg-obsidian-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Tool Permissions */}
              <div>
                <label className="block text-gray-300 font-medium mb-1.5">Approved Tool Allowlist</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTools?.map((tool: any) => {
                    const isChecked = formTools.includes(tool.name);
                    return (
                      <label
                        key={tool.id}
                        className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 cursor-pointer transition ${
                          isChecked
                            ? "bg-violet-950/40 border-violet-500/50 text-white"
                            : "bg-obsidian-900 border-white/5 text-gray-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setFormTools([...formTools, tool.name]);
                            else setFormTools(formTools.filter((t) => t !== tool.name));
                          }}
                          className="accent-violet-500"
                        />
                        <span className="font-mono font-semibold">{tool.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Human Approval Required Toggle */}
              <div className="p-3 rounded-lg bg-obsidian-900 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-200">Require Human Approval</div>
                  <div className="text-[10px] text-gray-400">Pause executions before completing high-value decisions</div>
                </div>
                <input
                  type="checkbox"
                  checked={formApproval}
                  onChange={(e) => setFormApproval(e.target.checked)}
                  className="w-4 h-4 accent-violet-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-white/5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg glow-btn font-semibold text-white"
                >
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Testing Playground Drawer */}
      {showPlayground && selectedAgent && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-obsidian-900 border-l border-white/10 shadow-2xl z-50 flex flex-col glass-panel-elevated animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">{selectedAgent.name}</h3>
                <span className="text-[10px] text-gray-400 font-mono">Interactive Test Playground</span>
              </div>
            </div>
            <button
              onClick={() => setShowPlayground(false)}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat History Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {testHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <Sparkles className="w-8 h-8 text-violet-400 mb-2 animate-pulse" />
                <p className="text-xs font-medium text-gray-300">Ready to test agent execution</p>
                <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                  Send a prompt below. Tool permissions, system rules, and token tracking will execute live.
                </p>
              </div>
            ) : (
              testHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col text-xs ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-br-none"
                        : msg.isError
                        ? "bg-red-500/20 text-red-300 border border-red-500/30 rounded-bl-none"
                        : "bg-obsidian-850 border border-white/5 text-gray-200 rounded-bl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                    {/* Tool Calls Summary if invoked */}
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-[10px] space-y-1">
                        {msg.tools.map((tc: any, tIdx: number) => (
                          <div key={tIdx} className="text-violet-300 font-mono flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>{tc.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.tokens && (
                    <div className="mt-1 text-[9px] font-mono text-gray-500 flex items-center gap-2">
                      <span>{msg.tokens} tokens</span>
                      <span>${(msg.cost || 0).toFixed(6)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {isRunningTest && (
              <div className="flex items-center gap-2 text-xs text-violet-400">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span>AI Agent thinking & evaluating tools...</span>
              </div>
            )}
          </div>

          {/* Prompt Input Form */}
          <form onSubmit={handleRunPlayground} className="p-3 border-t border-white/5 bg-obsidian-950 flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ask agent, e.g. 'calculate 500 * 12' or 'check policy'..."
              className="flex-1 bg-obsidian-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={isRunningTest || !testPrompt.trim()}
              className="px-3.5 py-2 rounded-lg glow-btn text-white disabled:opacity-40 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
