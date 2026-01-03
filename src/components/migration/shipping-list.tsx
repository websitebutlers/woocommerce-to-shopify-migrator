"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Truck, MapPin, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { ShippingZone } from '@/lib/types';

interface ShippingListProps {
    zones: ShippingZone[];
    isLoading: boolean;
}

export function ShippingList({
    zones,
    isLoading,
}: ShippingListProps) {
    const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});

    const toggleZoneLocations = (zoneId: string) => {
        setExpandedZones((prev) => ({
            ...prev,
            [zoneId]: !prev[zoneId],
        }));
    };

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (zones.length === 0) {
        return (
            <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                    <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No shipping zones found</h3>
                    <p className="text-sm text-muted-foreground">
                        Your WooCommerce store doesn't have any shipping zones configured.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                    Shipping Zones ({zones.length})
                </h2>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Zone Name</TableHead>
                            <TableHead>Locations</TableHead>
                            <TableHead>Shipping Methods</TableHead>
                            <TableHead className="text-right">Order</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {zones.map((zone) => (
                            <TableRow key={zone.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        {zone.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {zone.locations.length > 0 ? (
                                            (expandedZones[zone.id] ? zone.locations : zone.locations.slice(0, 3)).map((loc, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">
                                                    {loc.code}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Everywhere</span>
                                        )}
                                        {zone.locations.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleZoneLocations(zone.id)}
                                                className="ml-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                {expandedZones[zone.id] ? (
                                                    <>
                                                        <ChevronUp className="h-3 w-3" />
                                                        <span>Hide</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="h-3 w-3" />
                                                        <span>Show all {zone.locations.length}</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                        {zone.methods.length > 0 ? (
                                            zone.methods.map((method, i) => {
                                                const settings = method.settings || {};
                                                const entries = Object.entries(settings);

                                                return (
                                                    <div
                                                        key={i}
                                                        className="rounded-md border bg-muted/40 px-2 py-1.5"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                                <span>{method.title}</span>
                                                                {method.methodId && (
                                                                    <span className="text-[11px] text-muted-foreground">
                                                                        ({method.methodId})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {method.enabled && (
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                    Active
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {entries.length > 0 && (
                                                            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                                                {entries.map(([key, raw]) => {
                                                                    const label =
                                                                        typeof raw === 'object' && raw !== null
                                                                            ? (raw as any).label || key
                                                                            : key;
                                                                    const valueRaw =
                                                                        typeof raw === 'object' && raw !== null
                                                                            ? (raw as any).value ?? (raw as any).default ?? ''
                                                                            : raw ?? '';
                                                                    const display = String(valueRaw).trim();

                                                                    if (!display) return null;

                                                                    return (
                                                                        <div key={key} className="flex flex-col">
                                                                            <dt className="font-medium">{label}</dt>
                                                                            <dd className="truncate">{display}</dd>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </dl>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <span className="text-muted-foreground text-sm">No methods</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {zone.order}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
