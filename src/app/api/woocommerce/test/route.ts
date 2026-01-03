import { NextRequest, NextResponse } from 'next/server';
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

    if (isConnected) {
      return NextResponse.json({ success: true, message: 'Connection successful' });
    } else {
      return NextResponse.json(
        { error: 'Connection failed. Please check your credentials.' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('WooCommerce test connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test connection' },
      { status: 500 }
    );
  }
}

