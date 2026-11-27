"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bot,
  GitFork,
  FileText,
  Terminal,
  ShieldCheck,
  Activity,
  CreditCard,
  Settings,
  Plus,
  Play,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
  category: string;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    {
      id: "nav-agents",
      title: "AI Agent Studio",
      subtitle: "Configure autonomous agents, prompts, and tool permissions",
      icon: Bot,
      category: "Navigation",
      action: () => { router.push("/agents"); onClose(); },
    },
    {
      id: "nav-workflows",
      title: "Visual Workflow Builder",
      subtitle: "Drag-and-drop React Flow multi-step orchestrator",
      icon: GitFork,
      category: "Navigation",
      action: () => { router.push("/workflows"); onClose(); },
    },
    {
      id: "nav-knowledge",
      title: "Knowledge Hub & RAG",
      subtitle: "Upload documents, manage vector chunks and search embeddings",
      icon: FileText,
      category: "Navigation",
      action: () => { router.push("/knowledge"); onClose(); },
    },
    {
      id: "nav-prompts",
      title: "Prompt Studio",
      subtitle: "Manage versions, compare diffs and run evaluations",
      icon: Terminal,
      category: "Navigation",
      action: () => { router.push("/prompts"); onClose(); },
    },
    {
      id: "nav-approvals",
      title: "Human Approval Center",
      subtitle: "Review paused execution checkpoints and authorize actions",
      icon: ShieldCheck,
      category: "Navigation",
      action: () => { router.push("/approvals"); onClose(); },
    },
    {
      id: "nav-executions",
      title: "Execution Observatory",
      subtitle: "Inspect real-time execution steps, latency, tokens and costs",
      icon: Activity,
      category: "Navigation",
      action: () => { router.push("/executions"); onClose(); },
    },
    {
      id: "nav-billing",
      title: "Usage & Quota Management",
      subtitle: "Simulated subscriptions, tier upgrades and CSV reports",
      icon: CreditCard,
      category: "Navigation",
      action: () => { router.push("/billing"); onClose(); },
    },
    {
      id: "nav-admin",
      title: "Security & Administration",
      subtitle: "Multi-tenant partition audit logs and provider telemetry",
      icon: Settings,
      category: "Navigation",
      action: () => { router.push("/admin"); onClose(); },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-obsidian-850 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden glass-panel-elevated">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/5 gap-3">
          <Search className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or jump to section..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No matching commands found.</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-violet-600/20 hover:border-violet-500/40 border border-transparent transition text-left group"
                >
                  <div className="p-2 rounded-lg bg-obsidian-800 text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-200 group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-400 group-hover:text-violet-200">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-obsidian-900 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
          <span>Navigate with mouse or keyboard</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
