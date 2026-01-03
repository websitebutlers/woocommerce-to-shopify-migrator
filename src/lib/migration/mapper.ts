import { Platform, Product, Customer, Order, Collection, Coupon, Page, BlogPost, Review } from '../types';
import {
  transformWooCommerceProduct,
  transformWooCommerceCustomer,
  transformWooCommerceOrder,
  transformWooCommerceCollection,
  transformWooCommerceCoupon,
  transformWooCommerceReview,
  transformWooCommercePage,
  transformWooCommercePost,
  transformToWooCommerceProduct,
  transformToWooCommerceCustomer,
  transformToWooCommerceOrder,
  transformToWooCommerceCollection,
  transformToWooCommerceCoupon,
  transformToWooCommerceReview,
  transformToWooCommercePage,
  transformToWooCommercePost,
} from '../woocommerce/transformers';
import {
  transformShopifyProduct,
  transformShopifyCustomer,
  transformShopifyOrder,
  transformShopifyCollection,
  transformShopifyCoupon,
  transformShopifyPage,
  transformShopifyBlogPost,
  transformToShopifyProduct,
  transformToShopifyCustomer,
  transformToShopifyDraftOrder,
  transformToShopifyCollection,
  transformToShopifyDiscount,
  transformToShopifyPage,
  transformToShopifyBlogPost,
} from '../shopify/transformers';

export class MigrationMapper {
  // Transform from source platform to universal format
  static toUniversal(data: any, type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost', source: Platform): any {
    if (source === 'woocommerce') {
      switch (type) {
        case 'product':
          return transformWooCommerceProduct(data);
        case 'customer':
          return transformWooCommerceCustomer(data);
        case 'order':
          return transformWooCommerceOrder(data);
        case 'collection':
          return transformWooCommerceCollection(data);
        case 'coupon':
          return transformWooCommerceCoupon(data);
        case 'review':
          return transformWooCommerceReview(data);
        case 'page':
          return transformWooCommercePage(data);
        case 'blogPost':
          return transformWooCommercePost(data);
      }
    } else {
      switch (type) {
        case 'product':
          return transformShopifyProduct(data);
        case 'customer':
          return transformShopifyCustomer(data);
        case 'order':
          return transformShopifyOrder(data);
        case 'collection':
          return transformShopifyCollection(data);
        case 'coupon':
          return transformShopifyCoupon(data);
        case 'review':
          // Shopify doesn't have native reviews API
          throw new Error('Shopify does not have a native reviews API. Reviews can only be exported from WooCommerce.');
        case 'page':
          return transformShopifyPage(data);
        case 'blogPost':
          return transformShopifyBlogPost(data);
      }
    }
  }

  // Transform from universal format to destination platform
  static toDestination(data: any, type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost', destination: Platform): any {
    if (destination === 'woocommerce') {
      switch (type) {
        case 'product':
          return transformToWooCommerceProduct(data as Product);
        case 'customer':
          return transformToWooCommerceCustomer(data as Customer);
        case 'order':
          return transformToWooCommerceOrder(data as Order);
        case 'collection':
          return transformToWooCommerceCollection(data as Collection);
        case 'coupon':
          return transformToWooCommerceCoupon(data as Coupon);
        case 'review':
          return transformToWooCommerceReview(data as Review);
        case 'page':
          return transformToWooCommercePage(data as Page);
        case 'blogPost':
          return transformToWooCommercePost(data as BlogPost);
      }
    } else {
      switch (type) {
        case 'product':
          return transformToShopifyProduct(data as Product);
        case 'customer':
          return transformToShopifyCustomer(data as Customer);
        case 'order':
          return transformToShopifyDraftOrder(data as Order);
        case 'collection':
          return transformToShopifyCollection(data as Collection);
        case 'coupon':
          return transformToShopifyDiscount(data as Coupon);
        case 'review':
          // Shopify doesn't have native reviews API
          throw new Error('Shopify does not have a native reviews API. Use a third-party app like Judge.me or Yotpo.');
        case 'page':
          return transformToShopifyPage(data as Page);
        case 'blogPost':
          return transformToShopifyBlogPost(data as BlogPost);
      }
    }
  }

  // Full migration: source -> universal -> destination
  static migrate(
    data: any,
    type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost',
    source: Platform,
    destination: Platform
  ): any {
    const universal = this.toUniversal(data, type, source);
    return this.toDestination(universal, type, destination);
  }

  // Validate that required fields are present
  static validate(data: any, type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost'): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (type) {
      case 'product':
        if (!data.name) errors.push('Product name is required');
        if (!data.price) errors.push('Product price is required');
        break;
      case 'customer':
        if (!data.email) errors.push('Customer email is required');
        if (!data.firstName && !data.lastName) errors.push('Customer name is required');
        break;
      case 'order':
        if (!data.lineItems || data.lineItems.length === 0) errors.push('Order must have at least one line item');
        if (!data.totalPrice) errors.push('Order total price is required');
        break;
      case 'collection':
        if (!data.name) errors.push('Collection name is required');
        break;
      case 'coupon':
        if (!data.code) errors.push('Coupon code is required');
        if (!data.amount) errors.push('Coupon amount is required');
        if (!data.discountType) errors.push('Coupon discount type is required');
        break;
      case 'review':
        if (!data.productId) errors.push('Review product ID is required');
        if (!data.content) errors.push('Review content is required');
        if (!data.reviewerName) errors.push('Reviewer name is required');
        if (!data.reviewerEmail) errors.push('Reviewer email is required');
        if (!data.rating || data.rating < 1 || data.rating > 5) errors.push('Review rating must be between 1 and 5');
        break;
      case 'page':
        if (!data.title) errors.push('Page title is required');
        if (!data.content) errors.push('Page content is required');
        break;
      case 'blogPost':
        if (!data.title) errors.push('Blog post title is required');
        if (!data.content) errors.push('Blog post content is required');
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Preview migration without executing
  static preview(
    data: any,
    type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost',
    source: Platform,
    destination: Platform
  ): { source: any; destination: any; warnings: string[] } {
    const warnings: string[] = [];
    const universal = this.toUniversal(data, type, source);
    const destinationData = this.toDestination(universal, type, destination);

    // Check for data loss
    if (type === 'product') {
      if (universal.metafields.length > 0) {
        warnings.push(`${universal.metafields.length} metafields will be migrated`);
      }
      if (universal.variants.length > 100) {
        warnings.push('Product has more than 100 variants, some may not be migrated');
      }
    }

    if (type === 'customer') {
      if (universal.addresses.length > 2) {
        warnings.push('Customer has more than 2 addresses, only first 2 will be migrated');
      }
    }

    if (type === 'coupon') {
      if (universal.productIds && universal.productIds.length > 0) {
        warnings.push(`Coupon applies to ${universal.productIds.length} specific products`);
      }
      if (universal.categoryIds && universal.categoryIds.length > 0) {
        warnings.push(`Coupon applies to ${universal.categoryIds.length} specific categories`);
      }
    }

    if (type === 'page' || type === 'blogPost') {
      if (universal.content && universal.content.includes('[')) {
        warnings.push('Content contains WordPress shortcodes that may not work in Shopify');
      }
      if (source === 'woocommerce' && destination === 'shopify') {
        warnings.push('Image URLs will still point to WordPress - consider re-uploading images');
      }
    }

    return {
      source: universal,
      destination: destinationData,
      warnings,
    };
  }
}

// Helper function for direct coupon mapping
export function mapCoupon(coupon: any, source: Platform, destination: Platform): any {
  return MigrationMapper.migrate(coupon, 'coupon', source, destination);
}

