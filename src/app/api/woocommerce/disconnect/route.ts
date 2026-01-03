import { NextResponse } from 'next/server';
import { saveConnection } from '@/lib/db';

export async function POST() {
  try {
    saveConnection({
      id: 'woocommerce',
      platform: 'woocommerce',
      isConnected: false,
      config: {
        storeUrl: '',
        consumerKey: '',
        consumerSecret: '',
      },
    });

    return NextResponse.json({ success: true, message: 'WooCommerce disconnected' });
  } catch (error: any) {
    console.error('WooCommerce disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

