import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export const requestCorrelation = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers["x-request-id"] as string) || uuidv4();
  req.correlationId = correlationId;
  res.setHeader("X-Request-Id", correlationId);
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.correlationId || "unknown";
  console.error(`[ERROR] [${correlationId}] ${req.method} ${req.url}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? "An internal server error occurred" : err.message;

  // Never leak internal stack trace in response
  res.status(statusCode).json({
    error: err.name || "ServerError",
    message,
    correlationId,
    timestamp: new Date().toISOString()
  });
};
