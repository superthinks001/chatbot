import { Request, Response, NextFunction } from 'express';

export function rateLimit(_req: Request, _res: Response, next: NextFunction) {
  // TODO: Implement JWT-based rate limiting
  next();
}
