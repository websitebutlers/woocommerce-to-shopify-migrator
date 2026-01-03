"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ShippingList } from '@/components/migration/shipping-list';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ShippingZone } from '@/lib/types';

export default function ShippingPage() {
    const { source } = useAppStore();
    const [zones, setZones] = useState<ShippingZone[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadZones = async () => {
        if (source !== 'woocommerce') return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/woocommerce/shipping/zones');

            if (!response.ok) {
                throw new Error('Failed to fetch shipping zones');
            }

            const data = await response.json();
            setZones(data);
        } catch (error) {
            console.error('Failed to load shipping zones:', error);
            toast.error('Failed to load shipping zones');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (source === 'woocommerce') {
            loadZones();
        }
    }, [source]);

    const handleExport = () => {
        window.open('/api/woocommerce/shipping/export', '_blank');
        toast.success('Export started');
    };

    if (source !== 'woocommerce') {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shipping Settings</h1>
                    <p className="text-muted-foreground">
                        View and export shipping configuration
                    </p>
                </div>

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        This feature is currently designed for viewing WooCommerce shipping settings.
                        Please select <strong>WooCommerce</strong> as the source platform.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shipping Settings</h1>
                    <p className="text-muted-foreground">
                        View and export your WooCommerce shipping configuration
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadZones} variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button onClick={handleExport} variant="default" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export Configuration
                    </Button>
                </div>
            </div>

            <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    <div className="font-semibold mb-1">View-Only Feature</div>
                    <p className="mb-2">
                        Shipping zones cannot be directly migrated due to significant structural differences between WooCommerce and Shopify.
                        Use this page to view your current configuration and export it as a reference for manual setup in Shopify.
                    </p>
                    <a
                        href="https://help.shopify.com/en/manual/shipping/setting-up-and-managing-your-shipping/setting-up-shipping-zones"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline w-fit"
                    >
                        Shopify Shipping Guide <ExternalLink className="h-3 w-3" />
                    </a>
                </AlertDescription>
            </Alert>

            <ShippingList
                zones={zones}
                isLoading={isLoading}
            />
        </div>
    );
}
