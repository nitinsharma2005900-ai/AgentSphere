import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types";

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized", message: "User session required" });
    }

    // Platform administrator has superuser bypass within permissions policy
    if (req.user.role === "PLATFORM_ADMINISTRATOR") {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `Your role (${req.user.role}) is not authorized to perform this operation. Allowed roles: ${allowedRoles.join(", ")}`
      });
    }

    next();
  };
};
