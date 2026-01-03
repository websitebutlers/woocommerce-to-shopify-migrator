import { Product, Customer, Order, Collection, Coupon, Page, BlogPost, Address } from '../types';

// Shopify to Universal Format
export function transformShopifyProduct(shopifyProduct: any): Product {
  return {
    id: shopifyProduct.id,
    name: shopifyProduct.title,
    description: shopifyProduct.description || '',
    slug: shopifyProduct.handle,
    status: shopifyProduct.status === 'ACTIVE' ? 'published' : shopifyProduct.status === 'DRAFT' ? 'draft' : 'archived',
    price: shopifyProduct.variants?.edges[0]?.node.price || '0',
    compareAtPrice: shopifyProduct.variants?.edges[0]?.node.compareAtPrice,
    sku: shopifyProduct.variants?.edges[0]?.node.sku,
    barcode: shopifyProduct.variants?.edges[0]?.node.barcode,
    weight: undefined, // Weight not available in basic variant query
    images: [
      ...(shopifyProduct.featuredImage ? [{
        id: shopifyProduct.featuredImage.id,
        src: shopifyProduct.featuredImage.url,
        alt: shopifyProduct.featuredImage.altText || shopifyProduct.title,
        position: 0,
      }] : []),
      ...(shopifyProduct.images?.edges.map((edge: any, index: number) => ({
        id: edge.node.id,
        src: edge.node.url,
        alt: edge.node.altText || shopifyProduct.title,
        position: index + 1,
      })) || []),
    ],
    variants: shopifyProduct.variants?.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      sku: edge.node.sku,
      barcode: edge.node.barcode,
      price: edge.node.price,
      compareAtPrice: edge.node.compareAtPrice,
      weight: undefined, // Weight not available in basic variant query
      inventoryQuantity: edge.node.inventoryQuantity || 0,
      options: edge.node.selectedOptions?.map((opt: any) => ({
        name: opt.name,
        value: opt.value,
      })) || [],
    })) || [],
    categories: [shopifyProduct.productType].filter(Boolean),
    tags: shopifyProduct.tags || [],
    metafields: [],
    seo: shopifyProduct.seo ? {
      title: shopifyProduct.seo.title,
      description: shopifyProduct.seo.description,
    } : undefined,
    platform: 'shopify',
    originalId: shopifyProduct.id,
  };
}

export function transformShopifyCustomer(shopifyCustomer: any): Customer {
  return {
    id: shopifyCustomer.id,
    email: shopifyCustomer.email,
    firstName: shopifyCustomer.firstName || '',
    lastName: shopifyCustomer.lastName || '',
    phone: shopifyCustomer.phone,
    addresses: shopifyCustomer.addresses?.map((addr: any, index: number) => ({
      id: addr.id,
      firstName: addr.firstName || '',
      lastName: addr.lastName || '',
      company: addr.company,
      address1: addr.address1 || '',
      address2: addr.address2,
      city: addr.city || '',
      province: addr.province,
      country: addr.country || '',
      zip: addr.zip || '',
      phone: addr.phone,
      isDefault: index === 0,
    })) || [],
    tags: shopifyCustomer.tags || [],
    notes: shopifyCustomer.note,
    metafields: [],
    platform: 'shopify',
    originalId: shopifyCustomer.id,
  };
}

export function transformShopifyOrder(shopifyOrder: any): Order {
  return {
    id: shopifyOrder.id,
    orderNumber: shopifyOrder.name,
    email: shopifyOrder.email,
    lineItems: shopifyOrder.lineItems?.edges.map((edge: any) => ({
      id: edge.node.id,
      productId: edge.node.variant?.product?.id || '',
      variantId: edge.node.variant?.id,
      title: edge.node.title,
      quantity: edge.node.quantity,
      price: edge.node.variant?.price || '0',
      sku: edge.node.variant?.sku,
    })) || [],
    shippingAddress: shopifyOrder.shippingAddress ? {
      firstName: shopifyOrder.shippingAddress.firstName || '',
      lastName: shopifyOrder.shippingAddress.lastName || '',
      company: shopifyOrder.shippingAddress.company,
      address1: shopifyOrder.shippingAddress.address1 || '',
      address2: shopifyOrder.shippingAddress.address2,
      city: shopifyOrder.shippingAddress.city || '',
      province: shopifyOrder.shippingAddress.province,
      country: shopifyOrder.shippingAddress.country || '',
      zip: shopifyOrder.shippingAddress.zip || '',
      phone: shopifyOrder.shippingAddress.phone,
    } : undefined,
    billingAddress: shopifyOrder.billingAddress ? {
      firstName: shopifyOrder.billingAddress.firstName || '',
      lastName: shopifyOrder.billingAddress.lastName || '',
      company: shopifyOrder.billingAddress.company,
      address1: shopifyOrder.billingAddress.address1 || '',
      address2: shopifyOrder.billingAddress.address2,
      city: shopifyOrder.billingAddress.city || '',
      province: shopifyOrder.billingAddress.province,
      country: shopifyOrder.billingAddress.country || '',
      zip: shopifyOrder.billingAddress.zip || '',
      phone: shopifyOrder.billingAddress.phone,
    } : undefined,
    financialStatus: shopifyOrder.financialStatus,
    fulfillmentStatus: shopifyOrder.fulfillmentStatus,
    totalPrice: shopifyOrder.totalPriceSet?.shopMoney.amount || '0',
    subtotalPrice: shopifyOrder.subtotalPriceSet?.shopMoney.amount || '0',
    totalTax: shopifyOrder.totalTaxSet?.shopMoney.amount || '0',
    totalShipping: shopifyOrder.totalShippingPriceSet?.shopMoney.amount || '0',
    discounts: [],
    tags: shopifyOrder.tags || [],
    notes: shopifyOrder.note,
    createdAt: new Date(shopifyOrder.createdAt),
    platform: 'shopify',
    originalId: shopifyOrder.id,
  };
}

