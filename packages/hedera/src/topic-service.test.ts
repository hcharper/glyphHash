/**
 * Topic Service Tests
 * ===================
 * Unit tests for HCS topic operations
 */

import { TopicService, CreateTopicResult, SubmitMessageResult } from './topic-service';
import { createHash } from './utils';

// Mock the Hedera SDK
jest.mock('@hashgraph/sdk', () => {
  const mockExecute = jest.fn();
  const mockGetReceipt = jest.fn();

  return {
    Client: {
      forTestnet: jest.fn(() => ({
        setOperator: jest.fn(),
        setDefaultMaxTransactionFee: jest.fn(),
        setDefaultMaxQueryPayment: jest.fn(),
      })),
    },
    AccountId: {
      fromString: jest.fn((str: string) => ({ toString: () => str })),
    },
    PrivateKey: {
      fromString: jest.fn((str: string) => ({ toString: () => str })),
    },
    TopicId: {
      fromString: jest.fn((str: string) => ({ toString: () => str })),
    },
    TopicCreateTransaction: jest.fn(() => ({
      setTopicMemo: jest.fn().mockReturnThis(),
      execute: mockExecute,
    })),
    TopicMessageSubmitTransaction: jest.fn(() => ({
      setTopicId: jest.fn().mockReturnThis(),
      setMessage: jest.fn().mockReturnThis(),
      execute: mockExecute,
    })),
    Status: {
      Success: 'SUCCESS',
    },
    __mockExecute: mockExecute,
    __mockGetReceipt: mockGetReceipt,
  };
});

