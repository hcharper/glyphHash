/**
 * Verification API Route (Serverless)
 * ====================================
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const MIRROR_NODE_URLS: Record<string, string> = {
  mainnet: 'https://mainnet-public.mirrornode.hedera.com',
  testnet: 'https://testnet.mirrornode.hedera.com',
  previewnet: 'https://previewnet.mirrornode.hedera.com',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const topicId = formData.get('topicId') as string;

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

    // Compute file hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Query Hedera Mirror Node for messages
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const mirrorUrl = MIRROR_NODE_URLS[network] || MIRROR_NODE_URLS.testnet;

    const messagesResponse = await fetch(
      `${mirrorUrl}/api/v1/topics/${topicId}/messages?limit=100&order=desc`
    );

    if (!messagesResponse.ok) {
      throw new Error('Failed to query Hedera Mirror Node');
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    // Search for matching hash
    let matchingMessage = null;
    for (const msg of messages) {
      try {
        const decodedMessage = Buffer.from(msg.message, 'base64').toString('utf-8');
        const parsed = JSON.parse(decodedMessage);
        
        if (parsed.type === 'DOCUMENT_HASH' && parsed.payload?.hash === fileHash) {
          matchingMessage = {
            ...parsed,
            consensusTimestamp: msg.consensus_timestamp,
            sequenceNumber: msg.sequence_number,
          };
          break;
        }
      } catch {
        // Skip malformed messages
        continue;
      }
    }

    if (matchingMessage) {
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          hash: fileHash,
          message: matchingMessage,
          consensusTimestamp: matchingMessage.consensusTimestamp,
          sequenceNumber: matchingMessage.sequenceNumber,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          verified: false,
          hash: fileHash,
          message: null,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }

  } catch (error) {
    console.error('Error verifying document:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify document';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VERIFICATION_ERROR', message },
      },
      { status: 500 }
    );
  }
}
