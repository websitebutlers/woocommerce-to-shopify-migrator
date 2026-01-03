// Common types used across the application

export type Platform = 'woocommerce' | 'shopify';

export interface ConnectionConfig {
  id: string;
  platform: Platform;
  isConnected: boolean;
  config: WooCommerceConfig | ShopifyConfig;
  lastTested?: Date;
}

export interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  apiVersion?: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  price: string;
  compareAtPrice?: string;
  sku?: string;
  barcode?: string;
  weight?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: string[];
  tags: string[];
  metafields: Metafield[];
  seo?: SEOMetadata;
  platform: Platform;
  originalId: string;
}

export interface ProductImage {
  id: string;
  src: string;
  alt?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  weight?: number;
  inventoryQuantity: number;
  options: VariantOption[];
  image?: ProductImage;
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface Metafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface SEOMetadata {
  title?: string;
  description?: string;
}

// Customer types
export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  addresses: Address[];
  tags: string[];
  notes?: string;
  metafields: Metafield[];
  platform: Platform;
  originalId: string;
}

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
  isDefault?: boolean;
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  email: string;
  customer?: Customer;
  lineItems: LineItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: string;
  subtotalPrice: string;
  totalTax: string;
  totalShipping: string;
  discounts: Discount[];
  tags: string[];
  notes?: string;
  createdAt: Date;
  platform: Platform;
  originalId: string;
}

export interface LineItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  quantity: number;
  price: string;
  sku?: string;
}

export interface Discount {
  code: string;
  amount: string;
  type: 'percentage' | 'fixed';
}

// Collection types
export interface Collection {
  id: string;
  name: string;
  description?: string;
  slug: string;
  image?: ProductImage;
  productIds: string[];
  seo?: SEOMetadata;
  platform: Platform;
  originalId: string;
}

// Coupon types
export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed_cart' | 'fixed_product';
  amount: string;
  description?: string;
  expiryDate?: Date;
  minimumAmount?: string;
  maximumAmount?: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount?: number;
  individualUse?: boolean;
  productIds?: string[];
  excludedProductIds?: string[];
  categoryIds?: string[];
  excludedCategoryIds?: string[];
  freeShipping?: boolean;
  platform: Platform;
  originalId: string;
}

// Review types
export interface Review {
  id: string;
  productId: string;
  rating: number;
  title?: string;
  content: string;
  reviewerName: string;
  reviewerEmail: string;
  verified?: boolean;
  status: 'approved' | 'pending' | 'spam';
  createdAt: Date;
  platform: Platform;
  originalId: string;
}

// Page types
export interface Page {
  id: string;
  title: string;
  content: string;
  slug: string;
  status: 'draft' | 'published';
  author?: string;
  template?: string;
  seo?: SEOMetadata;
  createdAt: Date;
  updatedAt: Date;
  platform: Platform;
  originalId: string;
}

// Blog Post types
export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  status: 'draft' | 'published';
  author?: string;
  featuredImage?: string;
  categories: string[];
  tags: string[];
  seo?: SEOMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  platform: Platform;
  originalId: string;
}

// Attribute types
export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  type: 'select' | 'text';
  orderBy: string;
  hasArchives?: boolean;
  options?: string[];
  platform: Platform;
  originalId: string;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  platform: Platform;
  originalId: string;
}

// Shipping types
export interface ShippingZone {
  id: string;
  name: string;
  order?: number;
  locations: ShippingLocation[];
  methods: ShippingMethod[];
  platform: Platform;
  originalId: string;
}

export interface ShippingLocation {
  code: string;
  type: 'country' | 'state' | 'postcode';
}

