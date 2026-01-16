/**
 * Topic Routes Tests
 * ==================
 */

import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    topic: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
      bindingHash: 'abc123hash',
      consensusTimestamp: '2024-01-15T00:00:00Z',
    }),
  })),
  getMirrorNodeService: jest.fn(() => ({
    getTopicMessages: jest.fn().mockResolvedValue([]),
  })),
}));

import prisma from '../lib/prisma';

describe('Topic Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/topics', () => {
    it('should create a new topic', async () => {
      const mockTopic = {
        id: 'uuid-123',
        topicId: '0.0.123456',
        name: 'Test Topic',
        description: 'Test description',
        companyIdentifier: 'ACME-CORP',
        ownerId: 'demo-user',
        bindingHash: 'abc123hash',
        bindingTimestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.create as jest.Mock).mockResolvedValue(mockTopic);

      const response = await request(app)
        .post('/api/v1/topics')
        .send({
          name: 'Test Topic',
          description: 'Test description',
          companyIdentifier: 'ACME-CORP',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topic.topicId).toBe('0.0.123456');
      expect(response.body.data.transactionId).toBeDefined();
    });

    it('should return 400 for invalid request', async () => {
      const response = await request(app)
        .post('/api/v1/topics')
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for name exceeding max length', async () => {
      const response = await request(app)
        .post('/api/v1/topics')
        .send({
          name: 'a'.repeat(101), // Exceeds 100 char limit
          companyIdentifier: 'ACME-CORP',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/topics', () => {
    it('should return list of topics', async () => {
      const mockTopics = [
        {
          id: 'uuid-1',
          topicId: '0.0.123456',
          name: 'Topic 1',
          ownerId: 'demo-user',
          companyIdentifier: 'ACME',
          bindingHash: 'hash1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid-2',
          topicId: '0.0.123457',
          name: 'Topic 2',
          ownerId: 'demo-user',
          companyIdentifier: 'ACME',
          bindingHash: 'hash2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.topic.findMany as jest.Mock).mockResolvedValue(mockTopics);

      const response = await request(app)
        .get('/api/v1/topics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/topics/:id', () => {
    it('should return topic by ID', async () => {
      const mockTopic = {
        id: 'uuid-123',
        topicId: '0.0.123456',
        name: 'Test Topic',
        ownerId: 'demo-user',
        companyIdentifier: 'ACME',
        bindingHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(mockTopic);

      const response = await request(app)
        .get('/api/v1/topics/uuid-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('uuid-123');
    });

    it('should return 404 for non-existent topic', async () => {
      (prisma.topic.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/topics/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
