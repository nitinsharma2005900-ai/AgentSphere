import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { requestCorrelation, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import orgRoutes from "./routes/organizations";
import agentRoutes from "./routes/agents";
import promptRoutes from "./routes/prompts";
import workflowRoutes from "./routes/workflows";
import executionRoutes from "./routes/executions";
import approvalRoutes from "./routes/approvals";
import toolRoutes from "./routes/tools";
import documentRoutes from "./routes/documents";
import billingRoutes from "./routes/billing";
import adminRoutes from "./routes/admin";

export const app = express();

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(requestCorrelation);

// Base Health
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "AgentSphere Core Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/organizations", orgRoutes);
app.use("/api/v1/agents", agentRoutes);
app.use("/api/v1/prompts", promptRoutes);
app.use("/api/v1/workflows", workflowRoutes);
app.use("/api/v1/executions", executionRoutes);
app.use("/api/v1/approvals", approvalRoutes);
app.use("/api/v1/tools", toolRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/admin", adminRoutes);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`[AgentSphere Backend] Running at http://localhost:${config.port}`);
  });
}
