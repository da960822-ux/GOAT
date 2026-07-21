import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "./api-response";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  maxEntries?: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const DEFAULT_MAX_ENTRIES = 10_000;

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Lightweight single-process limiter. Multi-instance deployments should also
 * enforce equivalent limits at the gateway or through a shared store.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }

    const key = clientKey(req);
    const current = entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    entry.count += 1;
    entries.set(key, entry);

    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (!oldestKey) break;
      entries.delete(oldestKey);
    }

    res.setHeader("RateLimit-Limit", options.max.toString());
    res.setHeader("RateLimit-Remaining", Math.max(0, options.max - entry.count).toString());
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
      next(new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again later."));
      return;
    }

    next();
  };
}
