import { NextRequest, NextResponse } from 'next/server';
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

    if (isConnected) {
      return NextResponse.json({ success: true, message: 'Connection successful' });
    } else {
      return NextResponse.json(
        { error: 'Connection failed. Please check your credentials.' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Shopify test connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test connection' },
      { status: 500 }
    );
  }
}

