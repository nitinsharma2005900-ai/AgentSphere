import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true } as any);
dotenv.config({ quiet: true } as any);
const production = process.env.NODE_ENV === "production";
function secret(name: string) {
  const value = process.env[name];
  if (production && (!value || value.length < 32 || /your-|agentsphere-.*secret/.test(value))) {
    throw new Error(`${name} must be configured with a unique secret of at least 32 characters`);
  }
  return value || crypto.randomBytes(32).toString("hex");
}
export const config = {
  port: Number(process.env.PORT || 5000), nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: secret("JWT_SECRET"), jwtRefreshSecret: secret("JWT_REFRESH_SECRET"),
  encryptionKey: secret("ENCRYPTION_KEY"), serviceSecret: secret("SERVICE_SECRET"),
  jwtExpiresIn: "15m", jwtRefreshExpiresIn: "7d",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/api/v1",
  databaseUrl: process.env.DATABASE_URL || "", redisUrl: process.env.REDIS_URL || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  allowMock: process.env.ALLOW_MOCK_PROVIDER === "true" || process.env.NODE_ENV === "test",
  seedDemo: process.env.SEED_DEMO === "true" || !production,
  limits: { freePlanMonthlyTokens: 1_000_000, proPlanMonthlyTokens: 10_000_000,
    enterprisePlanMonthlyTokens: 100_000_000, maxExecutionSteps: 30, executionTimeoutMs: 60000,
    maxExecutionCostUsd: Number(process.env.MAX_EXECUTION_COST_USD || 0.1) }
};
if (production && !config.databaseUrl) throw new Error("DATABASE_URL is required in production");
