import { Request, Response, NextFunction } from 'express';

export interface ApiError {
  status: number;
  message: string;
  errors?: unknown;
  code?: string;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly errors?: unknown;

  constructor(status: number, message: string, code?: string, errors?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.message,
    });
    return;
  }

  // Mongoose duplicate key error
  if ((err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid identifier format',
    });
    return;
  }

  // Default: hide internals in production
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred',
    ...(isDev && { detail: err.message }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}
