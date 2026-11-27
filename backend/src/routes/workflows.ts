import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { enforceTenantIsolation } from "../middleware/tenant";
import { ExecutionEngine } from "../services/executionEngine";
import { Workflow } from "../types";

const router = Router();

// List workflows
router.get("/", authenticateToken, enforceTenantIsolation, (req: Request, res: Response) => {
  const workflows = db.getWorkflows(req.user!.organizationId);
  return res.json(workflows);
});

// Get workflow by ID
router.get("/:id", authenticateToken, enforceTenantIsolation, (req: Request, res: Response) => {
  const wf = db.getWorkflowById(req.user!.organizationId, req.params.id);
  if (!wf) return res.status(404).json({ error: "Workflow not found" });
  return res.json(wf);
});

// Create workflow
router.post(
  "/",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
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

    db.createWorkflow(newWorkflow);
    return res.status(201).json(newWorkflow);
  }
);

// Update workflow (Save canvas)
router.put(
  "/:id",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
    const wf = db.getWorkflowById(req.user!.organizationId, req.params.id);
    if (!wf) return res.status(404).json({ error: "Workflow not found" });

    const updated = db.updateWorkflow(req.user!.organizationId, req.params.id, {
      ...req.body,
      versionNumber: wf.versionNumber + 1,
    });
    return res.json(updated);
  }
);

// Delete workflow
router.delete(
  "/:id",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
    const success = db.deleteWorkflow(req.user!.organizationId, req.params.id);
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
        inputData || {}
      );
      return res.json(execution);
    } catch (err: any) {
      return res.status(500).json({ error: "Workflow execution failed", message: err.message });
    }
  }
);

export default router;
