"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  FolderOpen,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DashboardPage() {
  const { connections, source, destination } = useAppStore();

  const isWooCommerceConnected = connections.woocommerce?.isConnected;
  const isShopifyConnected = connections.shopify?.isConnected;
  const canMigrate = source && destination && source !== destination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your WooCommerce and Shopify data migration
        </p>
      </div>

      {/* Connection Status Alert */}
      {(!isWooCommerceConnected || !isShopifyConnected) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Required</AlertTitle>
          <AlertDescription>
            Please connect both platforms to start migrating data.{' '}
            <Link href="/connections" className="font-medium underline">
              Go to Connections
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Migration Direction */}
      {canMigrate && (
        <Card>
          <CardHeader>
            <CardTitle>Current Migration Direction</CardTitle>
            <CardDescription>
              Data will be migrated from {source} to {destination}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {source === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
              </Badge>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <Badge variant="outline" className="text-lg px-4 py-2">
                {destination === 'woocommerce' ? 'WooCommerce' : 'Shopify'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/products">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Migrate product data
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/customers">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Migrate customer data
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/orders">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Migrate order history
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <Link href="/collections">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collections</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Migrate collections
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>

      {/* Recent Migrations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Migrations</CardTitle>
          <CardDescription>
            Your latest migration activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No migrations yet. Start by selecting data to migrate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

