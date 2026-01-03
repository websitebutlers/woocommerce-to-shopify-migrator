# Pages & Blog Posts - Completion Guide

## 🎯 Current Status

### ✅ COMPLETED (60%)
- ✅ WordPress client methods (`getPages`, `createPage`, `getPosts`, `createPost`)
- ✅ Shopify client methods (`getPages`, `createPage`, `getBlogPosts`, `createBlogPost`)
- ✅ WooCommerce transformers (pages & blog posts)
- ✅ Shopify transformers (pages & blog posts)
- ✅ Mapper.ts updated with page & blogPost support
- ✅ API routes created:
  - `/api/woocommerce/pages/route.ts`
  - `/api/shopify/pages/route.ts`
  - `/api/woocommerce/posts/route.ts`
  - `/api/shopify/blog-posts/route.ts`

### 🔄 REMAINING (40%)

You need to complete these 9 tasks:

1. Update single migration route (add page & blogPost cases)
2. Update bulk migration route (add page & blogPost cases)
3. Create PageList component
4. Create pages-migration layout
5. Create pages-migration page
6. Update sidebar (add Pages link)
7. Create BlogPostList component
8. Create blog-posts page (with layout)
9. Update sidebar (add Blog Posts link)

---

## Step 1: Update Single Migration Route

### File: `src/app/api/migrate/single/route.ts`

Add these cases to the switch statement where source data is fetched:

```typescript
// In the WooCommerce source section:
case 'page':
  sourceData = await client.getPage(itemId);
  break;
case 'blogPost':
  sourceData = await client.getPost(itemId);
  break;

// In the Shopify source section:
case 'page':
  const pageResult = await client.getPages({ query: `id:${itemId}` });
  sourceData = pageResult.edges[0]?.node;
  if (!sourceData) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }
  break;
case 'blogPost':
  const postResult = await client.getBlogPosts({ query: `id:${itemId}` });
  sourceData = postResult.edges[0]?.node;
  if (!sourceData) {
    return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
  }
  break;
```

Add these cases to the destination creation section:

```typescript
// In the WooCommerce destination section:
case 'page':
  result = await client.createPage(transformedData);
  destinationId = result.id.toString();
  break;
case 'blogPost':
  result = await client.createPost(transformedData);
  destinationId = result.id.toString();
  break;

// In the Shopify destination section:
case 'page':
  result = await client.createPage(transformedData);
  destinationId = result.id;
  break;
case 'blogPost':
  result = await client.createBlogPost(transformedData);
  destinationId = result.id;
  break;
```

---

## Step 2: Update Bulk Migration Route

### File: `src/app/api/migrate/bulk/route.ts`

Add the same cases as Step 1 to both the source fetching section and destination creation section.

---

## Step 3: Create PageList Component

### File: `src/components/migration/page-list.tsx`

```typescript
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
import { ArrowRight, FileText } from 'lucide-react';

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
      onSelectionChange(pages.map(p => p.id));
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
                  onCheckedChange={handleSelectAll}
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
                    onCheckedChange={(checked) => handleSelectOne(page.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{page.title}</div>
                </TableCell>
                <TableCell>
                  <code className="text-sm text-muted-foreground">{page.slug}</code>
                </TableCell>
                <TableCell>
                  <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
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
```

---

## Step 4: Create Pages Migration Layout

### File: `src/app/pages-migration/layout.tsx`

```typescript
import DashboardLayout from '../dashboard/layout';

export default DashboardLayout;
```

---

## Step 5: Create Pages Migration Page

