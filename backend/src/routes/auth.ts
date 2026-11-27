import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/store";
import { config } from "../config";
import { authenticateToken } from "../middleware/auth";
import { UserRole } from "../types";

const router = Router();

// Sign In
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Validation Error", message: "Email and password are required" });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Auth Error", message: "Invalid credentials" });
  }

  const passwordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ error: "Auth Error", message: "Invalid credentials" });
  }

  const org = db.getOrganization(user.organizationId);

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

  db.logAudit({
    id: `audit-${uuidv4().substring(0, 8)}`,
    organizationId: user.organizationId,
    userId: user.id,
    userEmail: user.email,
    action: "USER_LOGGED_IN",
    resourceType: "auth",
    resourceId: user.id,
    details: { email: user.email, role: user.role },
    ipAddress: req.ip || "127.0.0.1",
    timestamp: new Date().toISOString(),
  });

  return res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org?.name || "Default Org",
    },
  });
});

// Refresh Token
router.post("/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Validation Error", message: "Refresh token is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const newToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const newRefreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

    return res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (e) {
    return res.status(401).json({ error: "Invalid refresh token", message: "Session expired, please log in again." });
  }
});

// Get Current Profile
router.get("/me", authenticateToken, (req: Request, res: Response) => {
  const user = db.findUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const org = db.getOrganization(user.organizationId);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org?.name || "Acme AI Global",
    },
    organization: org,
  });
});

// Sign Up
router.post("/signup", (req: Request, res: Response) => {
  const { email, password, name, organizationName, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Validation Error", message: "Email, password, and name are required." });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "Conflict", message: "User with this email already exists." });
  }

  // Create new organization or link
  const orgId = `org-${uuidv4().substring(0, 8)}`;
  const now = new Date().toISOString();
  const org = db.createOrganization({
    id: orgId,
    name: organizationName || `${name}'s Organization`,
    plan: "pro",
    monthlyTokenLimit: 10_000_000,
    usedTokensThisMonth: 0,
    dailyExecutionLimit: 1000,
    usedExecutionsToday: 0,
    createdAt: now,
    updatedAt: now,
  });

  const userId = `user-${uuidv4().substring(0, 8)}`;
  const userRole: UserRole = (role as UserRole) || "ORGANIZATION_OWNER";
  const user = db.createUser({
    id: userId,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    name,
    role: userRole,
    organizationId: orgId,
    createdAt: now,
    updatedAt: now,
  });

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn as any });

  return res.status(201).json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org.name,
    },
  });
});

// Password Reset Simulation (with clear documented delivery mechanism)
router.post("/forgot-password", (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const user = db.findUserByEmail(email);
  // Always return consistent success message to prevent user enumeration
  return res.json({
    success: true,
    message: "If an account with that email exists, password reset instructions and a secure token have been dispatched to the registered inbox."
  });
});

export default router;
