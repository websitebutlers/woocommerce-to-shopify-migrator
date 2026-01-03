# Data Sync Feature - Design Document

## Overview

A comprehensive sync feature that allows selecting a "source of truth" platform and syncing data to the other platform. This ensures both platforms stay in sync with the authoritative data source.

## User's Requirements

1. **Inventory Sync** (Priority 1)
   - Select WooCommerce as source of truth
   - Adjust Shopify inventory quantities to match WooCommerce
   - Sanity check to verify inventory matches

2. **Extend to All Data Types** (Priority 2)
   - Products (full product data, not just inventory)
   - Pages
   - Blog Posts
   - Coupons
   - Collections
   - Reviews (future)
   - Customers (future)
   - Orders (read-only comparison)

## Architecture

### Core Concept: "Sync" vs "Audit"

**Audit** (existing):
- Find differences between platforms
- Display what's missing or different
- User manually takes action

**Sync** (new):
- Find differences between platforms
- Display what will change
- User approves changes
- System automatically updates destination platform

### Sync Types

1. **Inventory Sync** - Update stock quantities only
2. **Product Sync** - Update full product data (name, price, description, etc.)
3. **Content Sync** - Update pages, blog posts
4. **Discount Sync** - Update coupons/discounts
5. **Collection Sync** - Update collections/categories

## Phase 1: Inventory Sync (MVP)

### What Gets Synced

For each matched product (by SKU or name):
- **Stock Quantity** - Update destination to match source
- **Stock Status** - In stock / Out of stock
- **Inventory Tracking** - Enable/disable tracking

### What Doesn't Get Synced

- Product name, description, price
- Images
- Categories, tags
- SEO data
- Variants (structure)

### User Flow

1. **Navigate to Inventory Sync page**
2. **Select source of truth** (WooCommerce or Shopify)
3. **Click "Compare Inventory"**
4. **Review differences**:
   - Products with matching SKU/name
   - Current inventory in both platforms
   - Differences highlighted
5. **Select products to sync** (or select all)
6. **Click "Sync Inventory"**
7. **Confirm action** (warning dialog)
8. **Watch progress** (real-time updates)
9. **Review results** (success/failure for each product)

### UI Components

```
┌─────────────────────────────────────────────────────────┐
│ Inventory Sync                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Source of Truth:                                        │
│ ○ WooCommerce  ○ Shopify                               │
│                                                         │
│ [Compare Inventory]                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Inventory Differences (45 products)                     │
├─────────────────────────────────────────────────────────┤
│ ☑ Select All                                           │
│                                                         │
│ ☑ Product Name          WC: 100  →  Shopify: 95  Δ -5 │
│ ☑ Another Product       WC: 50   →  Shopify: 60  Δ +10│
│ ☐ Third Product         WC: 0    →  Shopify: 5   Δ +5 │
│                                                         │
│ [Export CSV] [Sync Selected (2)]                       │
└─────────────────────────────────────────────────────────┘
```

### API Endpoints

1. **POST /api/inventory/compare**
   - Input: `{ sourceOfTruth: 'woocommerce' | 'shopify' }`
   - Output: Array of inventory differences
   - Logic: Fetch all products, match by SKU/name, compare quantities

2. **POST /api/inventory/sync**
   - Input: `{ sourceOfTruth: 'woocommerce' | 'shopify', products: [...] }`
   - Output: Sync results (success/failure per product)
   - Logic: Update inventory in destination platform

### Data Structure

```typescript
interface InventoryDifference {
  productId: string;
  name: string;
  sku: string;
  sourceQuantity: number;
  destinationQuantity: number;
  difference: number;
  sourceStatus: 'instock' | 'outofstock';
  destinationStatus: 'instock' | 'outofstock';
  sourcePlatform: Platform;
  destinationPlatform: Platform;
  sourceProductId: string;
  destinationProductId: string;
}

interface SyncResult {
  productId: string;
  name: string;
  success: boolean;
  error?: string;
  oldQuantity: number;
  newQuantity: number;
}
```

## Phase 2: Full Product Sync

### What Gets Synced

- Product name
- Description
- Price & compare at price
- SKU, barcode
- Weight
- Images
- Variants
- Categories/tags
- SEO metadata
- **AND** inventory

### Conflict Resolution

When syncing full products, conflicts may arise:
- **Strategy 1**: Source always wins (overwrite destination)
- **Strategy 2**: Show conflicts, let user choose
- **Strategy 3**: Merge (combine data intelligently)

