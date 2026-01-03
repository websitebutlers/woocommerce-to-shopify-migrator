"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Settings, 
  ArrowLeftRight, 
  Package, 
  Users, 
  ShoppingCart, 
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';

export default function DocumentationPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Documentation
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete guide to using the WooCommerce ↔ Shopify Migration Tool
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>Get started in 3 simple steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Connect Your Platforms</h3>
                <p className="text-sm text-muted-foreground">
                  Go to <strong>Connections</strong> and add your WooCommerce and Shopify API credentials.
                  Test each connection to ensure they work properly.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Select Source & Destination</h3>
                <p className="text-sm text-muted-foreground">
                  Use the header dropdowns to choose which platform to migrate <strong>from</strong> (source) 
                  and which to migrate <strong>to</strong> (destination).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Start Migrating</h3>
                <p className="text-sm text-muted-foreground">
                  Navigate to Products, Customers, or Collections and start migrating your data!
                  You can migrate items one-by-one or in bulk.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Platform Setup
          </CardTitle>
          <CardDescription>How to get your API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WooCommerce Setup */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Badge variant="outline">WooCommerce</Badge>
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Log in to your WooCommerce store admin panel</li>
              <li>Go to <strong>WooCommerce → Settings → Advanced → REST API</strong></li>
              <li>Click <strong>"Add key"</strong></li>
              <li>Enter a description (e.g., "Migration Tool")</li>
              <li>Set permissions to <strong>"Read/Write"</strong></li>
              <li>Click <strong>"Generate API key"</strong></li>
              <li>Copy the <strong>Consumer Key</strong> and <strong>Consumer Secret</strong></li>
              <li>Enter these credentials in the Connections page</li>
            </ol>
          </div>

          <Separator />

          {/* Shopify Setup */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Badge variant="outline">Shopify</Badge>
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Log in to your Shopify admin panel</li>
              <li>Go to <strong>Settings → Apps and sales channels</strong></li>
              <li>Click <strong>"Develop apps"</strong> (you may need to enable custom app development)</li>
              <li>Click <strong>"Create an app"</strong></li>
              <li>Enter an app name (e.g., "Migration Tool")</li>
              <li>Configure <strong>Admin API scopes</strong> with these permissions:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>read_products, write_products</li>
                  <li>read_customers, write_customers</li>
                  <li>read_orders</li>
                  <li>read_product_listings, write_product_listings</li>
                </ul>
              </li>
              <li>Install the app and copy the <strong>Admin API access token</strong></li>
              <li>Enter your store domain (e.g., "mystore.myshopify.com") and token in the Connections page</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Migration Features
          </CardTitle>
          <CardDescription>What you can migrate and how</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Products */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
              <Badge variant="default" className="ml-auto">Fully Supported</Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Migrate product data including names, descriptions, prices, SKUs, images, variants, and more.
            </p>
            <div className="space-y-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Duplicate Detection:</strong> Enable the "Check for existing products" toggle 
                  to see which products already exist in the destination platform. Perfect for tracking 
                  partial migrations!
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Separator />

          {/* Customers */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
              <Badge variant="default" className="ml-auto">Fully Supported</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Migrate customer information including names, emails, addresses, and metadata.
            </p>
          </div>

          <Separator />

          {/* Collections */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Collections / Categories
              <Badge variant="default" className="ml-auto">Fully Supported</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Migrate product collections (Shopify) or categories (WooCommerce) including names, descriptions, and images.
            </p>
          </div>

          <Separator />

          {/* Orders */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
              <Badge variant="secondary" className="ml-auto">View Only</Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              View order history from either platform. Direct order migration is not supported due to 
              payment processing, tax calculations, and fulfillment constraints.
            </p>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Orders can be viewed for reference but cannot be directly migrated between platforms.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Migration Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Migration Types
          </CardTitle>
          <CardDescription>Single vs. Bulk migration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Single Item Migration</h3>
            <p className="text-sm text-muted-foreground">
              Click the <strong>"Migrate"</strong> button next to any item to migrate it immediately. 
              This is perfect for testing or migrating individual items.
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Real-time migration with instant feedback</span>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Bulk Migration</h3>
            <p className="text-sm text-muted-foreground">
              Select multiple items using the checkboxes, then click <strong>"Migrate Selected"</strong> 
              to queue a background job. This is ideal for migrating large numbers of items.
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Background processing for large batches</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Track progress with job IDs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Duplicate Detection
          </CardTitle>
          <CardDescription>Prevent duplicate products during migration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The duplicate detection feature helps you identify which products already exist in the 
            destination platform, making it perfect for partially migrated stores or ongoing synchronization.
          </p>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm mb-1">How to Use</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Select both source and destination platforms</li>
                <li>Go to the Products page</li>
                <li>Toggle on "Check for existing products"</li>
                <li>Wait for the system to scan (you'll see a notification)</li>
                <li>Use the filter to view only duplicates or unique products</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Visual Indicators</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Exists in destination
                  </Badge>
                  <span className="text-sm text-muted-foreground">Product already migrated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                    Not in destination
                  </Badge>
                  <span className="text-sm text-muted-foreground">Product needs migration</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-1">Matching Logic</h3>
              <p className="text-sm text-muted-foreground">
                Products are matched using two methods:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-1">
                <li><strong>SKU matching</strong> (primary) - Most reliable method</li>
                <li><strong>Name matching</strong> (fallback) - Used when SKU isn't available</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Best Practices
          </CardTitle>
          <CardDescription>Tips for successful migrations</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <strong>Test with a few items first</strong> - Migrate a small batch to ensure everything works correctly
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <strong>Use duplicate detection</strong> - Enable it to avoid creating duplicate products
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <strong>Backup your data</strong> - Always backup your destination platform before large migrations
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <strong>Check API rate limits</strong> - Both platforms have rate limits; bulk migrations handle this automatically
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <strong>Verify after migration</strong> - Check a few migrated items to ensure data integrity
              </div>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <strong>Migrate in order</strong> - Consider migrating collections first, then products, then customers
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Troubleshooting
          </CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">Connection Failed</h3>
              <p className="text-sm text-muted-foreground">
                • Double-check your API credentials<br />
                • Ensure your store URL is correct (include https://)<br />
                • Verify API permissions are set correctly<br />
                • Check if your store's API is enabled
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm mb-1">Migration Failed</h3>
              <p className="text-sm text-muted-foreground">
                • Check if the destination platform is connected<br />
                • Ensure you have write permissions on the destination API<br />
                • Verify the item data is valid (e.g., required fields are present)<br />
                • Check for API rate limit errors (wait and try again)
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm mb-1">Products Not Showing</h3>
              <p className="text-sm text-muted-foreground">
                • Ensure a source platform is selected in the header<br />
                • Click the Refresh button to reload products<br />
                • Check if your API credentials have read permissions<br />
                • Verify products exist in the source platform
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-sm mb-1">Duplicate Detection Not Working</h3>
              <p className="text-sm text-muted-foreground">
                • Ensure both source and destination platforms are connected<br />
                • Toggle the feature off and on again<br />
                • Check if products have SKUs (SKU matching is more reliable)<br />
                • Refresh the page and try again
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For additional support, check the README.md file in the project root or 
            consult the platform-specific documentation:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
            <li>WooCommerce REST API: <a href="https://woocommerce.github.io/woocommerce-rest-api-docs/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">docs</a></li>
            <li>Shopify Admin API: <a href="https://shopify.dev/docs/api/admin" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">docs</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

