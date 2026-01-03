import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const connection = getConnection('woocommerce');
    
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);
    const result = await client.getProducts({ page, per_page: perPage, search, status });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch WooCommerce products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

