import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { MigrationMapper } from '@/lib/migration/mapper';
import { migrationQueue } from '@/lib/migration/queue';
import { Platform, WooCommerceConfig, ShopifyConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds, type, source, destination } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid itemIds' },
        { status: 400 }
      );
    }

    if (!type || !source || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get connections
    const sourceConnection = getConnection(source);
    if (!sourceConnection || !sourceConnection.isConnected) {
      return NextResponse.json(
        { error: `${source} not connected` },
        { status: 401 }
      );
    }

    const destConnection = getConnection(destination);
    if (!destConnection || !destConnection.isConnected) {
      return NextResponse.json(
        { error: `${destination} not connected` },
        { status: 401 }
      );
    }

    // Create migration job
    const job = migrationQueue.createJob(type, source as Platform, destination as Platform, itemIds);

    // Process in background
    setImmediate(async () => {
      await migrationQueue.processJob(job.id, async (itemId: string) => {
        try {
          // Fetch from source
          let sourceData: any;
          if (source === 'woocommerce') {
            const client = createWooCommerceClient(sourceConnection.config as WooCommerceConfig);
            switch (type) {
              case 'product':
                sourceData = await client.getProduct(itemId);
                break;
              case 'customer':
                sourceData = await client.getCustomer(itemId);
                break;
              case 'order':
                sourceData = await client.getOrder(itemId);
                break;
              case 'collection':
                sourceData = await client.getProductCategory(itemId);
                break;
              case 'coupon':
                sourceData = await client.getCoupon(itemId);
                break;
              case 'page':
                sourceData = await client.getPage(itemId);
                break;
              case 'blogPost':
                sourceData = await client.getPost(itemId);
                break;
              default:
                throw new Error(`${type} not supported for WooCommerce source`);
            }
          } else {
            const client = createShopifyClient(sourceConnection.config as ShopifyConfig);
            switch (type) {
              case 'product':
                sourceData = await client.getProduct(itemId);
                break;
              case 'customer':
                sourceData = await client.getCustomer(itemId);
                break;
              case 'coupon':
                const result = await client.getDiscountCodes({ query: `id:${itemId}` });
                sourceData = result.edges[0]?.node;
                if (!sourceData) {
                  throw new Error('Coupon not found');
                }
                break;
              case 'page':
                const pageResult = await client.getPages({ query: `id:${itemId}` });
                sourceData = pageResult.edges[0]?.node;
                if (!sourceData) {
                  throw new Error('Page not found');
                }
                break;
              case 'blogPost':
                const postResult = await client.getBlogPosts({ query: `id:${itemId}` });
                sourceData = postResult.edges[0]?.node;
                if (!sourceData) {
                  throw new Error('Blog post not found');
                }
                break;
              default:
                throw new Error(`${type} not supported for Shopify source`);
            }
          }

          // Transform
          const transformedData = MigrationMapper.migrate(
            sourceData,
            type,
            source as Platform,
            destination as Platform
          );

          // Validate
          const validation = MigrationMapper.validate(transformedData, type);
          if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
          }

          // Create in destination
          let destinationId: string;
          if (destination === 'woocommerce') {
            const client = createWooCommerceClient(destConnection.config as WooCommerceConfig);
            let result: any;
            switch (type) {
              case 'product':
                result = await client.createProduct(transformedData);
                destinationId = result.id.toString();
                break;
              case 'customer':
                result = await client.createCustomer(transformedData);
                destinationId = result.id.toString();
                break;
              case 'coupon':
                result = await client.createCoupon(transformedData);
                destinationId = result.id.toString();
                break;
              case 'page':
                result = await client.createPage(transformedData);
                destinationId = result.id.toString();
                break;
              case 'blogPost':
                result = await client.createPost(transformedData);
                destinationId = result.id.toString();
                break;
              default:
                throw new Error(`${type} not supported for WooCommerce destination`);
            }
          } else {
            const client = createShopifyClient(destConnection.config as ShopifyConfig);
            let result: any;
            switch (type) {
              case 'product':
                result = await client.createProduct(transformedData);
                destinationId = result.id;
                break;
              case 'customer':
                result = await client.createCustomer(transformedData);
                destinationId = result.id;
                break;
              case 'coupon':
                result = await client.createDiscountCode(transformedData);
                destinationId = result.id;
                break;
              case 'page':
                result = await client.createPage(transformedData);
                destinationId = result.id;
                break;
              case 'blogPost':
                result = await client.createBlogPost(transformedData);
                destinationId = result.id;
                break;
              default:
                throw new Error(`${type} not supported for Shopify destination`);
            }
          }

          return { success: true, destinationId };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      });
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Migration job created for ${itemIds.length} items`,
    });
  } catch (error: any) {
    console.error('Bulk migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create migration job' },
      { status: 500 }
    );
  }
}

