import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || undefined;

    const connection = getConnection('woocommerce');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);
    const result = await client.getPages({ page, per_page: 50, search });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch WooCommerce pages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

