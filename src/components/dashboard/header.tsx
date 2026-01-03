"use client";

import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Header() {
  const { source, destination, setSource, setDestination, swapSourceDestination, connections } = useAppStore();

  const isWooCommerceConnected = connections.woocommerce?.isConnected;
  const isShopifyConnected = connections.shopify?.isConnected;

  return (
    <div className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Migration Control</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Source Platform */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Select
            value={source || ''}
            onValueChange={(value) => setSource(value as 'woocommerce' | 'shopify')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="woocommerce" disabled={!isWooCommerceConnected}>
                <div className="flex items-center gap-2">
                  WooCommerce
                  {!isWooCommerceConnected && (
                    <Badge variant="destructive" className="text-xs">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="shopify" disabled={!isShopifyConnected}>
                <div className="flex items-center gap-2">
                  Shopify
                  {!isShopifyConnected && (
                    <Badge variant="destructive" className="text-xs">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Swap Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={swapSourceDestination}
          disabled={!source || !destination}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        {/* Destination Platform */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Select
            value={destination || ''}
            onValueChange={(value) => setDestination(value as 'woocommerce' | 'shopify')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="woocommerce" disabled={!isWooCommerceConnected || source === 'woocommerce'}>
                <div className="flex items-center gap-2">
                  WooCommerce
                  {!isWooCommerceConnected && (
                    <Badge variant="destructive" className="text-xs">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="shopify" disabled={!isShopifyConnected || source === 'shopify'}>
                <div className="flex items-center gap-2">
                  Shopify
                  {!isShopifyConnected && (
                    <Badge variant="destructive" className="text-xs">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Badge variant={isWooCommerceConnected ? 'default' : 'secondary'}>
            WC: {isWooCommerceConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant={isShopifyConnected ? 'default' : 'secondary'}>
            Shopify: {isShopifyConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

