import { Product, Customer, Order, Collection, Coupon, Review, Page, BlogPost, Address } from '../types';

// WooCommerce to Universal Format
export function transformWooCommerceProduct(wcProduct: any): Product {
  return {
    id: wcProduct.id.toString(),
    name: wcProduct.name,
    description: wcProduct.description || '',
    slug: wcProduct.slug,
    status: wcProduct.status === 'publish' ? 'published' : wcProduct.status === 'draft' ? 'draft' : 'archived',
    price: wcProduct.price || '0',
    compareAtPrice: wcProduct.regular_price !== wcProduct.price ? wcProduct.regular_price : undefined,
    sku: wcProduct.sku,
    barcode: wcProduct.barcode,
    weight: wcProduct.weight ? parseFloat(wcProduct.weight) : undefined,
    images: wcProduct.images?.map((img: any, index: number) => ({
      id: img.id.toString(),
      src: img.src,
      alt: img.alt || wcProduct.name,
      position: index,
    })) || [],
    variants: wcProduct.variations?.map((varId: string, index: number) => ({
      id: varId,
      title: `Variant ${index + 1}`,
      sku: wcProduct.sku,
      price: wcProduct.price,
      inventoryQuantity: wcProduct.stock_quantity || 0,
      options: [],
    })) || [{
      id: wcProduct.id.toString(),
      title: 'Default',
      sku: wcProduct.sku,
      price: wcProduct.price,
      inventoryQuantity: wcProduct.stock_quantity || 0,
      options: [],
    }],
    categories: wcProduct.categories?.map((cat: any) => cat.name) || [],
    tags: wcProduct.tags?.map((tag: any) => tag.name) || [],
    metafields: wcProduct.meta_data?.map((meta: any) => ({
      namespace: 'woocommerce',
      key: meta.key,
      value: typeof meta.value === 'string' ? meta.value : JSON.stringify(meta.value),
      type: 'string',
    })) || [],
    seo: {
      title: wcProduct.meta_data?.find((m: any) => m.key === '_yoast_wpseo_title')?.value,
      description: wcProduct.meta_data?.find((m: any) => m.key === '_yoast_wpseo_metadesc')?.value,
    },
    platform: 'woocommerce',
    originalId: wcProduct.id.toString(),
  };
}

export function transformWooCommerceCustomer(wcCustomer: any): Customer {
  return {
    id: wcCustomer.id.toString(),
    email: wcCustomer.email,
    firstName: wcCustomer.first_name || '',
    lastName: wcCustomer.last_name || '',
    phone: wcCustomer.billing?.phone,
    addresses: [
      ...(wcCustomer.billing ? [{
        firstName: wcCustomer.billing.first_name || '',
        lastName: wcCustomer.billing.last_name || '',
        company: wcCustomer.billing.company,
        address1: wcCustomer.billing.address_1 || '',
        address2: wcCustomer.billing.address_2,
        city: wcCustomer.billing.city || '',
        province: wcCustomer.billing.state,
        country: wcCustomer.billing.country || '',
        zip: wcCustomer.billing.postcode || '',
        phone: wcCustomer.billing.phone,
        isDefault: true,
      }] : []),
      ...(wcCustomer.shipping && wcCustomer.shipping.address_1 ? [{
        firstName: wcCustomer.shipping.first_name || '',
        lastName: wcCustomer.shipping.last_name || '',
        company: wcCustomer.shipping.company,
        address1: wcCustomer.shipping.address_1,
        address2: wcCustomer.shipping.address_2,
        city: wcCustomer.shipping.city || '',
        province: wcCustomer.shipping.state,
        country: wcCustomer.shipping.country || '',
        zip: wcCustomer.shipping.postcode || '',
        isDefault: false,
      }] : []),
    ],
    tags: [],
    notes: wcCustomer.meta_data?.find((m: any) => m.key === 'customer_note')?.value,
    metafields: wcCustomer.meta_data?.map((meta: any) => ({
      namespace: 'woocommerce',
      key: meta.key,
      value: typeof meta.value === 'string' ? meta.value : JSON.stringify(meta.value),
      type: 'string',
    })) || [],
    platform: 'woocommerce',
    originalId: wcCustomer.id.toString(),
  };
}

