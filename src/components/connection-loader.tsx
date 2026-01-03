"use client";

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function ConnectionLoader() {
  const { setConnection } = useAppStore();

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await fetch('/api/connections');
        if (response.ok) {
          const data = await response.json();
          if (data.woocommerce) {
            setConnection('woocommerce', data.woocommerce);
          }
          if (data.shopify) {
            setConnection('shopify', data.shopify);
          }
        }
      } catch (error) {
        console.error('Failed to load connections:', error);
      }
    };

    loadConnections();
  }, [setConnection]);

  return null;
}

