'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, CheckCircle2, Download, RefreshCw, ArrowRight } from 'lucide-react';
import type { InventoryDifference, InventoryComparisonResult, InventorySyncResult } from '@/lib/types';

export default function InventorySyncPage() {
  const [sourceOfTruth, setSourceOfTruth] = useState<'woocommerce' | 'shopify'>('woocommerce');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<InventoryComparisonResult | null>(null);
  const [selectedDifferences, setSelectedDifferences] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<InventorySyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compareInventory = async () => {
    setLoading(true);
    setError(null);
    setComparisonResult(null);
    setSelectedDifferences(new Set());
    setSyncResults(null);

    try {
      const response = await fetch('/api/inventory/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceOfTruth }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compare inventory');
      }

      const data: InventoryComparisonResult = await response.json();
      setComparisonResult(data);

      // Auto-select all differences
      const allIds = new Set(data.differences.map(d => d.productId));
      setSelectedDifferences(allIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncInventory = async () => {
    if (!comparisonResult || selectedDifferences.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to sync ${selectedDifferences.size} product(s)?\n\n` +
      `This will update inventory in ${comparisonResult.summary.destinationPlatform} to match ${sourceOfTruth}.\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setSyncing(true);
    setError(null);
    setSyncResults(null);

    try {
      const differencesToSync = comparisonResult.differences.filter(d => 
        selectedDifferences.has(d.productId)
      );

      const response = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceOfTruth,
          differences: differencesToSync,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync inventory');
      }

      const data = await response.json();
      setSyncResults(data.results);

      // Remove successfully synced items from the comparison
      const successfulIds = new Set(
        data.results.filter((r: InventorySyncResult) => r.success).map((r: InventorySyncResult) => r.productId)
      );

      setComparisonResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          differences: prev.differences.filter(d => !successfulIds.has(d.productId)),
        };
      });

      setSelectedDifferences(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedDifferences(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!comparisonResult) return;
    
    if (selectedDifferences.size === comparisonResult.differences.length) {
      setSelectedDifferences(new Set());
    } else {
      const allIds = new Set(comparisonResult.differences.map(d => d.productId));
      setSelectedDifferences(allIds);
    }
  };

  const exportCSV = () => {
    if (!comparisonResult) return;

    const headers = ['Product Name', 'SKU', 'Variant', 'Source Qty', 'Destination Qty', 'Difference', 'Source Status', 'Dest Status'];
    const rows = comparisonResult.differences.map(d => [
      d.name,
      d.sku,
      d.variantTitle || 'Default',
      d.sourceQuantity.toString(),
      d.destinationQuantity.toString(),
      d.difference.toString(),
      d.sourceStatus,
      d.destinationStatus,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-differences-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Inventory Sync</h1>
        <p className="text-muted-foreground">
          Compare and sync inventory quantities between WooCommerce and Shopify
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Source of Truth</CardTitle>
          <CardDescription>
            Choose which platform has the correct inventory. The tool will update the other platform to match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={sourceOfTruth} onValueChange={(value: any) => setSourceOfTruth(value)}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="woocommerce" id="woo" />
              <label htmlFor="woo" className="cursor-pointer flex-1">
                WooCommerce is the source of truth (update Shopify inventory to match)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shopify" id="shopify" />
              <label htmlFor="shopify" className="cursor-pointer flex-1">
                Shopify is the source of truth (update WooCommerce inventory to match)
              </label>
            </div>
          </RadioGroup>

          <Button
            onClick={compareInventory}
            disabled={loading}
            className="mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Comparing Inventory...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Compare Inventory
              </>
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

      {comparisonResult && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Source Products</div>
                  <div className="text-2xl font-bold">{comparisonResult.summary.sourceProductCount}</div>
                  <div className="text-xs text-muted-foreground capitalize">{comparisonResult.summary.sourceOfTruth}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Destination Products</div>
                  <div className="text-2xl font-bold">{comparisonResult.summary.destinationProductCount}</div>
                  <div className="text-xs text-muted-foreground capitalize">{comparisonResult.summary.destinationPlatform}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Matched Products</div>
                  <div className="text-2xl font-bold">{comparisonResult.summary.matchedProducts}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Inventory Differences</div>
                  <div className="text-2xl font-bold text-orange-600">{comparisonResult.differences.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {comparisonResult.differences.length > 0 && (
            <>
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Syncing inventory will permanently update quantities in {comparisonResult.summary.destinationPlatform}.
                  This action cannot be undone. Consider exporting to CSV first for your records.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Inventory Differences ({comparisonResult.differences.length})</CardTitle>
                      <CardDescription>Select products to sync</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button
                        onClick={syncInventory}
                        disabled={syncing || selectedDifferences.size === 0}
                        size="sm"
                      >
                        {syncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Sync Selected ({selectedDifferences.size})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedDifferences.size === comparisonResult.differences.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all" className="cursor-pointer font-medium">
                      Select All
                    </label>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {comparisonResult.differences.map((diff) => (
                      <div
                        key={diff.productId}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedDifferences.has(diff.productId)}
                          onCheckedChange={() => toggleSelection(diff.productId)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{diff.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {diff.variantTitle && diff.variantTitle !== 'Default' && (
                              <span className="mr-2">Variant: {diff.variantTitle}</span>
                            )}
                            {diff.sku && <span>SKU: {diff.sku}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="text-right">
                            <div className="font-medium capitalize">{sourceOfTruth}</div>
                            <div className="text-lg font-bold">{diff.sourceQuantity}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="text-right">
                            <div className="font-medium capitalize">{comparisonResult.summary.destinationPlatform}</div>
                            <div className="text-lg font-bold">{diff.destinationQuantity}</div>
                          </div>
                          <div className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            diff.difference > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {diff.difference > 0 ? '+' : ''}{diff.difference}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {comparisonResult.differences.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>All inventory is in sync!</strong> No differences found between {sourceOfTruth} and {comparisonResult.summary.destinationPlatform}.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {syncResults && syncResults.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sync Results</CardTitle>
            <CardDescription>
              {syncResults.filter(r => r.success).length} succeeded, {syncResults.filter(r => !r.success).length} failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {syncResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 border rounded ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.name}</div>
                    {result.variantTitle && (
                      <div className="text-sm text-muted-foreground">Variant: {result.variantTitle}</div>
                    )}
                    {result.success ? (
                      <div className="text-sm text-green-700">
                        Updated: {result.oldQuantity} → {result.newQuantity}
                      </div>
                    ) : (
                      <div className="text-sm text-red-700">{result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

