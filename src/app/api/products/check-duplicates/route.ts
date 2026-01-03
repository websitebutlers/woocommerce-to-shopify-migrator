import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, Platform } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceProducts, source, destination } = body;

    console.log('Check duplicates request:', { 
      productsCount: sourceProducts?.length, 
      source, 
      destination 
    });

    if (!sourceProducts || !source || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceProducts, source, or destination' },
        { status: 400 }
      );
    }

    if (!Array.isArray(sourceProducts) || sourceProducts.length === 0) {
      return NextResponse.json(
        { error: 'sourceProducts must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get destination connection
    const destConnection = getConnection(destination);
    console.log('Destination connection:', { 
      platform: destination, 
      found: !!destConnection, 
      isConnected: destConnection?.isConnected 
    });

    if (!destConnection) {
      return NextResponse.json(
        { error: `${destination} connection not found. Please connect to ${destination} first.` },
        { status: 404 }
      );
    }

    if (!destConnection.isConnected) {
      return NextResponse.json(
        { error: `${destination} is not connected. Please test and save the connection first.` },
        { status: 401 }
      );
    }

    // Fetch all products from destination
    let destinationProducts: any[] = [];
    
    if (destination === 'woocommerce') {
      const client = createWooCommerceClient(destConnection.config as WooCommerceConfig);
      
      // Fetch all pages of WooCommerce products
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        console.log(`Fetching WooCommerce products page ${page}...`);
        const result = await client.getProducts({ page, per_page: 100 });
        destinationProducts.push(...result.data);
        
        // Check if there are more pages
        hasMore = result.data.length === 100;
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 50) break;
      }
      
      console.log(`Fetched ${destinationProducts.length} WooCommerce products`);
    } else {
      const client = createShopifyClient(destConnection.config as ShopifyConfig);
      
      // Fetch all pages of Shopify products using cursor pagination
      let hasNextPage = true;
      let cursor: string | undefined = undefined;
      
      while (hasNextPage) {
        console.log(`Fetching Shopify products${cursor ? ` after cursor ${cursor.substring(0, 20)}...` : '...'}`);
        const result = await client.getProducts({ first: 250, after: cursor });
        
        const products = result.edges.map((edge: any) => edge.node);
        destinationProducts.push(...products);
        
        hasNextPage = result.pageInfo.hasNextPage;
        cursor = result.pageInfo.endCursor;
        
        // Safety limit to prevent infinite loops
        if (destinationProducts.length > 10000) break;
      }
      
      console.log(`Fetched ${destinationProducts.length} Shopify products`);
    }

    // Create a map of destination products by SKU and name for matching
    const destProductMap = new Map();
    
    destinationProducts.forEach((product: any) => {
      // Match by SKU
      const sku = destination === 'woocommerce' ? product.sku : product.variants?.edges?.[0]?.node.sku;
      if (sku) {
        destProductMap.set(`sku:${sku.toLowerCase()}`, product);
      }
      
      // Match by name (normalized)
      const name = destination === 'woocommerce' ? product.name : product.title;
      if (name) {
        const normalizedName = name.toLowerCase().trim();
        destProductMap.set(`name:${normalizedName}`, product);
      }
    });

    // Check each source product for duplicates
    const duplicateStatus = sourceProducts.map((sourceProduct: any) => {
      try {
        const sourceSku = source === 'woocommerce' ? sourceProduct.sku : sourceProduct.variants?.edges?.[0]?.node?.sku;
        const sourceName = source === 'woocommerce' ? sourceProduct.name : sourceProduct.title;
        
        let isDuplicate = false;
        let matchType = null;
        let matchedProduct = null;

        // Check SKU match (more reliable)
        if (sourceSku && typeof sourceSku === 'string') {
          const skuMatch = destProductMap.get(`sku:${sourceSku.toLowerCase()}`);
          if (skuMatch) {
            isDuplicate = true;
            matchType = 'sku';
            matchedProduct = skuMatch;
          }
        }

        // Check name match if no SKU match
        if (!isDuplicate && sourceName && typeof sourceName === 'string') {
          const normalizedName = sourceName.toLowerCase().trim();
          const nameMatch = destProductMap.get(`name:${normalizedName}`);
          if (nameMatch) {
            isDuplicate = true;
            matchType = 'name';
            matchedProduct = nameMatch;
          }
        }

        return {
          id: source === 'woocommerce' ? sourceProduct.id?.toString() : sourceProduct.id,
          isDuplicate,
          matchType,
          matchedId: matchedProduct ? (destination === 'woocommerce' ? matchedProduct.id?.toString() : matchedProduct.id) : null,
        };
      } catch (error) {
        console.error('Error checking duplicate for product:', sourceProduct, error);
        return {
          id: source === 'woocommerce' ? sourceProduct.id?.toString() : sourceProduct.id,
          isDuplicate: false,
          matchType: null,
          matchedId: null,
        };
      }
    });

    return NextResponse.json({ duplicateStatus });
  } catch (error: any) {
    console.error('Failed to check duplicates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}