export function transformWooCommerceOrder(wcOrder: any): Order {
  return {
    id: wcOrder.id.toString(),
    orderNumber: wcOrder.number || wcOrder.id.toString(),
    email: wcOrder.billing?.email || '',
    lineItems: wcOrder.line_items?.map((item: any) => ({
      id: item.id.toString(),
      productId: item.product_id.toString(),
      variantId: item.variation_id ? item.variation_id.toString() : undefined,
      title: item.name,
      quantity: item.quantity,
      price: item.price.toString(),
      sku: item.sku,
    })) || [],
    shippingAddress: wcOrder.shipping ? {
      firstName: wcOrder.shipping.first_name || '',
      lastName: wcOrder.shipping.last_name || '',
      company: wcOrder.shipping.company,
      address1: wcOrder.shipping.address_1 || '',
      address2: wcOrder.shipping.address_2,
      city: wcOrder.shipping.city || '',
      province: wcOrder.shipping.state,
      country: wcOrder.shipping.country || '',
      zip: wcOrder.shipping.postcode || '',
      phone: wcOrder.billing?.phone,
    } : undefined,
    billingAddress: wcOrder.billing ? {
      firstName: wcOrder.billing.first_name || '',
      lastName: wcOrder.billing.last_name || '',
      company: wcOrder.billing.company,
      address1: wcOrder.billing.address_1 || '',
      address2: wcOrder.billing.address_2,
      city: wcOrder.billing.city || '',
      province: wcOrder.billing.state,
      country: wcOrder.billing.country || '',
      zip: wcOrder.billing.postcode || '',
      phone: wcOrder.billing.phone,
    } : undefined,
    financialStatus: wcOrder.status,
    fulfillmentStatus: wcOrder.status === 'completed' ? 'fulfilled' : 'unfulfilled',
    totalPrice: wcOrder.total,
    subtotalPrice: wcOrder.subtotal || wcOrder.total,
    totalTax: wcOrder.total_tax || '0',
    totalShipping: wcOrder.shipping_total || '0',
    discounts: wcOrder.coupon_lines?.map((coupon: any) => ({
      code: coupon.code,
      amount: coupon.discount,
      type: 'fixed' as const,
    })) || [],
    tags: [],
    notes: wcOrder.customer_note,
    createdAt: new Date(wcOrder.date_created),
    platform: 'woocommerce',
    originalId: wcOrder.id.toString(),
  };
}

export function transformWooCommerceCollection(wcCategory: any): Collection {
  return {
    id: wcCategory.id.toString(),
    name: wcCategory.name,
    description: wcCategory.description,
    slug: wcCategory.slug,
    image: wcCategory.image ? {
      id: wcCategory.image.id?.toString() || '',
      src: wcCategory.image.src,
      alt: wcCategory.image.alt || wcCategory.name,
      position: 0,
    } : undefined,
    productIds: [],
    seo: {
      title: wcCategory.name,
      description: wcCategory.description,
    },
    platform: 'woocommerce',
    originalId: wcCategory.id.toString(),
  };
}

// Universal Format to WooCommerce
export function transformToWooCommerceProduct(product: Product): any {
  return {
    name: product.name,
    type: product.variants.length > 1 ? 'variable' : 'simple',
    description: product.description,
    slug: product.slug,
    status: product.status === 'published' ? 'publish' : product.status,
    regular_price: product.compareAtPrice || product.price,
    sale_price: product.compareAtPrice ? product.price : undefined,
    sku: product.sku,
    weight: product.weight?.toString(),
    images: product.images.map(img => ({
      src: img.src,
      alt: img.alt,
    })),
    categories: product.categories.map(name => ({ name })),
    tags: product.tags.map(name => ({ name })),
    meta_data: product.metafields
      .filter(m => m.namespace === 'woocommerce')
      .map(m => ({
        key: m.key,
        value: m.value,
      })),
  };
}

