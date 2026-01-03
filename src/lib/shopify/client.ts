import { ShopifyConfig } from '../types';

export class ShopifyClient {
  private config: ShopifyConfig;
  private apiUrl: string;

  constructor(config: ShopifyConfig) {
    this.config = config;
    const domain = config.storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const version = config.apiVersion || '2024-01';
    this.apiUrl = `https://${domain}/admin/api/${version}/graphql.json`;
  }

  private async request(query: string, variables?: any) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.config.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      console.error('Shopify API request failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const query = `
        query {
          shop {
            name
            id
          }
        }
      `;
      const data = await this.request(query);
      return !!data.shop;
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }

  // Products
  async getProducts(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              title
              description
              handle
              status
              tags
              vendor
              productType
              createdAt
              updatedAt
              featuredImage {
                id
                url
                altText
              }
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    barcode
                    price
                    compareAtPrice
                    inventoryQuantity
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
              seo {
                title
                description
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.products;
  }

  async getProduct(id: string) {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          description
          handle
          status
          tags
          vendor
          productType
          featuredImage {
            id
            url
            altText
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          seo {
            title
            description
          }
        }
      }
    `;

    const data = await this.request(query, { id });
    return data.product;
  }

  async createProduct(input: any) {
    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { input });

    if (data.productCreate.userErrors.length > 0) {
      throw new Error(`Product creation failed: ${JSON.stringify(data.productCreate.userErrors)}`);
    }

