import { Router, Request, Response } from "express";
import { db } from "../db/store";
import { authenticateToken } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";

const router = Router();

// Get organization details
router.get("/current", authenticateToken, (req: Request, res: Response) => {
  const org = db.getOrganization(req.user!.organizationId);
  if (!org) return res.status(404).json({ error: "Organization not found" });
  return res.json(org);
});

// List all organizations (for organization switcher)
router.get("/all", authenticateToken, (req: Request, res: Response) => {
  const allOrgs = db.getAllOrganizations();
  return res.json(allOrgs);
});

// Switch active organization (returns new scoped token)
router.post("/switch", authenticateToken, (req: Request, res: Response) => {
  const { targetOrganizationId } = req.body;
  if (!targetOrganizationId) {
    return res.status(400).json({ error: "targetOrganizationId is required" });
  }

  const targetOrg = db.getOrganization(targetOrganizationId);
  if (!targetOrg) {
    return res.status(404).json({ error: "Target organization does not exist" });
  }

  // Update user in session
  const user = db.findUserById(req.user!.id);
  if (user) {
    db.updateUser(user.id, { organizationId: targetOrganizationId });
  }

  const jwt = require("jsonwebtoken");
  const { config } = require("../config");
  const payload = {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    organizationId: targetOrganizationId,
  };

  const newToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
  return res.json({
    token: newToken,
    organization: targetOrg,
    message: `Switched active organization context to ${targetOrg.name}`
  });
});

// Team members in organization
router.get("/members", authenticateToken, (req: Request, res: Response) => {
  const members = db.getUsers(req.user!.organizationId).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));
  return res.json(members);
});

export default router;
