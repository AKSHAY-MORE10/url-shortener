import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

function extractUserId(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    return payload.userId;
  } catch {
    // invalid or expired token — treat as anonymous, don't crash
    return undefined;
  }
}

/**
 * Attaches req.userId if a valid Bearer token is present.
 * Does NOT reject unauthenticated requests — use on endpoints that work
 * for both anonymous and authenticated users (e.g. POST /urls).
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  req.userId = extractUserId(req);
  next();
}

/**
 * Rejects the request with 401 if no valid Bearer token is present.
 * Use on endpoints that strictly require an authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.userId = userId;
  next();
}
