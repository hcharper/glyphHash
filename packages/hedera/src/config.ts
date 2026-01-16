/**
 * Hedera Configuration
 * ====================
 * Configuration and client initialization for Hedera network
 */

import {
  Client,
  AccountId,
  PrivateKey,
  Hbar,
} from '@hashgraph/sdk';

export interface HederaConfig {
  network: 'mainnet' | 'testnet' | 'previewnet' | 'local';
  accountId: string;
  privateKey: string;
}

export function createHederaClient(config: HederaConfig): Client {
  const accountId = AccountId.fromString(config.accountId);
  const privateKey = PrivateKey.fromString(config.privateKey);

  let client: Client;

  switch (config.network) {
    case 'mainnet':
      client = Client.forMainnet();
      break;
    case 'testnet':
      client = Client.forTestnet();
      break;
    case 'previewnet':
      client = Client.forPreviewnet();
      break;
    case 'local':
      // For local Hedera network (e.g., Hedera Local Node)
      client = Client.forNetwork({ '127.0.0.1:50211': new AccountId(3) });
      break;
    default:
      throw new Error(`Unknown network: ${config.network}`);
  }

  client.setOperator(accountId, privateKey);
  
  // Set default max transaction fee
  client.setDefaultMaxTransactionFee(new Hbar(1)); // 1 HBAR
  
  // Set max query payment
  client.setDefaultMaxQueryPayment(new Hbar(1)); // 1 HBAR

  return client;
}

export function getConfigFromEnv(): HederaConfig {
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId) {
    throw new Error('HEDERA_ACCOUNT_ID environment variable is required');
  }

  if (!privateKey) {
    throw new Error('HEDERA_PRIVATE_KEY environment variable is required');
  }

  return {
    network: network as HederaConfig['network'],
    accountId,
    privateKey,
  };
}
