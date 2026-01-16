/**
 * Document Routes
 * ===============
 * Endpoints for document upload and hash submission
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validate } from '../middleware/validation.js';
import { documentService } from '../services/document.service.js';
import type { ApiResponse, Document, UploadDocumentResponse } from '@glyphhash/types';

export const documentRoutes = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// ===========================================
// Validation Schemas
// ===========================================

const uploadMetadataSchema = z.object({
  topicId: z.string().uuid(),
  category: z.enum([
    'SECURITY_MONITORING',
    'ACCESS_CONTROL',
    'INCIDENT_RESPONSE',
    'CHANGE_MANAGEMENT',
    'RISK_ASSESSMENT',
    'COMPLIANCE_AUDIT',
    'POLICY_DOCUMENT',
    'EVIDENCE',
    'OTHER',
  ]),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ===========================================
// Routes
// ===========================================

/**
 * POST /api/v1/documents
 * Upload a document and submit hash to Hedera
 */
documentRoutes.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response) => {
    // Parse and validate metadata from form data
    const metadata = uploadMetadataSchema.parse(JSON.parse(req.body.metadata || '{}'));

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required',
        },
      });
    }

    const result = await documentService.uploadDocument({
      file: req.file,
      topicId: metadata.topicId,
      category: metadata.category,
      description: metadata.description,
      metadata: metadata.metadata,
    });

    const response: ApiResponse<UploadDocumentResponse> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  }
);

/**
 * GET /api/v1/documents
 * List documents with filtering
 */
documentRoutes.get('/', async (req: Request, res: Response) => {
  const { topicId, category, status, limit = '50', offset = '0' } = req.query;

  const documents = await documentService.listDocuments({
    topicId: topicId as string,
    category: category as string,
    status: status as string,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });

  const response: ApiResponse<Document[]> = {
    success: true,
    data: documents,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/documents/:id
 * Get document by ID
 */
documentRoutes.get('/:id', async (req: Request, res: Response) => {
  const document = await documentService.getDocumentById(req.params.id);

  const response: ApiResponse<Document> = {
    success: true,
    data: document,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/documents/:id/download
 * Download document file
 */
documentRoutes.get('/:id/download', async (req: Request, res: Response) => {
  const { stream, document } = await documentService.downloadDocument(req.params.id);

  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
  res.setHeader('Content-Length', document.size);

  stream.pipe(res);
});

/**
 * DELETE /api/v1/documents/:id
 * Delete document (local only, Hedera hash record is immutable)
 */
documentRoutes.delete('/:id', async (req: Request, res: Response) => {
  await documentService.deleteDocument(req.params.id);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});
