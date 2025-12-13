import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface MirrorNodeMessage {
  consensus_timestamp: string;
  topic_id: string;
  message: string;
  running_hash: string;
  sequence_number: number;
  payer_account_id: string;
}

@Injectable()
export class MirrorNodeService {
  private readonly logger = new Logger(MirrorNodeService.name);
  private readonly baseUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';
  }

  /**
   * Get messages from a topic
   */
  async getTopicMessages(
    topicId: string,
    sequenceNumber?: string,
  ): Promise<MirrorNodeMessage[]> {
    try {
      let url = `${this.baseUrl}/api/v1/topics/${topicId}/messages`;
      
      if (sequenceNumber) {
        url += `?sequencenumber=gt:${sequenceNumber}&order=asc`;
      } else {
        url += '?order=asc';
      }

      const response = await firstValueFrom(
        this.httpService.get<{ messages: MirrorNodeMessage[] }>(url),
      );

      return response.data.messages || [];
    } catch (error) {
      this.logger.error(
        `Failed to fetch topic messages: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a specific message by sequence number
   */
  async getMessageBySequence(
    topicId: string,
    sequenceNumber: string,
  ): Promise<MirrorNodeMessage | null> {
    try {
      const url = `${this.baseUrl}/api/v1/topics/${topicId}/messages/${sequenceNumber}`;
      const response = await firstValueFrom(
        this.httpService.get<MirrorNodeMessage>(url),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(
        `Failed to fetch message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Poll for new messages (used by worker)
   */
  async pollTopicMessages(
    topicId: string,
    lastSequence: string = '0',
    callback: (message: MirrorNodeMessage) => void,
  ): Promise<void> {
    try {
      const messages = await this.getTopicMessages(topicId, lastSequence);
      
      for (const message of messages) {
        callback(message);
      }
    } catch (error) {
      this.logger.error(
        `Error polling topic messages: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Decode base64 message content
   */
  decodeMessage(base64Message: string): string {
    try {
      return Buffer.from(base64Message, 'base64').toString('utf-8');
    } catch (error) {
      this.logger.error(`Failed to decode message: ${error.message}`);
      return base64Message;
    }
  }
}
