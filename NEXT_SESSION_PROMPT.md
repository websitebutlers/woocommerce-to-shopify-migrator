# Next Session Prompt - Complete Pages & Blog Posts

## 📋 Copy & Paste This Into Your Next Session

---

I need help completing the Pages and Blog Posts migration features for my WooCommerce ↔ Shopify migration tool.

**Context:**
- This is a Next.js 15 (App Router) + React + TypeScript project
- Uses Shadcn/ui components and Tailwind CSS
- We've already implemented: Products, Customers, Orders, Collections, Coupons, and Reviews
- Pages & Blog Posts are 60% complete - infrastructure is done, need to finish UI

**What's Already Done (60%):**
- ✅ WordPress client methods (getPages, createPage, getPosts, createPost) in `src/lib/woocommerce/client.ts`
- ✅ Shopify client methods (getPages, createPage, getBlogPosts, createBlogPost) in `src/lib/shopify/client.ts`
- ✅ All transformer functions in `src/lib/woocommerce/transformers.ts` and `src/lib/shopify/transformers.ts`
- ✅ Mapper.ts updated with page & blogPost support
- ✅ API routes created:
  - `/api/woocommerce/pages/route.ts`
  - `/api/shopify/pages/route.ts`
  - `/api/woocommerce/posts/route.ts`
  - `/api/shopify/blog-posts/route.ts`

**What I Need (40% remaining):**

Please complete these 9 tasks following the detailed guide in `/PAGES_BLOGPOSTS_COMPLETION_GUIDE.md`:

1. **Update `/api/migrate/single/route.ts`** - Add 'page' and 'blogPost' cases
2. **Update `/api/migrate/bulk/route.ts`** - Add 'page' and 'blogPost' cases
3. **Create `/components/migration/page-list.tsx`** - PageList component (copy from guide)
4. **Create `/app/pages-migration/layout.tsx`** - Simple layout file
5. **Create `/app/pages-migration/page.tsx`** - Full pages migration page
6. **Update `/components/dashboard/sidebar.tsx`** - Add Pages link with FileText icon
7. **Create `/components/migration/blog-post-list.tsx`** - BlogPostList component
8. **Create `/app/blog-posts/layout.tsx` and `/app/blog-posts/page.tsx`** - Blog posts pages
9. **Update `/components/dashboard/sidebar.tsx`** - Add Blog Posts link with Newspaper icon

**Complete Implementation Guide:**
Everything you need is in `/PAGES_BLOGPOSTS_COMPLETION_GUIDE.md` - it contains:
- Complete code for all components (copy-paste ready)
- Exact file paths
- Step-by-step instructions
- Testing checklist
- Important notes about WordPress shortcodes and images

**Important Notes:**
- Can't use `/pages` route (Next.js conflict) - use `/pages-migration` instead
- WordPress shortcodes won't work in Shopify - add warning in UI
- Image URLs will still point to WordPress unless re-uploaded
- Shopify requires a blog to exist before creating posts

**My Goal:**
Complete all 9 tasks so I have full bidirectional migration for both Pages and Blog Posts.

**Estimated Time:** 1.5-2 hours

Please read `/PAGES_BLOGPOSTS_COMPLETION_GUIDE.md` and implement all remaining tasks step-by-step. Let me know when you're ready to start!

---

## 🎯 Alternative Quick Start (If You Want to Jump Right In)

Just say: "I need to complete Pages & Blog Posts migration. The guide is in `/PAGES_BLOGPOSTS_COMPLETION_GUIDE.md`. Please implement Steps 1-9."

---

## 📝 After Completion

When done, we'll have:
- ✅ Coupons (bidirectional)
- ✅ Reviews (WooCommerce → CSV export)
- ✅ Pages (bidirectional)
- ✅ Blog Posts (bidirectional)

**Total: 4 new migration features complete!** 🎉

---

## 💡 Pro Tip

The guide contains complete, tested code. Just copy-paste and adjust as needed. All the hard work is done - you're just assembling the pieces!



