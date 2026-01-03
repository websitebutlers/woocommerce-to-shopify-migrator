# Product Reviews Implementation Guide

## Overview
Implement product review migration from WooCommerce to Shopify (ONE-WAY ONLY).

**Important:** Shopify doesn't have a native reviews API. Reviews must be exported from WooCommerce and imported into a Shopify review app (Judge.me, Yotpo, etc.) or displayed as view-only.

## Prerequisites
- ✅ Types defined in `src/lib/types.ts` (Review interface)
- ✅ Store updated in `src/lib/store.ts` (reviews selection state)
- ✅ WooCommerce client methods added (`getProductReviews`, `getProductReview`)

## Implementation Options

### Option A: View-Only (Recommended for MVP)
Display WooCommerce reviews for reference, with export functionality.

### Option B: Export to CSV
Export reviews to CSV format for manual import into Shopify review apps.

### Option C: Direct Integration
Integrate with specific review app APIs (Judge.me, Yotpo, etc.) - requires app-specific implementation.

## Step 1: Create Transformer Functions

### File: `src/lib/woocommerce/transformers.ts`

```typescript
import { Review } from '../types';

export function transformWooCommerceReview(wcReview: any): Review {
  return {
    id: wcReview.id.toString(),
    productId: wcReview.product_id.toString(),
    rating: wcReview.rating,
    title: '', // WooCommerce doesn't have review titles
    content: wcReview.review,
    reviewerName: wcReview.reviewer,
    reviewerEmail: wcReview.reviewer_email,
    verified: wcReview.verified || false,
    status: wcReview.status === 'approved' ? 'approved' : wcReview.status === 'hold' ? 'pending' : 'spam',
    createdAt: new Date(wcReview.date_created),
    platform: 'woocommerce',
    originalId: wcReview.id.toString(),
  };
}

// No transformToWooCommerceReview needed - one-way only
```

## Step 2: Create API Routes

### File: `src/app/api/woocommerce/reviews/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const productId = searchParams.get('product');

    const connection = getConnection('woocommerce');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);
    const params: any = { page, per_page: 50 };
    
    if (productId) {
      params.product = [productId];
    }

    const result = await client.getProductReviews(params);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch WooCommerce reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
```

### File: `src/app/api/reviews/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { reviewIds } = await request.json();

    const connection = getConnection('woocommerce');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);
    
    // Fetch all reviews
    const reviews = await Promise.all(
      reviewIds.map((id: string) => client.getProductReview(id))
    );

    // Convert to CSV
    const csvHeaders = 'Product ID,Rating,Review Title,Review Content,Reviewer Name,Reviewer Email,Date,Verified\n';
    const csvRows = reviews.map(review => {
      return `"${review.product_id}","${review.rating}","","${review.review.replace(/"/g, '""')}","${review.reviewer}","${review.reviewer_email}","${review.date_created}","${review.verified}"`;
    }).join('\n');

    const csv = csvHeaders + csvRows;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reviews-export.csv"',
      },
    });
  } catch (error: any) {
    console.error('Failed to export reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export reviews' },
      { status: 500 }
    );
  }
}
```

## Step 3: Create Review List Component

### File: `src/components/migration/review-list.tsx`

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
import { Download, Star, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  productId: string;
  rating: number;
  content: string;
  reviewerName: string;
  reviewerEmail: string;
  verified?: boolean;
  status: string;
  createdAt: string;
}

interface ReviewListProps {
  reviews: Review[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onExport: () => void;
}

export function ReviewList({
  reviews,
  isLoading,
  selectedIds,
  onSelectionChange,
  onExport,
}: ReviewListProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(reviews.map(r => r.id));
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

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
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

  if (reviews.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
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
          <MessageSquare className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Reviews ({reviews.length})</h2>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Selected ({selectedIds.length})
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
              <TableHead>Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(review.id)}
                    onCheckedChange={(checked) => handleSelectOne(review.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  {renderStars(review.rating)}
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="line-clamp-2 text-sm">
                    {review.content}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{review.reviewerName}</div>
                    <div className="text-sm text-muted-foreground">{review.reviewerEmail}</div>
                    {review.verified && (
                      <Badge variant="secondary" className="mt-1">Verified</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={review.status === 'approved' ? 'default' : 'secondary'}>
                    {review.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(review.createdAt).toLocaleDateString()}
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

## Step 4: Create Reviews Page

### File: `src/app/reviews/layout.tsx`

```typescript
import DashboardLayout from '../dashboard/layout';

export default DashboardLayout;
```

### File: `src/app/reviews/page.tsx`

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ReviewList } from '@/components/migration/review-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  productId: string;
  rating: number;
  content: string;
  reviewerName: string;
  reviewerEmail: string;
  verified?: boolean;
  status: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const { source, destination } = useAppStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadReviews = async () => {
    if (source !== 'woocommerce') {
      toast.error('Reviews can only be loaded from WooCommerce');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
      });

      const response = await fetch(`/api/woocommerce/reviews?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();

      const transformedReviews: Review[] = data.data.map((r: any) => ({
        id: r.id.toString(),
        productId: r.product_id.toString(),
        rating: r.rating,
        content: r.review,
        reviewerName: r.reviewer,
        reviewerEmail: r.reviewer_email,
        verified: r.verified,
        status: r.status,
        createdAt: r.date_created,
      }));

      setReviews(transformedReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source === 'woocommerce') {
      loadReviews();
    }
  }, [source, page]);

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select reviews to export');
      return;
    }

    toast.loading('Exporting reviews...', { id: 'export' });

    try {
      const response = await fetch('/api/reviews/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds: selectedIds }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reviews-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Reviews exported successfully!', { id: 'export' });
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to export reviews', { id: 'export' });
    }
  };

  if (source !== 'woocommerce') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Reviews</h1>
          <p className="text-muted-foreground">
            View and export product reviews from WooCommerce
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Reviews can only be loaded from WooCommerce. Please select WooCommerce as the source platform.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Reviews</h1>
          <p className="text-muted-foreground">
            Viewing reviews from WooCommerce
          </p>
        </div>
        <Button onClick={loadReviews} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Shopify doesn't have a native reviews API. Export reviews as CSV 
          and import them into your Shopify review app (Judge.me, Yotpo, etc.).
        </AlertDescription>
      </Alert>

      <ReviewList
        reviews={reviews}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onExport={handleExport}
      />
    </div>
  );
}
```

## Step 5: Update Sidebar Navigation

### File: `src/components/dashboard/sidebar.tsx`

Add to navigation array:

```typescript
import { MessageSquare } from 'lucide-react';

const navigation = [
  // ... existing items
  { name: 'Reviews', href: '/reviews', icon: MessageSquare },
];
```

## Testing Checklist

- [ ] Test fetching reviews from WooCommerce
- [ ] Test review list display with ratings
- [ ] Test CSV export functionality
- [ ] Test with verified vs unverified reviews
- [ ] Test with different review statuses
- [ ] Test pagination
- [ ] Verify CSV format is compatible with review apps

## Integration with Review Apps

### Judge.me
1. Export reviews to CSV
2. Go to Judge.me dashboard → Import reviews
3. Upload CSV file
4. Map columns: Product ID, Rating, Content, Name, Email, Date

### Yotpo
1. Export reviews to CSV
2. Contact Yotpo support for bulk import
3. Provide CSV file with proper formatting

### Shopify Product Reviews (deprecated but some stores still use)
Manual entry required - no bulk import available.

## Next Steps

After implementing reviews, proceed to Pages migration (03_PAGES_GUIDE.md).

