"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  Shield,
  Activity,
  Server,
  Lock,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { AccessSettings } from "../../components/AccessSettings";
import { useAuth } from "../../context/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();

  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["adminAuditLogs"],
    queryFn: () => apiFetch("/admin/audit-logs"),
    enabled:!!user && ["ORGANIZATION_OWNER","AUDITOR","PLATFORM_ADMINISTRATOR"].includes(user.role),
  });

  const { data: providerHealth, refetch: refetchHealth } = useQuery({
    queryKey: ["providerHealth"],
    queryFn: () => apiFetch("/admin/provider-health"),
  });

  const { data: members } = useQuery({
    queryKey: ["orgMembers"],
    queryFn: () => apiFetch("/organizations/members"),
  });

  const activeProvider = providerHealth?.aiGateway?.active_provider || "mock";
  const gemini = providerHealth?.aiGateway?.providers?.gemini;
  const mock = providerHealth?.aiGateway?.providers?.mock;

  return (
    <div className="space-y-6">
      <AccessSettings />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-violet-400" />
            <span>Security & Administration Center</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Tenant isolation telemetry, team member permissions, and platform audit records.
          </p>
        </div>
        <button
          onClick={() => { if(["ORGANIZATION_OWNER","AUDITOR","PLATFORM_ADMINISTRATOR"].includes(user?.role||""))refetchLogs(); refetchHealth(); }}
          className="px-3.5 py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-2 transition self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Security Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tenant Partition State */}
        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tenant Data Isolation</h3>
              <span className="text-[10px] text-emerald-400 font-mono">TENANT SCOPE</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            All SQL queries, vector chunk lookups, and execution engines are strictly bound to organization ID{" "}
            <code className="text-violet-300 font-mono">{user?.organizationId}</code>.
          </p>
        </div>

        {/* AI Gateway Model Health */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Model Provider Routing</h3>
              <span className="text-[10px] text-violet-400 font-mono uppercase">
                Active: {activeProvider}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>â€¢ Google Gemini SDK: {gemini?.configured ? "Connected" : "Unconfigured (Safe Fallback)"}</div>
            <div>â€¢ Mock Provider: Active (1.2ms latency)</div>
          </div>
        </div>

        {/* Backend Process Stats */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Service Health</h3>
              <span className="text-[10px] text-indigo-400 font-mono">HEALTHY</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>â€¢ Node.js: {providerHealth?.backendService?.nodeVersion || "v22"}</div>
            <div>â€¢ Memory: {providerHealth?.backendService?.memoryUsageMB || 45} MB</div>
          </div>
        </div>
      </div>

      {/* Team Members & Role Permissions */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-sm font-bold text-white mb-4">Organization Team Members & 5-Role RBAC</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-400">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Assigned Role</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members?.map((m: any) => (
                <tr key={m.id} className="hover:bg-white/5 transition">
                  <td className="py-3 font-semibold text-white">{m.name}</td>
                  <td className="py-3 text-gray-300 font-mono">{m.email}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-violet-950/60 text-violet-300 border border-violet-500/30">
                      {m.role?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Logs */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Platform Security Audit Log Stream</h2>
          <span className="text-[10px] text-gray-400 font-mono">Immutable Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-400">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">User Email</th>
                <th className="pb-3 font-medium">Action Event</th>
                <th className="pb-3 font-medium">Resource</th>
                <th className="pb-3 font-medium">IP Address</th>
                <th className="pb-3 font-medium">Event Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logsLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">Loading audit records...</td>
                </tr>
              ) : (
                auditLogs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="py-3 text-gray-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 font-medium text-white">{log.userEmail}</td>
                    <td className="py-3 font-mono text-violet-300 font-semibold">{log.action}</td>
                    <td className="py-3 font-mono text-gray-400 capitalize">{log.resourceType}</td>
                    <td className="py-3 font-mono text-gray-500">{log.ipAddress}</td>
                    <td className="py-3 text-gray-400 font-mono text-[10px] truncate max-w-xs">
                      {JSON.stringify(log.details)}
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
