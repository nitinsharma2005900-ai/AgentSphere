import { Request, Response, NextFunction } from "express";

/**
 * Strict Tenant Isolation Middleware
 * Prevents any request from querying or modifying resources outside the authenticated user's organization.
 */
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Cross-tenant protection: If request specifies an explicit organizationId in body/query/params,
  // verify it strictly matches req.user.organizationId (unless PLATFORM_ADMINISTRATOR)
  const requestedOrg = req.params.organizationId || req.query.organizationId || req.body?.organizationId;

  if (requestedOrg && req.user.role !== "PLATFORM_ADMINISTRATOR" && requestedOrg !== req.user.organizationId) {
    return res.status(403).json({
      error: "Tenant Isolation Violation",
      message: "Cross-tenant data access strictly prohibited by platform security policy."
    });
  }

  next();
};
