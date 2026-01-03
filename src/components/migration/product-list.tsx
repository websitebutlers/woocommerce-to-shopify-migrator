"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight, Package, Filter } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: string;
  status: string;
  image?: string;
  variantsCount?: number;
  isDuplicate?: boolean;
  matchType?: 'sku' | 'name' | null;
}

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onMigrateSingle: (id: string) => void;
  onMigrateBulk: () => void;
  showDuplicateStatus?: boolean;
}

export function ProductList({
  products,
  isLoading,
  selectedIds,
  onSelectionChange,
  onMigrateSingle,
  onMigrateBulk,
  showDuplicateStatus = false,
}: ProductListProps) {
  const [selectAll, setSelectAll] = useState(false);
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'duplicates' | 'unique'>('all');

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(products.map(p => p.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      setSelectAll(false);
    }
  };

  // Filter products based on duplicate status
  const filteredProducts = showDuplicateStatus
    ? products.filter(product => {
        if (duplicateFilter === 'duplicates') return product.isDuplicate;
        if (duplicateFilter === 'unique') return !product.isDuplicate;
        return true;
      })
    : products;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
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

  if (products.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Products ({filteredProducts.length}{filteredProducts.length !== products.length && ` of ${products.length}`})
            </h2>
          </div>
          {showDuplicateStatus && (
            <Select value={duplicateFilter} onValueChange={(value: any) => setDuplicateFilter(value)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="unique">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                    Not in Destination
                  </div>
                </SelectItem>
                <SelectItem value="duplicates">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Exists in Destination
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={onMigrateBulk}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Migrate Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-16"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Variants</TableHead>
              {showDuplicateStatus && <TableHead>Sync Status</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  {product.image ? (
                    <div className="relative h-10 w-10 rounded overflow-hidden">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.sku || '-'}
                </TableCell>
                <TableCell>{product.price}</TableCell>
                <TableCell>
                  <Badge variant={product.status === 'publish' || product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>{product.variantsCount || 1}</TableCell>
                {showDuplicateStatus && (
                  <TableCell>
                    {product.isDuplicate ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        Exists in destination
                        {product.matchType && (
                          <span className="text-xs opacity-70">({product.matchType})</span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                        Not in destination
                      </Badge>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMigrateSingle(product.id)}
                    disabled={showDuplicateStatus && product.isDuplicate}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {showDuplicateStatus && product.isDuplicate ? 'Already Exists' : 'Migrate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

