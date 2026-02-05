/**
 * Health Check API Route
 * ======================
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'glyphhash-web',
      timestamp: new Date().toISOString(),
      hedera: {
        network: process.env.HEDERA_NETWORK || 'testnet',
        configured: !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY),
      },
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
