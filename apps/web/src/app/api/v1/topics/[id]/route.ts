/**
 * Single Topic API Route (Serverless)
 * ====================================
 */

import { NextResponse } from 'next/server';

// Reference to the shared topics map (note: in serverless, each instance has its own memory)
// For a real app, use a database. This is demo-only.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // For demo, return a placeholder
  return NextResponse.json({
    success: true,
    data: {
      id: params.id,
      topicId: '0.0.demo',
      name: 'Demo Topic',
      description: 'This is a demo topic',
      companyIdentifier: 'demo-company',
      bindingHash: 'demo-hash',
      createdAt: new Date().toISOString(),
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
