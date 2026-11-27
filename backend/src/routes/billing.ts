import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { enforceTenantIsolation } from "../middleware/tenant";
import { requireRoles } from "../middleware/rbac";

const router = Router();

// Get usage limits & quota statistics
router.get("/usage", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const org = (await db.getOrganization(req.user!.organizationId));
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const executions = (await db.getExecutions(req.user!.organizationId));
  const totalCost = executions.reduce((sum, e) => sum + (e.estimatedCostUsd || 0), 0);
  const percentUsed = Math.min(100, Math.round((org.usedTokensThisMonth / org.monthlyTokenLimit) * 100));

  return res.json({
    plan: org.plan,
    monthlyTokenLimit: org.monthlyTokenLimit,
    usedTokensThisMonth: org.usedTokensThisMonth,
    remainingTokens: Math.max(0, org.monthlyTokenLimit - org.usedTokensThisMonth),
    percentUsed,
    dailyExecutionLimit: org.dailyExecutionLimit,
    usedExecutionsToday: org.usedExecutionsToday,
    totalEstimatedCostUsd: Number(totalCost.toFixed(4)),
    totalExecutionsRecorded: executions.length,
    isWarningThreshold: percentUsed >= 80,
    isQuotaExceeded: org.usedTokensThisMonth >= org.monthlyTokenLimit,
  });
});

// List simulated invoices
router.get("/invoices", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const invoices = (await db.getInvoices(req.user!.organizationId));
  return res.json(invoices);
});

// Switch subscription plan (clearly marked simulated)
router.post(
  "/plan",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER"]),
  async (req: Request, res: Response) => {
    const { plan } = req.body;
    if (!["free", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Choose from: free, pro, enterprise." });
    }

    const limits: Record<string, { tokens: number; executions: number; price: number }> = {
      free: { tokens: 1_000_000, executions: 200, price: 0 },
      pro: { tokens: 10_000_000, executions: 2000, price: 99 },
      enterprise: { tokens: 100_000_000, executions: 10000, price: 499 },
    };

    const target = limits[plan];
    const updated = (await db.updateOrganization(req.user!.organizationId, {
          plan: plan as any,
          monthlyTokenLimit: target.tokens,
          dailyExecutionLimit: target.executions,
        }));

    // Create simulated invoice
    (await db.createInvoice({
            id: `inv-${uuidv4().substring(0, 8)}`,
            organizationId: req.user!.organizationId,
            plan: plan as any,
            amountUsd: target.price,
            status: "PAID",
            billingPeriod: new Date().toLocaleDateString("en", {month:"long",year:"numeric",timeZone:"UTC"}),
            invoiceDate: new Date().toISOString(),
            tokenUsage: updated.usedTokensThisMonth,
          }));

    return res.json({
      success: true,
      message: `Organization subscription successfully upgraded to ${plan.toUpperCase()} tier (Simulated).`,
      organization: updated,
    });
  }
);

// Export usage report (CSV)
router.get("/export-report", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const executions = (await db.getExecutions(req.user!.organizationId));
  const org = (await db.getOrganization(req.user!.organizationId));

  const rows = [
    ["Execution ID", "Title", "Status", "Total Tokens", "Estimated Cost USD", "Provider", "Start Time"],
    ...executions.map((e) => [
      e.id,
      e.title,
      e.status,
      e.totalTokens,
      e.estimatedCostUsd,
      e.provider,
      e.startTime,
    ]),
  ];

  const escapeCell=(value:unknown)=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const csvContent = rows.map(r=>r.map(escapeCell).join(',')).join('\r\n');
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="AgentSphere_Usage_Report.csv"');
  return res.send(csvContent);
});

export default router;
