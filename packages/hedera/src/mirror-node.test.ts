/**
 * Mirror Node Service Tests
 * =========================
 * Unit tests for Mirror Node queries
 */

import { MirrorNodeService } from './mirror-node';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MirrorNodeService', () => {
  let service: MirrorNodeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MirrorNodeService({ network: 'testnet' });
  });

  describe('constructor', () => {
    it('should use testnet URL by default', () => {
      const testService = new MirrorNodeService();
      expect(testService['baseUrl']).toBe('https://testnet.mirrornode.hedera.com');
    });

    it('should use custom base URL when provided', () => {
      const testService = new MirrorNodeService({ baseUrl: 'http://localhost:5551' });
      expect(testService['baseUrl']).toBe('http://localhost:5551');
    });

    it('should use mainnet URL when specified', () => {
      const testService = new MirrorNodeService({ network: 'mainnet' });
      expect(testService['baseUrl']).toBe('https://mainnet-public.mirrornode.hedera.com');
    });
  });

  describe('getTopicMessages', () => {
    it('should fetch messages from mirror node', async () => {
      const mockMessages = [
        {
          consensusTimestamp: '1234567890.123456789',
          sequenceNumber: 1,
          message: Buffer.from('test message').toString('base64'),
          topicId: '0.0.123456',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      });

      const messages = await service.getTopicMessages('0.0.123456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/topics/0.0.123456/messages')
      );
      expect(messages).toEqual(mockMessages);
    });

    it('should return empty array for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const messages = await service.getTopicMessages('0.0.999999');

      expect(messages).toEqual([]);
    });

    it('should throw error for non-404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getTopicMessages('0.0.123456')).rejects.toThrow(
        'Mirror node request failed: 500 Internal Server Error'
      );
    });

    it('should apply filters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      });

      await service.getTopicMessages('0.0.123456', {
        limit: 50,
        sequenceNumber: 10,
        order: 'desc',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sequencenumber=gte%3A10')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('order=desc')
      );
    });
  });

  describe('getAllTopicMessages', () => {
    it('should paginate through all messages', async () => {
      const page1 = {
        messages: [{ sequenceNumber: 1, message: 'msg1', consensusTimestamp: '1.0', topicId: '0.0.123456' }],
        links: { next: '/api/v1/topics/0.0.123456/messages?timestamp=gt:1.0' },
      };
      const page2 = {
        messages: [{ sequenceNumber: 2, message: 'msg2', consensusTimestamp: '2.0', topicId: '0.0.123456' }],
        links: {},
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) });

      const messages = await service.getAllTopicMessages('0.0.123456');

      expect(messages).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMessageBySequence', () => {
    it('should return message with matching sequence number', async () => {
      const mockMessage = {
        consensusTimestamp: '1234567890.123456789',
        sequenceNumber: 5,
        message: Buffer.from('test').toString('base64'),
        topicId: '0.0.123456',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [mockMessage] }),
      });

      const message = await service.getMessageBySequence('0.0.123456', 5);

      expect(message).toEqual(mockMessage);
    });

    it('should return null when message not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      });

      const message = await service.getMessageBySequence('0.0.123456', 999);

      expect(message).toBeNull();
    });
  });

  describe('decodeMessage', () => {
    it('should decode and parse valid HashMessage', () => {
      const hashMessage = {
        type: 'DOCUMENT_HASH',
        version: '1.0',
        timestamp: '2024-01-15T00:00:00Z',
        payload: {
          documentId: 'doc-123',
          hash: 'abc123',
          filename: 'test.pdf',
          category: 'SECURITY_MONITORING',
          size: 1024,
          mimeType: 'application/pdf',
        },
      };

      const encoded = Buffer.from(JSON.stringify(hashMessage)).toString('base64');
      const decoded = service.decodeMessage(encoded);

      expect(decoded).toEqual(hashMessage);
    });

    it('should return null for invalid base64', () => {
      const decoded = service.decodeMessage('not-valid-base64!!!');
      expect(decoded).toBeNull();
    });

    it('should return null for non-JSON content', () => {
      const encoded = Buffer.from('not json').toString('base64');
      const decoded = service.decodeMessage(encoded);
      expect(decoded).toBeNull();
    });
  });

  describe('findDocumentHash', () => {
    it('should find document hash by document ID', async () => {
      const hashMessage = {
        type: 'DOCUMENT_HASH',
        version: '1.0',
        timestamp: '2024-01-15T00:00:00Z',
        payload: {
          documentId: 'doc-123',
          hash: 'abc123',
          filename: 'test.pdf',
          category: 'SECURITY_MONITORING',
          size: 1024,
          mimeType: 'application/pdf',
        },
      };

      const mockMessages = [
        {
          consensusTimestamp: '1.0',
          sequenceNumber: 1,
          message: Buffer.from(JSON.stringify(hashMessage)).toString('base64'),
          topicId: '0.0.123456',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages, links: {} }),
      });

      const result = await service.findDocumentHash('0.0.123456', 'doc-123');

      expect(result).not.toBeNull();
      expect(result?.payload.payload).toEqual(hashMessage.payload);
    });

    it('should return null when document not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [], links: {} }),
      });

      const result = await service.findDocumentHash('0.0.123456', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTopicInfo', () => {
    it('should return topic info', async () => {
      const mockTopicInfo = {
        topic_id: '0.0.123456',
        memo: 'Test topic',
        admin_key: { key: 'admin-key' },
        submit_key: null,
        created_timestamp: '1234567890.123456789',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTopicInfo),
      });

      const info = await service.getTopicInfo('0.0.123456');

      expect(info).toEqual({
        topicId: '0.0.123456',
        memo: 'Test topic',
        adminKey: 'admin-key',
        submitKey: null,
        createdTimestamp: '1234567890.123456789',
      });
    });

    it('should return null for non-existent topic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const info = await service.getTopicInfo('0.0.999999');

      expect(info).toBeNull();
    });
  });
});
