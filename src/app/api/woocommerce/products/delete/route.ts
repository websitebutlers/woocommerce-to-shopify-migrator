import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import type { WooCommerceConfig } from '@/lib/types';

export async function DELETE(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get WooCommerce connection
    const connection = getConnection('woocommerce');
    if (!connection) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 400 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);

    // Delete the product (force=true to permanently delete, not just trash)
    await client.deleteProduct(parseInt(productId), true);

    return NextResponse.json({
      success: true,
      deletedProductId: productId,
    });
  } catch (error: any) {
    console.error('Error deleting WooCommerce product:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}

