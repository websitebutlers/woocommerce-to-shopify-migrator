import { NextRequest, NextResponse } from 'next/server';
import { saveConnection } from '@/lib/db';
import { createShopifyClient } from '@/lib/shopify/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeDomain, accessToken } = body;

    if (!storeDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = createShopifyClient({
      storeDomain,
      accessToken,
    });

    const isConnected = await client.testConnection();

    if (!isConnected) {
      return NextResponse.json(
        { error: 'Connection failed. Please check your credentials.' },
        { status: 401 }
      );
    }

    saveConnection({
      id: 'shopify',
      platform: 'shopify',
      isConnected: true,
      config: {
        storeDomain,
        accessToken,
      },
      lastTested: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Shopify connected successfully' });
  } catch (error: any) {
    console.error('Shopify connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save connection' },
      { status: 500 }
    );
  }
}

