import type { Request, Response, NextFunction } from 'express';

const API_TOKEN = process.env.API_TOKEN;

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!API_TOKEN) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
    return;
  }

  next();
}
