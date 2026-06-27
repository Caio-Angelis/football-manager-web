import type { Request, Response, NextFunction } from 'express';
import { AppError, toErrorResponse } from '../utils/errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(toErrorResponse(err));
    return;
  }

  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json(toErrorResponse(err));
}
