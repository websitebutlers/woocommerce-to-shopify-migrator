# Pages/Content Implementation Guide

## Overview
Migrate static pages/content between WooCommerce (WordPress Pages) and Shopify Pages.

## Prerequisites
- ✅ Types defined (Page interface)
- ✅ Store updated (pages selection state)
- ✅ WooCommerce client needs WordPress REST API integration
- ✅ Shopify client methods added (`getPages`, `createPage`)

## Key Implementation Notes

### WooCommerce Pages
WooCommerce uses WordPress Pages API:
- Endpoint: `/wp-json/wp/v2/pages`
- Requires WordPress REST API (not WooCommerce REST API)
- May need separate authentication

### Shopify Pages
- GraphQL API: `pages` query and `pageCreate` mutation
- Simpler structure than WordPress

## Step 1: Add WordPress Client Method

### File: `src/lib/woocommerce/client.ts`

Add method to fetch WordPress pages (requires axios or fetch):

```typescript
// Add to WooCommerceClient class
async getPages(params?: {
  page?: number;
  per_page?: number;
  search?: string;
}) {
  try {
    // WordPress REST API endpoint
    const wpUrl = this.api.url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
    const response = await fetch(`${wpUrl}/pages?${new URLSearchParams(params as any)}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.api.consumerKey}:${this.api.consumerSecret}`).toString('base64')}`,
      },
    });
    
    const data = await response.json();
    return {
      data: data,
      total: parseInt(response.headers.get('x-wp-total') || '0'),
    };
  } catch (error) {
    console.error('Failed to fetch WordPress pages:', error);
    throw error;
  }
}

async createPage(data: any) {
  try {
    const wpUrl = this.api.url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
    const response = await fetch(`${wpUrl}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.api.consumerKey}:${this.api.consumerSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create WordPress page:', error);
    throw error;
  }
}
```

## Step 2: Create Transformers

### File: `src/lib/woocommerce/transformers.ts`

```typescript
import { Page } from '../types';

export function transformWooCommercePage(wpPage: any): Page {
  return {
    id: wpPage.id.toString(),
    title: wpPage.title.rendered,
    content: wpPage.content.rendered,
    slug: wpPage.slug,
    status: wpPage.status === 'publish' ? 'published' : 'draft',
    author: wpPage.author?.toString(),
    template: wpPage.template,
    seo: {
      title: wpPage.yoast_head_json?.title,
      description: wpPage.yoast_head_json?.description,
    },
    createdAt: new Date(wpPage.date),
    updatedAt: new Date(wpPage.modified),
    platform: 'woocommerce',
    originalId: wpPage.id.toString(),
  };
}

export function transformToWooCommercePage(page: Page): any {
  return {
    title: page.title,
    content: page.content,
    slug: page.slug,
    status: page.status === 'published' ? 'publish' : 'draft',
  };
}
```

### File: `src/lib/shopify/transformers.ts`

```typescript
import { Page } from '../types';

export function transformShopifyPage(shopifyPage: any): Page {
  return {
    id: shopifyPage.id,
    title: shopifyPage.title,
    content: shopifyPage.body || '',
    slug: shopifyPage.handle,
    status: shopifyPage.isPublished ? 'published' : 'draft',
    createdAt: new Date(shopifyPage.createdAt),
    updatedAt: new Date(shopifyPage.updatedAt),
    platform: 'shopify',
    originalId: shopifyPage.id,
  };
}

export function transformToShopifyPage(page: Page): any {
  return {
    title: page.title,
    body: page.content,
    handle: page.slug,
  };
}
```

## Step 3: Create API Routes

### File: `src/app/api/woocommerce/pages/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || undefined;

    const connection = getConnection('woocommerce');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);
    const result = await client.getPages({ page, per_page: 50, search });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch WooCommerce pages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
```

### File: `src/app/api/shopify/pages/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createShopifyClient } from '@/lib/shopify/client';
import { ShopifyConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const connection = getConnection('shopify');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'Shopify not connected' },
        { status: 401 }
      );
    }

    const client = createShopifyClient(connection.config as ShopifyConfig);
    const result = await client.getPages({ first: 50, query: search });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch Shopify pages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
```

## Step 4: Create Page List Component

### File: `src/components/migration/page-list.tsx`

Follow the same pattern as `coupon-list.tsx`:
- Display: Title, Slug, Status, Last Updated
- Actions: Single migrate, Bulk migrate
- Icon: `FileText` from lucide-react

## Step 5: Create Pages Page

### File: `src/app/pages-migration/page.tsx`

**Note:** Can't use `/pages` route as it conflicts with Next.js. Use `/pages-migration` or `/content`.

Follow the same pattern as `coupons/page.tsx`:
- Fetch from appropriate API based on source
- Transform data for display
- Handle single and bulk migration

## Step 6: Update Sidebar

```typescript
import { FileText } from 'lucide-react';

const navigation = [
  // ... existing
  { name: 'Pages', href: '/pages-migration', icon: FileText },
];
```

## Step 7: Update Migration Routes

Add 'page' case to `/api/migrate/single/route.ts` and `/api/migrate/bulk/route.ts`.

## Important Considerations

1. **HTML Content**: WordPress pages contain HTML. Shopify pages also support HTML, so content should transfer well.

2. **Shortcodes**: WordPress shortcodes won't work in Shopify. Consider:
   - Stripping shortcodes
   - Converting common shortcodes to HTML
   - Warning users about shortcodes

3. **Images**: Image URLs will still point to WordPress. Consider:
   - Downloading and re-uploading images to Shopify
   - Using a CDN
   - Leaving URLs as-is (images still load from WordPress)

4. **SEO**: Both platforms support custom SEO titles/descriptions. Ensure these migrate correctly.

## Testing Checklist

- [ ] Test fetching pages from WordPress
- [ ] Test fetching pages from Shopify
- [ ] Test single page migration both directions
- [ ] Test bulk page migration
- [ ] Test with pages containing HTML
- [ ] Test with pages containing images
- [ ] Verify SEO data migrates correctly
- [ ] Test with draft vs published pages

## Next Steps

After implementing pages, proceed to Product Attributes (04_ATTRIBUTES_GUIDE.md).

