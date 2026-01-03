import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function DELETE(request: NextRequest) {
    try {
        const { collectionId } = await request.json();

        if (!collectionId) {
            return NextResponse.json(
                { error: 'Collection ID is required' },
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

        // Delete the category (force delete to permanently remove it)
        const result = await client.deleteProductCategory(parseInt(collectionId), true);

        return NextResponse.json({
            success: true,
            deletedCategoryId: collectionId,
            result,
        });
    } catch (error: any) {
        console.error('Error deleting WooCommerce category:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete category' },
            { status: 500 }
        );
    }
}
