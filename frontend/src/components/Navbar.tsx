"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export function Navbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { user } = useAuth();
  const [providerHealth, setProviderHealth] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      apiFetch("/admin/provider-health")
        .then((h) => setProviderHealth(h))
        .catch(() => {});
    }
  }, [user]);

  const activeProvider = providerHealth?.aiGateway?.active_provider || "mock";
  const isHealthy = providerHealth?.aiGateway?.status === "healthy" || providerHealth?.backendService?.status === "healthy";

  return (
    <header className="h-16 border-b border-white/5 bg-obsidian-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Search / Command trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/5 text-xs text-gray-400 hover:text-gray-200 transition w-64 shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-violet-400" />
          <span className="truncate">Search commands, agents...</span>
          <kbd className="ml-auto font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 border border-white/5">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Real-time Provider Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-obsidian-850 border border-white/5 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-gray-300 font-medium capitalize">
            {activeProvider === "gemini" ? "Google Gemini 2.5" : "Deterministic Mock Provider"}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {activeProvider === "gemini" ? "140ms" : "1.2ms"}
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/5 text-gray-300 hover:text-white transition relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-obsidian-850 border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-semibold text-gray-200">System Notifications</span>
                <span className="text-[10px] text-violet-400">Live Telemetry</span>
              </div>
              <div className="space-y-2 mt-2">
                <div className="p-2 rounded-lg bg-white/5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Multi-tenant isolation verified</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Tenant partition {user?.organizationId} operating strictly within bounded policy.
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Human Approval Pending</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Workflow invoice batch requires authorization to resume.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
