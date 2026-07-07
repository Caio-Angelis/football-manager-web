import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
// E-26: Elevar teto para acomodar polling online (~60 req/min por jogador).
const MAX_REQUESTS = 200;
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
  // E-26: Key por x-player-id (UUID validado) com fallback para IP.
  const playerId = req.headers['x-player-id'] as string | undefined;
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const key = playerId || ip;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
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
