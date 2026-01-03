# Coupons/Discounts Implementation Guide

## Overview
Complete guide to implement coupon/discount migration between WooCommerce and Shopify.

## Prerequisites
- ✅ Types defined in `src/lib/types.ts` (Coupon interface)
- ✅ Store updated in `src/lib/store.ts` (coupons selection state)
- ✅ WooCommerce client methods added (`getCoupons`, `getCoupon`, `createCoupon`)
- ✅ Shopify client methods added (`getDiscountCodes`, `createDiscountCode`)

## Step 1: Create Transformer Functions

### File: `src/lib/woocommerce/transformers.ts`

Add these functions at the end of the file (before the export statement):

```typescript
import { Coupon } from '../types';

// Add to imports at top

// WooCommerce to Universal Format
export function transformWooCommerceCoupon(wcCoupon: any): Coupon {
  return {
    id: wcCoupon.id.toString(),
    code: wcCoupon.code,
    discountType: wcCoupon.discount_type as 'percentage' | 'fixed_cart' | 'fixed_product',
    amount: wcCoupon.amount,
    description: wcCoupon.description,
    expiryDate: wcCoupon.date_expires ? new Date(wcCoupon.date_expires) : undefined,
    minimumAmount: wcCoupon.minimum_amount || undefined,
    maximumAmount: wcCoupon.maximum_amount || undefined,
    usageLimit: wcCoupon.usage_limit || undefined,
    usageLimitPerUser: wcCoupon.usage_limit_per_user || undefined,
    usageCount: wcCoupon.usage_count || 0,
    individualUse: wcCoupon.individual_use || false,
    productIds: wcCoupon.product_ids?.map((id: number) => id.toString()) || [],
    excludedProductIds: wcCoupon.excluded_product_ids?.map((id: number) => id.toString()) || [],
    categoryIds: wcCoupon.product_categories?.map((id: number) => id.toString()) || [],
    excludedCategoryIds: wcCoupon.excluded_product_categories?.map((id: number) => id.toString()) || [],
    freeShipping: wcCoupon.free_shipping || false,
    platform: 'woocommerce',
    originalId: wcCoupon.id.toString(),
  };
}

// Universal Format to WooCommerce
export function transformToWooCommerceCoupon(coupon: Coupon): any {
  return {
    code: coupon.code,
    discount_type: coupon.discountType,
    amount: coupon.amount,
    description: coupon.description || '',
    date_expires: coupon.expiryDate ? coupon.expiryDate.toISOString() : null,
    minimum_amount: coupon.minimumAmount || '',
    maximum_amount: coupon.maximumAmount || '',
    usage_limit: coupon.usageLimit || null,
    usage_limit_per_user: coupon.usageLimitPerUser || null,
    individual_use: coupon.individualUse || false,
    product_ids: coupon.productIds?.map(id => parseInt(id)) || [],
    excluded_product_ids: coupon.excludedProductIds?.map(id => parseInt(id)) || [],
    product_categories: coupon.categoryIds?.map(id => parseInt(id)) || [],
    excluded_product_categories: coupon.excludedCategoryIds?.map(id => parseInt(id)) || [],
    free_shipping: coupon.freeShipping || false,
  };
}
```

### File: `src/lib/shopify/transformers.ts`

Add these functions at the end of the file:

