/**
 * Mirror Node Service
 * ===================
 * Queries Hedera Mirror Node for message history and verification
 */

import type { HederaMessage, MirrorNodeMessagesResponse, HashMessage } from '@glyphhash/types';

export interface MirrorNodeConfig {
  baseUrl?: string;
  network?: 'mainnet' | 'testnet' | 'previewnet';
}

const MIRROR_NODE_URLS = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

export class MirrorNodeService {
  private baseUrl: string;

  constructor(config: MirrorNodeConfig = {}) {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const network = config.network || 'testnet';
      this.baseUrl = MIRROR_NODE_URLS[network];
    }
  }

  /**
   * Get all messages for a topic
   */
  async getTopicMessages(
    topicId: string,
    options: {
      limit?: number;
      sequenceNumber?: number;
      timestamp?: string;
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<HederaMessage[]> {
    const { limit = 100, sequenceNumber, timestamp, order = 'asc' } = options;

    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('order', order);

    if (sequenceNumber !== undefined) {
      params.set('sequencenumber', `gte:${sequenceNumber}`);
    }

    if (timestamp) {
      params.set('timestamp', `gte:${timestamp}`);
    }

    const url = `${this.baseUrl}/api/v1/topics/${topicId}/messages?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Mirror node request failed: ${response.status} ${response.statusText}`);
    }

    const data: MirrorNodeMessagesResponse = await response.json();
    return data.messages || [];
  }

  /**
   * Get all messages with pagination
   */
  async getAllTopicMessages(topicId: string): Promise<HederaMessage[]> {
    const allMessages: HederaMessage[] = [];
    let nextUrl: string | undefined = `${this.baseUrl}/api/v1/topics/${topicId}/messages?limit=100&order=asc`;

    while (nextUrl) {
      const response = await fetch(nextUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          break;
        }
        throw new Error(`Mirror node request failed: ${response.status}`);
      }

      const data: MirrorNodeMessagesResponse = await response.json();
      
      if (data.messages) {
        allMessages.push(...data.messages);
      }

      nextUrl = data.links?.next ? `${this.baseUrl}${data.links.next}` : undefined;
    }

    return allMessages;
  }

  /**
   * Get a specific message by sequence number
   */
  async getMessageBySequence(topicId: string, sequenceNumber: number): Promise<HederaMessage | null> {
    const messages = await this.getTopicMessages(topicId, {
      sequenceNumber,
      limit: 1,
    });

    const message = messages.find((m) => m.sequenceNumber === sequenceNumber);
    return message || null;
  }

  /**
   * Decode a base64 message and parse as HashMessage
   */
  decodeMessage(base64Message: string): HashMessage | null {
    try {
      const decoded = Buffer.from(base64Message, 'base64').toString('utf-8');
      return JSON.parse(decoded) as HashMessage;
    } catch {
      return null;
    }
  }

  /**
   * Get messages within a time range
   */
  async getMessagesByTimeRange(
    topicId: string,
    startTimestamp: string,
    endTimestamp: string
  ): Promise<HederaMessage[]> {
    const allMessages = await this.getAllTopicMessages(topicId);
    
    return allMessages.filter((msg) => {
      const msgTimestamp = msg.consensusTimestamp;
      return msgTimestamp >= startTimestamp && msgTimestamp <= endTimestamp;
    });
  }

  /**
   * Find document hash message by document ID
   */
  async findDocumentHash(topicId: string, documentId: string): Promise<{
    message: HederaMessage;
    payload: HashMessage;
  } | null> {
    const messages = await this.getAllTopicMessages(topicId);

    for (const message of messages) {
      const decoded = this.decodeMessage(message.message);
      
      if (
        decoded &&
        decoded.type === 'DOCUMENT_HASH' &&
        'documentId' in decoded.payload &&
        decoded.payload.documentId === documentId
      ) {
        return { message, payload: decoded };
      }
    }

    return null;
  }

  /**
   * Get topic info
   */
  async getTopicInfo(topicId: string): Promise<{
    topicId: string;
    memo: string;
    adminKey: string | null;
    submitKey: string | null;
    createdTimestamp: string;
  } | null> {
    const url = `${this.baseUrl}/api/v1/topics/${topicId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Mirror node request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      topicId: data.topic_id,
      memo: data.memo || '',
      adminKey: data.admin_key?.key || null,
      submitKey: data.submit_key?.key || null,
      createdTimestamp: data.created_timestamp,
    };
  }
}
