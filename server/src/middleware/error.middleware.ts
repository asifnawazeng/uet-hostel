import type { NextFunction, Request, Response } from 'express';

import { isProduction } from '@server/config/env';

/** 404 handler for unmatched routes. */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
    return;
  }
  next();
}

/** Central error handler. Must keep all four parameters for Express. */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = 500;

  console.error('[error]', error);

  res.status(status).json({
    message: isProduction ? 'Internal server error' : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
  });
}
