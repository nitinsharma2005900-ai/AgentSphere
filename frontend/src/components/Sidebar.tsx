"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  GitFork,
  FileText,
  Terminal,
  ShieldCheck,
  Activity,
  Wrench,
  CreditCard,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/agents", label: "AI Agent Studio", icon: Bot },
  { href: "/workflows", label: "Workflow Builder", icon: GitFork },
  { href: "/knowledge", label: "Knowledge Hub & RAG", icon: FileText },
  { href: "/prompts", label: "Prompt Studio", icon: Terminal },
  { href: "/approvals", label: "Approval Center", icon: ShieldCheck, badgeKey: "approvals" },
  { href: "/executions", label: "Observatory", icon: Activity },
  { href: "/tools", label: "Tool Marketplace", icon: Wrench },
  { href: "/billing", label: "Usage & Billing", icon: CreditCard },
  { href: "/admin", label: "Security & Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, switchOrganization } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      apiFetch("/organizations/all")
        .then((orgs) => setOrganizations(orgs))
        .catch(() => {});

      apiFetch("/approvals")
        .then((apprs) => {
          const pending = apprs.filter((a: any) => a.status === "PENDING").length;
          setPendingApprovalsCount(pending);
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user && pathname.startsWith("/auth")) return null;

  return (
    <aside className="w-64 flex-shrink-0 min-h-screen bg-obsidian-900 border-r border-white/5 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Animated Sphere Visual */}
            <div className="absolute inset-0 rounded-full bg-violet-600/30 blur-sm animate-pulse-glow" />
            <div className="w-6 h-6 rounded-full border border-violet-400 flex items-center justify-center bg-obsidian-950">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
            </div>
            <div className="absolute inset-0 border border-violet-500/40 rounded-full animate-orbit-slow" />
          </div>
          <div>
            <div className="font-bold text-base tracking-wide bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
              AgentSphere
            </div>
            <div className="text-[10px] text-violet-400 font-mono uppercase tracking-widest">
              AI Core Platform
            </div>
          </div>
        </div>

        {/* Tenant Organization Switcher */}
        <div className="p-3">
          <div className="relative">
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 border border-white/5 text-xs transition"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="font-medium text-gray-200 truncate">
                  {user?.organizationName || "Acme AI Global"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </button>

            {showOrgDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-obsidian-800 border border-white/10 rounded-lg shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Switch Organization
                </div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-violet-600/20 hover:text-white transition ${
                      org.id === user?.organizationId ? "text-violet-400 font-semibold" : "text-gray-300"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                      {org.plan}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-900/20"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-gray-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badgeKey === "approvals" && pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {pendingApprovalsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-white/5">
        <div className="p-2.5 rounded-lg bg-obsidian-850 flex items-center justify-between">
          <div className="truncate mr-2">
            <div className="text-xs font-semibold text-gray-200 truncate">{user?.name || "Elena Rostova"}</div>
            <div className="text-[10px] text-gray-400 truncate">{user?.email || "owner@agentsphere.ai"}</div>
            <div className="mt-1 inline-block text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-500/30">
              {user?.role?.replace(/_/g, " ") || "ORGANIZATION OWNER"}
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
