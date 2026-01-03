'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, ShoppingBag, AlertCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { OrderDifference, OrderComparisonResult, OrderSyncResult } from '@/lib/types';

export default function OrderSyncPage() {
  const [sourceOfTruth, setSourceOfTruth] = useState<'woocommerce' | 'shopify'>('woocommerce');
  const [isComparing, setIsComparing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<OrderComparisonResult | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<{ results: OrderSyncResult[]; summary: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  const handleCompare = async () => {
    setIsComparing(true);
    setError(null);
    setComparisonResult(null);
    setSelectedOrders(new Set());
    setSyncResults(null);

    try {
      const response = await fetch('/api/orders/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceOfTruth }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare orders');
      }

      const result = await response.json();
      setComparisonResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsComparing(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && comparisonResult) {
      setSelectedOrders(new Set(comparisonResult.differences.map(d => d.sourceOrderId)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean | 'indeterminate') => {
    console.log('handleSelectOrder called:', { orderId, checked, currentSize: selectedOrders.size });
    const newSelected = new Set(selectedOrders);
    if (checked === true) {
      newSelected.add(orderId);
    } else if (checked === false) {
      newSelected.delete(orderId);
    }
    console.log('New selection size:', newSelected.size);
    setSelectedOrders(newSelected);
  };

  const handleExportCSV = () => {
    if (!comparisonResult) return;

    const headers = ['Order Number', 'Email', 'Total Price', 'Created At', 'Line Items', 'Financial Status', 'Fulfillment Status'];
    const rows = comparisonResult.differences.map(d => [
      d.orderNumber,
      d.email,
      d.totalPrice,
      new Date(d.createdAt).toLocaleDateString(),
      d.lineItemCount.toString(),
      d.financialStatus,
      d.fulfillmentStatus,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-sync-${sourceOfTruth}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleSync = async () => {
    if (!comparisonResult || selectedOrders.size === 0) return;

    const destPlatform = sourceOfTruth === 'woocommerce' ? 'Shopify' : 'WooCommerce';
    const warningMessage = sourceOfTruth === 'woocommerce'
      ? `\n\nIMPORTANT: Orders will be created as DRAFT ORDERS in Shopify and will require manual completion in the Shopify admin.`
      : '';

    const confirmed = window.confirm(
      `Are you sure you want to sync ${selectedOrders.size} order(s) from ${sourceOfTruth} to ${destPlatform}?${warningMessage}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setError(null);
    setSyncProgress({ current: 0, total: selectedOrders.size });

    try {
      const ordersToSync = comparisonResult.differences.filter(d => selectedOrders.has(d.sourceOrderId));
      const BATCH_SIZE = 20;
      const allResults: OrderSyncResult[] = [];
      const batchErrors: string[] = [];

      // Process orders in batches of 20
      for (let i = 0; i < ordersToSync.length; i += BATCH_SIZE) {
        const batch = ordersToSync.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(ordersToSync.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders)`);

        try {
          const response = await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceOfTruth,
              orders: batch,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`Batch ${batchNumber} API error:`, errorData);
            batchErrors.push(`Batch ${batchNumber}: ${errorData.error || 'Failed to sync'}`);

            // Add failed results for this batch
            batch.forEach(order => {
              allResults.push({
                orderNumber: order.orderNumber,
                email: order.email,
                platform: order.destinationPlatform,
                success: false,
                error: errorData.error || 'Batch request failed',
              });
            });
          } else {
            const result = await response.json();
            allResults.push(...result.results);
          }
        } catch (batchError: any) {
          console.error(`Batch ${batchNumber} error:`, batchError);
          batchErrors.push(`Batch ${batchNumber}: ${batchError.message}`);

          // Add failed results for this batch
          batch.forEach(order => {
            allResults.push({
              orderNumber: order.orderNumber,
              email: order.email,
              platform: order.destinationPlatform,
              success: false,
              error: batchError.message || 'Network error',
            });
          });
        }

        // Update progress
        setSyncProgress({ current: i + batch.length, total: ordersToSync.length });
      }

      // Calculate final summary
      const succeeded = allResults.filter(r => r.success).length;
      const failed = allResults.filter(r => !r.success).length;

      setSyncResults({
        results: allResults,
        summary: {
          total: allResults.length,
          succeeded,
          failed,
        }
      });

      console.log('Sync complete:', { succeeded, failed });

      // Build a detailed error summary when there are failures
      if (failed > 0) {
        const failedWithErrors = allResults.filter(r => !r.success && r.error);
        const uniqueErrors = Array.from(new Set(failedWithErrors.map(r => r.error as string)));

        if (succeeded === 0) {
          // Everything failed – make it very clear nothing was created
          setError(
            `All ${failed} order(s) failed to sync. No orders were created.\n\n` +
            (uniqueErrors.length
              ? `Most common error(s):\n- ${uniqueErrors.slice(0, 3).join('\n- ')}`
              : 'Check the per-order errors below for more details.')
          );
        } else {
          // Partial failure – show both batch-level and common per-order errors
          const parts: string[] = [];
          parts.push(`Some orders failed to sync. ${succeeded} succeeded, ${failed} failed.`);

          if (batchErrors.length > 0) {
            parts.push('Batch issues:');
            batchErrors.forEach(be => parts.push(`- ${be}`));
          }

          if (uniqueErrors.length > 0) {
            parts.push('Common error message(s):');
            uniqueErrors.slice(0, 5).forEach(errMsg => parts.push(`- ${errMsg}`));
          }

          setError(parts.join('\n'));
        }
      }

      // Clear selected orders after sync; click "Compare Orders" again to refresh differences
      setSelectedOrders(new Set());
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Order Sync</h1>
        <p className="text-muted-foreground">
          Compare orders between platforms and sync missing orders from your source of truth.
        </p>
      </div>

      {sourceOfTruth === 'woocommerce' && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Orders synced to Shopify will be created as <strong>draft orders</strong> and will require manual completion in the Shopify admin.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Source of Truth</CardTitle>
          <CardDescription>
            Select which platform has the authoritative order data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={sourceOfTruth} onValueChange={(v) => setSourceOfTruth(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="woocommerce" id="woo" />
              <Label htmlFor="woo">WooCommerce is the source of truth</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shopify" id="shopify" />
              <Label htmlFor="shopify">Shopify is the source of truth</Label>
            </div>
          </RadioGroup>

          <Button
            onClick={handleCompare}
            disabled={isComparing}
            className="mt-4"
          >
            {isComparing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Compare Orders
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </AlertDescription>
        </Alert>
      )}

      {syncResults && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Sync Results:</strong> {syncResults.summary.succeeded} succeeded, {syncResults.summary.failed} failed
          </AlertDescription>
        </Alert>
      )}

      {comparisonResult && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
            <CardDescription>
              Found {comparisonResult.summary.ordersOnlyInSource} order(s) in {sourceOfTruth} that don't exist in{' '}
              {sourceOfTruth === 'woocommerce' ? 'Shopify' : 'WooCommerce'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {comparisonResult.summary.sourceOrderCount} in {sourceOfTruth}
                </Badge>
                <Badge variant="outline">
                  {comparisonResult.summary.destinationOrderCount} in {comparisonResult.summary.destinationPlatform}
                </Badge>
                <Badge variant="outline">
                  {comparisonResult.summary.matchedOrders} matched
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={comparisonResult.differences.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  onClick={handleSync}
                  disabled={selectedOrders.size === 0 || isSyncing}
                  size="sm"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {syncProgress ? `Syncing ${syncProgress.current}/${syncProgress.total}...` : 'Syncing...'}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Selected ({selectedOrders.size})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {syncProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Syncing orders: {syncProgress.current} / {syncProgress.total}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {comparisonResult.differences.length === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  All orders are in sync! No differences found.
                </AlertDescription>
              </Alert>
            )}

            {comparisonResult.differences.length > 0 && (
              <>
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    Batch Selection:
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(true)}
                  >
                    Select All ({comparisonResult.differences.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(false)}
                  >
                    Deselect All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const completedOrders = comparisonResult.differences
                        .filter(d => d.financialStatus === 'completed' || d.financialStatus === 'processing')
                        .map(d => d.sourceOrderId);
                      setSelectedOrders(new Set(completedOrders));
                    }}
                  >
                    Select Completed/Processing
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fulfilledOrders = comparisonResult.differences
                        .filter(d => d.fulfillmentStatus === 'fulfilled')
                        .map(d => d.sourceOrderId);
                      setSelectedOrders(new Set(fulfilledOrders));
                    }}
                  >
                    Select Fulfilled
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const recentOrders = comparisonResult.differences
                        .filter(d => {
                          const orderDate = new Date(d.createdAt);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return orderDate >= thirtyDaysAgo;
                        })
                        .map(d => d.sourceOrderId);
                      setSelectedOrders(new Set(recentOrders));
                    }}
                  >
                    Select Last 30 Days
                  </Button>
                </div>
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left">
                            <Checkbox
                              checked={selectedOrders.size === comparisonResult.differences.length && comparisonResult.differences.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="p-3 text-left font-medium">Order #</th>
                          <th className="p-3 text-left font-medium">Customer Email</th>
                          <th className="p-3 text-left font-medium">Total</th>
                          <th className="p-3 text-left font-medium">Date</th>
                          <th className="p-3 text-left font-medium">Items</th>
                          <th className="p-3 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.differences.map((diff) => (
                          <tr key={diff.sourceOrderId} className="border-t hover:bg-muted/30">
                            <td className="p-3">
                              <Checkbox
                                checked={selectedOrders.has(diff.sourceOrderId)}
                                onCheckedChange={(checked) => handleSelectOrder(diff.sourceOrderId, checked)}
                              />
                            </td>
                            <td className="p-3 font-mono text-sm">{diff.orderNumber}</td>
                            <td className="p-3 text-sm">{diff.email}</td>
                            <td className="p-3 font-medium">{formatPrice(diff.totalPrice)}</td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {formatDate(diff.createdAt)}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {diff.lineItemCount}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {diff.financialStatus}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {diff.fulfillmentStatus}
                                </Badge>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {syncResults && syncResults.results.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Sync Results</h3>
                <div className="space-y-2">
                  {syncResults.results.map((result) => (
                    <div
                      key={result.orderNumber}
                      className={`p-3 rounded-lg border ${
                        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">Order #{result.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">{result.email}</div>
                          {result.error && (
                            <div className="text-sm text-red-600 mt-1">{result.error}</div>
                          )}
                          {result.success && result.newOrderId && (
                            <div className="text-sm text-green-600 mt-1">
                              Created in {result.platform}
                            </div>
                          )}
                          {result.warnings && result.warnings.length > 0 && (
                            <div className="mt-2">
                              {result.warnings.map((warning, idx) => (
                                <div key={idx} className="flex items-start gap-1 text-sm text-amber-600">
                                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                                  <span>{warning}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

