import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, CustomerDifference, CustomerComparisonResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceOfTruth } = body;

    console.log('Customer comparison request:', { sourceOfTruth });

    if (!sourceOfTruth || (sourceOfTruth !== 'woocommerce' && sourceOfTruth !== 'shopify')) {
      return NextResponse.json(
        {
          error: 'Invalid source of truth',
          details: 'sourceOfTruth must be either "woocommerce" or "shopify"',
          code: 'INVALID_SOURCE'
        },
        { status: 400 }
      );
    }

    const sourcePlatform = sourceOfTruth;
    const destinationPlatform = sourceOfTruth === 'woocommerce' ? 'shopify' : 'woocommerce';

    // Get connections
    const sourceConnection = getConnection(sourcePlatform);
    const destConnection = getConnection(destinationPlatform);

    if (!sourceConnection?.isConnected) {
      return NextResponse.json(
        {
          error: `${sourcePlatform.charAt(0).toUpperCase() + sourcePlatform.slice(1)} is not connected`,
          details: `Please connect to ${sourcePlatform.charAt(0).toUpperCase() + sourcePlatform.slice(1)} before comparing customers`,
          code: 'SOURCE_NOT_CONNECTED',
          platform: sourcePlatform
        },
        { status: 400 }
      );
    }

    if (!destConnection?.isConnected) {
      return NextResponse.json(
        {
          error: `${destinationPlatform.charAt(0).toUpperCase() + destinationPlatform.slice(1)} is not connected`,
          details: `Please connect to ${destinationPlatform.charAt(0).toUpperCase() + destinationPlatform.slice(1)} before comparing customers`,
          code: 'DESTINATION_NOT_CONNECTED',
          platform: destinationPlatform
        },
        { status: 400 }
      );
    }

    // Fetch all customers from source
    console.log(`Fetching customers from ${sourcePlatform} (source of truth)...`);
    let sourceCustomers;
    try {
      sourceCustomers = await fetchAllCustomers(sourcePlatform, sourceConnection.config);
      console.log(`Fetched ${sourceCustomers.length} customers from ${sourcePlatform}`);

      // When WooCommerce is the source of truth, only consider customers who have past orders
      // WooCommerce exposes `orders_count` and `total_spent` on customer objects, which we can
      // use as a proxy for "has at least one completed order".
      if (sourcePlatform === 'woocommerce') {
        const beforeCount = sourceCustomers.length;
        const filtered = sourceCustomers.filter((c: any) => {
          const ordersCountRaw = (c as any).orders_count;
          const totalSpentRaw = (c as any).total_spent;

          const ordersCount = typeof ordersCountRaw === 'number'
            ? ordersCountRaw
            : parseInt(ordersCountRaw || '0', 10);

          const totalSpent = typeof totalSpentRaw === 'number'
            ? totalSpentRaw
            : parseFloat(totalSpentRaw || '0');

          return (Number.isFinite(ordersCount) && ordersCount > 0) ||
                 (Number.isFinite(totalSpent) && totalSpent > 0);
        });

        // Safety fallback: if our filter would remove everyone, keep the original list so we don't
        // incorrectly report "all customers in sync" just because orders_count/total_spent are missing.
        if (beforeCount > 0 && filtered.length === 0) {
          console.warn(
            'WooCommerce customer filter for past orders would remove all customers; ' +
            'falling back to unfiltered customer list. Check whether orders_count/total_spent are populated.'
          );
        } else {
          sourceCustomers = filtered;
        }

        console.log(
          `Filtered WooCommerce customers to those with past orders: ${filtered.length} / ${beforeCount}`
        );
      }

      // After platform-specific filters, ensure we only consider customers that actually have a name
      // (either first or last). This helps avoid spam/placeholder records with no real customer info.
      const beforeNameFilterCount = sourceCustomers.length;
      sourceCustomers = sourceCustomers.filter((c: any) => {
        const firstName = (
          (c as any).first_name ??
          (c as any).firstName ??
          (c as any).billing?.first_name ??
          ''
        )
          .toString()
          .trim();
        const lastName = (
          (c as any).last_name ??
          (c as any).lastName ??
          (c as any).billing?.last_name ??
          ''
        )
          .toString()
          .trim();
        return Boolean(firstName || lastName);
      });
      console.log(
        `Filtered customers to those with a name: ${sourceCustomers.length} / ${beforeNameFilterCount}`
      );

    } catch (error: any) {
      console.error(`Failed to fetch customers from ${sourcePlatform}:`, error);
      return NextResponse.json(
        {
          error: `Failed to fetch customers from ${sourcePlatform.charAt(0).toUpperCase() + sourcePlatform.slice(1)}`,
          details: error.message || 'Unknown error occurred while fetching customers',
          code: 'SOURCE_FETCH_FAILED',
          platform: sourcePlatform
        },
        { status: 500 }
      );
    }

    // Fetch all customers from destination
    console.log(`Fetching customers from ${destinationPlatform} (destination)...`);
    let destCustomers;
    try {
      destCustomers = await fetchAllCustomers(destinationPlatform, destConnection.config);
      console.log(`Fetched ${destCustomers.length} customers from ${destinationPlatform}`);
    } catch (error: any) {
      console.error(`Failed to fetch customers from ${destinationPlatform}:`, error);
      return NextResponse.json(
        {
          error: `Failed to fetch customers from ${destinationPlatform.charAt(0).toUpperCase() + destinationPlatform.slice(1)}`,
          details: error.message || 'Unknown error occurred while fetching customers',
          code: 'DESTINATION_FETCH_FAILED',
          platform: destinationPlatform
        },
        { status: 500 }
      );
    }

    // Create maps for efficient lookup
    console.log('Starting customer comparison...');
    const destCustomersByEmail = new Map<string, any>();

    destCustomers.forEach(customer => {
      const email = customer.email?.toLowerCase().trim();
      if (email) {
        destCustomersByEmail.set(email, customer);
      }
    });

    // Find customers only in source
    const differences: CustomerDifference[] = [];

    for (const sourceCustomer of sourceCustomers) {
      const email = sourceCustomer.email?.toLowerCase().trim();

      if (!email) continue; // Skip customers without email

      const existsInDest = destCustomersByEmail.has(email);

      if (!existsInDest) {
        differences.push({
          email: sourceCustomer.email,
          firstName: sourceCustomer.first_name || sourceCustomer.firstName || '',
          lastName: sourceCustomer.last_name || sourceCustomer.lastName || '',
          phone: sourceCustomer.billing?.phone || sourceCustomer.phone,
          sourceCustomerId: sourceCustomer.id.toString(),
          existsInSource: true,
          existsInDestination: false,
          sourcePlatform,
          destinationPlatform,
          addressCount: sourceCustomer.addresses?.length || (sourceCustomer.billing ? 1 : 0),
        });
      }
    }

    console.log(`Found ${differences.length} customers only in ${sourcePlatform}`);

    const result: CustomerComparisonResult = {
      differences,
      summary: {
        sourceOfTruth: sourcePlatform,
        sourceCustomerCount: sourceCustomers.length,
        destinationPlatform,
        destinationCustomerCount: destCustomers.length,
        matchedCustomers: sourceCustomers.length - differences.length,
        customersOnlyInSource: differences.length,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Customer comparison failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to compare customers',
        details: error.message || 'An unexpected error occurred during customer comparison',
        code: 'COMPARISON_FAILED'
      },
      { status: 500 }
    );
  }
}

async function fetchAllCustomers(platform: string, config: any): Promise<any[]> {
  const allCustomers: any[] = [];

  if (platform === 'woocommerce') {
    const client = createWooCommerceClient(config as WooCommerceConfig);
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching WooCommerce customers page ${page}...`);
      const result = await client.getCustomers({ page, per_page: 100 });
      allCustomers.push(...result.data);

      hasMore = page < result.totalPages;
      page++;
    }
  } else {
    const client = createShopifyClient(config as ShopifyConfig);
    let hasNextPage = true;
    let after: string | undefined = undefined;

    while (hasNextPage) {
      console.log(after ? `Fetching Shopify customers after cursor ${after.substring(0, 20)}...` : 'Fetching Shopify customers...');
      const result = await client.getCustomers({ first: 250, after });

      const customers = result.edges.map((edge: any) => edge.node);
      allCustomers.push(...customers);

      hasNextPage = result.pageInfo.hasNextPage;
      after = result.pageInfo.endCursor;
    }
  }

  return allCustomers;
}