describe('TopicService', () => {
  let topicService: TopicService;
  let mockClient: any;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const sdk = require('@hashgraph/sdk');
    mockExecute = sdk.__mockExecute;

    mockClient = {
      setOperator: jest.fn(),
      setDefaultMaxTransactionFee: jest.fn(),
      setDefaultMaxQueryPayment: jest.fn(),
    };

    topicService = new TopicService({ client: mockClient });
  });

  describe('createTopic', () => {
    it('should create a topic and return topic ID', async () => {
      const mockTopicId = '0.0.123456';
      const mockTransactionId = '0.0.12345@1234567890.123456789';

      mockExecute.mockResolvedValueOnce({
        transactionId: { toString: () => mockTransactionId },
        getReceipt: jest.fn().mockResolvedValueOnce({
          status: 'SUCCESS',
          topicId: { toString: () => mockTopicId },
        }),
      });

      const result = await topicService.createTopic('Test Topic');

      expect(result).toEqual({
        topicId: mockTopicId,
        transactionId: mockTransactionId,
      });
    });

    it('should throw error when topic creation fails', async () => {
      mockExecute.mockResolvedValueOnce({
        transactionId: { toString: () => 'tx-id' },
        getReceipt: jest.fn().mockResolvedValueOnce({
          status: 'INVALID_TOPIC_ID',
          topicId: null,
        }),
      });

      await expect(topicService.createTopic()).rejects.toThrow(
        'Failed to create topic'
      );
    });

    it('should throw error when topic ID is missing from receipt', async () => {
      mockExecute.mockResolvedValueOnce({
        transactionId: { toString: () => 'tx-id' },
        getReceipt: jest.fn().mockResolvedValueOnce({
          status: 'SUCCESS',
          topicId: null,
        }),
      });

      await expect(topicService.createTopic()).rejects.toThrow(
        'Topic ID not found in receipt'
      );
    });
  });

  describe('submitMessage', () => {
    it('should submit a message and return sequence number', async () => {
      const mockTransactionId = '0.0.12345@1234567890.123456789';
      const mockSequenceNumber = 42;

      mockExecute.mockResolvedValueOnce({
        transactionId: { toString: () => mockTransactionId },
        getReceipt: jest.fn().mockResolvedValueOnce({
          status: 'SUCCESS',
          topicSequenceNumber: { toNumber: () => mockSequenceNumber },
          topicRunningHash: Buffer.from('hash'),
        }),
      });

      const result = await topicService.submitMessage(
        '0.0.123456',
        'Test message'
      );

      expect(result.transactionId).toBe(mockTransactionId);
      expect(result.sequenceNumber).toBe(mockSequenceNumber);
    });

    it('should throw error when message submission fails', async () => {
      mockExecute.mockResolvedValueOnce({
        transactionId: { toString: () => 'tx-id' },
        getReceipt: jest.fn().mockResolvedValueOnce({
          status: 'INVALID_TOPIC_ID',
        }),
      });

      await expect(
        topicService.submitMessage('0.0.123456', 'Test message')
      ).rejects.toThrow('Failed to submit message');
    });
  });

  describe('submitTopicBinding', () => {
    it('should submit topic binding with correct hash', async () => {
      const topicId = '0.0.123456';
      const companyIdentifier = 'ACME-CORP';
      const expectedBindingHash = createHash(`${companyIdentifier}:${topicId}`);
      const mockTransactionId = '0.0.12345@1234567890.123456789';

      mockExecute.mockResolvedValueOnce({
        transactionId: { toString: () => mockTransactionId },
        getReceipt: jest.fn().mockResolvedValueOnce({
          status: 'SUCCESS',
          topicSequenceNumber: { toNumber: () => 1 },
          topicRunningHash: Buffer.from('hash'),
        }),
      });

      const result = await topicService.submitTopicBinding(
        topicId,
        companyIdentifier
      );

      expect(result.bindingHash).toBe(expectedBindingHash);
      expect(result.sequenceNumber).toBe(1);
    });

    it('should include correct message structure in binding', async () => {
      const topicId = '0.0.123456';
      const companyIdentifier = 'ACME-CORP';

      const sdk = require('@hashgraph/sdk');
      let capturedMessage: string = '';

      sdk.TopicMessageSubmitTransaction.mockImplementationOnce(() => ({
        setTopicId: jest.fn().mockReturnThis(),
        setMessage: jest.fn((msg: string) => {
          capturedMessage = msg;
          return {
            execute: jest.fn().mockResolvedValueOnce({
              transactionId: { toString: () => 'tx-id' },
              getReceipt: jest.fn().mockResolvedValueOnce({
                status: 'SUCCESS',
                topicSequenceNumber: { toNumber: () => 1 },
                topicRunningHash: Buffer.from('hash'),
              }),
            }),
          };
        }),
      }));

      // Re-create service with fresh mocks
      const service = new TopicService({ client: mockClient });
      await service.submitTopicBinding(topicId, companyIdentifier);

      const parsed = JSON.parse(capturedMessage);
      expect(parsed.type).toBe('TOPIC_BINDING');
      expect(parsed.version).toBe('1.0');
      expect(parsed.payload.companyIdentifier).toBe(companyIdentifier);
      expect(parsed.payload.topicId).toBe(topicId);
      expect(parsed.payload.bindingHash).toBeDefined();
    });
  });

  describe('submitDocumentHash', () => {
    it('should submit document hash with correct payload', async () => {
      const sdk = require('@hashgraph/sdk');
      let capturedMessage: string = '';

      sdk.TopicMessageSubmitTransaction.mockImplementationOnce(() => ({
        setTopicId: jest.fn().mockReturnThis(),
        setMessage: jest.fn((msg: string) => {
          capturedMessage = msg;
          return {
            execute: jest.fn().mockResolvedValueOnce({
              transactionId: { toString: () => 'tx-id' },
              getReceipt: jest.fn().mockResolvedValueOnce({
                status: 'SUCCESS',
                topicSequenceNumber: { toNumber: () => 5 },
                topicRunningHash: Buffer.from('hash'),
              }),
            }),
          };
        }),
      }));

      const service = new TopicService({ client: mockClient });
      const result = await service.submitDocumentHash(
        '0.0.123456',
        'doc-123',
        'abc123hash',
        'report.pdf',
        'SECURITY_MONITORING',
        1024,
        'application/pdf',
        { quarter: 'Q1' }
      );

      expect(result.sequenceNumber).toBe(5);

      const parsed = JSON.parse(capturedMessage);
      expect(parsed.type).toBe('DOCUMENT_HASH');
      expect(parsed.payload.documentId).toBe('doc-123');
      expect(parsed.payload.hash).toBe('abc123hash');
      expect(parsed.payload.filename).toBe('report.pdf');
      expect(parsed.payload.category).toBe('SECURITY_MONITORING');
      expect(parsed.payload.size).toBe(1024);
      expect(parsed.payload.metadata).toEqual({ quarter: 'Q1' });
    });
  });
});
