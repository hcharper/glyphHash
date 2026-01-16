/**
 * @glyphhash/hedera
 * =================
 * Hedera SDK wrapper for GlyphHash
 */

export { createHederaClient, getConfigFromEnv } from './config.js';
export type { HederaConfig } from './config.js';

export { TopicService } from './topic-service.js';
export type { TopicServiceConfig, CreateTopicResult, SubmitMessageResult } from './topic-service.js';

export { MirrorNodeService } from './mirror-node.js';
export type { MirrorNodeConfig } from './mirror-node.js';

export {
  createHash,
  createFileHash,
  verifyHash,
  generateId,
  parseHederaTimestamp,
  toHederaTimestamp,
  encodeBase64,
  decodeBase64,
} from './utils.js';
