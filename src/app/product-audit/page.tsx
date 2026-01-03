'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface OrphanedProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
  platform: string;
}

interface AuditSummary {
  sourceOfTruth: string;
  sourceProductCount: number;
  destinationPlatform: string;
  destinationProductCount: number;
  orphanedCount: number;
}

export default function ProductAuditPage() {
  const [sourceOfTruth, setSourceOfTruth] = useState<'woocommerce' | 'shopify'>('woocommerce');
  const [isLoading, setIsLoading] = useState(false);
  const [orphanedProducts, setOrphanedProducts] = useState<OrphanedProduct[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const findOrphanedProducts = async () => {
    setIsLoading(true);
    setError(null);
    setOrphanedProducts([]);
    setSummary(null);

    try {
      const response = await fetch('/api/products/find-orphaned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceOfTruth }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find orphaned products');
      }

      const data = await response.json();
      setOrphanedProducts(data.orphanedProducts);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (orphanedProducts.length === 0) return;

    const headers = ['ID', 'Name', 'SKU', 'Status', 'Platform'];
    const rows = orphanedProducts.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
      p.sku || 'N/A',
      p.status,
      p.platform,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orphaned-products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const deleteProduct = async (product: OrphanedProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(product.id));

    try {
      const endpoint = product.platform === 'shopify'
        ? '/api/shopify/products/delete'
        : '/api/woocommerce/products/delete';

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      // Mark as deleted
      setDeletedIds(prev => new Set(prev).add(product.id));

      // Remove from orphaned products list
      setOrphanedProducts(prev => prev.filter(p => p.id !== product.id));

      // Update summary count
      if (summary) {
        setSummary({
          ...summary,
          orphanedCount: summary.orphanedCount - 1,
        });
      }
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message}`);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Product Audit</h1>
        <p className="text-muted-foreground">
          Find products that exist in one platform but not in the other (orphaned products)
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Source of Truth</CardTitle>
          <CardDescription>
            Choose which platform has the correct product inventory. The tool will find products in the other platform that don't exist here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={sourceOfTruth} onValueChange={(value) => setSourceOfTruth(value as 'woocommerce' | 'shopify')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="woocommerce" id="woocommerce" />
              <Label htmlFor="woocommerce" className="cursor-pointer">
                WooCommerce is the source of truth (find orphaned products in Shopify)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shopify" id="shopify" />
              <Label htmlFor="shopify" className="cursor-pointer">
                Shopify is the source of truth (find orphaned products in WooCommerce)
              </Label>
            </div>
          </RadioGroup>

          <Button onClick={findOrphanedProducts} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Products...
              </>
            ) : (
              'Find Orphaned Products'
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Audit Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Source of Truth</p>
                <p className="text-2xl font-bold capitalize">{summary.sourceOfTruth}</p>
                <p className="text-sm text-muted-foreground">{summary.sourceProductCount} products</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checking Platform</p>
                <p className="text-2xl font-bold capitalize">{summary.destinationPlatform}</p>
                <p className="text-sm text-muted-foreground">{summary.destinationProductCount} products</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orphaned Products</p>
                <p className="text-2xl font-bold text-orange-600">{summary.orphanedCount}</p>
              </div>
              <div className="flex items-center">
                {summary.orphanedCount === 0 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    <span className="font-semibold">All in sync!</span>
                  </div>
                ) : (
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {orphanedProducts.length > 0 && (
        <>
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting products is permanent and cannot be undone.
              Please review each product carefully before deletion. Consider exporting to CSV first for your records.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Orphaned Products ({orphanedProducts.length})</CardTitle>
              <CardDescription>
                These products exist in {summary?.destinationPlatform} but NOT in {summary?.sourceOfTruth}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orphanedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <div className="flex gap-2 mt-1">
                        {product.sku && (
                          <Badge variant="outline" className="text-xs">
                            SKU: {product.sku}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {product.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {product.platform}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {product.id}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProduct(product)}
                      disabled={deletingIds.has(product.id)}
                    >
                      {deletingIds.has(product.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {summary && orphanedProducts.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Great news! All products in {summary.destinationPlatform} exist in {summary.sourceOfTruth}.
            Your inventories are in sync.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

