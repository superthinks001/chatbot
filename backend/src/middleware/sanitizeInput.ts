import { Request, Response, NextFunction } from 'express';

export function sanitizeInput(_req: Request, _res: Response, next: NextFunction) {
  // TODO: Implement input sanitization
  next();
}