### File: `src/app/pages-migration/page.tsx`

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PageList } from '@/components/migration/page-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadPages = async () => {
    if (!source) {
      toast.error('Please select a source platform');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(searchQuery && { search: searchQuery }),
      });

      const endpoint = source === 'woocommerce' 
        ? `/api/woocommerce/pages?${params}`
        : `/api/shopify/pages?${params}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }

      const data = await response.json();

      let transformedPages: Page[] = [];
      
      if (source === 'woocommerce') {
        transformedPages = data.data.map((p: any) => ({
          id: p.id.toString(),
          title: p.title.rendered,
          slug: p.slug,
          status: p.status === 'publish' ? 'published' : 'draft',
          updatedAt: p.modified,
        }));
      } else {
        transformedPages = data.edges.map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title,
          slug: edge.node.handle,
          status: edge.node.isPublished ? 'published' : 'draft',
          updatedAt: edge.node.updatedAt,
        }));
      }

      setPages(transformedPages);
    } catch (error) {
      console.error('Failed to load pages:', error);
      toast.error('Failed to load pages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (source) {
      loadPages();
    }
  }, [source, page]);

  const handleSearch = () => {
    setPage(1);
    loadPages();
  };

  const handleMigrateSingle = async (id: string) => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    toast.loading('Migrating page...', { id: 'migrate-single' });

    try {
      const response = await fetch('/api/migrate/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: id,
          type: 'page',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Page migrated successfully!', { id: 'migrate-single' });
        setSelectedItems('pages', selectedItems.pages.filter(pid => pid !== id));
      } else {
        toast.error(data.error || 'Migration failed', { id: 'migrate-single' });
      }
    } catch (error) {
      toast.error('Failed to migrate page', { id: 'migrate-single' });
    }
  };

  const handleMigrateBulk = async () => {
    if (!destination) {
      toast.error('Please select a destination platform');
      return;
    }

    if (selectedItems.pages.length === 0) {
      toast.error('Please select pages to migrate');
      return;
    }

    toast.loading('Starting bulk migration...', { id: 'migrate-bulk' });

    try {
      const response = await fetch('/api/migrate/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems.pages,
          type: 'page',
          source,
          destination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Migration job started for ${selectedItems.pages.length} pages`, { id: 'migrate-bulk' });
        toast.info(`Job ID: ${data.jobId}. Check progress in the dashboard.`);
        setSelectedItems('pages', []);
      } else {
        toast.error(data.error || 'Failed to start migration', { id: 'migrate-bulk' });
      }
    } catch (error) {
      toast.error('Failed to start bulk migration', { id: 'migrate-bulk' });
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
            Viewing pages from {source === 'woocommerce' ? 'WordPress' : 'Shopify'}
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
            Please select a destination platform from the header to enable migration.
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
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <PageList
        pages={pages}
        isLoading={isLoading}
        selectedIds={selectedItems.pages}
        onSelectionChange={(ids) => setSelectedItems('pages', ids)}
        onMigrateSingle={handleMigrateSingle}
        onMigrateBulk={handleMigrateBulk}
      />
    </div>
  );
}
```

---

## Step 6: Update Sidebar (Add Pages Link)

### File: `src/components/dashboard/sidebar.tsx`

Add import:
```typescript
import { FileText } from 'lucide-react';
```

Add to navigation array:
```typescript
{ name: 'Pages', href: '/pages-migration', icon: FileText },
```

---

## Step 7: Create BlogPostList Component

### File: `src/components/migration/blog-post-list.tsx`

Copy the PageList component and modify:
- Change `Page` interface to `BlogPost` with: `id, title, slug, status, excerpt, publishedAt, tags`
- Change icon from `FileText` to `FileText` or `Newspaper`
- Add tags display in the table
- Add excerpt preview (truncated)

---

## Step 8: Create Blog Posts Page

### File: `src/app/blog-posts/layout.tsx`

```typescript
import DashboardLayout from '../dashboard/layout';

export default DashboardLayout;
```

### File: `src/app/blog-posts/page.tsx`

Copy the pages-migration page and modify:
- Change API endpoints to `/api/woocommerce/posts` and `/api/shopify/blog-posts`
- Change type from 'page' to 'blogPost'
- Update interface to match BlogPost
- Update data transformation for blog posts
- Add note about Shopify requiring a blog to exist first

---

## Step 9: Update Sidebar (Add Blog Posts Link)

### File: `src/components/dashboard/sidebar.tsx`

Add import:
```typescript
import { Newspaper } from 'lucide-react';
```

Add to navigation array:
```typescript
{ name: 'Blog Posts', href: '/blog-posts', icon: Newspaper },
```

---

## 🧪 Testing Checklist

After implementation:

### Pages:
- [ ] Fetch pages from WordPress
- [ ] Fetch pages from Shopify
- [ ] Single page migration WP → Shopify
- [ ] Single page migration Shopify → WP
- [ ] Bulk page migration
- [ ] Verify HTML content migrates correctly

### Blog Posts:
- [ ] Fetch posts from WordPress
- [ ] Fetch posts from Shopify
- [ ] Single post migration WP → Shopify
- [ ] Single post migration Shopify → WP
- [ ] Bulk post migration
- [ ] Verify tags and categories migrate
- [ ] Verify featured images are referenced

---

## 🚨 Important Notes

1. **WordPress Shortcodes**: Will not work in Shopify - warn users
2. **Images**: URLs will still point to WordPress - consider image migration
3. **Shopify Blogs**: Must create a blog in Shopify before migrating posts
4. **SEO Data**: Yoast SEO data will migrate if available
5. **Route Naming**: Can't use `/pages` (Next.js conflict) - using `/pages-migration`

---

## 📝 Estimated Time

- Steps 1-2: 15 minutes (migration routes)
- Steps 3-5: 30 minutes (PageList + pages)
- Step 6: 2 minutes (sidebar)
- Steps 7-8: 30 minutes (BlogPostList + blog posts)
- Step 9: 2 minutes (sidebar)
- Testing: 20 minutes

**Total: ~1.5-2 hours**

---

## ✅ When Complete

You will have:
- ✅ Full bidirectional Pages migration
- ✅ Full bidirectional Blog Posts migration
- ✅ 4 new features total (Coupons, Reviews, Pages, Blog Posts)
- ✅ Professional migration tool ready for production

Good luck! 🚀



