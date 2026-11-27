import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { enforceTenantIsolation } from "../middleware/tenant";
import { AiGatewayClient } from "../services/aiGatewayClient";
import { PromptVersion } from "../types";

const router = Router();

// List prompt versions
router.get("/", authenticateToken, enforceTenantIsolation, (req: Request, res: Response) => {
  const agentId = req.query.agentId as string | undefined;
  const versions = db.getPromptVersions(req.user!.organizationId, agentId);
  return res.json(versions);
});

// Create new prompt version
router.post(
  "/",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
    const { agentId, title, templateText, inputVariables, changeSummary, isPublished } = req.body;
    if (!title || !templateText) {
      return res.status(400).json({ error: "Title and templateText are required." });
    }

    const existing = db.getPromptVersions(req.user!.organizationId, agentId);
    const nextVersionNumber = existing.length > 0 ? Math.max(...existing.map((v) => v.versionNumber)) + 1 : 1;

    const newVersion: PromptVersion = {
      id: `pv-${uuidv4().substring(0, 8)}`,
      organizationId: req.user!.organizationId,
      agentId,
      versionNumber: nextVersionNumber,
      title,
      templateText,
      inputVariables: inputVariables || [],
      changeSummary: changeSummary || "Iteration updates",
      isPublished: !!isPublished,
      createdAt: new Date().toISOString(),
    };

    db.createPromptVersion(newVersion);
    return res.status(201).json(newVersion);
  }
);

// Rollback / Set as published
router.post(
  "/:id/publish",
  authenticateToken,
  enforceTenantIsolation,
  requireRoles(["ORGANIZATION_OWNER", "AI_BUILDER"]),
  (req: Request, res: Response) => {
    const versions = db.getPromptVersions(req.user!.organizationId);
    const target = versions.find((v) => v.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: "Prompt version not found" });
    }

    // Unpublish previous versions for this agent
    versions.forEach((v) => {
      if (v.agentId === target.agentId) {
        v.isPublished = false;
      }
    });
    target.isPublished = true;
    db.persist();

    return res.json({ success: true, message: `Version ${target.versionNumber} is now published and active.` });
  }
);

// Test playground for prompt template with variables
router.post(
  "/test",
  authenticateToken,
  enforceTenantIsolation,
  async (req: Request, res: Response) => {
    const { templateText, variables, provider, temperature } = req.body;
    if (!templateText) {
      return res.status(400).json({ error: "templateText is required" });
    }

    // Substitute variables: {{varName}} -> value
    let rendered = templateText;
    if (variables && typeof variables === "object") {
      for (const [k, v] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      }
    }

    try {
      const result = await AiGatewayClient.generate({
        messages: [{ role: "user", content: rendered }],
        provider: provider || "gemini",
        temperature: temperature || 0.7,
        tenantId: req.user!.organizationId,
      });

      return res.json({
        renderedPrompt: rendered,
        response: result.content,
        usage: result.usage,
        provider: result.provider,
        model: result.model,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Prompt execution failed", message: err.message });
    }
  }
);

export default router;
