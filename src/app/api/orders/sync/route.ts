import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, OrderDifference, OrderSyncResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth, orders } = body as {
      sourceOfTruth: 'woocommerce' | 'shopify';
      orders: OrderDifference[];
    };

    console.log('Order sync request:', { sourceOfTruth, count: orders.length });

    if (!sourceOfTruth || !orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
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

    console.log(`Syncing ${orders.length} orders from ${sourcePlatform} to ${destinationPlatform}...`);

    const sourceClient = sourcePlatform === 'woocommerce'
      ? createWooCommerceClient(sourceConnection.config as WooCommerceConfig)
      : createShopifyClient(sourceConnection.config as ShopifyConfig);

    const destClient = destinationPlatform === 'woocommerce'
      ? createWooCommerceClient(destConnection.config as WooCommerceConfig)
      : createShopifyClient(destConnection.config as ShopifyConfig);

    const results: OrderSyncResult[] = [];

    for (const orderDiff of orders) {
      try {
        // Fetch full order data from source
        const sourceOrder = await sourceClient.getOrder(orderDiff.sourceOrderId);

        // Transform and create in destination
        let newOrderId: string | undefined;
        const warnings: string[] = [];

        if (destinationPlatform === 'shopify') {
          // Create draft order in Shopify (Shopify doesn't allow direct order creation)
          const draftOrderInput = transformToShopifyDraftOrder(sourceOrder);
          const created = await (destClient as any).createDraftOrder(draftOrderInput);
          newOrderId = created.id;

          // Add specific warnings based on WooCommerce status
          if (sourceOrder.status === 'completed') {
            warnings.push('Created as draft order - Complete and mark as FULFILLED in Shopify admin (WooCommerce status: completed)');
          } else if (sourceOrder.status === 'processing') {
            warnings.push('Created as draft order - Complete and mark as PAID in Shopify admin (WooCommerce status: processing)');
          } else {
            warnings.push('Created as draft order - requires manual completion in Shopify admin');
          }
        } else {
          // Create order in WooCommerce
          const wcInput = transformToWooCommerceOrder(sourceOrder);
          const created = await (destClient as any).api.post('orders', wcInput);
          newOrderId = created.data.id.toString();
        }

        console.log(`✓ Successfully created order ${orderDiff.orderNumber} in ${destinationPlatform}`);

        results.push({
          orderNumber: orderDiff.orderNumber,
          email: orderDiff.email,
          success: true,
          newOrderId,
          warnings: warnings.length > 0 ? warnings : undefined,
          platform: destinationPlatform,
        });
      } catch (error: any) {
        console.error(`✗ Failed to sync order ${orderDiff.orderNumber}:`, error.message);
        
        results.push({
          orderNumber: orderDiff.orderNumber,
          email: orderDiff.email,
          success: false,
          error: error.message,
          platform: destinationPlatform,
        });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Sync complete: ${succeeded} succeeded, ${failed} failed`);

    return NextResponse.json({
      results,
      summary: {
        total: orders.length,
        succeeded,
        failed,
      },
    });
  } catch (error: any) {
    console.error('Order sync failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync orders' },
      { status: 500 }
    );
  }
}

function transformToShopifyDraftOrder(wcOrder: any): any {
  const billingAddress = wcOrder.billing;
  const shippingAddress = wcOrder.shipping;

  // Build note with WooCommerce status information and original date
  const originalDate = wcOrder.date_created || wcOrder.date_created_gmt;
  const formattedDate = originalDate ? new Date(originalDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }) : 'Unknown';

  const statusNote = `WooCommerce Order #${wcOrder.number || wcOrder.id}\nOriginal Date: ${formattedDate}\nOriginal Status: ${wcOrder.status}`;
  const customerNote = wcOrder.customer_note ? `\n\nCustomer Note: ${wcOrder.customer_note}` : '';
  const fullNote = statusNote + customerNote;

  // Add tags to indicate original status and date
  const tags: string[] = ['woocommerce-import'];

  // Add year tag for filtering (e.g., "wc-2023")
  if (originalDate) {
    const year = new Date(originalDate).getFullYear();
    tags.push(`wc-${year}`);
  }

  if (wcOrder.status === 'completed') {
    tags.push('wc-completed', 'needs-fulfillment');
  } else if (wcOrder.status === 'processing') {
    tags.push('wc-processing');
  }

  return {
    email: wcOrder.billing?.email || '',
    // Shopify's DraftOrderInput uses `note` on input, but the DraftOrder type exposes `note2`.
    // We write to `note` here and read from `note2` when fetching draft orders.
    note: fullNote,
    tags,
    billingAddress: billingAddress ? {
      firstName: billingAddress.first_name || '',
      lastName: billingAddress.last_name || '',
      address1: billingAddress.address_1 || '',
      address2: billingAddress.address_2 || '',
      city: billingAddress.city || '',
      province: billingAddress.state || '',
      country: billingAddress.country || '',
      zip: billingAddress.postcode || '',
      phone: billingAddress.phone || '',
    } : undefined,
    shippingAddress: shippingAddress ? {
      firstName: shippingAddress.first_name || '',
      lastName: shippingAddress.last_name || '',
      address1: shippingAddress.address_1 || '',
      address2: shippingAddress.address_2 || '',
      city: shippingAddress.city || '',
      province: shippingAddress.state || '',
      country: shippingAddress.country || '',
      zip: shippingAddress.postcode || '',
    } : undefined,
    lineItems: wcOrder.line_items?.map((item: any) => ({
      title: item.name,
      quantity: item.quantity,
      originalUnitPrice: item.price.toString(),
      requiresShipping: true,
    })) || [],
  };
}

function transformToWooCommerceOrder(shopifyOrder: any): any {
  const billingAddr = shopifyOrder.billingAddress;
  const shippingAddr = shopifyOrder.shippingAddress;

  return {
    status: shopifyOrder.displayFinancialStatus === 'PAID' ? 'processing' : 'pending',
    billing: billingAddr ? {
      first_name: billingAddr.firstName || '',
      last_name: billingAddr.lastName || '',
      address_1: billingAddr.address1 || '',
      address_2: billingAddr.address2 || '',
      city: billingAddr.city || '',
      state: billingAddr.province || '',
      postcode: billingAddr.zip || '',
      country: billingAddr.country || '',
      email: shopifyOrder.email,
      phone: billingAddr.phone || '',
    } : undefined,
    shipping: shippingAddr ? {
      first_name: shippingAddr.firstName || '',
      last_name: shippingAddr.lastName || '',
      address_1: shippingAddr.address1 || '',
      address_2: shippingAddr.address2 || '',
      city: shippingAddr.city || '',
      state: shippingAddr.province || '',
      postcode: shippingAddr.zip || '',
      country: shippingAddr.country || '',
    } : undefined,
    line_items: shopifyOrder.lineItems?.edges?.map((edge: any) => ({
      name: edge.node.title,
      quantity: edge.node.quantity,
      total: edge.node.variant?.price || '0',
    })) || [],
  };
}

