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
  async (req: Request, res: Response) => {
    // If platform admin, can see all; otherwise strictly tenant scoped
    let logs = (await db.getAuditLogs(req.user!.organizationId));
    if (req.user!.role === "PLATFORM_ADMINISTRATOR") {
      logs = (await db.list("audit_logs"));
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
  
  async (req: Request, res: Response) => {
    const orgs = (await db.getAllOrganizations());
    const currentOrg = (await db.getOrganization(req.user!.organizationId));
    const executions = (await db.getExecutions(req.user!.organizationId));
    const agents = (await db.getAgents(req.user!.organizationId));
    const workflows = (await db.getWorkflows(req.user!.organizationId));
    const documents = (await db.getDocuments(req.user!.organizationId));
    const pendingApprovals = (await (await db.getApprovalRequests(req.user!.organizationId)).filter((a) => a.status === "PENDING"));

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
      systemOrganizationsCount: req.user!.role === "PLATFORM_ADMINISTRATOR" ? orgs.length : 1,
    });
  }
);

export default router;
