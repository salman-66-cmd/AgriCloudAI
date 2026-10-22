import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
  (req as any).requestId = requestId;

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Skip verbose logging for static/health in test
    if (req.originalUrl !== '/health' && req.originalUrl !== '/ready') {
      console.log(JSON.stringify(log));
    }
  });

  next();
}
