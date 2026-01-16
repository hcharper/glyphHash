/**
 * Document Routes Tests
 * =====================
 */

import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    topic: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../lib/hedera', () => ({
  getTopicService: jest.fn(() => ({
    submitDocumentHash: jest.fn().mockResolvedValue({
      transactionId: '0.0.12345@1234567890.123456789',
      sequenceNumber: 1,
      consensusTimestamp: '2024-01-15T00:00:00Z',
    }),
  })),
  getMirrorNodeService: jest.fn(() => ({})),
}));

jest.mock('../lib/storage', () => ({
  storeFile: jest.fn().mockResolvedValue({
    filename: 'stored-file-123.pdf',
    storagePath: '/storage/stored-file-123.pdf',
  }),
  getFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  createReadStream: jest.fn(),
}));

jest.mock('@glyphhash/hedera', () => ({
  createFileHash: jest.fn().mockReturnValue('abc123hash456def'),
}));

import prisma from '../lib/prisma';

describe('Document Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/documents', () => {
    it('should list all documents', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          topicId: 'topic-1',
          filename: 'file1.pdf',
          originalName: 'Original File 1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          category: 'EVIDENCE',
          hash: 'hash1',
          storagePath: '/storage/file1.pdf',
          status: 'CONFIRMED',
          sequenceNumber: 1,
          consensusTimestamp: new Date(),
          transactionId: 'tx-1',
          metadata: null,
          version: 1,
          previousVersionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          topic: {
            id: 'topic-1',
            name: 'Test Topic',
            topicId: '0.0.123456',
          },
        },
      ];

      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);

      const response = await request(app)
        .get('/api/v1/documents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].originalName).toBe('Original File 1.pdf');
    });

    it('should filter documents by topicId', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/documents?topicId=topic-1')
        .expect(200);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topicId: 'topic-1',
          }),
        })
      );
    });

    it('should filter documents by category', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/documents?category=EVIDENCE')
        .expect(200);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'EVIDENCE',
          }),
        })
      );
    });

    it('should filter documents by status', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/documents?status=CONFIRMED')
        .expect(200);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CONFIRMED',
          }),
        })
      );
    });

    it('should apply pagination with limit and offset', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/documents?limit=10&offset=20')
        .expect(200);

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should get a document by ID', async () => {
      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        filename: 'file1.pdf',
        originalName: 'Original File 1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        category: 'EVIDENCE',
        hash: 'hash1',
        storagePath: '/storage/file1.pdf',
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const response = await request(app)
        .get('/api/v1/documents/doc-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('doc-1');
    });

    it('should return 404 for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/documents/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/documents', () => {
    it('should upload a document successfully', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
      };

      const mockDocument = {
        id: 'doc-new',
        topicId: 'topic-1',
        filename: 'stored-file-123.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        category: 'EVIDENCE',
        hash: 'abc123hash456def',
        storagePath: '/storage/stored-file-123.pdf',
        status: 'SUBMITTED',
        transactionId: '0.0.12345@1234567890.123456789',
        sequenceNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.document.create as jest.Mock).mockResolvedValue({ ...mockDocument, status: 'PENDING' });
      (prisma.document.update as jest.Mock).mockResolvedValue(mockDocument);

      const response = await request(app)
        .post('/api/v1/documents')
        .field('metadata', JSON.stringify({
          topicId: '550e8400-e29b-41d4-a716-446655440000',
          category: 'EVIDENCE',
          description: 'Test document',
        }))
        .attach('file', Buffer.from('test file content'), 'test.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toBeDefined();
      expect(response.body.data.transactionId).toBeDefined();
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/v1/documents')
        .field('metadata', JSON.stringify({
          topicId: '550e8400-e29b-41d4-a716-446655440000',
          category: 'EVIDENCE',
        }))
        .expect(400);

      expect(response.body.success).toBe(false);
      // Could be validation error or file required error depending on processing order
    });

    it('should return 404 when topic does not exist', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/documents')
        .field('metadata', JSON.stringify({
          topicId: '550e8400-e29b-41d4-a716-446655440000',
          category: 'EVIDENCE',
        }))
        .attach('file', Buffer.from('test file content'), 'test.pdf')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    it('should delete a document successfully', async () => {
      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        storagePath: '/storage/file1.pdf',
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);
      (prisma.document.delete as jest.Mock).mockResolvedValue(mockDocument);

      const response = await request(app)
        .delete('/api/v1/documents/doc-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should return 404 for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/v1/documents/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
