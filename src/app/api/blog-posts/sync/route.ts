import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { BlogPostDifference, BlogPostSyncResult, Platform } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sourceOfTruth, differences } = body;

        console.log('Blog post sync request:', { sourceOfTruth, count: differences?.length });

        if (!sourceOfTruth || (sourceOfTruth !== 'woocommerce' && sourceOfTruth !== 'shopify')) {
            return NextResponse.json(
                { error: 'sourceOfTruth must be either "woocommerce" or "shopify"' },
                { status: 400 }
            );
        }

        if (!differences || !Array.isArray(differences) || differences.length === 0) {
            return NextResponse.json(
                { error: 'differences array is required and must not be empty' },
                { status: 400 }
            );
        }

        const destinationPlatform: Platform = sourceOfTruth === 'woocommerce' ? 'shopify' : 'woocommerce';

        // Get connections
        const sourceConnection = getConnection(sourceOfTruth);
        const destConnection = getConnection(destinationPlatform);

        if (!sourceConnection || !destConnection) {
            return NextResponse.json(
                { error: `Missing connection for ${!sourceConnection ? sourceOfTruth : destinationPlatform}` },
                { status: 400 }
            );
        }

        const results: BlogPostSyncResult[] = [];

        // Sync each blog post
        for (const diff of differences as BlogPostDifference[]) {
            try {
                // For now, we'll use the existing migration API
                // This calls the /api/migrate/single endpoint
                const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/migrate/single`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        itemId: diff.sourceBlogPostId,
                        type: 'blogPost',
                        source: sourceOfTruth,
                        destination: destinationPlatform,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    results.push({
                        title: diff.title,
                        slug: diff.slug,
                        success: true,
                        newBlogPostId: data.destinationId,
                        platform: destinationPlatform,
                    });
                } else {
                    const errorData = await response.json();
                    results.push({
                        title: diff.title,
                        slug: diff.slug,
                        success: false,
                        error: errorData.error || 'Migration failed',
                        platform: destinationPlatform,
                    });
                }
            } catch (error: any) {
                results.push({
                    title: diff.title,
                    slug: diff.slug,
                    success: false,
                    error: error.message || 'Failed to sync blog post',
                    platform: destinationPlatform,
                });
            }
        }

        console.log(`Synced ${results.filter(r => r.success).length}/${results.length} blog posts`);

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Failed to sync blog posts:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync blog posts' },
            { status: 500 }
        );
    }
}
