import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { enforceTenantIsolation } from "../middleware/tenant";
import { requireRoles } from "../middleware/rbac";
import { ToolExecutor } from "../services/toolExecutor";
import { ToolItem } from "../types";

const router = Router();

// List tools
router.get("/", authenticateToken, enforceTenantIsolation, (req: Request, res: Response) => {
  const tools = db.getTools(req.user!.organizationId);
  return res.json(tools);
});

// Register new tool
router.post(
  "/",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
    const { name, description, category, parameters, endpointUrl, timeoutMs } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" });
    }

    const newTool: ToolItem = {
      id: `tool-${uuidv4().substring(0, 8)}`,
      organizationId: req.user!.organizationId,
      name,
      description,
      category: category || "utility",
      parameters: parameters || {},
      isEnabled: true,
      isSystemTool: false,
      endpointUrl,
      timeoutMs: timeoutMs || 5000,
      createdAt: new Date().toISOString(),
    };

    db.createTool(newTool);
    return res.status(201).json(newTool);
  }
);

// Toggle tool enabled status
router.patch(
  "/:id/toggle",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
    const tools = db.getTools(req.user!.organizationId);
    const tool = tools.find((t) => t.id === req.params.id);
    if (!tool) return res.status(404).json({ error: "Tool not found" });

    const updated = db.updateTool(req.user!.organizationId, tool.id, {
      isEnabled: !tool.isEnabled,
    });
    return res.json(updated);
  }
);

// Test tool execution directly
router.post(
  "/:id/test",
  authenticateToken,
  enforceTenantIsolation,
  async (req: Request, res: Response) => {
    const { args } = req.body;
    const tools = db.getTools(req.user!.organizationId);
    const tool = tools.find((t) => t.id === req.params.id);
    if (!tool) return res.status(404).json({ error: "Tool not found" });

    try {
      const start = Date.now();
      const result = await ToolExecutor.executeTool(
        req.user!.organizationId,
        tool.name,
        args || {}
      );
      const durationMs = Date.now() - start;

      return res.json({
        toolName: tool.name,
        durationMs,
        result,
        status: "SUCCESS"
      });
    } catch (err: any) {
      return res.status(400).json({
        toolName: tool.name,
        error: err.message,
        status: "FAILED"
      });
    }
  }
);

export default router;