```typescript
import { Coupon } from '../types';

// Add to imports at top

// Shopify to Universal Format
export function transformShopifyCoupon(shopifyDiscount: any): Coupon {
  const discount = shopifyDiscount.codeDiscount;
  const code = discount.codes?.edges?.[0]?.node?.code || '';
  
  // Determine discount type and amount
  let discountType: 'percentage' | 'fixed_cart' | 'fixed_product' = 'percentage';
  let amount = '0';
  
  if (discount.__typename === 'DiscountCodeFreeShipping') {
    discountType = 'fixed_cart';
    amount = '0';
  } else if (discount.customerGets?.value) {
    const value = discount.customerGets.value;
    if (value.percentage) {
      discountType = 'percentage';
      amount = (value.percentage * 100).toString();
    } else if (value.amount) {
      discountType = 'fixed_cart';
      amount = value.amount.amount;
    }
  }

  return {
    id: shopifyDiscount.id,
    code: code,
    discountType: discountType,
    amount: amount,
    description: discount.title || '',
    expiryDate: discount.endsAt ? new Date(discount.endsAt) : undefined,
    minimumAmount: discount.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || undefined,
    usageLimit: discount.usageLimit || undefined,
    usageLimitPerUser: discount.appliesOncePerCustomer ? 1 : undefined,
    usageCount: discount.asyncUsageCount || 0,
    individualUse: false,
    freeShipping: discount.__typename === 'DiscountCodeFreeShipping',
    platform: 'shopify',
    originalId: shopifyDiscount.id,
  };
}

// Universal Format to Shopify
export function transformToShopifyDiscount(coupon: Coupon): any {
  const input: any = {
    title: coupon.description || coupon.code,
    code: coupon.code,
    startsAt: new Date().toISOString(),
  };

  if (coupon.expiryDate) {
    input.endsAt = coupon.expiryDate.toISOString();
  }

  if (coupon.usageLimit) {
    input.usageLimit = coupon.usageLimit;
  }

  if (coupon.usageLimitPerUser && coupon.usageLimitPerUser === 1) {
    input.appliesOncePerCustomer = true;
  }

  // Set discount value
  if (coupon.discountType === 'percentage') {
    input.customerGets = {
      value: {
        percentage: parseFloat(coupon.amount) / 100,
      },
      items: {
        all: true,
      },
    };
  } else if (coupon.discountType === 'fixed_cart') {
    input.customerGets = {
      value: {
        discountAmount: {
          amount: coupon.amount,
          appliesOnEachItem: false,
        },
      },
      items: {
        all: true,
      },
    };
  }

  // Set minimum requirement
  if (coupon.minimumAmount) {
    input.minimumRequirement = {
      greaterThanOrEqualToSubtotal: {
        amount: coupon.minimumAmount,
      },
    };
  }

  return input;
}
```

## Step 2: Update Mapper

### File: `src/lib/migration/mapper.ts`

Add coupon mapping functions:

```typescript
import { transformWooCommerceCoupon, transformToWooCommerceCoupon } from '../woocommerce/transformers';
import { transformShopifyCoupon, transformToShopifyDiscount } from '../shopify/transformers';

// Add to existing imports

export function mapCoupon(coupon: any, source: Platform, destination: Platform): any {
  // First transform to universal format
  let universal;
  if (source === 'woocommerce') {
    universal = transformWooCommerceCoupon(coupon);
  } else {
    universal = transformShopifyCoupon(coupon);
  }

  // Then transform to destination format
  if (destination === 'woocommerce') {
    return transformToWooCommerceCoupon(universal);
  } else {
    return transformToShopifyDiscount(universal);
  }
}
```

## Step 3: Create API Routes

### File: `src/app/api/woocommerce/coupons/route.ts`

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
    const result = await client.getCoupons({ page, per_page: 50, search });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch WooCommerce coupons:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}
```

### File: `src/app/api/shopify/discounts/route.ts`

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
    const result = await client.getDiscountCodes({ first: 50, query: search });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch Shopify discounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch discounts' },
      { status: 500 }
    );
  }
}
```

## Step 4: Update Migration Routes

### File: `src/app/api/migrate/single/route.ts`

Add coupon case to the switch statement:

