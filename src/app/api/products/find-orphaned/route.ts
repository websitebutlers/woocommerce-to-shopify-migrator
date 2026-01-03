import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth } = body;

    console.log('Find orphaned products request:', { sourceOfTruth });

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

    console.log(`Fetching all products from ${sourceOfTruth} (source of truth)...`);
    console.log(`Fetching all products from ${destinationPlatform} (to find orphans)...`);

    // Fetch all products from source of truth
    const sourceProducts: any[] = [];
    
    if (sourceOfTruth === 'woocommerce') {
      const client = createWooCommerceClient(sourceConnection.config as WooCommerceConfig);
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        console.log(`Fetching WooCommerce products page ${page}...`);
        const result = await client.getProducts({ page, per_page: 100 });
        sourceProducts.push(...result.data);
        hasMore = result.data.length === 100;
        page++;
        if (page > 100) break; // Safety limit
      }
    } else {
      const client = createShopifyClient(sourceConnection.config as ShopifyConfig);
      let hasNextPage = true;
      let cursor: string | undefined = undefined;
      
      while (hasNextPage) {
        console.log(`Fetching Shopify products${cursor ? ` after cursor` : ''}...`);
        const result = await client.getProducts({ first: 250, after: cursor });
        const products = result.edges.map((edge: any) => edge.node);
        sourceProducts.push(...products);
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        if (sourceProducts.length > 10000) break; // Safety limit
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
        console.log(`Fetching WooCommerce products page ${page}...`);
        const result = await client.getProducts({ page, per_page: 100 });
        destinationProducts.push(...result.data);
        hasMore = result.data.length === 100;
        page++;
        if (page > 100) break; // Safety limit
      }
    } else {
      const client = createShopifyClient(destConnection.config as ShopifyConfig);
      let hasNextPage = true;
      let cursor: string | undefined = undefined;
      
      while (hasNextPage) {
        console.log(`Fetching Shopify products${cursor ? ` after cursor` : ''}...`);
        const result = await client.getProducts({ first: 250, after: cursor });
        const products = result.edges.map((edge: any) => edge.node);
        destinationProducts.push(...products);
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        if (destinationProducts.length > 10000) break; // Safety limit
      }
    }

    console.log(`Fetched ${destinationProducts.length} products from ${destinationPlatform}`);

    // Create a map of source products by SKU and name
    const sourceProductMap = new Map();
    
    sourceProducts.forEach((product: any) => {
      const sku = sourceOfTruth === 'woocommerce' ? product.sku : product.variants?.edges?.[0]?.node.sku;
      if (sku) {
        sourceProductMap.set(`sku:${sku.toLowerCase()}`, product);
      }
      
      const name = sourceOfTruth === 'woocommerce' ? product.name : product.title;
      if (name) {
        const normalizedName = name.toLowerCase().trim();
        sourceProductMap.set(`name:${normalizedName}`, product);
      }
    });

    // Find orphaned products (exist in destination but NOT in source)
    const orphanedProducts = destinationProducts.filter((destProduct: any) => {
      const destSku = destinationPlatform === 'woocommerce' ? destProduct.sku : destProduct.variants?.edges?.[0]?.node?.sku;
      const destName = destinationPlatform === 'woocommerce' ? destProduct.name : destProduct.title;
      
      // Check if product exists in source by SKU
      if (destSku && typeof destSku === 'string') {
        const skuMatch = sourceProductMap.get(`sku:${destSku.toLowerCase()}`);
        if (skuMatch) return false; // Found in source, not orphaned
      }
      
      // Check if product exists in source by name
      if (destName && typeof destName === 'string') {
        const normalizedName = destName.toLowerCase().trim();
        const nameMatch = sourceProductMap.get(`name:${normalizedName}`);
        if (nameMatch) return false; // Found in source, not orphaned
      }
      
      return true; // Not found in source, this is orphaned
    });

    console.log(`Found ${orphanedProducts.length} orphaned products in ${destinationPlatform}`);

    // Format the orphaned products for the response
    const formattedOrphans = orphanedProducts.map((product: any) => ({
      id: destinationPlatform === 'woocommerce' ? product.id?.toString() : product.id,
      name: destinationPlatform === 'woocommerce' ? product.name : product.title,
      sku: destinationPlatform === 'woocommerce' ? product.sku : product.variants?.edges?.[0]?.node?.sku,
      status: destinationPlatform === 'woocommerce' ? product.status : product.status,
      platform: destinationPlatform,
    }));

    return NextResponse.json({
      orphanedProducts: formattedOrphans,
      summary: {
        sourceOfTruth: sourceOfTruth,
        sourceProductCount: sourceProducts.length,
        destinationPlatform: destinationPlatform,
        destinationProductCount: destinationProducts.length,
        orphanedCount: orphanedProducts.length,
      }
    });

  } catch (error: any) {
    console.error('Failed to find orphaned products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find orphaned products' },
      { status: 500 }
    );
  }
}

