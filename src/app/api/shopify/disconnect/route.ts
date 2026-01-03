import { NextResponse } from 'next/server';
import { saveConnection } from '@/lib/db';

export async function POST() {
  try {
    saveConnection({
      id: 'shopify',
      platform: 'shopify',
      isConnected: false,
      config: {
        storeDomain: '',
        accessToken: '',
      },
    });

    return NextResponse.json({ success: true, message: 'Shopify disconnected' });
  } catch (error: any) {
    console.error('Shopify disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

