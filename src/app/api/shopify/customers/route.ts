import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createShopifyClient } from '@/lib/shopify/client';
import { ShopifyConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const connection = getConnection('shopify');
    
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const first = parseInt(searchParams.get('first') || '50');
    const after = searchParams.get('after') || undefined;
    const query = searchParams.get('query') || undefined;

    const client = createShopifyClient(connection.config as ShopifyConfig);
    const result = await client.getCustomers({ first, after, query });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch Shopify customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

