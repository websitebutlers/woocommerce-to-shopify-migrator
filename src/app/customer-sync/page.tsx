'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Users, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { CustomerDifference, CustomerComparisonResult, CustomerSyncResult } from '@/lib/types';

export default function CustomerSyncPage() {
  const [sourceOfTruth, setSourceOfTruth] = useState<'woocommerce' | 'shopify'>('woocommerce');
  const [isComparing, setIsComparing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<CustomerComparisonResult | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<{ results: CustomerSyncResult[]; summary: any } | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setIsComparing(true);
    setError(null);
    setComparisonResult(null);
    setSelectedCustomers(new Set());
    setSyncResults(null);

    try {
      const response = await fetch('/api/customers/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceOfTruth }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare customers');
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
      setSelectedCustomers(new Set(comparisonResult.differences.map(d => d.email)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (email: string, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(email);
    } else {
      newSelected.delete(email);
    }
    setSelectedCustomers(newSelected);
  };

  const handleExportCSV = () => {
    if (!comparisonResult) return;

    const headers = ['Email', 'First Name', 'Last Name', 'Phone', 'Source Customer ID', 'Address Count'];
    const rows = comparisonResult.differences.map(d => [
      d.email,
      d.firstName,
      d.lastName,
      d.phone || '',
      d.sourceCustomerId,
      d.addressCount?.toString() || '0',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-sync-${sourceOfTruth}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleSync = async () => {
    if (!comparisonResult || selectedCustomers.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to sync ${selectedCustomers.size} customer(s) from ${sourceOfTruth} to ${sourceOfTruth === 'woocommerce' ? 'Shopify' : 'WooCommerce'}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setError(null);
    setSyncResults(null);

    const customersToSync = comparisonResult.differences.filter(d => selectedCustomers.has(d.email));
    const total = customersToSync.length;
    const destinationPlatform = sourceOfTruth === 'woocommerce' ? 'shopify' : 'woocommerce';

    setSyncProgress({ current: 0, total });

    const allResults: CustomerSyncResult[] = [];
    const batchErrors: string[] = [];
    const BATCH_SIZE = 20;

    try {
      for (let i = 0; i < customersToSync.length; i += BATCH_SIZE) {
        const batch = customersToSync.slice(i, i + BATCH_SIZE);
        const batchNumber = i / BATCH_SIZE + 1;

        try {
          const response = await fetch('/api/customers/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceOfTruth,
              customers: batch,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const batchErrorMessage = `Batch ${batchNumber} failed (${response.status} ${response.statusText}): ${errorText}`;
            console.error(batchErrorMessage);
            batchErrors.push(batchErrorMessage);

            // Mark each customer in this batch as failed
            for (const customer of batch) {
              allResults.push({
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                success: false,
                error: `Batch failed: ${response.status} ${response.statusText}`,
                platform: destinationPlatform,
              });
            }
          } else {
            const result = await response.json();

            if (Array.isArray(result.results)) {
              allResults.push(...result.results);
            } else {
              console.warn('Unexpected customer sync response shape:', result);
            }
          }
        } catch (err: any) {
          const batchErrorMessage = `Batch ${batchNumber} failed with network or unexpected error: ${err.message || String(err)}`;
          console.error(batchErrorMessage);
          batchErrors.push(batchErrorMessage);

          for (const customer of batch) {
            allResults.push({
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              success: false,
              error: batchErrorMessage,
              platform: destinationPlatform,
            });
          }
        }

        setSyncProgress({
          current: Math.min(i + BATCH_SIZE, total),
          total,
        });
      }

      const succeeded = allResults.filter(r => r.success).length;
      const failed = allResults.filter(r => !r.success).length;

      setSyncResults({
        results: allResults,
        summary: {
          total: allResults.length,
          succeeded,
          failed,
        },
      });

      console.log('Customer sync complete:', { succeeded, failed });

      if (failed > 0) {
        const failedWithErrors = allResults.filter(r => !r.success && r.error);
        const uniqueErrors = Array.from(new Set(failedWithErrors.map(r => r.error as string)));

        const parts: string[] = [];

        if (succeeded === 0) {
          parts.push(`All ${failed} customer(s) failed to sync. No customers were created.`);
        } else {
          parts.push(`Some customers failed to sync. ${succeeded} succeeded, ${failed} failed.`);
        }

        if (batchErrors.length > 0) {
          parts.push('Batch issues:');
          batchErrors.forEach(be => parts.push(`- ${be}`));
        }

        if (uniqueErrors.length > 0) {
          parts.push('Common error message(s):');
          uniqueErrors.slice(0, 5).forEach(errMsg => parts.push(`- ${errMsg}`));
        }

        setError(parts.join('\n'));
      } else {
        setError(null);
      }

      // Clear selected customers after sync; click "Compare Customers" again to refresh differences
      setSelectedCustomers(new Set());
    } catch (err: any) {
      console.error('Customer sync error:', err);
      setError(err.message || 'An unexpected error occurred during customer sync.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Customer Sync</h1>
        <p className="text-muted-foreground">
          Compare customers between platforms and sync missing customers from your source of truth.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Source of Truth</CardTitle>
          <CardDescription>
            Select which platform has the authoritative customer data
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
          {sourceOfTruth === 'woocommerce' && (
            <p className="text-xs text-muted-foreground mb-2">
              Note: When WooCommerce is the source of truth, this comparison only considers customers who have at least one past order
              (using WooCommerce order count / total spent). Customers with no orders (likely spam) are intentionally ignored.
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-2">
            Additionally, this comparison only includes customers who have at least a first or last name, to filter out
            nameless spam/placeholder accounts.
          </p>

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
                <Users className="mr-2 h-4 w-4" />
                Compare Customers
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
              Found {comparisonResult.summary.customersOnlyInSource} customer(s) in {sourceOfTruth} that don't exist in{' '}
              {sourceOfTruth === 'woocommerce' ? 'Shopify' : 'WooCommerce'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {comparisonResult.summary.sourceCustomerCount} in {sourceOfTruth}
                </Badge>
                <Badge variant="outline">
                  {comparisonResult.summary.destinationCustomerCount} in {comparisonResult.summary.destinationPlatform}
                </Badge>
                <Badge variant="outline">
                  {comparisonResult.summary.matchedCustomers} matched
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
                  disabled={selectedCustomers.size === 0 || isSyncing}
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
                      Sync Selected ({selectedCustomers.size})
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
                    Syncing customers: {syncProgress.current} / {syncProgress.total}
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


            {comparisonResult.differences.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  All customers are in sync! No differences found.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left">
                          <Checkbox
                            checked={selectedCustomers.size === comparisonResult.differences.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="p-3 text-left font-medium">Email</th>
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Phone</th>
                        <th className="p-3 text-left font-medium">Addresses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.differences.map((diff) => (
                        <tr key={diff.email} className="border-t hover:bg-muted/30">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedCustomers.has(diff.email)}
                              onCheckedChange={(checked) => handleSelectCustomer(diff.email, checked as boolean)}
                            />
                          </td>
                          <td className="p-3 font-mono text-sm">{diff.email}</td>
                          <td className="p-3">
                            {diff.firstName} {diff.lastName}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {diff.phone || '-'}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {diff.addressCount || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {syncResults && syncResults.results.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Sync Results</h3>
                <div className="space-y-2">
                  {syncResults.results.map((result) => (
                    <div
                      key={result.email}
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
                          <div className="font-medium">
                            {result.firstName} {result.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{result.email}</div>
                          {result.error && (
                            <div className="text-sm text-red-600 mt-1">{result.error}</div>
                          )}
                          {result.success && result.newCustomerId && (
                            <div className="text-sm text-green-600 mt-1">
                              Created in {result.platform}
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

