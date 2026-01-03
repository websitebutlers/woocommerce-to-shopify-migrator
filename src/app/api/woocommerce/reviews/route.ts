import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const productId = searchParams.get('product');

    const connection = getConnection('woocommerce');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);
    // Fetch up to 100 reviews per page so smaller stores (like this one with 85 reviews)
    // can see all reviews in a single view.
    const params: any = { page, per_page: 100 };

    if (productId) {
      params.product = [productId];
    }

    const result = await client.getProductReviews(params);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch WooCommerce reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

