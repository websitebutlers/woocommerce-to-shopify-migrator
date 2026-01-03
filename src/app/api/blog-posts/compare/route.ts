import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { createShopifyClient } from '@/lib/shopify/client';
import { WooCommerceConfig, ShopifyConfig, BlogPostDifference, BlogPostComparisonResult, Platform } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sourceOfTruth } = body;

        console.log('Blog post comparison request:', { sourceOfTruth });

        if (!sourceOfTruth || (sourceOfTruth !== 'woocommerce' && sourceOfTruth !== 'shopify')) {
            return NextResponse.json(
                { error: 'sourceOfTruth must be either "woocommerce" or "shopify"' },
                { status: 400 }
            );
        }

        // Get connections
        const sourceConnection = getConnection(sourceOfTruth);
        const destinationPlatform: Platform = sourceOfTruth === 'woocommerce' ? 'shopify' : 'woocommerce';
        const destConnection = getConnection(destinationPlatform);

        if (!sourceConnection || !destConnection) {
            return NextResponse.json(
                { error: `Missing connection for ${!sourceConnection ? sourceOfTruth : destinationPlatform}` },
                { status: 400 }
            );
        }

        // Validate connection configs
        if (!sourceConnection.config || typeof sourceConnection.config !== 'object') {
            return NextResponse.json(
                { error: `Invalid configuration for ${sourceOfTruth}. Please reconnect.` },
                { status: 400 }
            );
        }

        if (!destConnection.config || typeof destConnection.config !== 'object') {
            return NextResponse.json(
                { error: `Invalid configuration for ${destinationPlatform}. Please reconnect.` },
                { status: 400 }
            );
        }

        // Validate required fields for WooCommerce
        if (sourceOfTruth === 'woocommerce') {
            const config = sourceConnection.config as WooCommerceConfig;
            if (!config.consumerKey || !config.consumerSecret || !config.storeUrl) {
                return NextResponse.json(
                    { error: 'WooCommerce connection is missing required credentials. Please reconnect.' },
                    { status: 400 }
                );
            }
        } else {
            const config = sourceConnection.config as ShopifyConfig;
            if (!config.storeDomain || !config.accessToken) {
                return NextResponse.json(
                    { error: 'Shopify connection is missing required credentials. Please reconnect.' },
                    { status: 400 }
                );
            }
        }

        // Validate required fields for destination
        if (destinationPlatform === 'woocommerce') {
            const config = destConnection.config as WooCommerceConfig;
            if (!config.consumerKey || !config.consumerSecret || !config.storeUrl) {
                return NextResponse.json(
                    { error: 'WooCommerce connection is missing required credentials. Please reconnect.' },
                    { status: 400 }
                );
            }
        } else {
            const config = destConnection.config as ShopifyConfig;
            if (!config.storeDomain || !config.accessToken) {
                return NextResponse.json(
                    { error: 'Shopify connection is missing required credentials. Please reconnect.' },
                    { status: 400 }
                );
            }
        }

        console.log(`Fetching blog posts from ${sourceOfTruth} (source of truth)...`);
        console.log(`Fetching blog posts from ${destinationPlatform} (destination)...`);

        // Fetch all blog posts from source
        const sourcePosts: any[] = [];

        if (sourceOfTruth === 'woocommerce') {
            const client = createWooCommerceClient(sourceConnection.config as WooCommerceConfig);
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await client.getPosts({ page, per_page: 100 });
                sourcePosts.push(...result.data);
                hasMore = result.data.length === 100;
                page++;
                if (page > 100) break;
            }
        } else {
            const client = createShopifyClient(sourceConnection.config as ShopifyConfig);
            let hasNextPage = true;
            let cursor: string | undefined = undefined;

            while (hasNextPage) {
                const result = await client.getBlogPosts({ first: 250, after: cursor });
                const posts = result.edges.map((edge: any) => edge.node);
                sourcePosts.push(...posts);
                hasNextPage = result.pageInfo.hasNextPage;
                cursor = result.pageInfo.endCursor;
                if (sourcePosts.length > 10000) break;
            }
        }

        console.log(`Fetched ${sourcePosts.length} blog posts from ${sourceOfTruth}`);

        // Fetch all blog posts from destination
        const destinationPosts: any[] = [];

        if (destinationPlatform === 'woocommerce') {
            const client = createWooCommerceClient(destConnection.config as WooCommerceConfig);
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await client.getPosts({ page, per_page: 100 });
                destinationPosts.push(...result.data);
                hasMore = result.data.length === 100;
                page++;
                if (page > 100) break;
            }
        } else {
            const client = createShopifyClient(destConnection.config as ShopifyConfig);
            let hasNextPage = true;
            let cursor: string | undefined = undefined;

            while (hasNextPage) {
                const result = await client.getBlogPosts({ first: 250, after: cursor });
                const posts = result.edges.map((edge: any) => edge.node);
                destinationPosts.push(...posts);
                hasNextPage = result.pageInfo.hasNextPage;
                cursor = result.pageInfo.endCursor;
                if (destinationPosts.length > 10000) break;
            }
        }

        console.log(`Fetched ${destinationPosts.length} blog posts from ${destinationPlatform}`);

        // Create maps for matching
        const destPostMap = new Map();

        // Map destination posts by title and slug
        destinationPosts.forEach((post: any) => {
            const title = destinationPlatform === 'woocommerce' ? post.title?.rendered : post.title;
            const slug = destinationPlatform === 'woocommerce' ? post.slug : post.handle;

            if (title) {
                destPostMap.set(`title:${title.toLowerCase().trim()}`, post);
            }
            if (slug) {
                destPostMap.set(`slug:${slug.toLowerCase().trim()}`, post);
            }
        });

        // Compare blog posts and find differences
        const differences: BlogPostDifference[] = [];
        let matchedPosts = 0;

        console.log('Starting blog post comparison...');

        // Iterate through source posts and find matches in destination
        for (const sourcePost of sourcePosts) {
            const sourceTitle = sourceOfTruth === 'woocommerce' ? sourcePost.title?.rendered : sourcePost.title;
            const sourceSlug = sourceOfTruth === 'woocommerce' ? sourcePost.slug : sourcePost.handle;

            // Try to find matching post in destination
            let destPost = null;
            if (sourceTitle) {
                destPost = destPostMap.get(`title:${sourceTitle.toLowerCase().trim()}`);
            }
            if (!destPost && sourceSlug) {
                destPost = destPostMap.get(`slug:${sourceSlug.toLowerCase().trim()}`);
            }

            if (destPost) {
                matchedPosts++;
                continue; // Skip matched posts
            }

            // Post exists only in source
            const excerpt = sourceOfTruth === 'woocommerce'
                ? (sourcePost.excerpt?.rendered ? sourcePost.excerpt.rendered.replace(/<[^>]+>/g, '').slice(0, 160) : '')
                : (sourcePost.excerpt || '');

            const publishedAt = sourceOfTruth === 'woocommerce'
                ? sourcePost.date
                : sourcePost.publishedAt;

            const tags = sourceOfTruth === 'woocommerce'
                ? (sourcePost.tags || []).map((t: any) => t.name || t)
                : (sourcePost.tags || []);

            const status = sourceOfTruth === 'woocommerce'
                ? (sourcePost.status === 'publish' ? 'published' : 'draft')
                : (sourcePost.publishedAt ? 'published' : 'draft');

            differences.push({
                title: sourceTitle || '',
                slug: sourceSlug || '',
                excerpt,
                publishedAt,
                sourceBlogPostId: sourcePost.id.toString(),
                existsInSource: true,
                existsInDestination: false,
                sourcePlatform: sourceOfTruth,
                destinationPlatform,
                tags,
                status,
            });
        }

        console.log(`Found ${differences.length} unique blog posts in ${sourceOfTruth} (${matchedPosts} matched)`);

        const result: BlogPostComparisonResult = {
            differences,
            summary: {
                sourceOfTruth,
                sourceBlogPostCount: sourcePosts.length,
                destinationPlatform,
                destinationBlogPostCount: destinationPosts.length,
                matchedBlogPosts: matchedPosts,
                blogPostsOnlyInSource: differences.length,
            }
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Failed to compare blog posts:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to compare blog posts' },
            { status: 500 }
        );
    }
}
