"use client";

import { useEffect, useState } from 'react';
import { WooCommerceForm } from '@/components/connections/woocommerce-form';
import { ShopifyForm } from '@/components/connections/shopify-form';
import { useAppStore } from '@/lib/store';

export default function ConnectionsPage() {
  const { connections, setConnection } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        if (data.woocommerce) {
          setConnection('woocommerce', data.woocommerce);
        }
        if (data.shopify) {
          setConnection('shopify', data.shopify);
        }
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Loading connection settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
        <p className="text-muted-foreground">
          Manage your WooCommerce and Shopify platform connections
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WooCommerceForm
          isConnected={connections.woocommerce?.isConnected || false}
          onConnectionChange={loadConnections}
        />
        <ShopifyForm
          isConnected={connections.shopify?.isConnected || false}
          onConnectionChange={loadConnections}
        />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-2">How to get API credentials</h3>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-1">WooCommerce:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to WooCommerce → Settings → Advanced → REST API</li>
              <li>Click "Add key"</li>
              <li>Set description and permissions (Read/Write)</li>
              <li>Copy the Consumer Key and Consumer Secret</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Shopify:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to Shopify Admin → Apps → Develop apps</li>
              <li>Click "Create an app"</li>
              <li>Configure Admin API scopes: <code className="text-xs bg-muted px-1 py-0.5 rounded">read_products</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">write_products</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">read_customers</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">write_customers</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">read_orders</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">write_orders</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">write_draft_orders</code></li>
              <li>Install the app and copy the Admin API access token</li>
              <li><strong>Important:</strong> If you add scopes after creating the app, you must regenerate the access token and update it here</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

