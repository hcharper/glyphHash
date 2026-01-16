/**
 * Topic Routes
 * ============
 * Endpoints for Hedera topic management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import { topicService } from '../services/topic.service.js';
import type { ApiResponse, CreateTopicResponse, Topic } from '@glyphhash/types';

export const topicRoutes = Router();

// ===========================================
// Validation Schemas
// ===========================================

const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  companyIdentifier: z.string().min(1).max(100),
});

const updateTopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

// ===========================================
// Routes
// ===========================================

/**
 * POST /api/v1/topics
 * Create a new Hedera topic and establish binding
 */
topicRoutes.post(
  '/',
  validate(createTopicSchema),
  async (req: Request, res: Response) => {
    const { name, description, companyIdentifier } = req.body;

    const result = await topicService.createTopic({
      name,
      description,
      companyIdentifier,
      ownerId: 'demo-user', // TODO: Get from auth
    });

    const response: ApiResponse<CreateTopicResponse> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  }
);

/**
 * GET /api/v1/topics
 * List all topics
 */
topicRoutes.get('/', async (req: Request, res: Response) => {
  const topics = await topicService.listTopics('demo-user'); // TODO: Get from auth

  const response: ApiResponse<Topic[]> = {
    success: true,
    data: topics,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/topics/:id
 * Get topic by ID
 */
topicRoutes.get('/:id', async (req: Request, res: Response) => {
  const topic = await topicService.getTopicById(req.params.id);

  const response: ApiResponse<Topic> = {
    success: true,
    data: topic,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * GET /api/v1/topics/:id/messages
 * Get messages from Hedera topic via mirror node
 */
topicRoutes.get('/:id/messages', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const messages = await topicService.getTopicMessages(req.params.id, { limit });

  const response: ApiResponse<unknown[]> = {
    success: true,
    data: messages,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});

/**
 * PATCH /api/v1/topics/:id
 * Update topic metadata
 */
topicRoutes.patch(
  '/:id',
  validate(updateTopicSchema),
  async (req: Request, res: Response) => {
    const topic = await topicService.updateTopic(req.params.id, req.body);

    const response: ApiResponse<Topic> = {
      success: true,
      data: topic,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  }
);

/**
 * DELETE /api/v1/topics/:id
 * Delete topic (local only, Hedera record is immutable)
 */
topicRoutes.delete('/:id', async (req: Request, res: Response) => {
  await topicService.deleteTopic(req.params.id);

  const response: ApiResponse<null> = {
    success: true,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
});
