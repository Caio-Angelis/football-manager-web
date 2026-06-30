import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  next();
}
