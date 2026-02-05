/**
 * Documents API Route (Serverless)
 * =================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client, TopicMessageSubmitTransaction, TopicId, Status, AccountId, PrivateKey, Hbar } from '@hashgraph/sdk';
import crypto from 'crypto';

// In-memory storage for demo
const documents: Map<string, {
  id: string;
  topicId: string;
  filename: string;
  hash: string;
  category: string;
  size: number;
  mimeType: string;
  transactionId?: string;
  consensusTimestamp?: string;
  createdAt: string;
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
    const documentList = Array.from(documents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: documentList,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list documents' },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const topicId = formData.get('topicId') as string;
    const category = formData.get('category') as string || 'OTHER';

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'File is required' },
        },
        { status: 400 }
      );
    }

    if (!topicId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'topicId is required' },
        },
        { status: 400 }
      );
    }

    // Read file and compute hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const filenameHash = createHash(file.name);

    const client = getHederaClient();
    const documentId = crypto.randomUUID();

    // Submit hash to Hedera
    const payload = {
      documentId,
      hash: fileHash,
      filenameHash,
      category,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    };

    const message = JSON.stringify({
      type: 'DOCUMENT_HASH',
      version: '1.0',
      timestamp: new Date().toISOString(),
      payload,
    });

    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message);

    const response = await submitTx.execute(client);
    const receipt = await response.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error('Failed to submit document hash to Hedera');
    }

    const document = {
      id: documentId,
      topicId,
      filename: file.name,
      hash: fileHash,
      category,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      transactionId: response.transactionId.toString(),
      consensusTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    documents.set(documentId, document);

    return NextResponse.json({
      success: true,
      data: {
        document,
        transactionId: response.transactionId.toString(),
        sequenceNumber: receipt.topicSequenceNumber?.toNumber() ?? 0,
      },
      meta: { timestamp: new Date().toISOString() },
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload document';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'HEDERA_ERROR', message },
      },
      { status: 500 }
    );
  }
}
