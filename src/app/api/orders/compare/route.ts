import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, OrderDifference, OrderComparisonResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth } = body;

    console.log('Order comparison request:', { sourceOfTruth });

    if (!sourceOfTruth || (sourceOfTruth !== 'woocommerce' && sourceOfTruth !== 'shopify')) {
      return NextResponse.json(
        { error: 'sourceOfTruth must be either "woocommerce" or "shopify"' },
        { status: 400 }
      );
    }

    const sourcePlatform = sourceOfTruth;
    const destinationPlatform = sourceOfTruth === 'woocommerce' ? 'shopify' : 'woocommerce';

    // Get connections
    const sourceConnection = getConnection(sourcePlatform);
    const destConnection = getConnection(destinationPlatform);

    if (!sourceConnection?.isConnected || !destConnection?.isConnected) {
      return NextResponse.json(
        { error: 'Both platforms must be connected' },
        { status: 400 }
      );
    }

    // Fetch all orders from source
    console.log(`Fetching orders from ${sourcePlatform} (source of truth)...`);
    const sourceOrders = await fetchAllOrders(sourcePlatform, sourceConnection.config);
    console.log(`Fetched ${sourceOrders.length} orders from ${sourcePlatform}`);

    // Fetch all orders from destination
    console.log(`Fetching orders from ${destinationPlatform} (destination)...`);
    const destOrders = await fetchAllOrders(destinationPlatform, destConnection.config);
    console.log(`Fetched ${destOrders.length} orders from ${destinationPlatform}`);

    // Create maps for efficient lookup
    console.log('Starting order comparison...');
    const destOrdersByNumber = new Map<string, any>();
    const destOrdersByEmailAndTotal = new Map<string, any>();

    destOrders.forEach(order => {
      let orderNumber = (order.number || order.name || order.id)?.toString().toLowerCase().trim();

      // For draft orders, extract WooCommerce order number from note2
      if (order.isDraft && order.note2) {
        const match = order.note2.match(/WooCommerce Order #(\d+)/i);
        if (match) {
          orderNumber = match[1].toLowerCase().trim();
        }
      }

      if (orderNumber) {
        destOrdersByNumber.set(orderNumber, order);
      }

      // Secondary key: email + total price
      const email = order.billing?.email || order.email;
      const total = order.total || order.totalPriceSet?.shopMoney?.amount;
      if (email && total) {
        const key = `${email.toLowerCase()}_${total}`;
        destOrdersByEmailAndTotal.set(key, order);
      }
    });

    // Find orders only in source
    const differences: OrderDifference[] = [];
    
    for (const sourceOrder of sourceOrders) {
      const orderNumber = (sourceOrder.number || sourceOrder.name || sourceOrder.id)?.toString().toLowerCase().trim();
      const email = sourceOrder.billing?.email || sourceOrder.email || '';
      const total = sourceOrder.total || sourceOrder.totalPriceSet?.shopMoney?.amount || '0';
      
      // Try primary match: order number
      let existsInDest = orderNumber && destOrdersByNumber.has(orderNumber);
      
      // Try secondary match: email + total
      if (!existsInDest && email && total) {
        const key = `${email.toLowerCase()}_${total}`;
        existsInDest = destOrdersByEmailAndTotal.has(key);
      }
      
      if (!existsInDest) {
        const lineItemCount = sourceOrder.line_items?.length || sourceOrder.lineItems?.edges?.length || 0;
        const createdAt = sourceOrder.date_created || sourceOrder.createdAt || new Date().toISOString();

        differences.push({
          orderNumber: sourceOrder.number || sourceOrder.name || sourceOrder.id?.toString() || 'N/A',
          email,
          totalPrice: total.toString(),
          createdAt,
          sourceOrderId: sourceOrder.id.toString(),
          existsInSource: true,
          existsInDestination: false,
          sourcePlatform,
          destinationPlatform,
          lineItemCount,
          financialStatus: sourceOrder.status || sourceOrder.displayFinancialStatus || 'unknown',
          fulfillmentStatus: sourceOrder.fulfillment_status || sourceOrder.displayFulfillmentStatus || 'unfulfilled',
        });
      }
    }

    console.log(`Found ${differences.length} orders only in ${sourcePlatform}`);

    const result: OrderComparisonResult = {
      differences,
      summary: {
        sourceOfTruth: sourcePlatform,
        sourceOrderCount: sourceOrders.length,
        destinationPlatform,
        destinationOrderCount: destOrders.length,
        matchedOrders: sourceOrders.length - differences.length,
        ordersOnlyInSource: differences.length,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Order comparison failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare orders' },
      { status: 500 }
    );
  }
}

async function fetchAllOrders(platform: string, config: any): Promise<any[]> {
  const allOrders: any[] = [];

  if (platform === 'woocommerce') {
    const client = createWooCommerceClient(config as WooCommerceConfig);
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching WooCommerce orders page ${page}...`);
      const result = await client.getOrders({ page, per_page: 100 });
      allOrders.push(...result.data);

      hasMore = page < result.totalPages;
      page++;
    }
  } else {
    const client = createShopifyClient(config as ShopifyConfig);

    // Fetch completed orders
    let hasNextPage = true;
    let after: string | undefined = undefined;

    while (hasNextPage) {
      console.log(after ? `Fetching Shopify orders after cursor ${after.substring(0, 20)}...` : 'Fetching Shopify orders...');
      const result = await client.getOrders({ first: 250, after });

      const orders = result.edges.map((edge: any) => edge.node);
      allOrders.push(...orders);

      hasNextPage = result.pageInfo.hasNextPage;
      after = result.pageInfo.endCursor;
    }

    // Also fetch draft orders (these are imported WooCommerce orders)
    hasNextPage = true;
    after = undefined;

    while (hasNextPage) {
      console.log(after ? `Fetching Shopify draft orders after cursor ${after.substring(0, 20)}...` : 'Fetching Shopify draft orders...');
      const result = await client.getDraftOrders({ first: 250, after });

      const draftOrders = result.edges.map((edge: any) => ({
        ...edge.node,
        isDraft: true, // Mark as draft for identification
      }));
      allOrders.push(...draftOrders);

      hasNextPage = result.pageInfo.hasNextPage;
      after = result.pageInfo.endCursor;
    }
  }

  return allOrders;
}

