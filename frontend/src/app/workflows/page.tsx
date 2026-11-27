"use client";

import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitFork,
  Play,
  Save,
  Plus,
  Bot,
  FileText,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

// Custom Flow Nodes
function StartNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-obsidian-900 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 min-w-[160px]">
      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
        <Play className="w-3.5 h-3.5 fill-emerald-400" />
        <span>START TRIGGER</span>
      </div>
      <div className="text-[11px] text-gray-200">{data?.label || "Event Ingestion"}</div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-3 !h-3" />
    </div>
  );
}

function KnowledgeNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-obsidian-900 border-2 border-indigo-500 shadow-lg shadow-indigo-500/10 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
        <FileText className="w-3.5 h-3.5" />
        <span>KNOWLEDGE RAG</span>
      </div>
      <div className="text-[11px] text-gray-200">{data?.label || "Semantic Search"}</div>
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3" />
    </div>
  );
}

function AgentNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-obsidian-900 border-2 border-violet-500 shadow-lg shadow-violet-500/20 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-violet-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 text-violet-400 text-xs font-bold mb-1">
        <Bot className="w-3.5 h-3.5" />
        <span>AI AGENT INFERENCE</span>
      </div>
      <div className="text-[11px] text-gray-200">{data?.label || "Financial Auditor AI"}</div>
      <Handle type="source" position={Position.Right} className="!bg-violet-500 !w-3 !h-3" />
    </div>
  );
}

function ApprovalNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-obsidian-900 border-2 border-amber-500 shadow-lg shadow-amber-500/20 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>HUMAN APPROVAL GATE</span>
      </div>
      <div className="text-[11px] text-gray-200">{data?.label || "Manager Authorization"}</div>
      <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-3 !h-3" />
    </div>
  );
}

function OutputNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-obsidian-900 border-2 border-fuchsia-500 shadow-lg shadow-fuchsia-500/10 min-w-[160px]">
      <Handle type="target" position={Position.Left} className="!bg-fuchsia-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-bold mb-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>OUTPUT DISPATCH</span>
      </div>
      <div className="text-[11px] text-gray-200">{data?.label || "Final Result"}</div>
    </div>
  );
}

export default function WorkflowsPage() {
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => apiFetch("/workflows"),
  });

  const [activeWorkflowId, setActiveWorkflowId] = useState<string>("wf-invoice-1");
  const [activeExecutionResult, setActiveExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initial nodes & edges
  const initialNodes: Node[] = [
    { id: "node-1", type: "start", position: { x: 50, y: 150 }, data: { label: "Invoice Ingest" } },
    { id: "node-2", type: "knowledgeRetrieval", position: { x: 300, y: 150 }, data: { label: "Query Policy RAG" } },
    { id: "node-3", type: "aiAgent", position: { x: 580, y: 150 }, data: { label: "Financial Auditor AI" } },
    { id: "node-4", type: "humanApproval", position: { x: 860, y: 150 }, data: { label: "Manager Approval Gate" } },
    { id: "node-5", type: "output", position: { x: 1140, y: 150 }, data: { label: "Ledger Update" } },
  ];

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "node-1", target: "node-2", animated: true },
    { id: "e2-3", source: "node-2", target: "node-3", animated: true },
    { id: "e3-4", source: "node-3", target: "node-4", animated: true },
    { id: "e4-5", source: "node-4", target: "node-5", animated: true },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      knowledgeRetrieval: KnowledgeNode,
      aiAgent: AgentNode,
      humanApproval: ApprovalNode,
      output: OutputNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // Add new node dynamically
  const addNode = (type: string, label: string) => {
    const id = `node-${Date.now().toString().slice(-4)}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 400 + Math.random() * 80, y: 220 + Math.random() * 80 },
      data: { label },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Run Workflow Mutation
  const runWorkflow = async () => {
    setIsExecuting(true);
    setActiveExecutionResult(null);

    try {
      const exec = await apiFetch(`/workflows/${activeWorkflowId}/run`, {
        method: "POST",
        body: JSON.stringify({
          inputData: {
            invoiceId: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            amount: 6850.0,
            currency: "USD",
          },
        }),
      });

      setActiveExecutionResult(exec);
      queryClient.invalidateQueries({ queryKey: ["recentExecutions"] });
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    } catch (err: any) {
      alert(`Workflow Run Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Save Canvas Mutation
  const saveWorkflow = async () => {
    try {
      await apiFetch(`/workflows/${activeWorkflowId}`, {
        method: "PUT",
        body: JSON.stringify({ nodes, edges }),
      });
      alert("Workflow canvas saved successfully to PostgreSQL database.");
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl glass-panel">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Visual Workflow Automation Builder</h1>
            <p className="text-[11px] text-gray-400">React Flow Canvas • Bounded Orchestration Engine</p>
          </div>
        </div>

        {/* Node Addition Palette */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addNode("knowledgeRetrieval", "RAG Document Step")}
            className="px-2.5 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-[11px] text-indigo-300 border border-indigo-500/30 font-medium transition"
          >
            + Knowledge
          </button>
          <button
            onClick={() => addNode("aiAgent", "Autonomous Agent Step")}
            className="px-2.5 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-[11px] text-violet-300 border border-violet-500/30 font-medium transition"
          >
            + AI Agent
          </button>
          <button
            onClick={() => addNode("humanApproval", "Approval Gate")}
            className="px-2.5 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-[11px] text-amber-300 border border-amber-500/30 font-medium transition"
          >
            + Approval Gate
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={saveWorkflow}
            className="px-3 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5 text-gray-400" />
            <span>Save</span>
          </button>

          <button
            onClick={runWorkflow}
            disabled={isExecuting}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold glow-btn text-white flex items-center gap-2 disabled:opacity-50 transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isExecuting ? "Executing..." : "Execute Workflow"}</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas & Live Trace Inspector */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 rounded-2xl overflow-hidden glass-panel border border-white/10 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#1C1E29" gap={20} size={1} />
            <Controls className="!bg-obsidian-900 !border-white/10 !fill-gray-300" />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === "start") return "#10B981";
                if (n.type === "knowledgeRetrieval") return "#6366F1";
                if (n.type === "aiAgent") return "#8B5CF6";
                if (n.type === "humanApproval") return "#F59E0B";
                return "#EC4899";
              }}
              className="!bg-obsidian-900 !border-white/10"
            />
          </ReactFlow>
        </div>

        {/* Live Execution Inspector Drawer */}
        <div className="w-96 rounded-2xl glass-panel p-4 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span>Execution Trace Inspector</span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Live Session</span>
            </div>

            {activeExecutionResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-obsidian-850 border border-white/5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white">{activeExecutionResult.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        activeExecutionResult.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : activeExecutionResult.status === "PAUSED_APPROVAL"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {activeExecutionResult.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    ID: {activeExecutionResult.id} • Tokens: {activeExecutionResult.totalTokens}
                  </div>
                </div>

                <div className="space-y-2">
                  {activeExecutionResult.stepsTimeline?.map((step: any) => (
                    <div
                      key={step.stepIndex}
                      className="p-2.5 rounded-lg bg-obsidian-850 border border-white/5 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-200">
                          {step.stepIndex}. {step.name}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">
                          {step.durationMs}ms
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        Output: {JSON.stringify(step.outputData)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-500 text-xs">
                <Play className="w-6 h-6 text-violet-400 mb-2 opacity-50" />
                <span>Click "Execute Workflow" above to run this pipeline and observe step telemetry.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] text-gray-500">
            Status: React Flow canvas wired directly to Node.js / FastAPI backend engine.
          </div>
        </div>
      </div>
    </div>
  );
}
