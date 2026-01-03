import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createShopifyClient } from '@/lib/shopify/client';
import type { ShopifyConfig } from '@/lib/types';

export async function DELETE(request: NextRequest) {
    try {
        const { collectionId } = await request.json();

        if (!collectionId) {
            return NextResponse.json(
                { error: 'Collection ID is required' },
                { status: 400 }
            );
        }

        // Get Shopify connection
        const connection = getConnection('shopify');
        if (!connection) {
            return NextResponse.json(
                { error: 'Shopify not connected' },
                { status: 400 }
            );
        }

        const client = createShopifyClient(connection.config as ShopifyConfig);

        // Delete the collection using GraphQL mutation
        const mutation = `
      mutation collectionDelete($input: CollectionDeleteInput!) {
        collectionDelete(input: $input) {
          deletedCollectionId
          userErrors {
            field
            message
          }
        }
      }
    `;

        const variables = {
            input: {
                id: collectionId,
            },
        };

        const response = await fetch(
            `https://${(connection.config as ShopifyConfig).storeDomain}/admin/api/2024-01/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': (connection.config as ShopifyConfig).accessToken,
                },
                body: JSON.stringify({ query: mutation, variables }),
            }
        );

        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(data.errors[0]?.message || 'GraphQL error');
        }

        if (data.data?.collectionDelete?.userErrors?.length > 0) {
            throw new Error(data.data.collectionDelete.userErrors[0].message);
        }

        return NextResponse.json({
            success: true,
            deletedCollectionId: data.data?.collectionDelete?.deletedCollectionId,
        });
    } catch (error: any) {
        console.error('Error deleting Shopify collection:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete collection' },
            { status: 500 }
        );
    }
}
