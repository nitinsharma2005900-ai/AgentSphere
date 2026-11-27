"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  Send,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState<Record<string, string>>({});

  // Queries
  const { data: approvals, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => apiFetch("/approvals"),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, approvalNotes }: { id: string; approvalNotes: string }) =>
      apiFetch(`/approvals/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ notes: approvalNotes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["recentExecutions"] });
      alert("Execution request authorized. The workflow engine has resumed.");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, rejectionNotes }: { id: string; rejectionNotes: string }) =>
      apiFetch(`/approvals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ notes: rejectionNotes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["recentExecutions"] });
      alert("Execution request rejected. The workflow has safely terminated.");
    },
  });

  const pendingApprovals = approvals?.filter((a: any) => a.status === "PENDING") || [];
  const historyApprovals = approvals?.filter((a: any) => a.status !== "PENDING") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <span>Human-in-the-Loop Approval Center</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Review, approve, or reject paused execution checkpoints under organization policy.
        </p>
      </div>

      {/* Pending Queue Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Pending Authorization Requests
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {pendingApprovals.length} PENDING
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center text-xs text-gray-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <span>All execution requests are up to date. No pending human checkpoints.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((req: any) => (
              <div
                key={req.id}
                className="glass-panel-elevated p-6 rounded-2xl border-amber-500/30 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Execution Checkpoint: {req.id}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Execution: {req.executionId} • Step: {req.stepId}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Requested {new Date(req.requestedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-xs text-gray-200 bg-obsidian-900 p-3.5 rounded-xl border border-white/5 font-medium leading-relaxed">
                  {req.prompt}
                </div>

                {/* Context Payload */}
                {req.context && (
                  <div className="p-3 rounded-xl bg-obsidian-850 border border-white/5 text-[11px] font-mono text-gray-300">
                    <div className="text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Trigger Context Data:
                    </div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(req.context, null, 2)}</pre>
                  </div>
                )}

                {/* Operator Decision Action Area */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Optional authorization notes (e.g. Approved per quarterly budget exception)..."
                    value={notes[req.id] || ""}
                    onChange={(e) => setNotes({ ...notes, [req.id]: e.target.value })}
                    className="flex-1 w-full bg-obsidian-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() =>
                        rejectMutation.mutate({ id: req.id, rejectionNotes: notes[req.id] || "" })
                      }
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject & Halt</span>
                    </button>
                    <button
                      onClick={() =>
                        approveMutation.mutate({ id: req.id, approvalNotes: notes[req.id] || "" })
                      }
                      className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Authorize & Resume</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Audit History */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-sm font-bold text-white mb-4">Historical Approvals & Audit Trail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-400">
                <th className="pb-3 font-medium">Request ID</th>
                <th className="pb-3 font-medium">Execution ID</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Decided By</th>
                <th className="pb-3 font-medium">Notes</th>
                <th className="pb-3 font-medium">Decided At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historyApprovals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">No historical decisions recorded.</td>
                </tr>
              ) : (
                historyApprovals.map((req: any) => (
                  <tr key={req.id} className="hover:bg-white/5 transition">
                    <td className="py-3 font-mono text-gray-300">{req.id}</td>
                    <td className="py-3 font-mono text-gray-300">{req.executionId}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{req.approverEmail || "Operator"}</td>
                    <td className="py-3 text-gray-400 italic">{req.approvalNotes || "None"}</td>
                    <td className="py-3 text-gray-400">
                      {req.decidedAt ? new Date(req.decidedAt).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