export interface ShippingMethod {
  id: string;
  title: string;
  methodId: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

// Tax types
export interface TaxRate {
  id: string;
  country: string;
  state?: string;
  postcode?: string;
  city?: string;
  rate: string;
  name: string;
  priority?: number;
  compound?: boolean;
  shipping?: boolean;
  order?: number;
  class?: string;
  platform: Platform;
  originalId: string;
}

// Migration types
export interface MigrationJob {
  id: string;
  type: 'product' | 'customer' | 'order' | 'collection' | 'coupon' | 'review' | 'page' | 'blogPost' | 'attribute' | 'tag' | 'shipping' | 'tax';
  source: Platform;
  destination: Platform;
  items: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;
  total: number;
  results: MigrationResult[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface MigrationResult {
  sourceId: string;
  destinationId?: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface MigrationPreview {
  source: any;
  destination: any;
  warnings: string[];
}

// Inventory Sync types
export interface InventoryDifference {
  productId: string;
  name: string;
  sku: string;
  sourceQuantity: number;
  destinationQuantity: number;
  difference: number;
  sourceStatus: 'instock' | 'outofstock';
  destinationStatus: 'instock' | 'outofstock';
  sourcePlatform: Platform;
  destinationPlatform: Platform;
  sourceProductId: string;
  destinationProductId: string;
  variantId?: string;
  variantTitle?: string;
}

export interface InventoryComparisonResult {
  differences: InventoryDifference[];
  summary: {
    sourceOfTruth: Platform;
    sourceProductCount: number;
    destinationPlatform: Platform;
    destinationProductCount: number;
    matchedProducts: number;
    productsWithDifferences: number;
    totalVariantsCompared: number;
  };
}

export interface InventorySyncRequest {
  sourceOfTruth: Platform;
  productIds: string[]; // IDs of InventoryDifference items to sync
}

export interface InventorySyncResult {
  productId: string;
  name: string;
  variantTitle?: string;
  success: boolean;
  error?: string;
  oldQuantity: number;
  newQuantity: number;
  platform: Platform;
}

// Customer Sync types
export interface CustomerDifference {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  sourceCustomerId: string;
  existsInSource: boolean;
  existsInDestination: boolean;
  sourcePlatform: Platform;
  destinationPlatform: Platform;
  addressCount?: number;
}

export interface CustomerComparisonResult {
  differences: CustomerDifference[];
  summary: {
    sourceOfTruth: Platform;
    sourceCustomerCount: number;
    destinationPlatform: Platform;
    destinationCustomerCount: number;
    matchedCustomers: number;
    customersOnlyInSource: number;
  };
}

export interface CustomerSyncResult {
  email: string;
  firstName: string;
  lastName: string;
  success: boolean;
  error?: string;
  newCustomerId?: string;
  platform: Platform;
}

// Order Sync types
export interface OrderDifference {
  orderNumber: string;
  email: string;
  totalPrice: string;
  createdAt: string;
  sourceOrderId: string;
  existsInSource: boolean;
  existsInDestination: boolean;
  sourcePlatform: Platform;
  destinationPlatform: Platform;
  lineItemCount: number;
  financialStatus: string;
  fulfillmentStatus: string;
}

export interface OrderComparisonResult {
  differences: OrderDifference[];
  summary: {
    sourceOfTruth: Platform;
    sourceOrderCount: number;
    destinationPlatform: Platform;
    destinationOrderCount: number;
    matchedOrders: number;
    ordersOnlyInSource: number;
  };
}

export interface OrderSyncResult {
  orderNumber: string;
  email: string;
  success: boolean;
  error?: string;
  newOrderId?: string;
  warnings?: string[];
  platform: Platform;
}

// Blog Post Sync types
export interface BlogPostDifference {
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  sourceBlogPostId?: string;
  existsInSource: boolean;
  existsInDestination: boolean;
  sourcePlatform: Platform;
  destinationPlatform: Platform;
  tags: string[];
  status: string;
}

export interface BlogPostComparisonResult {
  differences: BlogPostDifference[];
  summary: {
    sourceOfTruth: Platform;
    sourceBlogPostCount: number;
    destinationPlatform: Platform;
    destinationBlogPostCount: number;
    matchedBlogPosts: number;
    blogPostsOnlyInSource: number;
  };
}

export interface BlogPostSyncResult {
  title: string;
  slug: string;
  success: boolean;
  error?: string;
  newBlogPostId?: string;
  platform: Platform;
}