export function transformToWooCommerceCustomer(customer: Customer): any {
  const billingAddress = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
  const shippingAddress = customer.addresses.find(a => !a.isDefault) || billingAddress;

  return {
    email: customer.email,
    first_name: customer.firstName,
    last_name: customer.lastName,
    billing: billingAddress ? {
      first_name: billingAddress.firstName,
      last_name: billingAddress.lastName,
      company: billingAddress.company,
      address_1: billingAddress.address1,
      address_2: billingAddress.address2,
      city: billingAddress.city,
      state: billingAddress.province,
      postcode: billingAddress.zip,
      country: billingAddress.country,
      email: customer.email,
      phone: billingAddress.phone || customer.phone,
    } : undefined,
    shipping: shippingAddress ? {
      first_name: shippingAddress.firstName,
      last_name: shippingAddress.lastName,
      company: shippingAddress.company,
      address_1: shippingAddress.address1,
      address_2: shippingAddress.address2,
      city: shippingAddress.city,
      state: shippingAddress.province,
      postcode: shippingAddress.zip,
      country: shippingAddress.country,
    } : undefined,
    meta_data: customer.metafields
      .filter(m => m.namespace === 'woocommerce')
      .map(m => ({
        key: m.key,
        value: m.value,
      })),
  };
}

// WooCommerce to Universal Format
export function transformWooCommerceCoupon(wcCoupon: any): Coupon {
  return {
    id: wcCoupon.id.toString(),
    code: wcCoupon.code,
    discountType: wcCoupon.discount_type as 'percentage' | 'fixed_cart' | 'fixed_product',
    amount: wcCoupon.amount,
    description: wcCoupon.description,
    expiryDate: wcCoupon.date_expires ? new Date(wcCoupon.date_expires) : undefined,
    minimumAmount: wcCoupon.minimum_amount || undefined,
    maximumAmount: wcCoupon.maximum_amount || undefined,
    usageLimit: wcCoupon.usage_limit || undefined,
    usageLimitPerUser: wcCoupon.usage_limit_per_user || undefined,
    usageCount: wcCoupon.usage_count || 0,
    individualUse: wcCoupon.individual_use || false,
    productIds: wcCoupon.product_ids?.map((id: number) => id.toString()) || [],
    excludedProductIds: wcCoupon.excluded_product_ids?.map((id: number) => id.toString()) || [],
    categoryIds: wcCoupon.product_categories?.map((id: number) => id.toString()) || [],
    excludedCategoryIds: wcCoupon.excluded_product_categories?.map((id: number) => id.toString()) || [],
    freeShipping: wcCoupon.free_shipping || false,
    platform: 'woocommerce',
    originalId: wcCoupon.id.toString(),
  };
}

// Universal Format to WooCommerce
export function transformToWooCommerceCoupon(coupon: Coupon): any {
  return {
    code: coupon.code,
    discount_type: coupon.discountType,
    amount: coupon.amount,
    description: coupon.description || '',
    date_expires: coupon.expiryDate ? coupon.expiryDate.toISOString() : null,
    minimum_amount: coupon.minimumAmount || '',
    maximum_amount: coupon.maximumAmount || '',
    usage_limit: coupon.usageLimit || null,
    usage_limit_per_user: coupon.usageLimitPerUser || null,
    individual_use: coupon.individualUse || false,
    product_ids: coupon.productIds?.map(id => parseInt(id)) || [],
    excluded_product_ids: coupon.excludedProductIds?.map(id => parseInt(id)) || [],
    product_categories: coupon.categoryIds?.map(id => parseInt(id)) || [],
    excluded_product_categories: coupon.excludedCategoryIds?.map(id => parseInt(id)) || [],
    free_shipping: coupon.freeShipping || false,
  };
}

// WooCommerce Review to Universal Format
export function transformWooCommerceReview(wcReview: any): Review {
  return {
    id: wcReview.id.toString(),
    productId: wcReview.product_id.toString(),
    rating: wcReview.rating,
    title: '', // WooCommerce doesn't have review titles
    content: wcReview.review,
    reviewerName: wcReview.reviewer,
    reviewerEmail: wcReview.reviewer_email,
    verified: wcReview.verified || false,
    status: wcReview.status === 'approved' ? 'approved' : wcReview.status === 'hold' ? 'pending' : 'spam',
    createdAt: new Date(wcReview.date_created),
    platform: 'woocommerce',
    originalId: wcReview.id.toString(),
  };
}

// Universal Format to WooCommerce Review (for importing reviews)
export function transformToWooCommerceReview(review: Review): any {
  return {
    product_id: parseInt(review.productId),
    review: review.content,
    reviewer: review.reviewerName,
    reviewer_email: review.reviewerEmail,
    rating: review.rating,
    verified: review.verified || false,
    status: review.status === 'approved' ? 'approved' : review.status === 'pending' ? 'hold' : 'spam',
  };
}

