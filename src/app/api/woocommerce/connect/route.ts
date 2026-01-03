import { NextRequest, NextResponse } from 'next/server';
import { saveConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeUrl, consumerKey, consumerSecret } = body;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = createWooCommerceClient({
      storeUrl,
      consumerKey,
      consumerSecret,
    });

    const isConnected = await client.testConnection();

    if (!isConnected) {
      return NextResponse.json(
        { error: 'Connection failed. Please check your credentials.' },
        { status: 401 }
      );
    }

    saveConnection({
      id: 'woocommerce',
      platform: 'woocommerce',
      isConnected: true,
      config: {
        storeUrl,
        consumerKey,
        consumerSecret,
      },
      lastTested: new Date(),
    });

    return NextResponse.json({ success: true, message: 'WooCommerce connected successfully' });
  } catch (error: any) {
    console.error('WooCommerce connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save connection' },
      { status: 500 }
    );
  }
}

