import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth } = body;

    console.log('Find orphaned collections request:', { sourceOfTruth });

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

    console.log(`Fetching all collections from ${sourceOfTruth} (source of truth)...`);
    console.log(`Fetching all collections from ${destinationPlatform} (to find orphans)...`);

    // Fetch all collections from source of truth
    const sourceCollections: any[] = [];

    if (sourceOfTruth === 'woocommerce') {
      const client = createWooCommerceClient(sourceConnection.config as WooCommerceConfig);
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching WooCommerce categories page ${page}...`);
        const result = await client.getProductCategories({ page, per_page: 100 });
        sourceCollections.push(...result.data);
        hasMore = result.data.length === 100;
        page++;
        if (page > 100) break; // Safety limit
      }
    } else {
      const client = createShopifyClient(sourceConnection.config as ShopifyConfig);
      let hasNextPage = true;
      let cursor: string | undefined = undefined;

      while (hasNextPage) {
        console.log(`Fetching Shopify collections${cursor ? ` after cursor` : ''}...`);
        const result = await client.getCollections({ first: 250, after: cursor });
        const collections = result.edges.map((edge: any) => edge.node);
        sourceCollections.push(...collections);
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        if (sourceCollections.length > 10000) break; // Safety limit
      }
    }

    console.log(`Fetched ${sourceCollections.length} collections from ${sourceOfTruth}`);

    // Fetch all collections from destination
    const destinationCollections: any[] = [];

    if (destinationPlatform === 'woocommerce') {
      const client = createWooCommerceClient(destConnection.config as WooCommerceConfig);
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        console.log(`Fetching WooCommerce categories page ${page}...`);
        const result = await client.getProductCategories({ page, per_page: 100 });
        destinationCollections.push(...result.data);
        hasMore = result.data.length === 100;
        page++;
        if (page > 100) break; // Safety limit
      }
    } else {
      const client = createShopifyClient(destConnection.config as ShopifyConfig);
      let hasNextPage = true;
      let cursor: string | undefined = undefined;

      while (hasNextPage) {
        console.log(`Fetching Shopify collections${cursor ? ` after cursor` : ''}...`);
        const result = await client.getCollections({ first: 250, after: cursor });
        const collections = result.edges.map((edge: any) => edge.node);
        destinationCollections.push(...collections);
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        if (destinationCollections.length > 10000) break; // Safety limit
      }
    }

    console.log(`Fetched ${destinationCollections.length} collections from ${destinationPlatform}`);

    // Create a map of source collections by slug/handle and name
    const sourceCollectionMap = new Map();

    sourceCollections.forEach((collection: any) => {
      // Map by slug (WooCommerce) or handle (Shopify)
      const slug = sourceOfTruth === 'woocommerce' ? collection.slug : collection.handle;
      if (slug) {
        sourceCollectionMap.set(`slug:${slug.toLowerCase()}`, collection);
      }

      // Map by name/title
      const name = sourceOfTruth === 'woocommerce' ? collection.name : collection.title;
      if (name) {
        const normalizedName = name.toLowerCase().trim();
        sourceCollectionMap.set(`name:${normalizedName}`, collection);
      }
    });

    // Find orphaned collections (exist in destination but NOT in source)
    const orphanedCollections = destinationCollections.filter((destCollection: any) => {
      const destSlug = destinationPlatform === 'woocommerce' ? destCollection.slug : destCollection.handle;
      const destName = destinationPlatform === 'woocommerce' ? destCollection.name : destCollection.title;

      // Check if collection exists in source by slug/handle
      if (destSlug && typeof destSlug === 'string') {
        const slugMatch = sourceCollectionMap.get(`slug:${destSlug.toLowerCase()}`);
        if (slugMatch) return false; // Found in source, not orphaned
      }

      // Check if collection exists in source by name
      if (destName && typeof destName === 'string') {
        const normalizedName = destName.toLowerCase().trim();
        const nameMatch = sourceCollectionMap.get(`name:${normalizedName}`);
        if (nameMatch) return false; // Found in source, not orphaned
      }

      return true; // Not found in source, this is orphaned
    });

    console.log(`Found ${orphanedCollections.length} orphaned collections in ${destinationPlatform}`);

    // Format the orphaned collections for the response
    const formattedOrphans = orphanedCollections.map((collection: any) => ({
      id: destinationPlatform === 'woocommerce' ? collection.id?.toString() : collection.id,
      name: destinationPlatform === 'woocommerce' ? collection.name : collection.title,
      slug: destinationPlatform === 'woocommerce' ? collection.slug : collection.handle,
      productCount: destinationPlatform === 'woocommerce' ? collection.count : (collection.productsCount?.count || 0),
      platform: destinationPlatform,
    }));

    return NextResponse.json({
      orphanedCollections: formattedOrphans,
      summary: {
        sourceOfTruth: sourceOfTruth,
        sourceCollectionCount: sourceCollections.length,
        destinationPlatform: destinationPlatform,
        destinationCollectionCount: destinationCollections.length,
        orphanedCount: orphanedCollections.length,
      }
    });

  } catch (error: any) {
    console.error('Failed to find orphaned collections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find orphaned collections' },
      { status: 500 }
    );
  }
}
