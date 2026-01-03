# Duplicate Detection Feature

## Overview

The duplicate detection feature helps users identify which products already exist in the destination platform, making it perfect for:
- **Partially migrated stores** - Track what's been migrated already
- **Ongoing synchronization** - Identify new products that need migration
- **Preventing duplicates** - Avoid creating duplicate products

## How It Works

### 1. Enable Duplicate Checking

On the Products page, when both source and destination platforms are selected, you'll see a toggle switch:

```
☐ Check for existing products in [Destination Platform]
```

Toggle this on to enable duplicate detection.

### 2. Matching Logic

The system checks for duplicates using two methods (in order of priority):

1. **SKU Matching** (Most Reliable)
   - Compares product SKUs between platforms
   - Case-insensitive comparison
   - If SKUs match, products are considered duplicates

2. **Name Matching** (Fallback)
   - Compares product names/titles
   - Normalized (lowercase, trimmed)
   - Used when SKU matching doesn't find a match

### 3. Visual Indicators

Each product in the list shows its sync status:

#### 🟢 Exists in Destination
- Green indicator badge
- Shows match type (SKU or name)
- Migrate button is disabled
- Product already exists in destination

#### 🟠 Not in Destination
- Orange indicator badge
- Migrate button is enabled
- Product needs to be migrated

### 4. Filtering Options

Use the filter dropdown to view:

- **All Products** - Show everything
- **Not in Destination** - Only products that need migration (🟠)
- **Exists in Destination** - Only products already migrated (🟢)

The product count updates to show filtered results: `Products (5 of 20)`

## Use Cases

### Case 1: Partial Migration Tracking
You've manually migrated some products and want to see what's left:
1. Enable duplicate checking
2. Filter by "Not in Destination"
3. See only products that still need migration

### Case 2: Preventing Duplicates
Before bulk migrating, check what already exists:
1. Enable duplicate checking
2. Review products marked as "Exists in Destination"
3. Only migrate products marked as "Not in Destination"

### Case 3: Ongoing Sync
Regularly check for new products to migrate:
1. Enable duplicate checking
2. Filter by "Not in Destination"
3. Migrate only new products

## Technical Details

### API Endpoint
`POST /api/products/check-duplicates`

**Request Body:**
```json
{
  "sourceProducts": [
    { "id": "123", "name": "Product Name", "sku": "ABC123" }
  ],
  "source": "woocommerce",
  "destination": "shopify"
}
```

**Response:**
```json
{
  "duplicateStatus": [
    {
      "id": "123",
      "isDuplicate": true,
      "matchType": "sku",
      "matchedId": "gid://shopify/Product/456"
    }
  ]
}
```

### Performance
- Fetches up to 100 WooCommerce products or 250 Shopify products for comparison
- Matching is done in-memory using Map data structures for O(1) lookups
- Results are cached in component state until refresh

## Limitations

1. **Large Catalogs**: For stores with thousands of products, only a subset is checked (first 100-250 products)
2. **Variant Matching**: Currently matches on the first variant's SKU only
3. **Name Variations**: Minor differences in product names may not be detected

## Future Enhancements

Potential improvements:
- Batch processing for large catalogs
- More sophisticated name matching (fuzzy matching)
- Variant-level duplicate detection
- Persistent duplicate status (database storage)
- Duplicate detection for customers, orders, and collections

