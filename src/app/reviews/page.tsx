"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ReviewList } from '@/components/migration/review-list';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
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
  const { source } = useAppStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const handleExportAll = async () => {
    if (reviews.length === 0) {
      toast.error('No reviews to export');
      return;
    }

    toast.loading('Exporting all reviews...', { id: 'export-all' });

    try {
      const response = await fetch('/api/reviews/export-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reviews-export-all.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('All reviews exported successfully!', { id: 'export-all' });
    } catch (error) {
      console.error('Failed to export all reviews:', error);
      toast.error('Failed to export all reviews', { id: 'export-all' });
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
          <strong>Note:</strong> Shopify doesn&apos;t have a native reviews API. Export reviews as CSV 
          and import them into your Shopify review app (Judge.me, Yotpo, etc.).
        </AlertDescription>
      </Alert>

      <ReviewList
        reviews={reviews}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onExport={handleExport}
        onExportAll={handleExportAll}
      />
    </div>
  );
}