```typescript
// Inside the switch statement for type
case 'coupon':
  if (source === 'woocommerce') {
    const wcClient = createWooCommerceClient(sourceConnection.config as WooCommerceConfig);
    sourceItem = await wcClient.getCoupon(itemId);
  } else {
    // Shopify - fetch from discount codes
    const shopifyClient = createShopifyClient(sourceConnection.config as ShopifyConfig);
    const result = await shopifyClient.getDiscountCodes({ query: `id:${itemId}` });
    sourceItem = result.edges[0]?.node;
  }

  if (!sourceItem) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
  }

  // Map the coupon
  const mappedCoupon = mapCoupon(sourceItem, source, destination);

  // Create in destination
  if (destination === 'woocommerce') {
    const wcClient = createWooCommerceClient(destConnection.config as WooCommerceConfig);
    result = await wcClient.createCoupon(mappedCoupon);
  } else {
    const shopifyClient = createShopifyClient(destConnection.config as ShopifyConfig);
    result = await shopifyClient.createDiscountCode(mappedCoupon);
  }
  break;
```

### File: `src/app/api/migrate/bulk/route.ts`

Add 'coupon' to the type validation and processing.

## Step 5: Create Coupon List Component

### File: `src/components/migration/coupon-list.tsx`

```typescript
"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight, Ticket } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  amount: string;
  description?: string;
  expiryDate?: string;
  usageCount?: number;
  usageLimit?: number;
}

interface CouponListProps {
  coupons: Coupon[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onMigrateSingle: (id: string) => void;
  onMigrateBulk: () => void;
}

export function CouponList({
  coupons,
  isLoading,
  selectedIds,
  onSelectionChange,
  onMigrateSingle,
  onMigrateBulk,
}: CouponListProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(coupons.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      setSelectAll(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (coupons.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No coupons found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Coupons ({coupons.length})</h2>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={onMigrateBulk}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Migrate Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(coupon.id)}
                    onCheckedChange={(checked) => handleSelectOne(coupon.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{coupon.code}</div>
                    {coupon.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {coupon.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {coupon.discountType === 'percentage' ? 'Percentage' : 
                     coupon.discountType === 'fixed_cart' ? 'Fixed Cart' : 
                     'Fixed Product'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {coupon.discountType === 'percentage' ? `${coupon.amount}%` : `$${coupon.amount}`}
                </TableCell>
                <TableCell>
                  {coupon.usageCount || 0}
                  {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                </TableCell>
                <TableCell>
                  {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'No expiry'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMigrateSingle(coupon.id)}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Migrate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
```

## Step 6: Create Coupons Page

### File: `src/app/coupons/layout.tsx`

```typescript
import DashboardLayout from '../dashboard/layout';

export default DashboardLayout;
```

### File: `src/app/coupons/page.tsx`

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { CouponList } from '@/components/migration/coupon-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  amount: string;
  description?: string;
  expiryDate?: string;
  usageCount?: number;
  usageLimit?: number;
}