// WordPress Page to Universal Format
export function transformWooCommercePage(wpPage: any): Page {
  return {
    id: wpPage.id.toString(),
    title: wpPage.title.rendered,
    content: wpPage.content.rendered,
    slug: wpPage.slug,
    status: wpPage.status === 'publish' ? 'published' : 'draft',
    author: wpPage.author?.toString(),
    template: wpPage.template,
    seo: {
      title: wpPage.yoast_head_json?.title,
      description: wpPage.yoast_head_json?.description,
    },
    createdAt: new Date(wpPage.date),
    updatedAt: new Date(wpPage.modified),
    platform: 'woocommerce',
    originalId: wpPage.id.toString(),
  };
}

// Universal Format to WordPress Page
export function transformToWooCommercePage(page: Page): any {
  return {
    title: page.title,
    content: page.content,
    slug: page.slug,
    status: page.status === 'published' ? 'publish' : 'draft',
  };
}

// WordPress Post to Universal Format
export function transformWooCommercePost(wpPost: any): BlogPost {
  return {
    id: wpPost.id.toString(),
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    excerpt: wpPost.excerpt?.rendered || '',
    slug: wpPost.slug,
    status: wpPost.status === 'publish' ? 'published' : 'draft',
    author: wpPost.author?.toString(),
    featuredImage: wpPost.featured_media ? wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url : undefined,
    categories: wpPost._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.name) || [],
    tags: wpPost._embedded?.['wp:term']?.[1]?.map((tag: any) => tag.name) || [],
    seo: {
      title: wpPost.yoast_head_json?.title,
      description: wpPost.yoast_head_json?.description,
    },
    createdAt: new Date(wpPost.date),
    updatedAt: new Date(wpPost.modified),
    publishedAt: wpPost.date ? new Date(wpPost.date) : undefined,
    platform: 'woocommerce',
    originalId: wpPost.id.toString(),
  };
}

// Universal Format to WordPress Post
export function transformToWooCommercePost(post: BlogPost): any {
  return {
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    slug: post.slug,
    status: post.status === 'published' ? 'publish' : 'draft',
  };
}

// Universal Format to WooCommerce Order
export function transformToWooCommerceOrder(order: Order): any {
  return {
    status: mapFinancialStatusToWooCommerce(order.financialStatus),
    billing: order.billingAddress ? {
      first_name: order.billingAddress.firstName,
      last_name: order.billingAddress.lastName,
      company: order.billingAddress.company || '',
      address_1: order.billingAddress.address1,
      address_2: order.billingAddress.address2 || '',
      city: order.billingAddress.city,
      state: order.billingAddress.province || '',
      postcode: order.billingAddress.zip,
      country: order.billingAddress.country,
      email: order.email,
      phone: order.billingAddress.phone || '',
    } : undefined,
    shipping: order.shippingAddress ? {
      first_name: order.shippingAddress.firstName,
      last_name: order.shippingAddress.lastName,
      company: order.shippingAddress.company || '',
      address_1: order.shippingAddress.address1,
      address_2: order.shippingAddress.address2 || '',
      city: order.shippingAddress.city,
      state: order.shippingAddress.province || '',
      postcode: order.shippingAddress.zip,
      country: order.shippingAddress.country,
    } : undefined,
    line_items: order.lineItems.map(item => ({
      name: item.title,
      quantity: item.quantity,
      total: item.price,
      sku: item.sku || '',
    })),
    customer_note: order.notes || '',
    set_paid: order.financialStatus === 'PAID' || order.financialStatus === 'paid',
  };
}

// Helper function to map Shopify financial status to WooCommerce order status
function mapFinancialStatusToWooCommerce(status: string): string {
  const statusMap: Record<string, string> = {
    'PAID': 'processing',
    'paid': 'processing',
    'PENDING': 'pending',
    'pending': 'pending',
    'REFUNDED': 'refunded',
    'refunded': 'refunded',
    'PARTIALLY_REFUNDED': 'processing',
    'partially_refunded': 'processing',
    'VOIDED': 'cancelled',
    'voided': 'cancelled',
    'AUTHORIZED': 'on-hold',
    'authorized': 'on-hold',
  };
  return statusMap[status] || 'pending';
}

// Universal Format to WooCommerce Collection (Category)
export function transformToWooCommerceCollection(collection: Collection): any {
  return {
    name: collection.name,
    slug: collection.slug,
    description: collection.description || '',
    image: collection.image ? { src: collection.image.src } : undefined,
  };
}

