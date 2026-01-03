import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const connection = getConnection('woocommerce');
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'WooCommerce not connected' },
        { status: 401 }
      );
    }

    const client = createWooCommerceClient(connection.config as WooCommerceConfig);

    // Page through all WooCommerce product reviews
    const allReviews: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Export-all: fetching WooCommerce reviews page ${page}...`);
      const result = await client.getProductReviews({ page, per_page: 100 });
      allReviews.push(...result.data);

      hasMore = page < result.totalPages;
      page++;
    }

    // Build a map of product ID -> SKU so we can include SKU in the export
    const productSkuMap: Record<string, string> = {};
    const uniqueProductIds = Array.from(
      new Set(
        allReviews
          .map((review: any) =>
            review.product_id != null ? review.product_id.toString() : ''
          )
          .filter((id: string) => id)
      )
    );

    for (const productId of uniqueProductIds) {
      try {
        const product = await client.getProduct(productId);
        productSkuMap[productId] = product.sku || '';
      } catch (err) {
        console.error(
          `Failed to fetch WooCommerce product ${productId} while exporting all reviews:`,
          err
        );
        productSkuMap[productId] = '';
      }
    }

    // Convert to CSV in the same format as the selected-export endpoint
    const csvHeaders = 'Product ID,Product SKU,Rating,Review Title,Review Content,Reviewer Name,Reviewer Email,Date,Verified\n';
    const csvRows = allReviews
      .map((review: any) => {
        const productId =
          review.product_id != null ? review.product_id.toString() : '';
        const sku = productSkuMap[productId] || '';
        const safeReview = (review.review || '').replace(/"/g, '""');
        const safeReviewer = (review.reviewer || '').replace(/"/g, '""');
        const safeEmail = (review.reviewer_email || '').replace(/"/g, '""');
        return `"${productId}","${sku}","${review.rating}","","${safeReview}","${safeReviewer}","${safeEmail}","${review.date_created}","${review.verified}"`;
      })
      .join('\n');

    const csv = csvHeaders + csvRows;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reviews-export-all.csv"',
      },
    });
  } catch (error: any) {
    console.error('Failed to export all reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export all reviews' },
      { status: 500 }
    );
  }
}

