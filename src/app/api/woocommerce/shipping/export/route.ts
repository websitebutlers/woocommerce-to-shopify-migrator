import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { createWooCommerceClient } from '@/lib/woocommerce/client';
import { WooCommerceConfig } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const connection = getConnection('woocommerce');

        if (!connection || !connection.isConnected) {
            return NextResponse.json(
                { error: 'WooCommerce not connected' },
                { status: 401 }
            );
        }

        const client = createWooCommerceClient(connection.config as WooCommerceConfig);
        const { data: zones } = await client.getShippingZones();

        // Fetch locations and methods for each zone
        const zonesWithDetails = await Promise.all(zones.map(async (zone: any) => {
            const [locations, methods] = await Promise.all([
                client.getShippingZoneLocations(zone.id),
                client.getShippingZoneMethods(zone.id)
            ]);
            return { ...zone, locations, methods };
        }));

        const exportData = {
            exportedAt: new Date().toISOString(),
            source: 'WooCommerce',
            zones: zonesWithDetails
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="woocommerce-shipping-export-${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } catch (error: any) {
        console.error('Failed to export WooCommerce shipping configuration:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to export shipping configuration' },
            { status: 500 }
        );
    }
}
