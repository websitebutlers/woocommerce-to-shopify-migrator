"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, FileText } from "lucide-react";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
}

interface PageListProps {
  pages: Page[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onMigrateSingle: (id: string) => void;
  onMigrateBulk: () => void;
}

export function PageList({
  pages,
  isLoading,
  selectedIds,
  onSelectionChange,
  onMigrateSingle,
  onMigrateBulk,
}: PageListProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onSelectionChange(pages.map((p) => p.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      setSelectAll(false);
    }
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

  if (pages.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pages found</h3>
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
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Pages ({pages.length})</h2>
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
                  onCheckedChange={(value) => handleSelectAll(value as boolean)}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(page.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(page.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{page.title}</div>
                </TableCell>
                <TableCell>
                  <code className="text-sm text-muted-foreground">
                    {page.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      page.status === "published" ? "default" : "secondary"
                    }
                  >
                    {page.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(page.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMigrateSingle(page.id)}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Migrate
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

