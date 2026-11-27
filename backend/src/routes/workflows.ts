import { Router, Request, Response } from "express";
import { randomUUID as uuidv4 } from "crypto";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { enforceTenantIsolation } from "../middleware/tenant";
import { ExecutionEngine } from "../services/executionEngine";
import { Workflow } from "../types";

const router = Router();
import { workflowSchema } from "../middleware/validation";
import { validateGraph } from "../services/workflowGraph";

// List workflows
router.get("/", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const workflows = (await db.getWorkflows(req.user!.organizationId));
  return res.json(workflows);
});

// Get workflow by ID
router.get("/:id", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const wf = (await db.getWorkflowById(req.user!.organizationId, req.params.id));
  if (!wf) return res.status(404).json({ error: "Workflow not found" });
  return res.json(wf);
});

// Create workflow
router.post(
  "/",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    req.body = workflowSchema.parse(req.body);
    const { name, description, nodes, edges } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const now = new Date().toISOString();
    const newWorkflow: Workflow = {
      id: `wf-${uuidv4().substring(0, 8)}`,
      organizationId: req.user!.organizationId,
      name,
      description: description || "",
      nodes: nodes || [
        { id: "node-start", type: "start", position: { x: 100, y: 150 }, data: { label: "Trigger Start" } },
        { id: "node-end", type: "output", position: { x: 500, y: 150 }, data: { label: "Output Result" } }
      ],
      edges: edges || [
        { id: "edge-start-end", source: "node-start", target: "node-end", animated: true }
      ],
      versionNumber: 1,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    };

    validateGraph(newWorkflow);
    (await db.createWorkflow(newWorkflow));
    return res.status(201).json(newWorkflow);
  }
);

// Update workflow (Save canvas)
router.put(
  "/:id",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const wf = (await db.getWorkflowById(req.user!.organizationId, req.params.id));
    if (!wf) return res.status(404).json({ error: "Workflow not found" });

    req.body = workflowSchema.partial().parse(req.body);
    validateGraph({ ...wf, ...req.body });
    const updated = (await db.updateWorkflow(req.user!.organizationId, req.params.id, {
          ...req.body,
          versionNumber: wf.versionNumber + 1,
        }));
    return res.json(updated);
  }
);

// Delete workflow
router.delete(
  "/:id",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const success = (await db.deleteWorkflow(req.user!.organizationId, req.params.id));
    if (!success) return res.status(404).json({ error: "Workflow not found" });
    return res.json({ success: true });
  }
);

// Run workflow
router.post(
  "/:id/run",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER", "WORKFLOW_OPERATOR"]),
  async (req: Request, res: Response) => {
    const { inputData } = req.body;
    try {
      const execution = await ExecutionEngine.runWorkflow(
        req.user!.organizationId,
        req.params.id,
        inputData || {},
        req.get("Idempotency-Key")
      );
      return res.json(execution);
    } catch (err: any) {
      return res.status(err.status || 500).json({ error: "Workflow execution failed", message: err.status ? err.message : "Execution failed" });
    }
  }
);

export default router;
