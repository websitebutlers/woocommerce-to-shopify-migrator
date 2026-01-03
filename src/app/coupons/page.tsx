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

