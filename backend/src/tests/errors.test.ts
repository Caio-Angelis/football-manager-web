import { describe, it, expect } from 'vitest';
import { AppError, ValidationError, toErrorResponse } from '../utils/errors.js';

describe('AppError', () => {
  it('creates with code, message, and statusCode', () => {
    const err = new AppError('UNKNOWN_ACTION', 'test', 400);
    expect(err.code).toBe('UNKNOWN_ACTION');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('AppError');
  });
});

describe('ValidationError', () => {
  it('creates with 400 status and VALIDATION_ERROR code', () => {
    const err = new ValidationError('bad input', { field: 'x' });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: 'x' });
  });
});

describe('toErrorResponse', () => {
  it('converts AppError to structured response', () => {
    const err = new AppError('NOT_FOUND', 'missing', 404);
    const res = toErrorResponse(err);
    expect(res.error).toBe('missing');
    expect(res.code).toBe('NOT_FOUND');
  });

  it('converts generic Error to INTERNAL_ERROR', () => {
    const res = toErrorResponse(new Error('boom'));
    expect(res.error).toBe('boom');
    expect(res.code).toBe('INTERNAL_ERROR');
  });
});
