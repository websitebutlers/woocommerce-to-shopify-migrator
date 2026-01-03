"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { OrderList } from '@/components/migration/order-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  totalPrice: string;
  status: string;
  itemCount: number;
  createdAt: string;
}

export default function OrdersPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadOrders = async () => {
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
        ? `/api/woocommerce/orders?${params}`
        : `/api/shopify/orders?${params}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Transform data based on source
      let transformedOrders: Order[] = [];
      
      if (source === 'woocommerce') {
        transformedOrders = data.data.map((o: any) => ({
          id: o.id.toString(),
          orderNumber: o.number || o.id.toString(),
          customerName: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || 'Guest',
          email: o.billing?.email || '',
          totalPrice: `$${o.total}`,
          status: o.status,
          itemCount: o.line_items?.length || 0,
          createdAt: new Date(o.date_created).toLocaleDateString(),
        }));
      } else {
        transformedOrders = data.edges.map((edge: any) => ({
          id: edge.node.id,
          orderNumber: edge.node.name,
          customerName: edge.node.customer?.displayName || 'Guest',
          email: edge.node.email || '',
          totalPrice: `$${edge.node.totalPriceSet?.shopMoney.amount || '0'}`,
          status: edge.node.fulfillmentStatus || 'UNFULFILLED',
          itemCount: edge.node.lineItems?.edges.length || 0,
          createdAt: new Date(edge.node.createdAt).toLocaleDateString(),
        }));
      }

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadOrders();
    }
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadOrders();
  };

  const handleMigrateSingle = async (id: string) => {
    toast.info('Order migration is view-only. Creating orders in destination platforms requires special handling due to payment and fulfillment constraints.');
  };

  const handleMigrateBulk = async () => {
    toast.info('Order migration is view-only. Creating orders in destination platforms requires special handling due to payment and fulfillment constraints.');
  };

  if (!source) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            View order history from your platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view orders.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Viewing orders from {source === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
          </p>
        </div>
        <Button onClick={loadOrders} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Order Migration Note</AlertTitle>
        <AlertDescription>
          Order migration is currently view-only. Creating orders in destination platforms typically requires
          special handling for payments, taxes, and fulfillment. Consider using this view to reference order
          data while manually processing orders, or contact support for custom order migration solutions.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <OrderList
        orders={orders}
        isLoading={isLoading}
        selectedIds={selectedItems.orders}
        onSelectionChange={(ids) => setSelectedItems('orders', ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}

