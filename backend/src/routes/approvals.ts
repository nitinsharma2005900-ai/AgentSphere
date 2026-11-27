import { Router, Request, Response } from "express";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { enforceTenantIsolation } from "../middleware/tenant";
import { requireRoles } from "../middleware/rbac";
import { ExecutionEngine } from "../services/executionEngine";

const router = Router();

// List pending and decided approval requests
router.get("/", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const approvals = (await db.getApprovalRequests(req.user!.organizationId));
  return res.json(approvals);
});

// Approve execution request
router.post(
  "/:id/approve",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const { notes } = req.body;
    const reqItem = (await db.getApprovalRequestById(req.user!.organizationId, req.params.id));
    if (!reqItem) return res.status(404).json({ error: "Approval request not found" });

    try {
      const resumedExecution = await ExecutionEngine.resumeExecution(
        req.user!.organizationId,
        reqItem.executionId,
        true,
        notes || "Approved by operator",
        req.user!.email
      );
      return res.json({ success: true, execution: resumedExecution });
    } catch (err: any) {
      return res.status(err.status || 500).json({ error: "Approval processing failed", message: err.message });
    }
  }
);

// Reject execution request
router.post(
  "/:id/reject",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const { notes } = req.body;
    const reqItem = (await db.getApprovalRequestById(req.user!.organizationId, req.params.id));
    if (!reqItem) return res.status(404).json({ error: "Approval request not found" });

    try {
      const rejectedExecution = await ExecutionEngine.resumeExecution(
        req.user!.organizationId,
        reqItem.executionId,
        false,
        notes || "Rejected by operator",
        req.user!.email
      );
      return res.json({ success: true, execution: rejectedExecution });
    } catch (err: any) {
      return res.status(err.status || 500).json({ error: "Rejection processing failed", message: err.message });
    }
  }
);

export default router;
