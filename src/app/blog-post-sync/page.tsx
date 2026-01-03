'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, Download, RefreshCw, ArrowRight, Newspaper } from 'lucide-react';
import type { BlogPostDifference, BlogPostComparisonResult, BlogPostSyncResult } from '@/lib/types';

export default function BlogPostSyncPage() {
    const [sourceOfTruth, setSourceOfTruth] = useState<'woocommerce' | 'shopify'>('woocommerce');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [comparisonResult, setComparisonResult] = useState<BlogPostComparisonResult | null>(null);
    const [selectedDifferences, setSelectedDifferences] = useState<Set<string>>(new Set());
    const [syncResults, setSyncResults] = useState<BlogPostSyncResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const compareBlogPosts = async () => {
        setLoading(true);
        setError(null);
        setComparisonResult(null);
        setSelectedDifferences(new Set());
        setSyncResults(null);

        try {
            const response = await fetch('/api/blog-posts/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceOfTruth }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to compare blog posts');
            }

            const data: BlogPostComparisonResult = await response.json();
            setComparisonResult(data);

            // Auto-select all differences
            const allIds = new Set(data.differences.map((d, idx) => `${d.sourceBlogPostId}-${idx}`));
            setSelectedDifferences(allIds);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const syncBlogPosts = async () => {
        if (!comparisonResult || selectedDifferences.size === 0) return;

        const confirmed = confirm(
            `Are you sure you want to sync ${selectedDifferences.size} blog post(s)?\n\n` +
            `This will create these posts in ${comparisonResult.summary.destinationPlatform}.\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) return;

        setSyncing(true);
        setError(null);
        setSyncResults(null);

        try {
            const differencesToSync = comparisonResult.differences.filter((d, idx) =>
                selectedDifferences.has(`${d.sourceBlogPostId}-${idx}`)
            );

            const response = await fetch('/api/blog-posts/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceOfTruth,
                    differences: differencesToSync,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to sync blog posts');
            }

            const data = await response.json();
            setSyncResults(data.results);

            // Remove successfully synced items from the comparison
            const successfulIds = new Set(
                data.results.filter((r: BlogPostSyncResult) => r.success).map((_: BlogPostSyncResult, idx: number) => {
                    const diff = differencesToSync[idx];
                    const originalIdx = comparisonResult.differences.indexOf(diff);
                    return `${diff.sourceBlogPostId}-${originalIdx}`;
                })
            );

            setComparisonResult(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    differences: prev.differences.filter((d, idx) => !successfulIds.has(`${d.sourceBlogPostId}-${idx}`)),
                };
            });

            setSelectedDifferences(new Set());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSyncing(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedDifferences(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (!comparisonResult) return;

        if (selectedDifferences.size === comparisonResult.differences.length) {
            setSelectedDifferences(new Set());
        } else {
            const allIds = new Set(comparisonResult.differences.map((d, idx) => `${d.sourceBlogPostId}-${idx}`));
            setSelectedDifferences(allIds);
        }
    };

    const exportCSV = () => {
        if (!comparisonResult) return;

        const headers = ['Title', 'Slug', 'Status', 'Published At', 'Tags', 'Excerpt', 'Platform'];
        const rows = comparisonResult.differences.map(d => [
            d.title,
            d.slug,
            d.status,
            d.publishedAt || '',
            d.tags.join('; '),
            (d.excerpt || '').replace(/,/g, ';'),
            d.sourcePlatform,
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blog-post-differences-${Date.now()}.csv`;
        a.click();
    };

    return (
        <div className="max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Blog Post Sync</h1>
                <p className="text-muted-foreground">
                    Compare and sync blog posts between WooCommerce and Shopify
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Select Source of Truth</CardTitle>
                    <CardDescription>
                        Choose which platform has the blog posts you want to sync. The tool will identify posts unique to this platform.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={sourceOfTruth} onValueChange={(value: any) => setSourceOfTruth(value)}>
                        <div className="flex items-center space-x-2 mb-3">
                            <RadioGroupItem value="woocommerce" id="woo" />
                            <label htmlFor="woo" className="cursor-pointer flex-1">
                                WooCommerce is the source of truth (find posts unique to WordPress)
                            </label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="shopify" id="shopify" />
                            <label htmlFor="shopify" className="cursor-pointer flex-1">
                                Shopify is the source of truth (find posts unique to Shopify)
                            </label>
                        </div>
                    </RadioGroup>

                    <Button
                        onClick={compareBlogPosts}
                        disabled={loading}
                        className="mt-6"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Comparing Blog Posts...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Compare Blog Posts
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
                                    <div className="text-sm text-muted-foreground">Source Blog Posts</div>
                                    <div className="text-2xl font-bold">{comparisonResult.summary.sourceBlogPostCount}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{comparisonResult.summary.sourceOfTruth}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Destination Blog Posts</div>
                                    <div className="text-2xl font-bold">{comparisonResult.summary.destinationBlogPostCount}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{comparisonResult.summary.destinationPlatform}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Matched Posts</div>
                                    <div className="text-2xl font-bold">{comparisonResult.summary.matchedBlogPosts}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Unique to Source</div>
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
                                    <strong>Note:</strong> Syncing will create these blog posts in {comparisonResult.summary.destinationPlatform}.
                                    Consider exporting to CSV first for your records.
                                </AlertDescription>
                            </Alert>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Unique Blog Posts ({comparisonResult.differences.length})</CardTitle>
                                            <CardDescription>Select posts to sync to {comparisonResult.summary.destinationPlatform}</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={exportCSV}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Export CSV
                                            </Button>
                                            <Button
                                                onClick={syncBlogPosts}
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
                                        {comparisonResult.differences.map((diff, idx) => {
                                            const id = `${diff.sourceBlogPostId}-${idx}`;
                                            return (
                                                <div
                                                    key={id}
                                                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50"
                                                >
                                                    <Checkbox
                                                        checked={selectedDifferences.has(id)}
                                                        onCheckedChange={() => toggleSelection(id)}
                                                        className="mt-1"
                                                    />
                                                    <Newspaper className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{diff.title}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            <code className="text-xs">{diff.slug}</code>
                                                        </div>
                                                        {diff.excerpt && (
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                                {diff.excerpt}
                                                            </p>
                                                        )}
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            <Badge variant={diff.status === 'published' ? 'default' : 'secondary'}>
                                                                {diff.status}
                                                            </Badge>
                                                            {diff.publishedAt && (
                                                                <Badge variant="outline">
                                                                    {new Date(diff.publishedAt).toLocaleDateString()}
                                                                </Badge>
                                                            )}
                                                            {diff.tags.length > 0 && (
                                                                <Badge variant="outline">
                                                                    {diff.tags.length} tag{diff.tags.length !== 1 ? 's' : ''}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {comparisonResult.differences.length === 0 && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                <strong>All blog posts are in sync!</strong> No unique posts found in {sourceOfTruth}.
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
                                    className={`flex items-center gap-3 p-3 border rounded ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                        }`}
                                >
                                    {result.success ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{result.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                            <code className="text-xs">{result.slug}</code>
                                        </div>
                                        {result.success ? (
                                            <div className="text-sm text-green-700">
                                                Successfully created in {result.platform}
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
