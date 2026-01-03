import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { WooCommerceConfig } from '../types';

export class WooCommerceClient {
  private api: WooCommerceRestApi;

  constructor(config: WooCommerceConfig) {
    this.api = new WooCommerceRestApi({
      url: config.storeUrl,
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      version: 'wc/v3',
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('system_status');
      return response.status === 200;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }

  // Products
  async getProducts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
  }) {
    try {
      const response = await this.api.get('products', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce products:', error);
      throw error;
    }
  }

  async getProduct(id: string) {
    try {
      const response = await this.api.get(`products/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce product ${id}:`, error);
      throw error;
    }
  }

  async createProduct(data: any) {
    try {
      const response = await this.api.post('products', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, data: any) {
    try {
      const response = await this.api.put(`products/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update WooCommerce product ${id}:`, error);
      throw error;
    }
  }

  async deleteProduct(id: number, force: boolean = false) {
    try {
      const response = await this.api.delete(`products/${id}`, { force });
      return response.data;
    } catch (error) {
      console.error(`Failed to delete WooCommerce product ${id}:`, error);
      throw error;
    }
  }

  async updateInventory(id: string, quantity: number, stockStatus?: 'instock' | 'outofstock') {
    try {
      const data: any = {
        stock_quantity: quantity,
        manage_stock: true,
      };

      if (stockStatus) {
        data.stock_status = stockStatus;
      } else {
        // Auto-set stock status based on quantity
        data.stock_status = quantity > 0 ? 'instock' : 'outofstock';
      }

      const response = await this.api.put(`products/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update WooCommerce inventory for product ${id}:`, error);
      throw error;
    }
  }

  // Customers
  async getCustomers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    try {
      const response = await this.api.get('customers', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce customers:', error);
      throw error;
    }
  }

  async getCustomer(id: string) {
    try {
      const response = await this.api.get(`customers/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce customer ${id}:`, error);
      throw error;
    }
  }

  async createCustomer(data: any) {
    try {
      const response = await this.api.post('customers', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, data: any) {
    try {
      const response = await this.api.put(`customers/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update WooCommerce customer ${id}:`, error);
      throw error;
    }
  }

  // Orders
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
  }) {
    try {
      const response = await this.api.get('orders', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce orders:', error);
      throw error;
    }
  }

  async getOrder(id: string) {
    try {
      const response = await this.api.get(`orders/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce order ${id}:`, error);
      throw error;
    }
  }

  async createOrder(data: any) {
    try {
      const response = await this.api.post('orders', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce order:', error);
      throw error;
    }
  }

  // Product Categories (Collections)
  async getProductCategories(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    try {
      const response = await this.api.get('products/categories', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce categories:', error);
      throw error;
    }
  }

  async getProductCategory(id: string) {
    try {
      const response = await this.api.get(`products/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce category ${id}:`, error);
      throw error;
    }
  }

  async createProductCategory(data: any) {
    try {
      const response = await this.api.post('products/categories', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce category:', error);
      throw error;
    }
  }

  async deleteProductCategory(id: number, force: boolean = false) {
    try {
      const response = await this.api.delete(`products/categories/${id}`, { force });
      return response.data;
    } catch (error) {
      console.error(`Failed to delete WooCommerce category ${id}:`, error);
      throw error;
    }
  }

  // Coupons
  async getCoupons(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    code?: string;
  }) {
    try {
      const response = await this.api.get('coupons', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce coupons:', error);
      throw error;
    }
  }

  async getCoupon(id: string) {
    try {
      const response = await this.api.get(`coupons/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce coupon ${id}:`, error);
      throw error;
    }
  }

  async createCoupon(data: any) {
    try {
      const response = await this.api.post('coupons', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce coupon:', error);
      throw error;
    }
  }

  // Product Reviews
  async getProductReviews(params?: {
    page?: number;
    per_page?: number;
    product?: string[];
  }) {
    try {
      const response = await this.api.get('products/reviews', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce reviews:', error);
      throw error;
    }
  }

  async getProductReview(id: string) {
    try {
      const response = await this.api.get(`products/reviews/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce review ${id}:`, error);
      throw error;
    }
  }

  async createProductReview(data: {
    product_id: number;
    review: string;
    reviewer: string;
    reviewer_email: string;
    rating?: number;
    verified?: boolean;
    status?: 'approved' | 'hold' | 'spam';
  }) {
    try {
      const response = await this.api.post('products/reviews', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce review:', error);
      throw error;
    }
  }

  // Product Tags
  async getProductTags(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    try {
      const response = await this.api.get('products/tags', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce tags:', error);
      throw error;
    }
  }

  async createProductTag(data: any) {
    try {
      const response = await this.api.post('products/tags', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce tag:', error);
      throw error;
    }
  }

  // Product Attributes
  async getProductAttributes(params?: {
    page?: number;
    per_page?: number;
  }) {
    try {
      const response = await this.api.get('products/attributes', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce attributes:', error);
      throw error;
    }
  }

  async createProductAttribute(data: any) {
    try {
      const response = await this.api.post('products/attributes', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce attribute:', error);
      throw error;
    }
  }

  // Shipping Zones
  async getShippingZones(params?: {
    page?: number;
    per_page?: number;
  }) {
    try {
      const response = await this.api.get('shipping/zones', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce shipping zones:', error);
      throw error;
    }
  }

  async getShippingZone(id: string) {
    try {
      const response = await this.api.get(`shipping/zones/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch WooCommerce shipping zone ${id}:`, error);
      throw error;
    }
  }

  async getShippingZoneMethods(zoneId: string) {
    try {
      const response = await this.api.get(`shipping/zones/${zoneId}/methods`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch shipping methods for zone ${zoneId}:`, error);
      throw error;
    }
  }

  async getShippingZoneLocations(zoneId: string) {
    try {
      const response = await this.api.get(`shipping/zones/${zoneId}/locations`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch shipping locations for zone ${zoneId}:`, error);
      throw error;
    }
  }

  // Tax Rates
  async getTaxRates(params?: {
    page?: number;
    per_page?: number;
    class?: string;
  }) {
    try {
      const response = await this.api.get('taxes', params);
      return {
        data: response.data,
        total: parseInt(response.headers['x-wp-total'] || '0'),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WooCommerce tax rates:', error);
      throw error;
    }
  }

  async createTaxRate(data: any) {
    try {
      const response = await this.api.post('taxes', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create WooCommerce tax rate:', error);
      throw error;
    }
  }

  // WordPress Pages (uses WordPress REST API, not WooCommerce API)
  async getPages(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    try {
      const wpUrl = (this.api as any).url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
      const queryParams = new URLSearchParams(params as any);
      const response = await fetch(`${wpUrl}/pages?${queryParams}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${(this.api as any)._opt.consumerKey}:${(this.api as any)._opt.consumerSecret}`).toString('base64')}`,
        },
      });

      const data = await response.json();
      return {
        data: data,
        total: parseInt(response.headers.get('x-wp-total') || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WordPress pages:', error);
      throw error;
    }
  }

  async getPage(id: string) {
    try {
      const wpUrl = (this.api as any).url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
      const response = await fetch(`${wpUrl}/pages/${id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${(this.api as any)._opt.consumerKey}:${(this.api as any)._opt.consumerSecret}`).toString('base64')}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch WordPress page ${id}:`, error);
      throw error;
    }
  }

  async createPage(data: any) {
    try {
      const wpUrl = (this.api as any).url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
      const response = await fetch(`${wpUrl}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${(this.api as any)._opt.consumerKey}:${(this.api as any)._opt.consumerSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to create WordPress page:', error);
      throw error;
    }
  }

  // WordPress Blog Posts (uses WordPress REST API, not WooCommerce API)
  async getPosts(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }) {
    try {
      const wpUrl = (this.api as any).url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
      const queryParams = new URLSearchParams(params as any);
      const response = await fetch(`${wpUrl}/posts?${queryParams}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${(this.api as any)._opt.consumerKey}:${(this.api as any)._opt.consumerSecret}`).toString('base64')}`,
        },
      });

      const data = await response.json();
      return {
        data: data,
        total: parseInt(response.headers.get('x-wp-total') || '0'),
      };
    } catch (error) {
      console.error('Failed to fetch WordPress posts:', error);
      throw error;
    }
  }

  async getPost(id: string) {
    try {
      const wpUrl = (this.api as any).url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
      const response = await fetch(`${wpUrl}/posts/${id}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${(this.api as any)._opt.consumerKey}:${(this.api as any)._opt.consumerSecret}`).toString('base64')}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch WordPress post ${id}:`, error);
      throw error;
    }
  }

  async createPost(data: any) {
    try {
      const wpUrl = (this.api as any).url.replace('/wp-json/wc/v3', '/wp-json/wp/v2');
      const response = await fetch(`${wpUrl}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${(this.api as any)._opt.consumerKey}:${(this.api as any)._opt.consumerSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to create WordPress post:', error);
      throw error;
    }
  }
}

export function createWooCommerceClient(config: WooCommerceConfig): WooCommerceClient {
  return new WooCommerceClient(config);
}

