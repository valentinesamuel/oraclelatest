import { Request, Response, NextFunction } from "express";
import { authLogger } from "../lib/logger";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    authLogger.warn(
      {
        event: "auth.failure",
        reason: "missing_token",
        method: req.method,
        path: req.path,
      },
      "Auth failed: missing token",
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  console.log(process.env.VPS_SECRET_TOKEN);
  console.log(process.env.token);
  if (token !== process.env.VPS_SECRET_TOKEN) {
    authLogger.warn(
      {
        event: "auth.failure",
        reason: "invalid_token",
        method: req.method,
        path: req.path,
      },
      "Auth failed: invalid token",
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  authLogger.debug(
    { event: "auth.success", method: req.method, path: req.path },
    "Auth success",
  );
  next();
}
