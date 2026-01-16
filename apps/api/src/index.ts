/**
 * API Server Entry Point
 * ======================
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Also try local .env if it exists
dotenv.config();

import { createApp } from './app.js';

const PORT = process.env.API_PORT || 4000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔐 GlyphHash API Server                                     ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                   ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                               ║
║   Endpoints:                                                  ║
║   • Health:       GET  /health                                ║
║   • Topics:       POST /api/v1/topics                         ║
║   • Documents:    POST /api/v1/documents                      ║
║   • Verification: POST /api/v1/verification                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
