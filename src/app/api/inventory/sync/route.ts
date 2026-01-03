import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, InventorySyncResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth, differences } = body;

    console.log('Inventory sync request:', { sourceOfTruth, count: differences?.length });

    if (!sourceOfTruth || (sourceOfTruth !== 'woocommerce' && sourceOfTruth !== 'shopify')) {
      return NextResponse.json(
        { error: 'sourceOfTruth must be either "woocommerce" or "shopify"' },
        { status: 400 }
      );
    }

    if (!differences || !Array.isArray(differences) || differences.length === 0) {
      return NextResponse.json(
        { error: 'differences array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Get connections
    const sourceConnection = getConnection(sourceOfTruth);
    const destinationPlatform = sourceOfTruth === 'woocommerce' ? 'shopify' : 'woocommerce';
    const destConnection = getConnection(destinationPlatform);

    if (!sourceConnection || !destConnection) {
      return NextResponse.json(
        { error: `Missing connection for ${!sourceConnection ? sourceOfTruth : destinationPlatform}` },
        { status: 400 }
      );
    }

    console.log(`Syncing ${differences.length} inventory items from ${sourceOfTruth} to ${destinationPlatform}...`);

    const results: InventorySyncResult[] = [];

    // Create client for destination platform
    if (destinationPlatform === 'woocommerce') {
      const client = createWooCommerceClient(destConnection.config as WooCommerceConfig);

      for (const diff of differences) {
        try {
          console.log(`Updating WooCommerce product ${diff.destinationProductId}: ${diff.destinationQuantity} → ${diff.sourceQuantity}`);
          
          await client.updateInventory(
            diff.destinationProductId,
            diff.sourceQuantity,
            diff.sourceQuantity > 0 ? 'instock' : 'outofstock'
          );

          results.push({
            productId: diff.productId,
            name: diff.name,
            variantTitle: diff.variantTitle,
            success: true,
            oldQuantity: diff.destinationQuantity,
            newQuantity: diff.sourceQuantity,
            platform: 'woocommerce',
          });

          console.log(`✓ Successfully updated ${diff.name}`);
        } catch (error: any) {
          console.error(`✗ Failed to update ${diff.name}:`, error.message);
          
          results.push({
            productId: diff.productId,
            name: diff.name,
            variantTitle: diff.variantTitle,
            success: false,
            error: error.message || 'Unknown error',
            oldQuantity: diff.destinationQuantity,
            newQuantity: diff.sourceQuantity,
            platform: 'woocommerce',
          });
        }
      }
    } else {
      // Shopify destination
      const client = createShopifyClient(destConnection.config as ShopifyConfig);

      for (const diff of differences) {
        try {
          console.log(`Updating Shopify variant ${diff.destinationProductId}: ${diff.destinationQuantity} → ${diff.sourceQuantity}`);
          
          await client.updateInventory(
            diff.destinationProductId,
            diff.sourceQuantity
          );

          results.push({
            productId: diff.productId,
            name: diff.name,
            variantTitle: diff.variantTitle,
            success: true,
            oldQuantity: diff.destinationQuantity,
            newQuantity: diff.sourceQuantity,
            platform: 'shopify',
          });

          console.log(`✓ Successfully updated ${diff.name}`);
        } catch (error: any) {
          console.error(`✗ Failed to update ${diff.name}:`, error.message);
          
          results.push({
            productId: diff.productId,
            name: diff.name,
            variantTitle: diff.variantTitle,
            success: false,
            error: error.message || 'Unknown error',
            oldQuantity: diff.destinationQuantity,
            newQuantity: diff.sourceQuantity,
            platform: 'shopify',
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Sync complete: ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
      }
    });

  } catch (error: any) {
    console.error('Failed to sync inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync inventory' },
      { status: 500 }
    );
  }
}

