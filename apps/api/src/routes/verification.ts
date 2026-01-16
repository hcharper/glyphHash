/**
 * Verification Routes
 * ===================
 * Endpoints for auditor verification workflows
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { verificationService } from '../services/verification.service.js';
import type { ApiResponse, VerificationResult, VerificationReport } from '@glyphhash/types';

export const verificationRoutes = Router();

// ===========================================
// Validation Schemas
// ===========================================

const verifyDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

const verifyBatchSchema = z.object({
  topicId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categories: z.array(z.enum([
    'SECURITY_MONITORING',
    'ACCESS_CONTROL',
    'INCIDENT_RESPONSE',
    'CHANGE_MANAGEMENT',
    'RISK_ASSESSMENT',
    'COMPLIANCE_AUDIT',
    'POLICY_DOCUMENT',
    'EVIDENCE',
    'OTHER',
  ])).optional(),
});

// ===========================================
// Routes
// ===========================================

/**
 * POST /api/v1/verification/document
 * Verify a single document against Hedera
 */
verificationRoutes.post(
  '/document',
  validate(verifyDocumentSchema),
  async (req: Request, res: Response) => {
    const { documentId } = req.body;

    const result = await verificationService.verifyDocument(documentId);

    const response: ApiResponse<VerificationResult> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * POST /api/v1/verification/batch
 * Verify all documents in a topic (batch verification)
 */
verificationRoutes.post(
  '/batch',
  validate(verifyBatchSchema),
  async (req: Request, res: Response) => {
    const { topicId, startDate, endDate, categories } = req.body;

    const report = await verificationService.verifyBatch({
      topicId,
      startDate,
      endDate,
      categories,
    });

    const response: ApiResponse<VerificationReport> = {
      success: true,
      data: report,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * GET /api/v1/verification/reports
 * List verification reports
 */
verificationRoutes.get('/reports', async (req: Request, res: Response) => {
  const { topicId, limit = '20', offset = '0' } = req.query;

  const reports = await verificationService.listReports({
    topicId: topicId as string,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });

  const response: ApiResponse<VerificationReport[]> = {
    success: true,
    data: reports,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/verification/reports/:id
 * Get verification report by ID
 */
verificationRoutes.get('/reports/:id', async (req: Request, res: Response) => {
  const report = await verificationService.getReportById(req.params.id);

  const response: ApiResponse<VerificationReport> = {
    success: true,
    data: report,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/verification/reports/:id/export
 * Export verification report as PDF/CSV
 */
verificationRoutes.get('/reports/:id/export', async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'pdf';
  
  const { buffer, filename, mimeType } = await verificationService.exportReport(
    req.params.id,
    format as 'pdf' | 'csv'
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});
