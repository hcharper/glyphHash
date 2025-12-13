import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TransferTransaction,
  Hbar,
  AccountBalanceQuery,
  TokenAssociateTransaction,
  TokenId,
} from '@hashgraph/sdk';

@Injectable()
export class HederaService {
  private readonly logger = new Logger(HederaService.name);
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const operatorIdStr = process.env.HEDERA_OPERATOR_ID;
    const operatorKeyStr = process.env.HEDERA_OPERATOR_KEY;

    if (!operatorIdStr || !operatorKeyStr || operatorIdStr.includes('xxxxx')) {
      this.logger.warn('Hedera credentials not configured. Running in test mode.');
      this.logger.warn('Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env');
      return; // Skip initialization in test mode
    }

    this.operatorId = AccountId.fromString(operatorIdStr);
    this.operatorKey = PrivateKey.fromString(operatorKeyStr);

    // Initialize client based on network
    if (network === 'mainnet') {
      this.client = Client.forMainnet();
    } else if (network === 'testnet') {
      this.client = Client.forTestnet();
    } else {
      this.client = Client.forPreviewnet();
    }

    this.client.setOperator(this.operatorId, this.operatorKey);

    this.logger.log(`Hedera client initialized for ${network}`);
    this.logger.log(`Operator account: ${this.operatorId.toString()}`);
  }

  /**
   * Create a new HCS topic for a tenant
   */
  async createTopic(tenantName: string, submitKey?: PrivateKey): Promise<string> {
    if (!this.client) {
      this.logger.warn('Hedera client not initialized. Returning mock topic ID.');
      return `0.0.${Math.floor(Math.random() * 1000000)}`;
    }

    try {
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(`glyphHash Compliance Topic - ${tenantName}`)
        .setAdminKey(this.operatorKey.publicKey);

      if (submitKey) {
        transaction.setSubmitKey(submitKey.publicKey);
      }

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const topicId = receipt.topicId;

      if (!topicId) {
        throw new Error('Topic creation failed - no topic ID returned');
      }

      this.logger.log(`Created HCS topic: ${topicId.toString()} for tenant: ${tenantName}`);
      return topicId.toString();
    } catch (error) {
      this.logger.error(`Failed to create HCS topic: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Submit a message to an HCS topic
   */
  async submitMessage(
    topicId: string,
    message: string,
    submitKey?: PrivateKey,
  ): Promise<{
    sequenceNumber: string;
    consensusTimestamp: string;
    transactionId: string;
  }> {
    if (!this.client) {
      this.logger.warn('Hedera client not initialized. Returning mock response.');
      return {
        sequenceNumber: '0',
        consensusTimestamp: new Date().toISOString(),
        transactionId: `0.0.${Math.floor(Math.random() * 1000000)}@${Date.now()}`,
      };
    }

    try {
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);

      if (submitKey) {
        transaction.freezeWith(this.client);
        transaction.sign(submitKey);
      }

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      const sequenceNumber = receipt.topicSequenceNumber?.toString() || '0';
      const consensusTimestamp = (receipt as any).consensusTimestamp?.toString() || '';

      this.logger.log(
        `Message submitted to topic ${topicId}, sequence: ${sequenceNumber}`,
      );

      return {
        sequenceNumber,
        consensusTimestamp,
        transactionId: txResponse.transactionId.toString(),
      };
    } catch (error) {
      this.logger.error(`Failed to submit message to HCS: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a private Hedera Sphere (simulation for testnet)
   * Note: Actual Sphere creation requires Hedera enterprise features
   * This is a placeholder that creates a topic as a Sphere identifier
   */
  async createSphere(sphereName: string): Promise<string> {
    try {
      // In production, this would use Hedera Sphere API
      // For now, we create a dedicated topic to represent a sphere
      const sphereTopicId = await this.createTopic(`Sphere: ${sphereName}`);
      
      this.logger.log(`Created Sphere (topic-based): ${sphereTopicId} for ${sphereName}`);
      return sphereTopicId;
    } catch (error) {
      this.logger.error(`Failed to create Sphere: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Transfer USDC (HTS token) for compliance log payment
   */
  async transferUSDC(
    recipientId: string,
    amount: number,
  ): Promise<string> {
    try {
      const tokenId = TokenId.fromString(process.env.HEDERA_USDC_TOKEN_ID || '0.0.1');
      const recipient = AccountId.fromString(recipientId);

      // Convert amount to token units (USDC has 6 decimals)
      const tokenAmount = amount * 1_000_000;

      const transaction = new TransferTransaction()
        .addTokenTransfer(tokenId, this.operatorId, -tokenAmount)
        .addTokenTransfer(tokenId, recipient, tokenAmount)
        .freezeWith(this.client);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      this.logger.log(
        `Transferred ${amount} USDC to ${recipientId}, tx: ${txResponse.transactionId.toString()}`,
      );

      return txResponse.transactionId.toString();
    } catch (error) {
      this.logger.error(`Failed to transfer USDC: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId?: string): Promise<{ hbar: string; tokens: any }> {
    try {
      const id = accountId ? AccountId.fromString(accountId) : this.operatorId;
      const balance = await new AccountBalanceQuery()
        .setAccountId(id)
        .execute(this.client);

      return {
        hbar: balance.hbars.toString(),
        tokens: balance.tokens ? balance.tokens.toString() : {},
      };
    } catch (error) {
      this.logger.error(`Failed to get account balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Associate token with account (required before receiving HTS tokens)
   */
  async associateToken(tokenId: string, privateKey?: PrivateKey): Promise<string> {
    try {
      const key = privateKey || this.operatorKey;
      const transaction = new TokenAssociateTransaction()
        .setAccountId(this.operatorId)
        .setTokenIds([TokenId.fromString(tokenId)])
        .freezeWith(this.client);

      const signedTx = await transaction.sign(key);
      const txResponse = await signedTx.execute(this.client);
      await txResponse.getReceipt(this.client);

      this.logger.log(`Associated token ${tokenId} with account ${this.operatorId.toString()}`);
      return txResponse.transactionId.toString();
    } catch (error) {
      this.logger.error(`Failed to associate token: ${error.message}`, error.stack);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }
}
