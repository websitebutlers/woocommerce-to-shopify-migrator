"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Star, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  productId: string;
  rating: number;
  content: string;
  reviewerName: string;
  reviewerEmail: string;
  verified?: boolean;
  status: string;
  createdAt: string;
}

interface ReviewListProps {
  reviews: Review[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onExport: () => void;
  onExportAll: () => void;
}

export function ReviewList({
  reviews,
  isLoading,
  selectedIds,
  onSelectionChange,
  onExport,
  onExportAll,
}: ReviewListProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(reviews.map(r => r.id));
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

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

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

  if (reviews.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
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
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Reviews ({reviews.length})</h2>
        </div>
        <div className="flex items-center gap-2">
          {reviews.length > 0 && (
            <Button variant="outline" onClick={onExportAll}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Selected ({selectedIds.length})
            </Button>
          )}
        </div>
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
              <TableHead>Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(review.id)}
                    onCheckedChange={(checked) => handleSelectOne(review.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  {renderStars(review.rating)}
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="line-clamp-2 text-sm">
                    {review.content}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{review.reviewerName}</div>
                    <div className="text-sm text-muted-foreground">{review.reviewerEmail}</div>
                    {review.verified && (
                      <Badge variant="secondary" className="mt-1">Verified</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={review.status === 'approved' ? 'default' : 'secondary'}>
                    {review.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(review.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

