import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "agentsphere-jwt-secret-key-32b-secure!",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "agentsphere-jwt-refresh-secret-key-32b!",
  jwtExpiresIn: "2h",
  jwtRefreshExpiresIn: "7d",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/api/v1",
  databaseUrl: process.env.DATABASE_URL || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  limits: {
    freePlanMonthlyTokens: 1_000_000,
    proPlanMonthlyTokens: 10_000_000,
    enterprisePlanMonthlyTokens: 100_000_000,
    maxExecutionSteps: 30,
    executionTimeoutMs: 60000,
  }
};
