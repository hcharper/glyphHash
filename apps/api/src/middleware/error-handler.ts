/**
 * Error Handling Middleware
 * =========================
 */

import { Request, Response, NextFunction } from 'express';
import type { ApiError, ApiResponse } from '@glyphhash/types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class HederaError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'HEDERA_ERROR', details);
  }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  throw new NotFoundError(`Route ${req.method} ${req.path} not found`);
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error in non-test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err);
  }

  // Handle known errors
  if (err instanceof AppError) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(err.statusCode).json(response);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: (err as any).errors,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(400).json(response);
  }

  // Handle unknown errors
  const response: ApiResponse<null> = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(500).json(response);
}
