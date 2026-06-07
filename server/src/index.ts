import "dotenv/config";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { healthRouter } from "./routes/health";
import { systemRouter } from "./routes/system";
import { predictionsRouter } from "./routes/predictions";
import { db } from "./lib/db";
import { jobQueue } from "./db/schema";
import { eq } from "drizzle-orm";
import { startMidnightCron } from "./crons/midnight-sync";
import { startMasterTicker } from "./workers/master-ticker";
import { logger, bootstrapLogger, serverLogger } from "./lib/logger";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "3001", 10);

const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    if (existing) return existing;
    const id = crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      body: req.raw?.body,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      responseBody: res.raw?.responseBody,
    }),
  },
});

function captureResponseBody(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    (res as any).responseBody = body;
    return originalJson(body);
  };
  next();
}

app.use(httpLogger);
app.use(captureResponseBody);
app.use(corsMiddleware);
app.use(express.json());

app.use("/api/health", healthRouter);

app.use("/api/system", authMiddleware, systemRouter);
app.use("/api/predictions", authMiddleware, predictionsRouter);

async function runMigrations(): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const migrationDb = drizzle(client);
    await migrate(migrationDb, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    bootstrapLogger.info("Database migrations applied successfully");
  } finally {
    await client.end();
  }
}

async function bootstrapSweep(): Promise<void> {
  const updated = await db
    .update(jobQueue)
    .set({ status: "PENDING", updatedAt: new Date() })
    .where(eq(jobQueue.status, "RUNNING"))
    .returning({ id: jobQueue.id });
  if (updated.length > 0) {
    bootstrapLogger.info(
      { recovered: updated.length },
      "Reset stuck RUNNING jobs to PENDING",
    );
  }
}

async function main(): Promise<void> {
  await runMigrations();
  await bootstrapSweep();
  startMidnightCron();
  startMasterTicker();
  app.listen(PORT, () => {
    serverLogger.info({ port: PORT }, "Server listening");
  });
}

main().catch((err) => {
  serverLogger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
