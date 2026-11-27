import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { enforceTenantIsolation } from "../middleware/tenant";
import { ExecutionEngine } from "../services/executionEngine";
import { Agent } from "../types";

const router = Router();
import { validate, agentSchema } from "../middleware/validation";
import { AppError } from "../services/errors";

// List agents for tenant
router.get("/", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const agents = (await db.getAgents(req.user!.organizationId));
  return res.json(agents);
});

// Get agent by ID
router.get("/:id", authenticateToken, enforceTenantIsolation, async (req: Request, res: Response) => {
  const agent = (await db.getAgentById(req.user!.organizationId, req.params.id));
  if (!agent) {
    return res.status(404).json({ error: "Agent not found in organization" });
  }
  return res.json(agent);
});

// Create agent
router.post(
  "/",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    req.body = agentSchema.parse(req.body);
    const {
      name,
      description,
      avatar,
      color,
      modelProvider,
      modelName,
      temperature,
      maxTokens,
      maxSteps,
      timeoutSeconds,
      knowledgeBaseIds,
      toolPermissions,
      humanApprovalRequired,
      isDraft,
      systemPrompt,
    } = req.body;

    if (!name || !systemPrompt) {
      return res.status(400).json({ error: "Name and systemPrompt are required fields." });
    }

    const now = new Date().toISOString();
    const newAgent: Agent = {
      id: `agent-${uuidv4().substring(0, 8)}`,
      organizationId: req.user!.organizationId,
      name,
      description: description || "",
      avatar: avatar || "bot",
      color: color || "#8B5CF6",
      modelProvider: modelProvider || "gemini",
      modelName: modelName || "gemini-3.1-flash-lite",
      temperature: typeof temperature === "number" ? temperature : 0.7,
      maxTokens: maxTokens || 2048,
      maxSteps: maxSteps || 15,
      timeoutSeconds: timeoutSeconds || 30,
      knowledgeBaseIds: knowledgeBaseIds || [],
      toolPermissions: toolPermissions || [],
      humanApprovalRequired: !!humanApprovalRequired,
      isDraft: !!isDraft,
      isArchived: false,
      systemPrompt,
      createdAt: now,
      updatedAt: now,
    };

    (await db.createAgent(newAgent));
    (await db.logAudit({
            id: `audit-${uuidv4().substring(0, 8)}`,
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: "AGENT_CREATED",
            resourceType: "agent",
            resourceId: newAgent.id,
            details: { name: newAgent.name },
            ipAddress: req.ip || "127.0.0.1",
            timestamp: now,
          }));

    return res.status(201).json(newAgent);
  }
);

// Update agent
router.put(
  "/:id",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const agent = (await db.getAgentById(req.user!.organizationId, req.params.id));
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    req.body = agentSchema.partial().parse(req.body);
    const updated = (await db.updateAgent(req.user!.organizationId, req.params.id, req.body));
    return res.json(updated);
  }
);

// Duplicate agent
router.post(
  "/:id/duplicate",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const agent = (await db.getAgentById(req.user!.organizationId, req.params.id));
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const now = new Date().toISOString();
    const duplicated: Agent = {
      ...agent,
      id: `agent-${uuidv4().substring(0, 8)}`,
      name: `${agent.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    (await db.createAgent(duplicated));
    return res.status(201).json(duplicated);
  }
);

// Archive / Delete agent
router.delete(
  "/:id",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  async (req: Request, res: Response) => {
    const success = (await db.deleteAgent(req.user!.organizationId, req.params.id));
    if (!success) {
      return res.status(404).json({ error: "Agent not found" });
    }
    return res.json({ success: true, message: "Agent deleted successfully." });
  }
);

// Run / Test agent
router.post(
  "/:id/run",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER", "WORKFLOW_OPERATOR"]),
  async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required to run the agent" });
    }

    try {
      const execution = await ExecutionEngine.runAgent(
        req.user!.organizationId,
        req.params.id,
        prompt,
        req.get("Idempotency-Key")
      );
      return res.json(execution);
    } catch (err: any) {
      return res.status(err.status || 500).json({ error: "Execution Failed", message: err.status ? err.message : "Execution failed" });
    }
  }
);

export default router;
