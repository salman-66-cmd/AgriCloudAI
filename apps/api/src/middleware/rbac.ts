import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: requires one of [${allowedRoles.join(', ')}] role`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
