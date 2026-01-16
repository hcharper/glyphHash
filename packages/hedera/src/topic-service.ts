/**
 * Topic Service
 * =============
 * Handles Hedera Consensus Service (HCS) topic operations
 */

import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
  Status,
} from '@hashgraph/sdk';
import type { HashMessage, TopicBindingPayload, DocumentHashPayload } from '@glyphhash/types';
import { createHash } from './utils.js';

export interface TopicServiceConfig {
  client: Client;
}

export interface CreateTopicResult {
  topicId: string;
  transactionId: string;
}

export interface SubmitMessageResult {
  transactionId: string;
  sequenceNumber: number;
  consensusTimestamp?: string;
}

export class TopicService {
  private client: Client;

  constructor(config: TopicServiceConfig) {
    this.client = config.client;
  }

  /**
   * Create a new HCS topic
   */
  async createTopic(memo?: string): Promise<CreateTopicResult> {
    const transaction = new TopicCreateTransaction();
    
    if (memo) {
      transaction.setTopicMemo(memo);
    }

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to create topic: ${receipt.status.toString()}`);
    }

    if (!receipt.topicId) {
      throw new Error('Topic ID not found in receipt');
    }

    return {
      topicId: receipt.topicId.toString(),
      transactionId: response.transactionId.toString(),
    };
  }

  /**
   * Submit a message to an HCS topic
   */
  async submitMessage(topicId: string, message: string): Promise<SubmitMessageResult> {
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message);

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to submit message: ${receipt.status.toString()}`);
    }

    return {
      transactionId: response.transactionId.toString(),
      sequenceNumber: receipt.topicSequenceNumber?.toNumber() ?? 0,
      consensusTimestamp: receipt.topicRunningHash 
        ? new Date().toISOString() // Actual timestamp from mirror node
        : undefined,
    };
  }

  /**
   * Create topic binding message (first message establishing ownership)
   */
  async submitTopicBinding(
    topicId: string,
    companyIdentifier: string
  ): Promise<SubmitMessageResult & { bindingHash: string }> {
    const bindingHash = createHash(`${companyIdentifier}:${topicId}`);

    const payload: TopicBindingPayload = {
      companyIdentifier,
      topicId,
      bindingHash,
    };

    const message: HashMessage = {
      type: 'TOPIC_BINDING',
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload,
    };

    const result = await this.submitMessage(topicId, JSON.stringify(message));

    return {
      ...result,
      bindingHash,
    };
  }

  /**
   * Submit document hash to topic
   */
  async submitDocumentHash(
    topicId: string,
    documentId: string,
    hash: string,
    filename: string,
    category: string,
    size: number,
    mimeType: string,
    metadata?: Record<string, unknown>
  ): Promise<SubmitMessageResult> {
    // Hash the filename for privacy - never store plaintext PII on blockchain
    const filenameHash = createHash(filename);
    
    const payload: DocumentHashPayload = {
      documentId,
      hash,
      filenameHash,
      category: category as DocumentHashPayload['category'],
      size,
      mimeType,
      metadata,
    };

    const message: HashMessage = {
      type: 'DOCUMENT_HASH',
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload,
    };

    return this.submitMessage(topicId, JSON.stringify(message));
  }

  /**
   * Get topic info (for validation)
   */
  async getTopicInfo(topicId: string): Promise<{ memo: string; sequenceNumber: number } | null> {
    try {
      const { TopicInfoQuery } = await import('@hashgraph/sdk');
      const query = new TopicInfoQuery().setTopicId(TopicId.fromString(topicId));
      const info = await query.execute(this.client);
      
      return {
        memo: info.topicMemo,
        sequenceNumber: info.sequenceNumber.toNumber(),
      };
    } catch (error) {
      // Topic doesn't exist or other error
      return null;
    }
  }
}