export function transformShopifyCollection(shopifyCollection: any): Collection {
  return {
    id: shopifyCollection.id,
    name: shopifyCollection.title,
    description: shopifyCollection.description,
    slug: shopifyCollection.handle,
    image: shopifyCollection.image ? {
      id: shopifyCollection.image.id,
      src: shopifyCollection.image.url,
      alt: shopifyCollection.image.altText || shopifyCollection.title,
      position: 0,
    } : undefined,
    productIds: [],
    seo: shopifyCollection.seo ? {
      title: shopifyCollection.seo.title,
      description: shopifyCollection.seo.description,
    } : undefined,
    platform: 'shopify',
    originalId: shopifyCollection.id,
  };
}

// Universal Format to Shopify
export function transformToShopifyProduct(product: Product): any {
  return {
    title: product.name,
    descriptionHtml: product.description,
    handle: product.slug,
    status: product.status === 'published' ? 'ACTIVE' : product.status === 'draft' ? 'DRAFT' : 'ARCHIVED',
    productType: product.categories[0] || '',
    tags: product.tags,
    variants: product.variants.map(variant => {
      const variantData: any = {
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        sku: variant.sku,
        barcode: variant.barcode,
        inventoryQuantity: variant.inventoryQuantity,
        options: variant.options.map(opt => opt.value),
      };
      
      // Only include weight if it's defined
      if (variant.weight !== undefined && variant.weight !== null) {
        variantData.weight = variant.weight;
        variantData.weightUnit = 'POUNDS';
      }
      
      return variantData;
    }),
    seo: product.seo ? {
      title: product.seo.title,
      description: product.seo.description,
    } : undefined,
  };
}

export function transformToShopifyCustomer(customer: Customer): any {
  const defaultAddress = customer.addresses.find(a => a.isDefault) || customer.addresses[0];

  return {
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    tags: customer.tags,
    note: customer.notes,
    addresses: customer.addresses.map(addr => ({
      firstName: addr.firstName,
      lastName: addr.lastName,
      company: addr.company,
      address1: addr.address1,
      address2: addr.address2,
      city: addr.city,
      province: addr.province,
      country: addr.country,
      zip: addr.zip,
      phone: addr.phone,
    })),
  };
}

// Shopify to Universal Format
export function transformShopifyCoupon(shopifyDiscount: any): Coupon {
  const discount = shopifyDiscount.codeDiscount;
  const code = discount.codes?.edges?.[0]?.node?.code || '';
  
  // Determine discount type and amount
  let discountType: 'percentage' | 'fixed_cart' | 'fixed_product' = 'percentage';
  let amount = '0';
  
  if (discount.__typename === 'DiscountCodeFreeShipping') {
    discountType = 'fixed_cart';
    amount = '0';
  } else if (discount.customerGets?.value) {
    const value = discount.customerGets.value;
    if (value.percentage) {
      discountType = 'percentage';
      amount = (value.percentage * 100).toString();
    } else if (value.amount) {
      discountType = 'fixed_cart';
      amount = value.amount.amount;
    }
  }

  return {
    id: shopifyDiscount.id,
    code: code,
    discountType: discountType,
    amount: amount,
    description: discount.title || '',
    expiryDate: discount.endsAt ? new Date(discount.endsAt) : undefined,
    minimumAmount: discount.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || undefined,
    usageLimit: discount.usageLimit || undefined,
    usageLimitPerUser: discount.appliesOncePerCustomer ? 1 : undefined,
    usageCount: discount.asyncUsageCount || 0,
    individualUse: false,
    freeShipping: discount.__typename === 'DiscountCodeFreeShipping',
    platform: 'shopify',
    originalId: shopifyDiscount.id,
  };
}

