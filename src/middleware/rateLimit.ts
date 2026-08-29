import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { TOKEN_BUCKET_SCRIPT } from "../utils/tokenBucket.lua";

const CAPACITY = 10;              // max burst size
const REFILL_PER_SEC = 10 / 60;   // sustained: 10 requests per minute

export function rateLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `ratelimit:${req.ip}`;
      const now = Date.now();

      const [allowed, remaining] = (await redis.eval(
        TOKEN_BUCKET_SCRIPT,
        1,
        key,
        CAPACITY,
        REFILL_PER_SEC,
        now,
        1
      )) as [number, number];

      res.setHeader("X-RateLimit-Limit", CAPACITY.toString());
      res.setHeader("X-RateLimit-Remaining", Math.floor(remaining).toString());

      if (!allowed) {
        return res.status(429).json({
          error: "Too many requests. Please try again shortly.",
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
