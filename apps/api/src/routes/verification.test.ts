/**
 * Verification Routes Tests
 * =========================
 */

import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    topic: {
      findUnique: jest.fn(),
    },
    verificationReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../lib/hedera', () => ({
  getMirrorNodeService: jest.fn(() => ({
    findDocumentHash: jest.fn().mockResolvedValue({
      message: {
        sequenceNumber: 1,
        consensusTimestamp: '1705276800.123456789',
      },
      payload: {
        type: 'DOCUMENT_HASH',
        payload: {
          documentId: 'doc-1',
          hash: 'abc123hash',
          filenameHash: 'filenamehash123',
          category: 'EVIDENCE',
        },
      },
    }),
  })),
}));

jest.mock('../lib/storage', () => ({
  getFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
}));

jest.mock('@glyphhash/hedera', () => ({
  createFileHash: jest.fn().mockReturnValue('abc123hash'),
}));

import prisma from '../lib/prisma';

describe('Verification Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/verification/document', () => {
    it('should verify a document successfully', async () => {
      const docId = '550e8400-e29b-41d4-a716-446655440000';
      const mockDocument = {
        id: docId,
        topicId: 'topic-1',
        originalName: 'test.pdf',
        hash: 'abc123hash',
        storagePath: '/storage/test.pdf',
        status: 'CONFIRMED',
        topic: {
          id: 'topic-1',
          topicId: '0.0.123456',
          name: 'Test Topic',
        },
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const response = await request(app)
        .post('/api/v1/verification/document')
        .send({ documentId: docId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('VERIFIED');
      expect(response.body.data.documentId).toBe(docId);
    });

    it('should return NOT_FOUND for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/verification/document')
        .send({ documentId: '550e8400-e29b-41d4-a716-446655440001' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return MISMATCH when file hash differs', async () => {
      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('different-hash');

      const docId = '550e8400-e29b-41d4-a716-446655440002';
      const mockDocument = {
        id: docId,
        topicId: 'topic-1',
        originalName: 'test.pdf',
        hash: 'abc123hash',
        storagePath: '/storage/test.pdf',
        status: 'CONFIRMED',
        topic: {
          id: 'topic-1',
          topicId: '0.0.123456',
          name: 'Test Topic',
        },
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const response = await request(app)
        .post('/api/v1/verification/document')
        .send({ documentId: docId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('MISMATCH');
    });

    it('should return validation error for invalid documentId', async () => {
      const response = await request(app)
        .post('/api/v1/verification/document')
        .send({ documentId: 'not-a-uuid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/verification/batch', () => {
    it('should verify batch of documents', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          topicId: 'topic-1',
          originalName: 'test1.pdf',
          hash: 'abc123hash',
          storagePath: '/storage/test1.pdf',
          status: 'CONFIRMED',
          topic: mockTopic,
        },
        {
          id: 'doc-2',
          topicId: 'topic-1',
          originalName: 'test2.pdf',
          hash: 'abc123hash',
          storagePath: '/storage/test2.pdf',
          status: 'CONFIRMED',
          topic: mockTopic,
        },
      ];

      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('abc123hash');

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);
      (prisma.document.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDocuments[0])
        .mockResolvedValueOnce(mockDocuments[1]);
      (prisma.verificationReport.create as jest.Mock).mockResolvedValue({
        id: 'report-1',
        topicId: 'topic-1',
        totalDocuments: 2,
        verified: 2,
        mismatches: 0,
        notFound: 0,
        errors: 0,
        results: [],
        startedAt: new Date(),
        completedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/v1/verification/batch')
        .send({ topicId: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalDocuments).toBe(2);
    });

    it('should return 404 for non-existent topic', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/verification/batch')
        .send({ topicId: '550e8400-e29b-41d4-a716-446655440001' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/verification/reports', () => {
    it('should list verification reports', async () => {
      const mockReports = [
        {
          id: 'report-1',
          topicId: 'topic-1',
          totalDocuments: 5,
          verified: 4,
          mismatches: 1,
          notFound: 0,
          errors: 0,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      (prisma.verificationReport.findMany as jest.Mock).mockResolvedValue(mockReports);

      const response = await request(app)
        .get('/api/v1/verification/reports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter reports by topicId', async () => {
      (prisma.verificationReport.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/verification/reports?topicId=topic-1')
        .expect(200);

      expect(prisma.verificationReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topicId: 'topic-1' },
        })
      );
    });
  });

  describe('GET /api/v1/verification/reports/:id', () => {
    it('should get a report by ID', async () => {
      const mockReport = {
        id: 'report-1',
        topicId: 'topic-1',
        totalDocuments: 5,
        verified: 5,
        mismatches: 0,
        notFound: 0,
        errors: 0,
        results: [],
        startedAt: new Date(),
        completedAt: new Date(),
      };

      (prisma.verificationReport.findUnique as jest.Mock).mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/v1/verification/reports/report-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('report-1');
    });

    it('should return 404 for non-existent report', async () => {
      (prisma.verificationReport.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/verification/reports/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
