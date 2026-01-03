"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { PageList } from "@/components/migration/page-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt: string;
}

export default function PagesMigrationPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const loadPages = async () => {
    if (!source) {
      toast.error("Please select a source platform");
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const endpoint =
        source === "woocommerce"
          ? `/api/woocommerce/pages?${params}`
          : `/api/shopify/pages?${params}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }

      const data = await response.json();

      let transformedPages: Page[] = [];

      if (source === "woocommerce") {
        transformedPages = data.data.map((p: any) => ({
          id: p.id.toString(),
          title: p.title.rendered,
          slug: p.slug,
          status: p.status === "publish" ? "published" : "draft",
          updatedAt: p.modified,
        }));
      } else {
        transformedPages = data.edges.map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title,
          slug: edge.node.handle,
          status: edge.node.isPublished ? "published" : "draft",
          updatedAt: edge.node.updatedAt,
        }));
      }

      setPages(transformedPages);
    } catch (error) {
      console.error("Failed to load pages:", error);
      toast.error("Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadPages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadPages();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error("Please select a destination platform");
      return;
    }

    toast.loading("Migrating page...", { id: "migrate-single" });

    try {
      const response = await fetch("/api/migrate/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: id,
          type: "page",
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Page migrated successfully!", { id: "migrate-single" });
        setSelectedItems(
          "pages",
          selectedItems.pages.filter((pid) => pid !== id)
        );
      } else {
        toast.error(data.error || "Migration failed", { id: "migrate-single" });
      }
    } catch (error) {
      toast.error("Failed to migrate page", { id: "migrate-single" });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error("Please select a destination platform");
      return;
    }

    if (selectedItems.pages.length === 0) {
      toast.error("Please select pages to migrate");
      return;
    }

    toast.loading("Starting bulk migration...", { id: "migrate-bulk" });

    try {
      const response = await fetch("/api/migrate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedItems.pages,
          type: "page",
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Migration job started for ${selectedItems.pages.length} pages`,
          { id: "migrate-bulk" }
        );
        toast.info(
          `Job ID: ${data.jobId}. Check progress in the dashboard.`
        );
        setSelectedItems("pages", []);
      } else {
        toast.error(data.error || "Failed to start migration", {
          id: "migrate-bulk",
        });
      }
    } catch (error) {
      toast.error("Failed to start bulk migration", { id: "migrate-bulk" });
    }
  };

  if (!source) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">
            Migrate static pages between platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view pages.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground">
            Viewing pages from
            {" "}
            {source === "woocommerce" ? "WordPress" : "Shopify"}
          </p>
        </div>
        <Button onClick={loadPages} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {!destination && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a destination platform from the header to enable
            migration.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> WordPress shortcodes may not work in Shopify.
          Image URLs will still point to WordPress unless re-uploaded.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <PageList
        pages={pages}
        isLoading={isLoading}
        selectedIds={selectedItems.pages}
        onSelectionChange={(ids) => setSelectedItems("pages", ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}

