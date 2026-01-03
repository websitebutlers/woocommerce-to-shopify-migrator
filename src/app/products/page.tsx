"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ProductList } from '@/components/migration/product-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: string;
  status: string;
  image?: string;
  variantsCount?: number;
  isDuplicate?: boolean;
  matchType?: 'sku' | 'name' | null;
}

export default function ProductsPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [checkDuplicates, setCheckDuplicates] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const loadProducts = async () => {
    if (!source) {
      toast.error('Please select a source platform');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        ...(source === 'woocommerce' && { 
          page: page.toString(),
          per_page: '100'
        }),
        ...(source === 'shopify' && { 
          first: '250'
        }),
        ...(searchQuery && { search: searchQuery }),
      });

      const endpoint = source === 'woocommerce' 
        ? `/api/woocommerce/products?${params}`
        : `/api/shopify/products?${params}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();

      // Transform data based on source
      let transformedProducts: Product[] = [];
      
      if (source === 'woocommerce') {
        transformedProducts = data.data.map((p: any) => ({
          id: p.id.toString(),
          name: p.name,
          sku: p.sku,
          price: `$${p.price}`,
          status: p.status,
          image: p.images?.[0]?.src,
          variantsCount: p.variations?.length || 0,
        }));
        
        // WooCommerce pagination: check if we got a full page
        const hasMore = data.data.length === 100;
        setHasNextPage(hasMore);
        console.log(`WooCommerce: Loaded ${data.data.length} products, hasNextPage: ${hasMore}`);
      } else {
        transformedProducts = data.edges.map((edge: any) => ({
          id: edge.node.id,
          name: edge.node.title,
          sku: edge.node.variants.edges[0]?.node.sku,
          price: `$${edge.node.variants.edges[0]?.node.price}`,
          status: edge.node.status,
          image: edge.node.featuredImage?.url,
          variantsCount: edge.node.variants.edges.length,
        }));
        
        // Shopify pagination: use pageInfo
        const hasMore = data.pageInfo?.hasNextPage || false;
        setHasNextPage(hasMore);
        setNextCursor(data.pageInfo?.endCursor);
        console.log(`Shopify: Loaded ${data.edges.length} products, hasNextPage: ${hasMore}, cursor: ${data.pageInfo?.endCursor?.substring(0, 20)}`);
      }

      setProducts(transformedProducts);

      // Check for duplicates if enabled and destination is set
      if (checkDuplicates && destination && transformedProducts.length > 0) {
        checkForDuplicates(transformedProducts);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const checkForDuplicates = async (productsToCheck: Product[]) => {
    if (!destination) return;

    setIsCheckingDuplicates(true);
    try {
      const response = await fetch('/api/products/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProducts: productsToCheck.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
          })),
          source,
          destination,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to check duplicates');
      }

      const data = await response.json();
      
      // Update products with duplicate status
      setProducts(prevProducts => 
        prevProducts.map(product => {
          const status = data.duplicateStatus.find((s: any) => s.id === product.id);
          return status ? { ...product, isDuplicate: status.isDuplicate, matchType: status.matchType } : product;
        })
      );

      const duplicateCount = data.duplicateStatus.filter((s: any) => s.isDuplicate).length;
      const uniqueCount = data.duplicateStatus.length - duplicateCount;
      
      toast.success(`Found ${duplicateCount} existing and ${uniqueCount} new products`);
    } catch (error: any) {
      console.error('Failed to check duplicates:', error);
      toast.error(error.message || 'Failed to check for duplicates');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadProducts();
    }
  }, [source, page]);

  useEffect(() => {
    if (checkDuplicates && destination && products.length > 0) {
      checkForDuplicates(products);
    }
  }, [checkDuplicates, destination]);

  const handleSearch = () => {
    setPage(1);
    loadProducts();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    toast.loading('Migrating product...', { id: 'migrate-single' });

    try {
      const response = await fetch('/api/migrate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: id,
          type: 'product',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Product migrated successfully!', { id: 'migrate-single' });
        setSelectedItems('products', selectedItems.products.filter(pid => pid !== id));
      } else {
        toast.error(data.error || 'Migration failed', { id: 'migrate-single' });
      }
    } catch (error) {
      toast.error('Failed to migrate product', { id: 'migrate-single' });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    if (selectedItems.products.length === 0) {
      toast.error('Please select products to migrate');
      return;
    }

    toast.loading('Starting bulk migration...', { id: 'migrate-bulk' });

    try {
      const response = await fetch('/api/migrate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems.products,
          type: 'product',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Migration job started for ${selectedItems.products.length} products`, { id: 'migrate-bulk' });
        toast.info(`Job ID: ${data.jobId}. Check progress in the dashboard.`);
        setSelectedItems('products', []);
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
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Migrate products between platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view products.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Viewing products from {source === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
          </p>
        </div>
        <Button onClick={loadProducts} variant="outline" size="sm">
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

      {destination && (
        <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
          <Switch
            id="check-duplicates"
            checked={checkDuplicates}
            onCheckedChange={setCheckDuplicates}
            disabled={isCheckingDuplicates}
          />
          <Label htmlFor="check-duplicates" className="cursor-pointer">
            Check for existing products in {destination === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
            {isCheckingDuplicates && <span className="ml-2 text-sm text-muted-foreground">(Checking...)</span>}
          </Label>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <ProductList
        products={products}
        isLoading={isLoading}
        selectedIds={selectedItems.products}
        onSelectionChange={(ids) => setSelectedItems('products', ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
        showDuplicateStatus={checkDuplicates && !!destination}
      />

      {/* Pagination Controls */}
      {products.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} • Showing {products.length} products
            {source === 'woocommerce' && ` (up to 100 per page)`}
            {source === 'shopify' && ` (up to 250 per page)`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(p => Math.max(1, p - 1));
              }}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(p => p + 1);
              }}
              disabled={!hasNextPage || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

