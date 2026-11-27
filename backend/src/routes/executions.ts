import { Router, Request, Response } from "express";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { enforceTenantIsolation } from "../middleware/tenant";
import { requireRoles } from "../middleware/rbac";
import { ExecutionEngine } from "../services/executionEngine";

const router = Router();

// List executions for tenant
router.get("/", authenticateToken, enforceTenantIsolation, (req: Request, res: Response) => {
  const executions = db.getExecutions(req.user!.organizationId);
  return res.json(executions);
});

// Get single execution trace
router.get("/:id", authenticateToken, enforceTenantIsolation, (req: Request, res: Response) => {
  const exec = db.getExecutionById(req.user!.organizationId, req.params.id);
  if (!exec) return res.status(404).json({ error: "Execution record not found" });
  return res.json(exec);
});

// Cancel execution
router.post(
  "/:id/cancel",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER", "WORKFLOW_OPERATOR"]),
  async (req: Request, res: Response) => {
    try {
      const updated = await ExecutionEngine.cancelExecution(req.user!.organizationId, req.params.id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: "Cancellation failed", message: err.message });
    }
  }
);

// Retry failed step
router.post(
  "/:id/retry",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER", "WORKFLOW_OPERATOR"]),
  async (req: Request, res: Response) => {
    const { stepIndex } = req.body;
    try {
      const updated = await ExecutionEngine.retryStep(
        req.user!.organizationId,
        req.params.id,
        typeof stepIndex === "number" ? stepIndex : 1
      );
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: "Retry failed", message: err.message });
    }
  }
);

export default router;
