import type { RequestHandler } from 'express';

export function loginRateLimit(now: () => number = Date.now): RequestHandler {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  const windowMs = 15 * 60 * 1000;
  return (req, res, next) => {
    if (req.method !== 'POST') return next();
    const time = now();
    for (const [ip, entry] of attempts) {
      if (entry.resetAt <= time) attempts.delete(ip);
    }
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = attempts.get(key);
    if (!entry && attempts.size < 10000) {
      entry = { count: 0, resetAt: time + windowMs };
      attempts.set(key, entry);
    }
    if (!entry || entry.count >= 10) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(((entry?.resetAt ?? time + windowMs) - time) / 1000))));
      res.status(429).json({ success: false, error: 'Demasiados intentos. Intente de nuevo más tarde.' });
      return;
    }
    entry.count += 1;
    next();
  };
}
