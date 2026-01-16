/**
 * Hedera Client Singleton
 * =======================
 */

import { createHederaClient, TopicService, MirrorNodeService, HederaConfig } from '@glyphhash/hedera';
import { Client } from '@hashgraph/sdk';

let client: Client | null = null;
let topicService: TopicService | null = null;
let mirrorNodeService: MirrorNodeService | null = null;

export function getHederaClient(): Client {
  if (!client) {
    const config: HederaConfig = {
      network: (process.env.HEDERA_NETWORK || 'testnet') as HederaConfig['network'],
      accountId: process.env.HEDERA_ACCOUNT_ID || '',
      privateKey: process.env.HEDERA_PRIVATE_KEY || '',
    };

    if (!config.accountId || !config.privateKey) {
      throw new Error('Hedera credentials not configured. Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY.');
    }

    client = createHederaClient(config);
  }

  return client;
}

export function getTopicService(): TopicService {
  if (!topicService) {
    topicService = new TopicService({ client: getHederaClient() });
  }
  return topicService;
}

export function getMirrorNodeService(): MirrorNodeService {
  if (!mirrorNodeService) {
    const network = (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'previewnet';
    mirrorNodeService = new MirrorNodeService({ network });
  }
  return mirrorNodeService;
}

// For testing - reset singleton instances
export function resetHederaClients() {
  client = null;
  topicService = null;
  mirrorNodeService = null;
}
