import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, CustomerDifference, CustomerSyncResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth, customers } = body as {
      sourceOfTruth: 'woocommerce' | 'shopify';
      customers: CustomerDifference[];
    };

    console.log('Customer sync request:', { sourceOfTruth, count: customers.length });

    if (!sourceOfTruth || !customers || !Array.isArray(customers)) {
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

    console.log(`Syncing ${customers.length} customers from ${sourcePlatform} to ${destinationPlatform}...`);

    const sourceClient = sourcePlatform === 'woocommerce'
      ? createWooCommerceClient(sourceConnection.config as WooCommerceConfig)
      : createShopifyClient(sourceConnection.config as ShopifyConfig);

    const destClient = destinationPlatform === 'woocommerce'
      ? createWooCommerceClient(destConnection.config as WooCommerceConfig)
      : createShopifyClient(destConnection.config as ShopifyConfig);

    const results: CustomerSyncResult[] = [];

    for (const customerDiff of customers) {
      try {
        // Fetch full customer data from source
        const sourceCustomer = await sourceClient.getCustomer(customerDiff.sourceCustomerId);

        // Transform and create in destination
        let newCustomerId: string | undefined;

        if (destinationPlatform === 'shopify') {
          // Create customer in Shopify
          const shopifyInput = transformToShopifyCustomer(sourceCustomer);
          const created = await (destClient as any).createCustomer(shopifyInput);
          newCustomerId = created.id;
        } else {
          // Create customer in WooCommerce
          const wcInput = transformToWooCommerceCustomer(sourceCustomer);
          const created = await (destClient as any).api.post('customers', wcInput);
          newCustomerId = created.data.id.toString();
        }

        console.log(`✓ Successfully created customer ${customerDiff.email} in ${destinationPlatform}`);

        results.push({
          email: customerDiff.email,
          firstName: customerDiff.firstName,
          lastName: customerDiff.lastName,
          success: true,
          newCustomerId,
          platform: destinationPlatform,
        });
      } catch (error: any) {
        console.error(`✗ Failed to sync customer ${customerDiff.email}:`, error.message);
        
        results.push({
          email: customerDiff.email,
          firstName: customerDiff.firstName,
          lastName: customerDiff.lastName,
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
        total: customers.length,
        succeeded,
        failed,
      },
    });
  } catch (error: any) {
    console.error('Customer sync failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync customers' },
      { status: 500 }
    );
  }
}

function transformToShopifyCustomer(wcCustomer: any): any {
  const billingAddress = wcCustomer.billing;
  const shippingAddress = wcCustomer.shipping;

  return {
    email: wcCustomer.email,
    firstName: wcCustomer.first_name || '',
    lastName: wcCustomer.last_name || '',
    phone: billingAddress?.phone || '',
    addresses: [
      ...(billingAddress ? [{
        address1: billingAddress.address_1 || '',
        address2: billingAddress.address_2 || '',
        city: billingAddress.city || '',
        province: billingAddress.state || '',
        country: billingAddress.country || '',
        zip: billingAddress.postcode || '',
        phone: billingAddress.phone || '',
        firstName: billingAddress.first_name || wcCustomer.first_name || '',
        lastName: billingAddress.last_name || wcCustomer.last_name || '',
        company: billingAddress.company || '',
      }] : []),
      ...(shippingAddress && shippingAddress.address_1 ? [{
        address1: shippingAddress.address_1 || '',
        address2: shippingAddress.address_2 || '',
        city: shippingAddress.city || '',
        province: shippingAddress.state || '',
        country: shippingAddress.country || '',
        zip: shippingAddress.postcode || '',
        firstName: shippingAddress.first_name || wcCustomer.first_name || '',
        lastName: shippingAddress.last_name || wcCustomer.last_name || '',
        company: shippingAddress.company || '',
      }] : []),
    ],
  };
}

function transformToWooCommerceCustomer(shopifyCustomer: any): any {
  const defaultAddress = shopifyCustomer.addresses?.[0];

  return {
    email: shopifyCustomer.email,
    first_name: shopifyCustomer.firstName || '',
    last_name: shopifyCustomer.lastName || '',
    billing: defaultAddress ? {
      first_name: defaultAddress.firstName || '',
      last_name: defaultAddress.lastName || '',
      company: defaultAddress.company || '',
      address_1: defaultAddress.address1 || '',
      address_2: defaultAddress.address2 || '',
      city: defaultAddress.city || '',
      state: defaultAddress.province || '',
      postcode: defaultAddress.zip || '',
      country: defaultAddress.country || '',
      email: shopifyCustomer.email,
      phone: defaultAddress.phone || shopifyCustomer.phone || '',
    } : undefined,
  };
}

