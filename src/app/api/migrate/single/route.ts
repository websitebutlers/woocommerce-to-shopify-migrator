import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { MigrationMapper } from '@/lib/migration/mapper';
import { Platform, WooCommerceConfig, ShopifyConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, type, source, destination } = body;

    if (!itemId || !type || !source || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get source connection
    const sourceConnection = getConnection(source);
    if (!sourceConnection || !sourceConnection.isConnected) {
      return NextResponse.json(
        { error: `${source} not connected` },
        { status: 401 }
      );
    }

    // Get destination connection
    const destConnection = getConnection(destination);
    if (!destConnection || !destConnection.isConnected) {
      return NextResponse.json(
        { error: `${destination} not connected` },
        { status: 401 }
      );
    }

    // Fetch data from source
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
          return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
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
        case 'order':
          sourceData = await client.getOrder(itemId);
          if (!sourceData) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
          }
          break;
        case 'collection':
          sourceData = await client.getCollection(itemId);
          if (!sourceData) {
            return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
          }
          break;
        case 'coupon':
          const result = await client.getDiscountCodes({ query: `id:${itemId}` });
          sourceData = result.edges[0]?.node;
          if (!sourceData) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
          }
          break;
        case 'page':
          const pageResult = await client.getPages({ query: `id:${itemId}` });
          sourceData = pageResult.edges[0]?.node;
          if (!sourceData) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
          }
          break;
        case 'blogPost':
          const postResult = await client.getBlogPosts({ query: `id:${itemId}` });
          sourceData = postResult.edges[0]?.node;
          if (!sourceData) {
            return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
          }
          break;
        default:
          return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
    }

    // Transform data
    const transformedData = MigrationMapper.migrate(sourceData, type, source as Platform, destination as Platform);

    // Validate
    const validation = MigrationMapper.validate(transformedData, type);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
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
        case 'order':
          result = await client.createOrder(transformedData);
          destinationId = result.id.toString();
          break;
        case 'collection':
          result = await client.createProductCategory(transformedData);
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
          return NextResponse.json({ error: 'Type not supported for WooCommerce' }, { status: 400 });
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
        case 'order':
          // Shopify uses Draft Orders for order imports (regular orders are read-only)
          result = await client.createDraftOrder(transformedData);
          destinationId = result.id;
          break;
        case 'collection':
          result = await client.createCollection(transformedData);
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
          return NextResponse.json({ error: 'Type not supported for Shopify' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      sourceId: itemId,
      destinationId,
      message: `${type} migrated successfully`,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

