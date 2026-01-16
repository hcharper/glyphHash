/**
 * Verification Service Tests
 * ==========================
 */

import { verificationService } from './verification.service';

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
import { NotFoundError } from '../middleware/error-handler';

describe('VerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyDocument', () => {
    it('should verify a document successfully', async () => {
      const mockDocument = {
        id: 'doc-1',
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

      const result = await verificationService.verifyDocument('doc-1');

      expect(result.status).toBe('VERIFIED');
      expect(result.documentId).toBe('doc-1');
      expect(result.storedHash).toBe('abc123hash');
      expect(result.details).toContain('verified successfully');
    });

    it('should throw NotFoundError for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        verificationService.verifyDocument('non-existent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should return MISMATCH when file hash differs from stored', async () => {
      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('different-hash');

      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        originalName: 'test.pdf',
        hash: 'abc123hash',
        storagePath: '/storage/test.pdf',
        topic: {
          id: 'topic-1',
          topicId: '0.0.123456',
        },
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await verificationService.verifyDocument('doc-1');

      expect(result.status).toBe('MISMATCH');
      expect(result.details).toContain('file may have been modified');
    });

    it('should return NOT_FOUND when hash not on Hedera', async () => {
      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('abc123hash');

      const { getMirrorNodeService } = require('../lib/hedera');
      getMirrorNodeService.mockReturnValue({
        findDocumentHash: jest.fn().mockResolvedValue(null),
      });

      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        originalName: 'test.pdf',
        hash: 'abc123hash',
        storagePath: '/storage/test.pdf',
        topic: {
          id: 'topic-1',
          topicId: '0.0.123456',
        },
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await verificationService.verifyDocument('doc-1');

      expect(result.status).toBe('NOT_FOUND');
      expect(result.details).toContain('not found on Hedera');
    });

    it('should return MISMATCH when Hedera hash differs', async () => {
      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('abc123hash');

      const { getMirrorNodeService } = require('../lib/hedera');
      getMirrorNodeService.mockReturnValue({
        findDocumentHash: jest.fn().mockResolvedValue({
          message: {
            sequenceNumber: 1,
            consensusTimestamp: '1705276800.123456789',
          },
          payload: {
            type: 'DOCUMENT_HASH',
            payload: {
              documentId: 'doc-1',
              hash: 'different-hedera-hash',
              filenameHash: 'filenamehash123',
            },
          },
        }),
      });

      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        originalName: 'test.pdf',
        hash: 'abc123hash',
        storagePath: '/storage/test.pdf',
        topic: {
          id: 'topic-1',
          topicId: '0.0.123456',
        },
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await verificationService.verifyDocument('doc-1');

      expect(result.status).toBe('MISMATCH');
      expect(result.details).toContain('Hedera hash does not match');
    });

    it('should return ERROR when storage read fails', async () => {
      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('abc123hash');

      const { getFile } = require('../lib/storage');
      getFile.mockRejectedValue(new Error('Storage error'));

      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        originalName: 'test.pdf',
        hash: 'abc123hash',
        storagePath: '/storage/test.pdf',
        topic: {
          id: 'topic-1',
          topicId: '0.0.123456',
        },
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await verificationService.verifyDocument('doc-1');

      expect(result.status).toBe('ERROR');
      expect(result.details).toContain('Storage error');
    });
  });

  describe('verifyBatch', () => {
    beforeEach(() => {
      // Reset mocks for batch tests
      const { createFileHash } = require('@glyphhash/hedera');
      createFileHash.mockReturnValue('abc123hash');

      const { getMirrorNodeService } = require('../lib/hedera');
      getMirrorNodeService.mockReturnValue({
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
            },
          },
        }),
      });

      const { getFile } = require('../lib/storage');
      getFile.mockResolvedValue(Buffer.from('test file content'));
    });

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
          topic: mockTopic,
        },
        {
          id: 'doc-2',
          topicId: 'topic-1',
          originalName: 'test2.pdf',
          hash: 'abc123hash',
          storagePath: '/storage/test2.pdf',
          topic: mockTopic,
        },
      ];

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);
      (prisma.document.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockDocuments[0])
        .mockResolvedValueOnce(mockDocuments[1]);
      (prisma.verificationReport.create as jest.Mock).mockImplementation((data) => ({
        id: 'report-1',
        ...data.data,
      }));

      const result = await verificationService.verifyBatch({
        topicId: 'topic-1',
      });

      expect(result.totalDocuments).toBe(2);
      expect(result.verified).toBe(2);
      expect(result.mismatches).toBe(0);
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        verificationService.verifyBatch({ topicId: 'non-existent' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should filter by date range', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.verificationReport.create as jest.Mock).mockImplementation((data) => ({
        id: 'report-1',
        ...data.data,
      }));

      await verificationService.verifyBatch({
        topicId: 'topic-1',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      });

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter by categories', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.verificationReport.create as jest.Mock).mockImplementation((data) => ({
        id: 'report-1',
        ...data.data,
      }));

      await verificationService.verifyBatch({
        topicId: 'topic-1',
        categories: ['EVIDENCE', 'POLICY_DOCUMENT'],
      });

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ['EVIDENCE', 'POLICY_DOCUMENT'] },
          }),
        })
      );
    });
  });

  describe('listReports', () => {
    it('should list verification reports', async () => {
      const mockReports = [
        {
          id: 'report-1',
          topicId: 'topic-1',
          totalDocuments: 10,
          verified: 9,
          mismatches: 1,
          notFound: 0,
          errors: 0,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      (prisma.verificationReport.findMany as jest.Mock).mockResolvedValue(mockReports);

      const result = await verificationService.listReports({
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(result[0].totalDocuments).toBe(10);
    });

    it('should filter by topicId', async () => {
      (prisma.verificationReport.findMany as jest.Mock).mockResolvedValue([]);

      await verificationService.listReports({
        topicId: 'topic-1',
        limit: 20,
        offset: 0,
      });

      expect(prisma.verificationReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topicId: 'topic-1' },
        })
      );
    });
  });

  describe('getReportById', () => {
    it('should get a report by ID', async () => {
      const mockReport = {
        id: 'report-1',
        topicId: 'topic-1',
        totalDocuments: 10,
        verified: 10,
        results: [],
      };

      (prisma.verificationReport.findUnique as jest.Mock).mockResolvedValue(mockReport);

      const result = await verificationService.getReportById('report-1');

      expect(result.id).toBe('report-1');
    });

    it('should throw NotFoundError for non-existent report', async () => {
      (prisma.verificationReport.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        verificationService.getReportById('non-existent')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
