import { Router, Request, Response } from "express";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { AiGatewayClient } from "../services/aiGatewayClient";

const router = Router();

// Audit logs
router.get(
  "/audit-logs",
  authenticateToken,
  requireRoles(["PLATFORM_ADMINISTRATOR", "AUDITOR", "ORGANIZATION_OWNER"]),
  (req: Request, res: Response) => {
    // If platform admin, can see all; otherwise strictly tenant scoped
    let logs = db.getAuditLogs(req.user!.organizationId);
    if (req.user!.role === "PLATFORM_ADMINISTRATOR") {
      logs = (db as any).state.auditLogs;
    }
    return res.json(logs);
  }
);

// Provider health & telemetry
router.get("/provider-health", authenticateToken, async (req: Request, res: Response) => {
  const health = await AiGatewayClient.getHealth();
  return res.json({
    timestamp: new Date().toISOString(),
    aiGateway: health,
    backendService: {
      status: "healthy",
      uptimeSeconds: process.uptime(),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
    },
  });
});

// Platform stats (Total organizations, users, executions)
router.get(
  "/stats",
  authenticateToken,
  requireRoles(["PLATFORM_ADMINISTRATOR", "ORGANIZATION_OWNER", "AUDITOR"]),
  (req: Request, res: Response) => {
    const orgs = db.getAllOrganizations();
    const currentOrg = db.getOrganization(req.user!.organizationId);
    const executions = db.getExecutions(req.user!.organizationId);
    const agents = db.getAgents(req.user!.organizationId);
    const workflows = db.getWorkflows(req.user!.organizationId);
    const documents = db.getDocuments(req.user!.organizationId);
    const pendingApprovals = db.getApprovalRequests(req.user!.organizationId).filter((a) => a.status === "PENDING");

    return res.json({
      organization: currentOrg,
      totalAgents: agents.length,
      activeWorkflows: workflows.length,
      totalDocuments: documents.length,
      totalExecutions: executions.length,
      successfulExecutions: executions.filter((e) => e.status === "COMPLETED").length,
      failedExecutions: executions.filter((e) => e.status === "FAILED").length,
      pendingApprovals: pendingApprovals.length,
      usedTokens: currentOrg?.usedTokensThisMonth || 0,
      monthlyLimit: currentOrg?.monthlyTokenLimit || 10000000,
      systemOrganizationsCount: orgs.length,
    });
  }
);

export default router;
