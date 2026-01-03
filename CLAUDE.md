# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WooCommerce ↔ Shopify Migrator: A Next.js application for bidirectional data migration between WooCommerce and Shopify platforms. Supports products, customers, orders, collections, coupons, reviews, pages, and blog posts.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Data Flow Pattern

The app uses a **Universal Format** pattern for bidirectional migration:
1. Source platform data → Transform to Universal Format
2. Universal Format → Transform to Destination platform format
3. Send to destination API

Transformers are in:
- `src/lib/woocommerce/transformers.ts` - WooCommerce ↔ Universal
- `src/lib/shopify/transformers.ts` - Shopify ↔ Universal

### State Management

Zustand store (`src/lib/store.ts`) manages:
- Platform connections (WooCommerce/Shopify credentials)
- Migration direction (source/destination)
- Selected items for bulk migration
- UI loading state

### Database

SQLite via better-sqlite3 (`src/lib/db/index.ts`):
- `connections` - Platform credentials
- `migration_jobs` - Job tracking
- `migration_logs` - Per-job logging

Database auto-initializes at `./data/migrator.db`.

### Migration Queue

In-memory queue (`src/lib/migration/queue.ts`) processes bulk migrations with:
- Progress tracking per item
- Success/failure results
- Status: pending → processing → completed/failed/partial

### API Structure

All APIs under `src/app/api/`:
- `/woocommerce/*` and `/shopify/*` - Platform-specific endpoints (products, customers, orders, etc.)
- `/migrate/single` and `/migrate/bulk` - Migration endpoints
- `/migrate/status/[jobId]` - Job status polling

### Type Definitions

`src/lib/types.ts` contains all shared interfaces:
- Platform types: `Product`, `Customer`, `Order`, `Collection`, `Coupon`, etc.
- Migration types: `MigrationJob`, `MigrationResult`
- Sync types: `InventoryDifference`, `CustomerDifference`, etc.

### UI Components

- shadcn/ui components in `src/components/ui/`
- Domain components: `src/components/migration/`, `src/components/connections/`, `src/components/dashboard/`

## Environment Variables

Required in `.env.local`:
```
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxx
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
SHOPIFY_API_VERSION=2024-01
DATABASE_PATH=./data/migrator.db
```

## Key Patterns

### Adding New Entity Support

1. Add types in `src/lib/types.ts`
2. Add transformers in both `src/lib/woocommerce/transformers.ts` and `src/lib/shopify/transformers.ts`
3. Create API routes in `src/app/api/woocommerce/[entity]/` and `src/app/api/shopify/[entity]/`
4. Add UI page under `src/app/[entity]/`
5. Update store's `selectedItems` in `src/lib/store.ts`

### API Patterns

- WooCommerce uses REST API
- Shopify uses GraphQL Admin API
- Both APIs are called server-side from Next.js API routes
