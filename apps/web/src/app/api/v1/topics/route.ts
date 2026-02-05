/**
 * Topics API Route (Serverless)
 * =============================
 * Handles topic creation and listing for the demo
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicId, Status, AccountId, PrivateKey, Hbar } from '@hashgraph/sdk';
import crypto from 'crypto';

// In-memory storage for demo (resets on cold start)
const topics: Map<string, {
  id: string;
  topicId: string;
  name: string;
  description?: string;
  companyIdentifier: string;
  bindingHash: string;
  createdAt: string;
  documentCount: number;
}> = new Map();

function createHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getHederaClient(): Client {
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error('Hedera credentials not configured');
  }

  let client: Client;
  if (network === 'mainnet') {
    client = Client.forMainnet();
  } else if (network === 'testnet') {
    client = Client.forTestnet();
  } else {
    client = Client.forTestnet();
  }

  client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
  client.setDefaultMaxTransactionFee(new Hbar(2));
  client.setDefaultMaxQueryPayment(new Hbar(1));

  return client;
}

export async function GET() {
  try {
    const topicList = Array.from(topics.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: topicList,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Error listing topics:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list topics' },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, companyIdentifier } = body;

    if (!name || !companyIdentifier) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name and companyIdentifier are required' },
        },
        { status: 400 }
      );
    }

    const client = getHederaClient();

    // 1. Create topic on Hedera
    const createTx = new TopicCreateTransaction().setTopicMemo(`GlyphHash: ${name}`);
    const createResponse = await createTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);

    if (createReceipt.status !== Status.Success || !createReceipt.topicId) {
      throw new Error('Failed to create topic on Hedera');
    }

    const topicId = createReceipt.topicId.toString();
    const transactionId = createResponse.transactionId.toString();

    // 2. Submit binding message
    const bindingHash = createHash(`${companyIdentifier}:${topicId}`);
    const bindingMessage = JSON.stringify({
      type: 'TOPIC_BINDING',
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload: { companyIdentifier, topicId, bindingHash },
    });

    const bindingTx = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(bindingMessage);
    
    const bindingResponse = await bindingTx.execute(client);
    const bindingReceipt = await bindingResponse.getReceipt(client);

    if (bindingReceipt.status !== Status.Success) {
      throw new Error('Failed to submit binding message');
    }

    // 3. Store in memory
    const id = crypto.randomUUID();
    const topic = {
      id,
      topicId,
      name,
      description,
      companyIdentifier,
      bindingHash,
      createdAt: new Date().toISOString(),
      documentCount: 0,
    };
    topics.set(id, topic);

    return NextResponse.json({
      success: true,
      data: {
        topic,
        transactionId,
        consensusTimestamp: new Date().toISOString(),
      },
      meta: { timestamp: new Date().toISOString() },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating topic:', error);
    const message = error instanceof Error ? error.message : 'Failed to create topic';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'HEDERA_ERROR', message },
      },
      { status: 500 }
    );
  }
}
