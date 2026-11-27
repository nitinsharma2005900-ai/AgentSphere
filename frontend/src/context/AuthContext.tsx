"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "ORGANIZATION_OWNER" | "AI_BUILDER" | "WORKFLOW_OPERATOR" | "AUDITOR" | "PLATFORM_ADMINISTRATOR";
  organizationId: string;
  organizationName: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  quickLogin: (role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("agentsphere_token");
    const savedUser = localStorage.getItem("agentsphere_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("agentsphere_token");
        localStorage.removeItem("agentsphere_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("agentsphere_token", data.token);
    localStorage.setItem("agentsphere_user", JSON.stringify(data.user));
    localStorage.setItem("agentsphere_active_org", data.user.organizationId);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("agentsphere_token");
    localStorage.removeItem("agentsphere_user");
    localStorage.removeItem("agentsphere_active_org");
    window.location.href = "/auth/login";
  };

  const switchOrganization = async (targetOrganizationId: string) => {
    const data = await apiFetch("/organizations/switch", {
      method: "POST",
      body: JSON.stringify({ targetOrganizationId }),
    });

    if (data.token) {
      setToken(data.token);
      localStorage.setItem("agentsphere_token", data.token);
      localStorage.setItem("agentsphere_active_org", targetOrganizationId);
      if (user) {
        const updated = {
          ...user,
          organizationId: targetOrganizationId,
          organizationName: data.organization.name,
        };
        setUser(updated);
        localStorage.setItem("agentsphere_user", JSON.stringify(updated));
      }
      window.location.reload();
    }
  };

  const quickLogin = async (role: string) => {
    const roleEmailMap: Record<string, string> = {
      owner: "owner@agentsphere.ai",
      builder: "builder@agentsphere.ai",
      operator: "operator@agentsphere.ai",
      auditor: "auditor@agentsphere.ai",
      admin: "admin@agentsphere.ai",
      competitor: "competitor@external.io",
    };
    const email = roleEmailMap[role.toLowerCase()] || "owner@agentsphere.ai";
    await login(email, "Password123!");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchOrganization,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
