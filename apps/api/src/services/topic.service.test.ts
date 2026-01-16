/**
 * Topic Service Tests
 * ===================
 */

import { topicService } from './topic.service';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    topic: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../lib/hedera', () => ({
  getTopicService: jest.fn(() => ({
    createTopic: jest.fn().mockResolvedValue({
      topicId: '0.0.123456',
      transactionId: '0.0.12345@1234567890.123456789',
    }),
    submitTopicBinding: jest.fn().mockResolvedValue({
      transactionId: '0.0.12345@1234567890.123456790',
      sequenceNumber: 1,
      bindingHash: 'bindingHash123',
      consensusTimestamp: '2024-01-15T00:00:00Z',
    }),
  })),
  getMirrorNodeService: jest.fn(() => ({
    getTopicMessages: jest.fn().mockResolvedValue([
      {
        sequenceNumber: 1,
        consensusTimestamp: '1705276800.123456789',
        message: 'test message',
      },
    ]),
  })),
}));

import prisma from '../lib/prisma';
import { NotFoundError } from '../middleware/error-handler';

describe('TopicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTopic', () => {
    it('should create a topic on Hedera and store in database', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
        description: 'Test description',
        companyIdentifier: 'GLYPHHASH',
        ownerId: 'user-1',
        bindingHash: 'bindingHash123',
        bindingTimestamp: new Date(),
        bindingTxId: '0.0.12345@1234567890.123456790',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.create as jest.Mock).mockResolvedValue(mockTopic);

      const result = await topicService.createTopic({
        name: 'Test Topic',
        description: 'Test description',
        companyIdentifier: 'GLYPHHASH',
        ownerId: 'user-1',
      });

      expect(result.topic).toBeDefined();
      expect(result.topic.topicId).toBe('0.0.123456');
      expect(result.transactionId).toBe('0.0.12345@1234567890.123456789');
      expect(prisma.topic.create).toHaveBeenCalled();
    });

    it('should throw HederaError when topic creation fails', async () => {
      const { getTopicService } = require('../lib/hedera');
      getTopicService.mockReturnValue({
        createTopic: jest.fn().mockRejectedValue(new Error('Hedera error')),
        submitTopicBinding: jest.fn(),
      });

      await expect(
        topicService.createTopic({
          name: 'Test Topic',
          companyIdentifier: 'GLYPHHASH',
          ownerId: 'user-1',
        })
      ).rejects.toThrow('Failed to create topic');
    });
  });

  describe('listTopics', () => {
    it('should list topics for a user with document counts', async () => {
      const mockTopics = [
        {
          id: 'topic-1',
          topicId: '0.0.123456',
          name: 'Topic 1',
          ownerId: 'user-1',
          _count: { documents: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'topic-2',
          topicId: '0.0.789012',
          name: 'Topic 2',
          ownerId: 'user-1',
          _count: { documents: 3 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.topic.findMany as jest.Mock).mockResolvedValue(mockTopics);

      const result = await topicService.listTopics('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]._count.documents).toBe(5);
      expect(prisma.topic.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      });
    });
  });

  describe('getTopicById', () => {
    it('should get a topic by ID', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);

      const result = await topicService.getTopicById('topic-1');

      expect(result.id).toBe('topic-1');
      expect(prisma.topic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        topicService.getTopicById('non-existent')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTopicByHederaId', () => {
    it('should get a topic by Hedera ID', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);

      const result = await topicService.getTopicByHederaId('0.0.123456');

      expect(result.topicId).toBe('0.0.123456');
      expect(prisma.topic.findUnique).toHaveBeenCalledWith({
        where: { topicId: '0.0.123456' },
      });
    });

    it('should throw NotFoundError for non-existent Hedera ID', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        topicService.getTopicByHederaId('0.0.999999')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTopicMessages', () => {
    it('should get messages from Hedera topic', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);

      const result = await topicService.getTopicMessages('topic-1', { limit: 50 });

      expect(result).toHaveLength(1);
      expect(result[0].sequenceNumber).toBe(1);
    });
  });

  describe('updateTopic', () => {
    it('should update topic metadata', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Updated Topic',
        description: 'Updated description',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.update as jest.Mock).mockResolvedValue(mockTopic);

      const result = await topicService.updateTopic('topic-1', {
        name: 'Updated Topic',
        description: 'Updated description',
      });

      expect(result.name).toBe('Updated Topic');
      expect(prisma.topic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: {
          name: 'Updated Topic',
          description: 'Updated description',
        },
      });
    });

    it('should update only provided fields', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Updated Topic',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.update as jest.Mock).mockResolvedValue(mockTopic);

      await topicService.updateTopic('topic-1', { name: 'Updated Topic' });

      expect(prisma.topic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: {
          name: 'Updated Topic',
        },
      });
    });
  });

  describe('deleteTopic', () => {
    it('should delete a topic with no documents', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
        documents: [],
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);
      (prisma.topic.delete as jest.Mock).mockResolvedValue(mockTopic);

      await topicService.deleteTopic('topic-1');

      expect(prisma.topic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
    });

    it('should throw NotFoundError for non-existent topic', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        topicService.deleteTopic('non-existent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error when topic has documents', async () => {
      const mockTopic = {
        id: 'topic-1',
        topicId: '0.0.123456',
        name: 'Test Topic',
        documents: [{ id: 'doc-1' }],
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);

      await expect(
        topicService.deleteTopic('topic-1')
      ).rejects.toThrow('Cannot delete topic with 1 documents');
    });
  });
});
