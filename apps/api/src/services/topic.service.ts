/**
 * Topic Service
 * =============
 * Business logic for topic management
 */

import prisma from '../lib/prisma.js';
import { getTopicService, getMirrorNodeService } from '../lib/hedera.js';
import { NotFoundError, HederaError } from '../middleware/error-handler.js';
import type { Topic, CreateTopicRequest, CreateTopicResponse, HederaMessage } from '@glyphhash/types';

interface CreateTopicParams extends CreateTopicRequest {
  ownerId: string;
}

class TopicServiceImpl {
  /**
   * Create a new topic on Hedera and store in database
   */
  async createTopic(params: CreateTopicParams): Promise<CreateTopicResponse> {
    const { name, description, companyIdentifier, ownerId } = params;

    try {
      const hederaTopicService = getTopicService();

      // 1. Create topic on Hedera
      const { topicId, transactionId } = await hederaTopicService.createTopic(
        `GlyphHash: ${name}`
      );

      // 2. Submit binding message (first message establishing ownership)
      const bindingResult = await hederaTopicService.submitTopicBinding(
        topicId,
        companyIdentifier
      );

      // 3. Store in database
      const topic = await prisma.topic.create({
        data: {
          topicId,
          name,
          description,
          companyIdentifier,
          ownerId,
          bindingHash: bindingResult.bindingHash,
          bindingTimestamp: new Date(),
          bindingTxId: bindingResult.transactionId,
        },
      });

      return {
        topic: this.mapTopic(topic),
        transactionId,
        consensusTimestamp: bindingResult.consensusTimestamp,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new HederaError(`Failed to create topic: ${error.message}`, error);
      }
      throw error;
    }
  }

  /**
   * List topics for a user
   */
  async listTopics(ownerId: string): Promise<any[]> {
    const topics = await prisma.topic.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    return topics.map((t) => ({
      ...this.mapTopic(t),
      _count: t._count,
    }));
  }

  /**
   * Get topic by internal ID
   */
  async getTopicById(id: string): Promise<Topic> {
    const topic = await prisma.topic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new NotFoundError(`Topic not found: ${id}`);
    }

    return this.mapTopic(topic);
  }

  /**
   * Get topic by Hedera topic ID
   */
  async getTopicByHederaId(topicId: string): Promise<Topic> {
    const topic = await prisma.topic.findUnique({
      where: { topicId },
    });

    if (!topic) {
      throw new NotFoundError(`Topic not found: ${topicId}`);
    }

    return this.mapTopic(topic);
  }

  /**
   * Get messages from Hedera topic via mirror node
   */
  async getTopicMessages(
    id: string,
    options: { limit?: number; sequenceNumber?: number } = {}
  ): Promise<HederaMessage[]> {
    const topic = await this.getTopicById(id);
    const mirrorNode = getMirrorNodeService();

    return mirrorNode.getTopicMessages(topic.topicId, options);
  }

  /**
   * Update topic metadata
   */
  async updateTopic(id: string, data: { name?: string; description?: string }): Promise<Topic> {
    const topic = await prisma.topic.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    return this.mapTopic(topic);
  }

  /**
   * Delete topic
   * Note: This only removes the topic from our database, not from Hedera
   */
  async deleteTopic(id: string): Promise<void> {
    // First check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { documents: { select: { id: true } } },
    });

    if (!topic) {
      throw new NotFoundError(`Topic not found: ${id}`);
    }

    if (topic.documents.length > 0) {
      throw new Error(`Cannot delete topic with ${topic.documents.length} documents. Delete documents first.`);
    }

    await prisma.topic.delete({
      where: { id },
    });
  }

  /**
   * Map Prisma model to API type
   */
  private mapTopic(topic: any): Topic {
    return {
      id: topic.id,
      topicId: topic.topicId,
      name: topic.name,
      description: topic.description,
      ownerId: topic.ownerId,
      companyIdentifier: topic.companyIdentifier,
      bindingHash: topic.bindingHash,
      bindingTimestamp: topic.bindingTimestamp,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }
}

export const topicService = new TopicServiceImpl();
