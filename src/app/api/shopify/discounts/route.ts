import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createShopifyClient } from '@/lib/shopify/client';
import { ShopifyConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const connection = getConnection('shopify');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 401 }
      );
    }

    const client = createShopifyClient(connection.config as ShopifyConfig);
    const result = await client.getDiscountCodes({ first: 50, query: search });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch Shopify discounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch discounts' },
      { status: 500 }
    );
  }
}

