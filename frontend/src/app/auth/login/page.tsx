"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Bot, ArrowRight, Lock, Mail, Sparkles, Shield, UserCheck, AlertCircle } from "lucide-react";
import { Dialog } from "../../../components/Feedback";

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleQuickLogin = async (role: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await quickLogin(role);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Quick login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try { await apiFetch("/auth/forgot-password",{method:"POST",body:JSON.stringify({email:forgotEmail})}); } catch(error) {setError(error instanceof Error?error.message:"Recovery unavailable");}
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Icon */}
      <Link href="/" className="mb-6 flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-obsidian-900 border border-violet-500/40 flex items-center justify-center group-hover:scale-105 transition">
          <Bot className="w-5 h-5 text-violet-400" />
        </div>
        <span className="text-xl font-bold tracking-wider text-white">AgentSphere</span>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">Sign In to AgentSphere</h1>
          <p className="text-xs text-gray-400 mt-1">Multi-tenant autonomous AI agent & workflow center</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-obsidian-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500" aria-label="Work Email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-300">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] text-violet-400 hover:text-violet-300 transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-obsidian-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500" aria-label="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg font-semibold text-xs glow-btn text-white transition disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In to Workspace"}
          </button>
        </form>

        {/* Quick Role Logins Section */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>1-Click Test Role Logins</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleRoleQuickLogin("owner")}
              className="p-2 rounded-lg bg-obsidian-900 hover:bg-violet-950/50 border border-white/5 hover:border-violet-500/40 text-left transition flex flex-col"
            >
              <span className="font-semibold text-gray-200">👑 Org Owner</span>
              <span className="text-[10px] text-gray-400">Elena Rostova</span>
            </button>
            <button
              onClick={() => handleRoleQuickLogin("builder")}
              className="p-2 rounded-lg bg-obsidian-900 hover:bg-violet-950/50 border border-white/5 hover:border-violet-500/40 text-left transition flex flex-col"
            >
              <span className="font-semibold text-gray-200">🛠️ AI Builder</span>
              <span className="text-[10px] text-gray-400">Marcus Vance</span>
            </button>
            <button
              onClick={() => handleRoleQuickLogin("operator")}
              className="p-2 rounded-lg bg-obsidian-900 hover:bg-violet-950/50 border border-white/5 hover:border-violet-500/40 text-left transition flex flex-col"
            >
              <span className="font-semibold text-gray-200">⚡ Operator</span>
              <span className="text-[10px] text-gray-400">Sarah Chen</span>
            </button>
            <button
              onClick={() => handleRoleQuickLogin("auditor")}
              className="p-2 rounded-lg bg-obsidian-900 hover:bg-violet-950/50 border border-white/5 hover:border-violet-500/40 text-left transition flex flex-col"
            >
              <span className="font-semibold text-gray-200">🔍 Auditor</span>
              <span className="text-[10px] text-gray-400">David Sterling</span>
            </button>
            <button
              onClick={() => handleRoleQuickLogin("admin")}
              className="p-2 rounded-lg bg-obsidian-900 hover:bg-violet-950/50 border border-white/5 hover:border-violet-500/40 text-left transition flex flex-col"
            >
              <span className="font-semibold text-gray-200">🛡️ Platform Admin</span>
              <span className="text-[10px] text-gray-400">Alex Cross (Root)</span>
            </button>
            <button
              onClick={() => handleRoleQuickLogin("competitor")}
              className="p-2 rounded-lg bg-obsidian-900 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/40 text-left transition flex flex-col"
            >
              <span className="font-semibold text-rose-300">🏢 Other Tenant</span>
              <span className="text-[10px] text-gray-400">Cyberdyne Systems</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          Need a new organization?{" "}
          <Link href="/auth/signup" className="text-violet-400 hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <Dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClose={()=>setShowForgotModal(false)} label="Account recovery">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-gray-400 mb-4">
              Check whether email recovery is available for your workspace.
            </p>
            {forgotSuccess ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                Contact your organization owner for account recovery.
                <button
                  onClick={() => { setShowForgotModal(false); setForgotSuccess(false); }}
                  className="mt-3 w-full py-1.5 rounded-lg bg-obsidian-850 hover:bg-obsidian-800 text-white text-xs font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                {error && <p role="alert" className="text-red-300 text-xs">{error}</p>}
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-obsidian-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500" aria-label="name@company.com"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 rounded-lg bg-obsidian-850 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg glow-btn text-xs font-semibold text-white"
                  >
                    Send Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
