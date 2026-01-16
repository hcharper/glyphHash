/**
 * Express Application Setup
 * =========================
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';

import { topicRoutes } from './routes/topics.js';
import { documentRoutes } from './routes/documents.js';
import { verificationRoutes } from './routes/verification.js';
import { healthRoutes } from './routes/health.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging (skip in test)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check (no prefix)
  app.use('/health', healthRoutes);

  // API routes
  app.use('/api/v1/topics', topicRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/verification', verificationRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
