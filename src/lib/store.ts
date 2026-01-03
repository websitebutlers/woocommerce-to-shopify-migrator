import { create } from 'zustand';
import { Platform, ConnectionConfig } from './types';

interface AppState {
  // Connection state
  connections: {
    woocommerce: ConnectionConfig | null;
    shopify: ConnectionConfig | null;
  };
  setConnection: (platform: Platform, config: ConnectionConfig | null) => void;
  
  // Migration state
  source: Platform | null;
  destination: Platform | null;
  setSource: (platform: Platform | null) => void;
  setDestination: (platform: Platform | null) => void;
  swapSourceDestination: () => void;
  
  // Selected items for migration
  selectedItems: {
    products: string[];
    customers: string[];
    orders: string[];
    collections: string[];
    coupons: string[];
    reviews: string[];
    pages: string[];
    blogPosts: string[];
    attributes: string[];
    tags: string[];
    shipping: string[];
    taxes: string[];
  };
  setSelectedItems: (type: 'products' | 'customers' | 'orders' | 'collections' | 'coupons' | 'reviews' | 'pages' | 'blogPosts' | 'attributes' | 'tags' | 'shipping' | 'taxes', ids: string[]) => void;
  clearSelectedItems: (type?: 'products' | 'customers' | 'orders' | 'collections' | 'coupons' | 'reviews' | 'pages' | 'blogPosts' | 'attributes' | 'tags' | 'shipping' | 'taxes') => void;
  
  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial connection state
  connections: {
    woocommerce: null,
    shopify: null,
  },
  setConnection: (platform, config) =>
    set((state) => ({
      connections: {
        ...state.connections,
        [platform]: config,
      },
    })),
  
  // Initial migration state
  source: null,
  destination: null,
  setSource: (platform) => set({ source: platform }),
  setDestination: (platform) => set({ destination: platform }),
  swapSourceDestination: () => {
    const { source, destination } = get();
    set({ source: destination, destination: source });
  },
  
  // Initial selected items
  selectedItems: {
    products: [],
    customers: [],
    orders: [],
    collections: [],
    coupons: [],
    reviews: [],
    pages: [],
    blogPosts: [],
    attributes: [],
    tags: [],
    shipping: [],
    taxes: [],
  },
  setSelectedItems: (type, ids) =>
    set((state) => ({
      selectedItems: {
        ...state.selectedItems,
        [type]: ids,
      },
    })),
  clearSelectedItems: (type) =>
    set((state) => {
      if (type) {
        return {
          selectedItems: {
            ...state.selectedItems,
            [type]: [],
          },
        };
      }
      return {
        selectedItems: {
          products: [],
          customers: [],
          orders: [],
          collections: [],
          coupons: [],
          reviews: [],
          pages: [],
          blogPosts: [],
          attributes: [],
          tags: [],
          shipping: [],
          taxes: [],
        },
      };
    }),
  
  // Initial UI state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

