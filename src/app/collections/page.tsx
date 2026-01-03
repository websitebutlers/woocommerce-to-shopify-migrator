"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { CollectionList } from '@/components/migration/collection-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Collection {
  id: string;
  name: string;
  description?: string;
  productCount?: number;
  image?: string;
}

export default function CollectionsPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadCollections = async () => {
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
        ? `/api/woocommerce/collections?${params}`
        : `/api/shopify/collections?${params}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();

      // Transform data based on source
      let transformedCollections: Collection[] = [];

      if (source === 'woocommerce') {
        transformedCollections = data.data.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          description: c.description,
          productCount: c.count || 0,
          image: c.image?.src,
        }));
      } else {
        transformedCollections = data.edges.map((edge: any) => ({
          id: edge.node.id,
          name: edge.node.title,
          description: edge.node.description,
          productCount: edge.node.productsCount?.count || 0,
          image: edge.node.image?.url,
        }));
      }

      setCollections(transformedCollections);
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadCollections();
    }
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadCollections();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    toast.loading('Migrating collection...', { id: 'migrate-single' });

    try {
      const response = await fetch('/api/migrate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: id,
          type: 'collection',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Collection migrated successfully!', { id: 'migrate-single' });
        setSelectedItems('collections', selectedItems.collections.filter(cid => cid !== id));
      } else {
        toast.error(data.error || 'Migration failed', { id: 'migrate-single' });
      }
    } catch (error) {
      toast.error('Failed to migrate collection', { id: 'migrate-single' });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    if (selectedItems.collections.length === 0) {
      toast.error('Please select collections to migrate');
      return;
    }

    toast.loading('Starting bulk migration...', { id: 'migrate-bulk' });

    try {
      const response = await fetch('/api/migrate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems.collections,
          type: 'collection',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Migration job started for ${selectedItems.collections.length} collections`, { id: 'migrate-bulk' });
        toast.info(`Job ID: ${data.jobId}. Check progress in the dashboard.`);
        setSelectedItems('collections', []);
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
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Migrate collections and categories between platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view collections.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            Viewing {source === 'woocommerce' ? 'categories' : 'collections'} from {source === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
          </p>
        </div>
        <Button onClick={loadCollections} variant="outline" size="sm">
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
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <CollectionList
        collections={collections}
        isLoading={isLoading}
        selectedIds={selectedItems.collections}
        onSelectionChange={(ids) => setSelectedItems('collections', ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}

