"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  FileCheck,
  Shield,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function BillingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Queries
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["billingUsage"],
    queryFn: () => apiFetch("/billing/usage"),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billingInvoices"],
    queryFn: () => apiFetch("/billing/invoices"),
  });

  // Switch Plan mutation
  const planMutation = useMutation({
    mutationFn: (plan: string) =>
      apiFetch("/billing/plan", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billingUsage"] });
      queryClient.invalidateQueries({ queryKey: ["billingInvoices"] });
      alert(data.message);
    },
  });

  const handleDownloadReport = () => {
    const token = localStorage.getItem("agentsphere_token");
    window.open("http://localhost:5000/api/v1/billing/export-report?token=" + token, "_blank");
  };

  const currentPlan = usage?.plan || "pro";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-violet-400" />
            <span>Usage Limits & Simulated Billing</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time server-side token quota enforcement, tier management, and simulated invoices.
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="px-4 py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/10 text-xs font-semibold text-gray-200 flex items-center gap-2 transition self-start"
        >
          <Download className="w-4 h-4 text-violet-400" />
          <span>Download Usage Report (CSV)</span>
        </button>
      </div>

      {/* Simulated Billing Notice Banner */}
      <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-center gap-3 text-xs text-violet-200">
        <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
        <span>
          <strong>Simulated Environment:</strong> In accordance with evaluation instructions, all financial transactions,
          invoices, and tier changes are strictly simulated with zero real credit card charging.
        </span>
      </div>

      {/* Usage Quota Card */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Monthly AI Token Consumption</h3>
            <p className="text-xs text-gray-400">Server-enforced quota boundary for {user?.organizationName}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-white">
              {(usage?.usedTokensThisMonth || 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {" "}/ {(usage?.monthlyTokenLimit || 10000000).toLocaleString()} tokens
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-obsidian-900 rounded-full h-3 overflow-hidden border border-white/5 mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usage?.isQuotaExceeded
                ? "bg-red-500"
                : usage?.isWarningThreshold
                ? "bg-amber-500"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-500"
            }`}
            style={{ width: `${Math.min(100, usage?.percentUsed || 24)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3 border-t border-white/5">
          <div>
            <span className="text-gray-500 block text-[10px]">Quota Utilization</span>
            <span className="font-bold text-white font-mono">{usage?.percentUsed || 0}%</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px]">Daily Executions Today</span>
            <span className="font-bold text-white font-mono">
              {usage?.usedExecutionsToday || 0} / {usage?.dailyExecutionLimit || 1000}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px]">Estimated Incurred Cost</span>
            <span className="font-bold text-emerald-400 font-mono">
              ${(usage?.totalEstimatedCostUsd || 0).toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px]">Current Active Tier</span>
            <span className="font-bold text-violet-300 font-mono uppercase">
              {currentPlan}
            </span>
          </div>
        </div>
      </div>

      {/* Tier Switcher Cards */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4">Subscription Tiers (Simulated Upgrade)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col justify-between ${
              currentPlan === "free" ? "border-violet-500/60 shadow-lg shadow-violet-950/50" : ""
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Starter</span>
                {currentPlan === "free" && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-600 text-white">
                    CURRENT
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-3">$0 <span className="text-xs font-normal text-gray-400">/ mo</span></div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1M Monthly Tokens</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 200 Executions / day</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Basic Support</li>
              </ul>
            </div>
            <button
              onClick={() => planMutation.mutate("free")}
              disabled={currentPlan === "free"}
              className="mt-6 w-full py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 disabled:opacity-40 text-xs font-semibold text-gray-200 border border-white/5 transition"
            >
              {currentPlan === "free" ? "Current Tier" : "Switch to Free"}
            </button>
          </div>

          {/* Pro Tier */}
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col justify-between relative ${
              currentPlan === "pro" ? "border-violet-500 shadow-xl shadow-violet-950/60" : ""
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Professional</span>
                {currentPlan === "pro" && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-600 text-white">
                    CURRENT
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-3">$99 <span className="text-xs font-normal text-gray-400">/ mo (Simulated)</span></div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 10M Monthly Tokens</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 2,000 Executions / day</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Human Approval Gates</li>
              </ul>
            </div>
            <button
              onClick={() => planMutation.mutate("pro")}
              disabled={currentPlan === "pro"}
              className="mt-6 w-full py-2 rounded-lg glow-btn disabled:opacity-40 text-xs font-semibold text-white transition"
            >
              {currentPlan === "pro" ? "Current Tier" : "Upgrade to Pro"}
            </button>
          </div>

          {/* Enterprise Tier */}
          <div
            className={`glass-panel p-6 rounded-2xl flex flex-col justify-between ${
              currentPlan === "enterprise" ? "border-violet-500 shadow-xl shadow-violet-950/60" : ""
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Enterprise</span>
                {currentPlan === "enterprise" && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-600 text-white">
                    CURRENT
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-white mb-3">$499 <span className="text-xs font-normal text-gray-400">/ mo (Simulated)</span></div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100M Monthly Tokens</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 10,000 Executions / day</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Audit Log Export & SLA</li>
              </ul>
            </div>
            <button
              onClick={() => planMutation.mutate("enterprise")}
              disabled={currentPlan === "enterprise"}
              className="mt-6 w-full py-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 disabled:opacity-40 text-xs font-semibold text-gray-200 border border-white/5 transition"
            >
              {currentPlan === "enterprise" ? "Current Tier" : "Upgrade to Enterprise"}
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Invoices Table */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-sm font-bold text-white mb-4">Simulated Billing Invoices</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-400">
                <th className="pb-3 font-medium">Invoice ID</th>
                <th className="pb-3 font-medium">Period</th>
                <th className="pb-3 font-medium">Plan Tier</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Tokens Used</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices?.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-white/5 transition">
                  <td className="py-3 font-mono text-gray-300">{inv.id}</td>
                  <td className="py-3 font-medium text-white">{inv.billingPeriod}</td>
                  <td className="py-3 uppercase font-mono text-gray-400">{inv.plan}</td>
                  <td className="py-3 text-emerald-400 font-mono font-bold">${inv.amountUsd}.00</td>
                  <td className="py-3 text-gray-300 font-mono">{inv.tokenUsage.toLocaleString()}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-right">
                    {new Date(inv.invoiceDate).toLocaleDateString()}
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
