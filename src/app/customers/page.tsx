"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { CustomerList } from '@/components/migration/customer-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ordersCount?: number;
  totalSpent?: string;
  tags?: string[];
}

export default function CustomersPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadCustomers = async () => {
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
        ? `/api/woocommerce/customers?${params}`
        : `/api/shopify/customers?${params}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();

      // Transform data based on source
      let transformedCustomers: Customer[] = [];
      
      if (source === 'woocommerce') {
        transformedCustomers = data.data.map((c: any) => ({
          id: c.id.toString(),
          email: c.email,
          firstName: c.first_name || '',
          lastName: c.last_name || '',
          ordersCount: c.orders_count || 0,
          totalSpent: c.total_spent ? `$${c.total_spent}` : '$0.00',
          tags: [],
        }));
      } else {
        transformedCustomers = data.edges.map((edge: any) => ({
          id: edge.node.id,
          email: edge.node.email,
          firstName: edge.node.firstName || '',
          lastName: edge.node.lastName || '',
          ordersCount: edge.node.numberOfOrders || 0,
          totalSpent: edge.node.amountSpent?.amount ? `$${edge.node.amountSpent.amount}` : '$0.00',
          tags: edge.node.tags || [],
        }));
      }

      setCustomers(transformedCustomers);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadCustomers();
    }
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadCustomers();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    toast.loading('Migrating customer...', { id: 'migrate-single' });

    try {
      const response = await fetch('/api/migrate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: id,
          type: 'customer',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Customer migrated successfully!', { id: 'migrate-single' });
        setSelectedItems('customers', selectedItems.customers.filter(cid => cid !== id));
      } else {
        toast.error(data.error || 'Migration failed', { id: 'migrate-single' });
      }
    } catch (error) {
      toast.error('Failed to migrate customer', { id: 'migrate-single' });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    if (selectedItems.customers.length === 0) {
      toast.error('Please select customers to migrate');
      return;
    }

    toast.loading('Starting bulk migration...', { id: 'migrate-bulk' });

    try {
      const response = await fetch('/api/migrate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems.customers,
          type: 'customer',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Migration job started for ${selectedItems.customers.length} customers`, { id: 'migrate-bulk' });
        toast.info(`Job ID: ${data.jobId}. Check progress in the dashboard.`);
        setSelectedItems('customers', []);
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
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Migrate customer data between platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view customers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Viewing customers from {source === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
          </p>
        </div>
        <Button onClick={loadCustomers} variant="outline" size="sm">
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
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <CustomerList
        customers={customers}
        isLoading={isLoading}
        selectedIds={selectedItems.customers}
        onSelectionChange={(ids) => setSelectedItems('customers', ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}