    return data.productCreate.product;
  }

  async updateProduct(id: string, input: any) {
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { input: { ...input, id } });

    if (data.productUpdate.userErrors.length > 0) {
      throw new Error(`Product update failed: ${JSON.stringify(data.productUpdate.userErrors)}`);
    }

    return data.productUpdate.product;
  }

  async updateInventory(variantId: string, quantity: number) {
    // First, get the inventory item ID and current quantity for this variant
    const variantQuery = `
      query getVariant($id: ID!) {
        productVariant(id: $id) {
          id
          inventoryItem {
            id
            inventoryLevels(first: 1) {
              edges {
                node {
                  id
                  location {
                    id
                  }
                  quantities(names: ["available"]) {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variantData = await this.request(variantQuery, { id: variantId });
    const inventoryItem = variantData.productVariant?.inventoryItem;

    if (!inventoryItem) {
      throw new Error(`No inventory item found for variant ${variantId}`);
    }

    const inventoryLevel = inventoryItem.inventoryLevels?.edges?.[0]?.node;

    if (!inventoryLevel) {
      throw new Error('No inventory level found for variant');
    }

    const inventoryItemId = inventoryItem.id;
    const locationId = inventoryLevel.location.id;

    // Get the available quantity from the quantities array
    const availableQuantity = inventoryLevel.quantities?.find((q: any) => q.name === 'available');
    const currentQuantity = availableQuantity?.quantity || 0;
    const delta = quantity - currentQuantity;

    // If no change needed, return early
    if (delta === 0) {
      return { reason: 'no_change', changes: [] };
    }

    // Use inventoryAdjustQuantities mutation
    const mutation = `
      mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          inventoryAdjustmentGroup {
            reason
            changes {
              name
              delta
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const input = {
      reason: 'correction',
      name: 'available',
      changes: [
        {
          inventoryItemId,
          locationId,
          delta,
        },
      ],
    };

    const data = await this.request(mutation, { input });

    if (data.inventoryAdjustQuantities.userErrors.length > 0) {
      throw new Error(`Inventory update failed: ${JSON.stringify(data.inventoryAdjustQuantities.userErrors)}`);
    }

    return data.inventoryAdjustQuantities.inventoryAdjustmentGroup;
  }

  // Customers
  async getCustomers(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getCustomers($first: Int!, $after: String, $query: String) {
        customers(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              email
              firstName
              lastName
              phone
              tags
              note
              addresses {
                id
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.customers;
  }

  async getCustomer(id: string) {
    const query = `
      query getCustomer($id: ID!) {
        customer(id: $id) {
          id
          email
          firstName
          lastName
          phone
          tags
          note
          addresses {
            id
            firstName
            lastName
            company
            address1
            address2
            city
            province
            country
            zip
            phone
          }
        }
      }
    `;

    const data = await this.request(query, { id });
    return data.customer;
  }

  async createCustomer(input: any) {
    const mutation = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { input });

    if (data.customerCreate.userErrors.length > 0) {
      throw new Error(`Customer creation failed: ${JSON.stringify(data.customerCreate.userErrors)}`);
    }

    return data.customerCreate.customer;
  }

  // Orders
  async getOrders(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              name
              email
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalShippingPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      sku
                    }
                  }
                }
              }
              shippingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              billingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                country
                zip
                phone
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.orders;
  }

  async getOrder(id: string) {
    const query = `
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          email
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          billingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
          }
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                quantity
                variant {
                  id
                  sku
                  price
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.request(query, { id });
    return data.order;
  }

  async getDraftOrders(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getDraftOrders($first: Int!, $after: String, $query: String) {
        draftOrders(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              name
              email
              createdAt
              note2
              tags
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    quantity
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.draftOrders;
  }

  async createDraftOrder(input: any) {
    const mutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { input });

    if (data.draftOrderCreate.userErrors.length > 0) {
      throw new Error(`Draft order creation failed: ${JSON.stringify(data.draftOrderCreate.userErrors)}`);
    }

    return data.draftOrderCreate.draftOrder;
  }

  // Collections
  async getCollections(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getCollections($first: Int!, $after: String, $query: String) {
        collections(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              title
              description
              handle
              image {
                id
                url
                altText
              }
              productsCount {
                count
              }
              seo {
                title
                description
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.collections;
  }

  async getCollection(id: string) {
    const query = `
      query getCollection($id: ID!) {
        collection(id: $id) {
          id
          title
          description
          handle
          image {
            id
            url
            altText
          }
          productsCount {
            count
          }
          seo {
            title
            description
          }
        }
      }
    `;

    const data = await this.request(query, { id });
    return data.collection;
  }

  async createCollection(input: any) {
    const mutation = `
      mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { input });

    if (data.collectionCreate.userErrors.length > 0) {
      throw new Error(`Collection creation failed: ${JSON.stringify(data.collectionCreate.userErrors)}`);
    }

    return data.collectionCreate.collection;
  }

  // Discount Codes (Coupons)
  async getDiscountCodes(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getDiscountCodes($first: Int!, $after: String, $query: String) {
        codeDiscountNodes(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  title
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  startsAt
                  endsAt
                  status
                  usageLimit
                  appliesOncePerCustomer
                  asyncUsageCount
                  customerGets {
                    value {
                      ... on DiscountPercentage {
                        percentage
                      }
                      ... on DiscountAmount {
                        amount {
                          amount
                        }
                      }
                    }
                    items {
                      ... on AllDiscountItems {
                        allItems
                      }
                    }
                  }
                  minimumRequirement {
                    ... on DiscountMinimumSubtotal {
                      greaterThanOrEqualToSubtotal {
                        amount
                      }
                    }
                  }
                }
                ... on DiscountCodeFreeShipping {
                  title
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                  startsAt
                  endsAt
                  status
                  usageLimit
                  appliesOncePerCustomer
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.codeDiscountNodes;
  }

  async createDiscountCode(input: any) {
    const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) {
                  edges {
                    node {
                      code
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { basicCodeDiscount: input });

    if (data.discountCodeBasicCreate.userErrors.length > 0) {
      throw new Error(`Discount code creation failed: ${JSON.stringify(data.discountCodeBasicCreate.userErrors)}`);
    }

    return data.discountCodeBasicCreate.codeDiscountNode;
  }

  // Product Tags
  async getProductTags(params?: {
    first?: number;
  }) {
    const { first = 250 } = params || {};

    const query = `
      query getProductTags($first: Int!) {
        shop {
          productTags(first: $first) {
            edges {
              node
            }
          }
        }
      }
    `;

    const data = await this.request(query, { first });
    return data.shop.productTags.edges.map((edge: any) => edge.node);
  }

  // Metafields (for attributes)
  async createProductMetafield(productId: string, input: any) {
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const metafields = [{
      ownerId: productId,
      namespace: input.namespace,
      key: input.key,
      value: input.value,
      type: input.type || 'single_line_text_field',
    }];

    const data = await this.request(mutation, { metafields });

    if (data.metafieldsSet.userErrors.length > 0) {
      throw new Error(`Metafield creation failed: ${JSON.stringify(data.metafieldsSet.userErrors)}`);
    }

    return data.metafieldsSet.metafields[0];
  }

  // Pages
  async getPages(params?: {
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { first = 50, after, query: searchQuery } = params || {};

    const query = `
      query getPages($first: Int!, $after: String, $query: String) {
        pages(first: $first, after: $after, query: $query) {
          edges {
            cursor
            node {
              id
              title
              body
              bodySummary
              handle
              createdAt
              updatedAt
              isPublished
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after, query: searchQuery });
    return data.pages;
  }

  async createPage(input: any) {
    const mutation = `
      mutation pageCreate($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { page: input });

    if (data.pageCreate.userErrors.length > 0) {
      throw new Error(`Page creation failed: ${JSON.stringify(data.pageCreate.userErrors)}`);
    }

    return data.pageCreate.page;
  }

  // Blog Posts (Articles)
  async getBlogs(params?: {
    first?: number;
    after?: string;
  }) {
    const { first = 50, after } = params || {};

    const query = `
      query getBlogs($first: Int!, $after: String) {
        blogs(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const data = await this.request(query, { first, after });
    return data.blogs;
  }

  async getBlogPosts(params?: {
    blogId?: string;
    first?: number;
    after?: string;
    query?: string;
  }) {
    const { blogId, first = 50, after, query: searchQuery } = params || {};

    // If no blogId provided, get the first blog
    let targetBlogId = blogId;
    if (!targetBlogId) {
      const blogs = await this.getBlogs({ first: 1 });
      targetBlogId = blogs.edges[0]?.node?.id;
      if (!targetBlogId) {
        throw new Error('No blogs found in Shopify store');
      }
    }

    const query = `
      query getBlogPosts($blogId: ID!, $first: Int!, $after: String, $query: String) {
        blog(id: $blogId) {
          articles(first: $first, after: $after, query: $query) {
            edges {
              node {
                id
                title
                handle
                content
                excerpt
                publishedAt
                createdAt
                updatedAt
                tags
                image {
                  url
                  altText
                }
                author {
                  name
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    const data = await this.request(query, { blogId: targetBlogId, first, after, query: searchQuery });
    return data.blog.articles;
  }

  async createBlogPost(input: any) {
    // First, ensure we have a blog to post to
    const blogs = await this.getBlogs({ first: 1 });
    const blogId = input.blogId || blogs.edges[0]?.node?.id;

    if (!blogId) {
      throw new Error('No blog found. Please create a blog in Shopify first.');
    }

    const mutation = `
      mutation blogPostCreate($blogId: ID!, $article: ArticleCreateInput!) {
        articleCreate(blogId: $blogId, article: $article) {
          article {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await this.request(mutation, { blogId, article: input });

    if (data.articleCreate.userErrors.length > 0) {
      throw new Error(`Blog post creation failed: ${JSON.stringify(data.articleCreate.userErrors)}`);
    }

    return data.articleCreate.article;
  }

  // Delivery Profiles (Shipping)
  async getDeliveryProfiles() {
    const query = `
      query getDeliveryProfiles {
        deliveryProfiles(first: 50) {
          edges {
            node {
              id
              name
              default
              locationGroupsCount
              profileLocationGroups {
                locationGroup {
                  id
                  locations(first: 10) {
                    edges {
                      node {
                        id
                        name
                      }
                    }
                  }
                }
                locationGroupZones(first: 10) {
                  edges {
                    node {
                      zone {
                        id
                        name
                        countries {
                          code {
                            countryCode
                          }
                          provinces {
                            code
                          }
                        }
                      }
                      methodDefinitions {
                        id
                        name
                        rateProvider {
                          ... on DeliveryRateDefinition {
                            price {
                              amount
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.request(query, {});
    return data.deliveryProfiles;
  }
}

export function createShopifyClient(config: ShopifyConfig): ShopifyClient {
  return new ShopifyClient(config);
}

