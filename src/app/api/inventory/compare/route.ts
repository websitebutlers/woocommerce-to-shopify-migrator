import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, InventoryDifference, InventoryComparisonResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth } = body;

    console.log('Inventory comparison request:', { sourceOfTruth });

    if (!sourceOfTruth || (sourceOfTruth !== 'woocommerce' && sourceOfTruth !== 'shopify')) {
      return NextResponse.json(
        { error: 'sourceOfTruth must be either "woocommerce" or "shopify"' },
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

    console.log(`Fetching products from ${sourceOfTruth} (source of truth)...`);
    console.log(`Fetching products from ${destinationPlatform} (destination)...`);

    // Fetch all products from source
    const sourceProducts: any[] = [];
    
    if (sourceOfTruth === 'woocommerce') {
      const client = createWooCommerceClient(sourceConnection.config as WooCommerceConfig);
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const result = await client.getProducts({ page, per_page: 100 });
        sourceProducts.push(...result.data);
        hasMore = result.data.length === 100;
        page++;
        if (page > 100) break;
      }
    } else {
      const client = createShopifyClient(sourceConnection.config as ShopifyConfig);
      let hasNextPage = true;
      let cursor: string | undefined = undefined;
      
      while (hasNextPage) {
        const result = await client.getProducts({ first: 250, after: cursor });
        const products = result.edges.map((edge: any) => edge.node);
        sourceProducts.push(...products);
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        if (sourceProducts.length > 10000) break;
      }
    }

    console.log(`Fetched ${sourceProducts.length} products from ${sourceOfTruth}`);

    // Fetch all products from destination
    const destinationProducts: any[] = [];
    
    if (destinationPlatform === 'woocommerce') {
      const client = createWooCommerceClient(destConnection.config as WooCommerceConfig);
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const result = await client.getProducts({ page, per_page: 100 });
        destinationProducts.push(...result.data);
        hasMore = result.data.length === 100;
        page++;
        if (page > 100) break;
      }
    } else {
      const client = createShopifyClient(destConnection.config as ShopifyConfig);
      let hasNextPage = true;
      let cursor: string | undefined = undefined;
      
      while (hasNextPage) {
        const result = await client.getProducts({ first: 250, after: cursor });
        const products = result.edges.map((edge: any) => edge.node);
        destinationProducts.push(...products);
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        if (destinationProducts.length > 10000) break;
      }
    }

    console.log(`Fetched ${destinationProducts.length} products from ${destinationPlatform}`);

    // Create maps for matching
    const sourceProductMap = new Map();
    const destProductMap = new Map();

    // Map source products by SKU and name
    sourceProducts.forEach((product: any) => {
      const sku = sourceOfTruth === 'woocommerce' ? product.sku : product.variants?.edges?.[0]?.node.sku;
      if (sku) {
        sourceProductMap.set(`sku:${sku.toLowerCase()}`, product);
      }
      const name = sourceOfTruth === 'woocommerce' ? product.name : product.title;
      if (name) {
        sourceProductMap.set(`name:${name.toLowerCase().trim()}`, product);
      }
    });

    // Map destination products by SKU and name
    destinationProducts.forEach((product: any) => {
      const sku = destinationPlatform === 'woocommerce' ? product.sku : product.variants?.edges?.[0]?.node.sku;
      if (sku) {
        destProductMap.set(`sku:${sku.toLowerCase()}`, product);
      }
      const name = destinationPlatform === 'woocommerce' ? product.name : product.title;
      if (name) {
        destProductMap.set(`name:${name.toLowerCase().trim()}`, product);
      }
    });

    // Compare inventory and find differences
    const differences: InventoryDifference[] = [];
    let matchedProducts = 0;
    let totalVariantsCompared = 0;

    console.log('Starting inventory comparison...');

    // Iterate through source products and find matches in destination
    for (const sourceProduct of sourceProducts) {
      const sourceSku = sourceOfTruth === 'woocommerce' ? sourceProduct.sku : sourceProduct.variants?.edges?.[0]?.node.sku;
      const sourceName = sourceOfTruth === 'woocommerce' ? sourceProduct.name : sourceProduct.title;

      // Try to find matching product in destination
      let destProduct = null;
      if (sourceSku) {
        destProduct = destProductMap.get(`sku:${sourceSku.toLowerCase()}`);
      }
      if (!destProduct && sourceName) {
        destProduct = destProductMap.get(`name:${sourceName.toLowerCase().trim()}`);
      }

      if (!destProduct) {
        continue; // Skip products that don't exist in destination
      }

      matchedProducts++;

      // Compare inventory for variants
      if (sourceOfTruth === 'woocommerce') {
        // WooCommerce product
        const sourceQty = sourceProduct.stock_quantity || 0;
        const sourceStatus = sourceProduct.stock_status === 'instock' ? 'instock' : 'outofstock';

        // Shopify product (destination)
        const destVariants = destProduct.variants?.edges || [];

        if (destVariants.length > 0) {
          // Compare with first variant (or matching SKU variant)
          let matchingVariant = destVariants[0].node;

          if (sourceSku) {
            const skuMatch = destVariants.find((v: any) => v.node.sku?.toLowerCase() === sourceSku.toLowerCase());
            if (skuMatch) matchingVariant = skuMatch.node;
          }

          const destQty = matchingVariant.inventoryQuantity || 0;
          const destStatus = destQty > 0 ? 'instock' : 'outofstock';

          if (sourceQty !== destQty) {
            totalVariantsCompared++;
            differences.push({
              productId: `${sourceProduct.id}-${matchingVariant.id}`,
              name: sourceName,
              sku: sourceSku || '',
              sourceQuantity: sourceQty,
              destinationQuantity: destQty,
              difference: sourceQty - destQty,
              sourceStatus,
              destinationStatus: destStatus,
              sourcePlatform: 'woocommerce',
              destinationPlatform: 'shopify',
              sourceProductId: sourceProduct.id.toString(),
              destinationProductId: matchingVariant.id,
              variantId: matchingVariant.id,
              variantTitle: matchingVariant.title,
            });
          }
        }
      } else {
        // Shopify product (source)
        const sourceVariants = sourceProduct.variants?.edges || [];

        for (const sourceVariantEdge of sourceVariants) {
          const sourceVariant = sourceVariantEdge.node;
          const sourceQty = sourceVariant.inventoryQuantity || 0;
          const sourceStatus = sourceQty > 0 ? 'instock' : 'outofstock';

          // WooCommerce product (destination)
          const destQty = destProduct.stock_quantity || 0;
          const destStatus = destProduct.stock_status === 'instock' ? 'instock' : 'outofstock';

          if (sourceQty !== destQty) {
            totalVariantsCompared++;
            differences.push({
              productId: `${sourceVariant.id}-${destProduct.id}`,
              name: sourceName,
              sku: sourceVariant.sku || '',
              sourceQuantity: sourceQty,
              destinationQuantity: destQty,
              difference: sourceQty - destQty,
              sourceStatus,
              destinationStatus: destStatus,
              sourcePlatform: 'shopify',
              destinationPlatform: 'woocommerce',
              sourceProductId: sourceVariant.id,
              destinationProductId: destProduct.id.toString(),
              variantId: sourceVariant.id,
              variantTitle: sourceVariant.title,
            });
          }
        }
      }
    }

    console.log(`Found ${differences.length} inventory differences across ${matchedProducts} matched products`);

    const result: InventoryComparisonResult = {
      differences,
      summary: {
        sourceOfTruth: sourceOfTruth,
        sourceProductCount: sourceProducts.length,
        destinationPlatform: destinationPlatform,
        destinationProductCount: destinationProducts.length,
        matchedProducts,
        productsWithDifferences: differences.length,
        totalVariantsCompared,
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Failed to compare inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare inventory' },
      { status: 500 }
    );
  }
}

