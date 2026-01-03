import { NextResponse } from 'next/server';
import { getAllConnections } from '@/lib/db';

export async function GET() {
  try {
    const connections = getAllConnections();
    
    const result = {
      woocommerce: connections.find(c => c.platform === 'woocommerce') || null,
      shopify: connections.find(c => c.platform === 'shopify') || null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