export default function CouponsPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadCoupons = async () => {
    if (!source) {
      toast.error('Please select a source platform');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const endpoint = source === 'woocommerce' 
        ? `/api/woocommerce/coupons?${params}`
        : `/api/shopify/discounts?${params}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }

      const data = await response.json();

      // Transform data based on source
      let transformedCoupons: Coupon[] = [];
      
      if (source === 'woocommerce') {
        transformedCoupons = data.data.map((c: any) => ({
          id: c.id.toString(),
          code: c.code,
          discountType: c.discount_type,
          amount: c.amount,
          description: c.description,
          expiryDate: c.date_expires,
          usageCount: c.usage_count,
          usageLimit: c.usage_limit,
        }));
      } else {
        transformedCoupons = data.edges.map((edge: any) => {
          const discount = edge.node.codeDiscount;
          const code = discount.codes?.edges?.[0]?.node?.code || '';
          
          let amount = '0';
          let discountType = 'percentage';
          
          if (discount.__typename === 'DiscountCodeFreeShipping') {
            discountType = 'fixed_cart';
          } else if (discount.customerGets?.value) {
            const value = discount.customerGets.value;
            if (value.percentage) {
              amount = (value.percentage * 100).toString();
            } else if (value.amount) {
              discountType = 'fixed_cart';
              amount = value.amount.amount;
            }
          }

          return {
            id: edge.node.id,
            code: code,
            discountType: discountType,
            amount: amount,
            description: discount.title,
            expiryDate: discount.endsAt,
            usageCount: discount.asyncUsageCount,
            usageLimit: discount.usageLimit,
          };
        });
      }

      setCoupons(transformedCoupons);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadCoupons();
    }
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadCoupons();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    toast.loading('Migrating coupon...', { id: 'migrate-single' });

    try {
      const response = await fetch('/api/migrate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: id,
          type: 'coupon',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Coupon migrated successfully!', { id: 'migrate-single' });
        setSelectedItems('coupons', selectedItems.coupons.filter(cid => cid !== id));
      } else {
        toast.error(data.error || 'Migration failed', { id: 'migrate-single' });
      }
    } catch (error) {
      toast.error('Failed to migrate coupon', { id: 'migrate-single' });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    if (selectedItems.coupons.length === 0) {
      toast.error('Please select coupons to migrate');
      return;
    }

    toast.loading('Starting bulk migration...', { id: 'migrate-bulk' });

    try {
      const response = await fetch('/api/migrate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems.coupons,
          type: 'coupon',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Migration job started for ${selectedItems.coupons.length} coupons`, { id: 'migrate-bulk' });
        toast.info(`Job ID: ${data.jobId}. Check progress in the dashboard.`);
        setSelectedItems('coupons', []);
      } else {
        toast.error(data.error || 'Failed to start migration', { id: 'migrate-bulk' });
      }
    } catch (error) {
      toast.error('Failed to start bulk migration', { id: 'migrate-bulk' });
    }
  };

  if (!source) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">
            Migrate coupons and discount codes between platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view coupons.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">
            Viewing coupons from {source === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
          </p>
        </div>
        <Button onClick={loadCoupons} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!destination && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a destination platform from the header to enable migration.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search coupons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <CouponList
        coupons={coupons}
        isLoading={isLoading}
        selectedIds={selectedItems.coupons}
        onSelectionChange={(ids) => setSelectedItems('coupons', ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}
```

## Step 7: Update Sidebar Navigation

### File: `src/components/dashboard/sidebar.tsx`

Add to the navigation array:

```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Collections', href: '/collections', icon: FolderOpen },
  { name: 'Coupons', href: '/coupons', icon: Ticket }, // Add this line
];
```

Import Ticket icon:

```typescript
import { Ticket } from 'lucide-react';
```

## Testing Checklist

- [ ] Test fetching coupons from WooCommerce
- [ ] Test fetching discounts from Shopify
- [ ] Test single coupon migration WooCommerce → Shopify
- [ ] Test single coupon migration Shopify → WooCommerce
- [ ] Test bulk coupon migration
- [ ] Test with percentage discounts
- [ ] Test with fixed amount discounts
- [ ] Test with expiry dates
- [ ] Test with usage limits
- [ ] Test error handling for invalid coupons
- [ ] Verify coupon data integrity after migration

## Common Issues & Solutions

**Issue:** Shopify discount creation fails
**Solution:** Ensure the discount code doesn't already exist in Shopify. Shopify requires unique codes.

**Issue:** WooCommerce coupon minimum amount not working
**Solution:** Verify the amount is passed as a string, not a number.

**Issue:** Free shipping coupons not migrating correctly
**Solution:** Check the `freeShipping` flag in the transformer and ensure it maps to the correct Shopify discount type.

## Next Steps

After implementing coupons, use this same pattern for:
1. Reviews (similar structure, simpler data)
2. Pages (similar structure, content-focused)
3. Other data types

The pattern is:
1. Transformers
2. API routes
3. List component
4. Page
5. Navigation update

