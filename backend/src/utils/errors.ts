export type ErrorCode =
  | 'UNKNOWN_ACTION'
  | 'ACTION_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'ACTION_EXECUTION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return {
      error: err.message,
      code: err.code,
      details: err.details,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    error: message,
    code: 'INTERNAL_ERROR' as ErrorCode,
  };
}
