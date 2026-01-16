/**
 * Health Check Routes
 * ===================
 */

import { Router, Request, Response } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

healthRoutes.get('/ready', async (req: Request, res: Response) => {
  // TODO: Add database and Hedera connectivity checks
  const checks = {
    database: true, // Will check Prisma connection
    hedera: true,   // Will check Hedera client
  };

  const isReady = Object.values(checks).every(Boolean);

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});
