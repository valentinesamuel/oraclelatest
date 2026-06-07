import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import { corsMiddleware } from "./middleware/cors";
import { authMiddleware } from "./middleware/auth";
import { healthRouter } from "./routes/health";
import { systemRouter } from "./routes/system";
import { predictionsRouter } from "./routes/predictions";
import { prisma } from "./lib/prisma";
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

async function bootstrapSweep(): Promise<void> {
  const result = await prisma.jobQueue.updateMany({
    where: { status: "RUNNING" },
    data: { status: "PENDING" },
  });
  if (result.count > 0) {
    bootstrapLogger.info(
      { recovered: result.count },
      "Reset stuck RUNNING jobs to PENDING",
    );
  }
}

async function main(): Promise<void> {
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