// Universal Format to Shopify
export function transformToShopifyDiscount(coupon: Coupon): any {
  const input: any = {
    title: coupon.description || coupon.code,
    code: coupon.code,
    startsAt: new Date().toISOString(),
  };

  if (coupon.expiryDate) {
    input.endsAt = coupon.expiryDate.toISOString();
  }

  if (coupon.usageLimit) {
    input.usageLimit = coupon.usageLimit;
  }

  if (coupon.usageLimitPerUser && coupon.usageLimitPerUser === 1) {
    input.appliesOncePerCustomer = true;
  }

  // Set discount value
  if (coupon.discountType === 'percentage') {
    input.customerGets = {
      value: {
        percentage: parseFloat(coupon.amount) / 100,
      },
      items: {
        all: true,
      },
    };
  } else if (coupon.discountType === 'fixed_cart') {
    input.customerGets = {
      value: {
        discountAmount: {
          amount: coupon.amount,
          appliesOnEachItem: false,
        },
      },
      items: {
        all: true,
      },
    };
  }

  // Set minimum requirement
  if (coupon.minimumAmount) {
    input.minimumRequirement = {
      greaterThanOrEqualToSubtotal: {
        amount: coupon.minimumAmount,
      },
    };
  }

  return input;
}

// Shopify Page to Universal Format
export function transformShopifyPage(shopifyPage: any): Page {
  return {
    id: shopifyPage.id,
    title: shopifyPage.title,
    content: shopifyPage.body || '',
    slug: shopifyPage.handle,
    status: shopifyPage.isPublished ? 'published' : 'draft',
    createdAt: new Date(shopifyPage.createdAt),
    updatedAt: new Date(shopifyPage.updatedAt),
    platform: 'shopify',
    originalId: shopifyPage.id,
  };
}

// Universal Format to Shopify Page
export function transformToShopifyPage(page: Page): any {
  return {
    title: page.title,
    body: page.content,
    handle: page.slug,
  };
}

// Shopify Blog Post (Article) to Universal Format
export function transformShopifyBlogPost(shopifyArticle: any): BlogPost {
  return {
    id: shopifyArticle.id,
    title: shopifyArticle.title,
    content: shopifyArticle.content || '',
    excerpt: shopifyArticle.excerpt || '',
    slug: shopifyArticle.handle,
    status: shopifyArticle.publishedAt ? 'published' : 'draft',
    author: shopifyArticle.author?.name,
    featuredImage: shopifyArticle.image?.url,
    tags: shopifyArticle.tags || [],
    categories: [], // Shopify doesn't have categories for blog posts
    createdAt: new Date(shopifyArticle.createdAt),
    updatedAt: new Date(shopifyArticle.updatedAt),
    publishedAt: shopifyArticle.publishedAt ? new Date(shopifyArticle.publishedAt) : undefined,
    platform: 'shopify',
    originalId: shopifyArticle.id,
  };
}

// Universal Format to Shopify Blog Post
export function transformToShopifyBlogPost(post: BlogPost): any {
  return {
    title: post.title,
    body: post.content,
    handle: post.slug,
    tags: post.tags,
    // Note: Shopify requires a blog to be created first
    // The blogId will be handled in the API client
  };
}

// Universal Format to Shopify Draft Order (for order migration)
export function transformToShopifyDraftOrder(order: Order): any {
  return {
    email: order.email,
    note: order.notes,
    tags: order.tags,
    lineItems: order.lineItems.map(item => ({
      title: item.title,
      quantity: item.quantity,
      originalUnitPrice: item.price,
      sku: item.sku,
    })),
    shippingAddress: order.shippingAddress ? {
      firstName: order.shippingAddress.firstName,
      lastName: order.shippingAddress.lastName,
      company: order.shippingAddress.company,
      address1: order.shippingAddress.address1,
      address2: order.shippingAddress.address2,
      city: order.shippingAddress.city,
      province: order.shippingAddress.province,
      country: order.shippingAddress.country,
      zip: order.shippingAddress.zip,
      phone: order.shippingAddress.phone,
    } : undefined,
    billingAddress: order.billingAddress ? {
      firstName: order.billingAddress.firstName,
      lastName: order.billingAddress.lastName,
      company: order.billingAddress.company,
      address1: order.billingAddress.address1,
      address2: order.billingAddress.address2,
      city: order.billingAddress.city,
      province: order.billingAddress.province,
      country: order.billingAddress.country,
      zip: order.billingAddress.zip,
      phone: order.billingAddress.phone,
    } : undefined,
  };
}

// Universal Format to Shopify Collection
export function transformToShopifyCollection(collection: Collection): any {
  return {
    title: collection.name,
    handle: collection.slug,
    descriptionHtml: collection.description || '',
    image: collection.image ? {
      src: collection.image.src,
      altText: collection.image.alt,
    } : undefined,
    seo: collection.seo ? {
      title: collection.seo.title,
      description: collection.seo.description,
    } : undefined,
  };
}

