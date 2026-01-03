"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { BlogPostList } from "@/components/migration/blog-post-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  publishedAt: string;
  tags: string[];
}

export default function BlogPostsPage() {
  const { source, destination, selectedItems, setSelectedItems } = useAppStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const loadPosts = async () => {
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
          ? `/api/woocommerce/posts?${params}`
          : `/api/shopify/blog-posts?${params}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Failed to fetch blog posts");
      }

      const data = await response.json();

      let transformedPosts: BlogPost[] = [];

      if (source === "woocommerce") {
        transformedPosts = data.data.map((p: any) => ({
          id: p.id.toString(),
          title: p.title.rendered,
          slug: p.slug,
          status: p.status === "publish" ? "published" : "draft",
          excerpt: p.excerpt?.rendered
            ? p.excerpt.rendered.replace(/<[^>]+>/g, "").slice(0, 160)
            : "",
          publishedAt: p.date,
          tags: (p.tags || []).map((t: any) => t.name || t),
        }));
      } else {
        transformedPosts = data.edges.map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title,
          slug: edge.node.handle,
          status: edge.node.publishedAt ? "published" : "draft",
          excerpt: edge.node.excerpt || "",
          publishedAt: edge.node.publishedAt || edge.node.createdAt,
          tags:
            edge.node.tags && Array.isArray(edge.node.tags)
              ? edge.node.tags
              : [],
        }));
      }

      setPosts(transformedPosts);
    } catch (error) {
      console.error("Failed to load blog posts:", error);
      toast.error("Failed to load blog posts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadPosts();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error("Please select a destination platform");
      return;
    }

    toast.loading("Migrating blog post...", { id: "migrate-single" });

    try {
      const response = await fetch("/api/migrate/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: id,
          type: "blogPost",
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Blog post migrated successfully!", {
          id: "migrate-single",
        });
        setSelectedItems(
          "blogPosts",
          selectedItems.blogPosts.filter((pid) => pid !== id)
        );
      } else {
        toast.error(data.error || "Migration failed", { id: "migrate-single" });
      }
    } catch (error) {
      toast.error("Failed to migrate blog post", { id: "migrate-single" });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error("Please select a destination platform");
      return;
    }

    if (selectedItems.blogPosts.length === 0) {
      toast.error("Please select blog posts to migrate");
      return;
    }

    toast.loading("Starting bulk migration...", { id: "migrate-bulk" });

    try {
      const response = await fetch("/api/migrate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedItems.blogPosts,
          type: "blogPost",
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Migration job started for ${selectedItems.blogPosts.length} blog posts`,
          { id: "migrate-bulk" }
        );
        toast.info(
          `Job ID: ${data.jobId}. Check progress in the dashboard.`
        );
        setSelectedItems("blogPosts", []);
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
          <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
          <p className="text-muted-foreground">
            Migrate blog content between platforms
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a source platform from the header to view blog posts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
          <p className="text-muted-foreground">
            Viewing blog posts from
            {" "}
            {source === "woocommerce" ? "WordPress" : "Shopify"}
          </p>
        </div>
        <Button onClick={loadPosts} variant="outline" size="sm">
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
          Shopify requires an existing Blog resource before posts can be
          assigned.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search blog posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <BlogPostList
        posts={posts}
        isLoading={isLoading}
        selectedIds={selectedItems.blogPosts}
        onSelectionChange={(ids) => setSelectedItems("blogPosts", ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}