**Recommendation**: Start with Strategy 1 (source wins)

## Phase 3: Content Sync (Pages, Blog Posts)

### Pages Sync

Match by:
- Slug (primary)
- Title (secondary)

Sync:
- Title
- Content
- Status (published/draft)
- SEO metadata

### Blog Posts Sync

Match by:
- Slug (primary)
- Title (secondary)

Sync:
- Title
- Content
- Excerpt
- Status
- Featured image
- Categories, tags
- SEO metadata

## Phase 4: Other Data Types

### Coupons/Discounts

Match by:
- Code (unique identifier)

Sync:
- Discount amount
- Type (percentage/fixed)
- Expiry date
- Usage limits
- Product restrictions

### Collections/Categories

Match by:
- Slug (primary)
- Name (secondary)

Sync:
- Name
- Description
- Image
- Product assignments
- SEO metadata

## Safety Features

### Pre-Sync Validation

1. **Connection Check** - Verify both platforms connected
2. **Backup Recommendation** - Warn user to backup first
3. **Dry Run** - Show what will change before syncing
4. **Confirmation Dialog** - Require explicit confirmation

### During Sync

1. **Progress Tracking** - Show real-time progress
2. **Error Handling** - Continue on error, log failures
3. **Rate Limiting** - Respect API rate limits
4. **Batch Processing** - Process in batches to avoid timeouts

### Post-Sync

1. **Results Summary** - Show success/failure counts
2. **Error Log** - Detailed error messages
3. **Rollback Option** - (Future) Ability to undo sync
4. **Audit Trail** - Log all sync operations

## Technical Implementation

### File Structure

```
src/
├── app/
│   ├── inventory-sync/
│   │   ├── page.tsx              # Inventory sync UI
│   │   └── layout.tsx
│   ├── product-sync/
│   │   ├── page.tsx              # Full product sync UI
│   │   └── layout.tsx
│   ├── content-sync/
│   │   ├── page.tsx              # Pages/blog posts sync UI
│   │   └── layout.tsx
│   └── api/
│       ├── inventory/
│       │   ├── compare/route.ts  # Compare inventory
│       │   └── sync/route.ts     # Sync inventory
│       ├── products/
│       │   ├── compare/route.ts  # Compare products
│       │   └── sync/route.ts     # Sync products
│       └── content/
│           ├── compare/route.ts  # Compare content
│           └── sync/route.ts     # Sync content
├── lib/
│   ├── sync/
│   │   ├── inventory.ts          # Inventory sync logic
│   │   ├── products.ts           # Product sync logic
│   │   ├── content.ts            # Content sync logic
│   │   └── matcher.ts            # Matching algorithms
│   └── types.ts                  # Add sync-related types
```

### Reusable Components

1. **SyncComparison** - Display differences table
2. **SyncProgress** - Show sync progress
3. **SyncResults** - Display sync results
4. **SourceOfTruthSelector** - Radio buttons for platform selection

## Implementation Plan

### Step 1: Inventory Sync (This Session)
- [ ] Create inventory comparison API
- [ ] Create inventory sync API
- [ ] Build inventory sync UI
- [ ] Add to sidebar navigation
- [ ] Test with real data

### Step 2: Full Product Sync
- [ ] Create product comparison API
- [ ] Create product sync API
- [ ] Build product sync UI
- [ ] Handle variants properly
- [ ] Test with real data

### Step 3: Content Sync
- [ ] Create content comparison API
- [ ] Create content sync API
- [ ] Build content sync UI
- [ ] Handle pages and blog posts
- [ ] Test with real data

### Step 4: Polish & Extend
- [ ] Add coupons sync
- [ ] Add collections sync
- [ ] Add rollback functionality
- [ ] Add audit trail
- [ ] Performance optimization

## Questions for User

1. **Inventory Sync Scope**: Should we sync ALL products or only selected ones?
2. **Conflict Handling**: What should happen if a product exists in destination but not in source?
3. **Variant Inventory**: Should we sync inventory for each variant separately?
4. **Stock Status**: Should we auto-set "out of stock" when quantity is 0?
5. **Backup**: Should we create automatic backups before syncing?

## Next Steps

1. Get user approval on design
2. Start with Inventory Sync MVP
3. Build comparison API first
4. Build sync API second
5. Build UI last
6. Test thoroughly before extending to other data types

