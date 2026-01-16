/**
 * Document Service Tests
 * ======================
 */

import { documentService } from './document.service';

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
}));

jest.mock('../lib/storage', () => ({
  storeFile: jest.fn().mockResolvedValue({
    filename: 'stored-file-123.pdf',
    storagePath: '/storage/stored-file-123.pdf',
  }),
  getFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn(),
  }),
}));

jest.mock('@glyphhash/hedera', () => ({
  createFileHash: jest.fn().mockReturnValue('abc123hash456def'),
}));

import prisma from '../lib/prisma';
import { NotFoundError } from '../middleware/error-handler';

describe('DocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload a document and submit hash to Hedera', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
      };

      const mockDocument = {
        id: 'doc-1',
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

      const file = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = await documentService.uploadDocument({
        file,
        topicId: 'topic-1',
        category: 'EVIDENCE',
        description: 'Test document',
      });

      expect(result.document).toBeDefined();
      expect(result.transactionId).toBe('0.0.12345@1234567890.123456789');
      expect(prisma.document.create).toHaveBeenCalled();
      expect(prisma.document.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      const file = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      await expect(
        documentService.uploadDocument({
          file,
          topicId: 'non-existent',
          category: 'EVIDENCE',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should mark document as FAILED when Hedera submission fails', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
      };

      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        status: 'PENDING',
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.document.create as jest.Mock).mockResolvedValue(mockDocument);
      (prisma.document.update as jest.Mock).mockResolvedValue({ ...mockDocument, status: 'FAILED' });

      const { getTopicService } = require('../lib/hedera');
      getTopicService.mockReturnValue({
        submitDocumentHash: jest.fn().mockRejectedValue(new Error('Hedera submission failed')),
      });

      const file = {
        buffer: Buffer.from('test file content'),
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      await expect(
        documentService.uploadDocument({
          file,
          topicId: 'topic-1',
          category: 'EVIDENCE',
        })
      ).rejects.toThrow();

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('listDocuments', () => {
    it('should list documents with filters', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          topicId: 'topic-1',
          originalName: 'test.pdf',
          category: 'EVIDENCE',
          status: 'CONFIRMED',
          topic: { id: 'topic-1', name: 'Test Topic', topicId: '0.0.123456' },
        },
      ];

      (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await documentService.listDocuments({
        topicId: 'topic-1',
        category: 'EVIDENCE',
        status: 'CONFIRMED',
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(1);
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          topicId: 'topic-1',
          category: 'EVIDENCE',
          status: 'CONFIRMED',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              topicId: true,
            },
          },
        },
      });
    });

    it('should list all documents when no filters provided', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([]);

      await documentService.listDocuments({
        limit: 50,
        offset: 0,
      });

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              topicId: true,
            },
          },
        },
      });
    });
  });

  describe('getDocumentById', () => {
    it('should get a document by ID', async () => {
      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        originalName: 'test.pdf',
        status: 'CONFIRMED',
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await documentService.getDocumentById('doc-1');

      expect(result.id).toBe('doc-1');
      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should throw NotFoundError for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        documentService.getDocumentById('non-existent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        storagePath: '/storage/test.pdf',
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);
      (prisma.document.delete as jest.Mock).mockResolvedValue(mockDocument);

      await documentService.deleteDocument('doc-1');

      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should throw NotFoundError for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        documentService.deleteDocument('non-existent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('downloadDocument', () => {
    it('should return a stream and document info', async () => {
      const mockDocument = {
        id: 'doc-1',
        topicId: 'topic-1',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        storagePath: '/storage/test.pdf',
      };

      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await documentService.downloadDocument('doc-1');

      expect(result.document).toBeDefined();
      expect(result.stream).toBeDefined();
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update document status', async () => {
      const mockDocument = {
        id: 'doc-1',
        status: 'CONFIRMED',
        consensusTimestamp: new Date(),
      };

      (prisma.document.update as jest.Mock).mockResolvedValue(mockDocument);

      const result = await documentService.updateDocumentStatus(
        'doc-1',
        'CONFIRMED',
        new Date()
      );

      expect(result.status).toBe('CONFIRMED');
      expect(prisma.document.update).toHaveBeenCalled();
    });
  });
});
