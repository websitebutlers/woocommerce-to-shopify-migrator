# Product Attributes & Tags Implementation Guide

## Overview
This guide covers both Product Attributes (Phase 2) and Product Tags (Phase 2) as they share similar implementation patterns.

---

## PART A: Product Attributes (as Metafields)

### Migration Direction
**WooCommerce → Shopify ONLY** (one-way)

WooCommerce attributes → Shopify product metafields

### Why One-Way?
- WooCommerce attributes are complex (can have terms, variations, etc.)
- Shopify metafields are simpler key-value pairs
- Reverse migration would lose attribute structure

### Implementation Pattern

#### 1. Transformers

```typescript
// src/lib/woocommerce/transformers.ts
import { ProductAttribute } from '../types';

export function transformWooCommerceAttribute(wcAttr: any): ProductAttribute {
  return {
    id: wcAttr.id.toString(),
    name: wcAttr.name,
    slug: wcAttr.slug,
    type: wcAttr.type,
    orderBy: wcAttr.order_by,
    hasArchives: wcAttr.has_archives,
    options: [], // Would need separate API call to get terms
    platform: 'woocommerce',
    originalId: wcAttr.id.toString(),
  };
}

export function transformAttributeToShopifyMetafield(attr: ProductAttribute, productId: string): any {
  return {
    namespace: 'attributes',
    key: attr.slug,
    value: attr.name,
    type: 'single_line_text_field',
  };
}
```

#### 2. API Routes

```typescript
// src/app/api/woocommerce/attributes/route.ts
// Similar to coupons route - fetch from client.getProductAttributes()

// src/app/api/shopify/metafields/route.ts
// Use client.createProductMetafield()
```

#### 3. Component & Page

Create `attribute-list.tsx` and `attributes/page.tsx` following coupon pattern.

**Key Difference:** When migrating, user must select which products to apply attributes to.

#### 4. UI Considerations

- Show attribute name, slug, type
- Allow user to select target products
- Warn about one-way migration
- Show metafield namespace/key that will be created

---

## PART B: Product Tags

### Migration Direction
**Bidirectional** (WooCommerce ↔ Shopify)

### Implementation Pattern

#### 1. Transformers

```typescript
// src/lib/woocommerce/transformers.ts
import { Tag } from '../types';

export function transformWooCommerceTag(wcTag: any): Tag {
  return {
    id: wcTag.id.toString(),
    name: wcTag.name,
    slug: wcTag.slug,
    description: wcTag.description,
    count: wcTag.count,
    platform: 'woocommerce',
    originalId: wcTag.id.toString(),
  };
}

export function transformToWooCommerceTag(tag: Tag): any {
  return {
    name: tag.name,
    slug: tag.slug,
    description: tag.description || '',
  };
}
```

```typescript
// src/lib/shopify/transformers.ts
import { Tag } from '../types';

export function transformShopifyTag(shopifyTag: string): Tag {
  // Shopify tags are just strings
  return {
    id: shopifyTag,
    name: shopifyTag,
    slug: shopifyTag.toLowerCase().replace(/\s+/g, '-'),
    platform: 'shopify',
    originalId: shopifyTag,
  };
}

export function transformToShopifyTag(tag: Tag): string {
  return tag.name;
}
```

#### 2. API Routes

```typescript
// src/app/api/woocommerce/tags/route.ts
// Use client.getProductTags()

// src/app/api/shopify/tags/route.ts
// Use client.getProductTags() - returns array of tag strings
```

#### 3. Component

```typescript
// src/components/migration/tag-list.tsx
// Display: Tag name, slug, product count
// Actions: Single migrate, Bulk migrate
// Icon: Tag from lucide-react
```

#### 4. Page

```typescript
// src/app/tags/page.tsx
// Similar to coupons page
// Handle both WooCommerce and Shopify as source
```

#### 5. Important Note

**Tags vs Products:**
- Tags in WooCommerce are separate entities
- Tags in Shopify are part of product data
- When migrating tags, they're created as "available tags" but not automatically applied to products
- Users should migrate products (which include tags) rather than tags separately
- This page is mainly useful for:
  - Viewing all available tags
  - Bulk creating tags before product migration
  - Cleaning up unused tags

#### 6. Alternative Approach

Consider making this a "view-only" page that shows:
- All tags from source platform
- Which products use each tag
- Recommendation to migrate products instead

---

## Sidebar Updates

```typescript
import { Tag, Box } from 'lucide-react';

const navigation = [
  // ... existing
  { name: 'Attributes', href: '/attributes', icon: Box },
  { name: 'Tags', href: '/tags', icon: Tag },
];
```

---

## Testing Checklist

### Attributes
- [ ] Fetch attributes from WooCommerce
- [ ] Display attribute details
- [ ] Create metafields in Shopify
- [ ] Verify metafield appears in Shopify admin
- [ ] Test with different attribute types

### Tags
- [ ] Fetch tags from WooCommerce
- [ ] Fetch tags from Shopify
- [ ] Migrate tags WooCommerce → Shopify
- [ ] Migrate tags Shopify → WooCommerce
- [ ] Verify tag creation
- [ ] Test bulk tag creation

---

## Recommendations

1. **Attributes**: Implement as "advanced" feature with clear documentation about limitations

2. **Tags**: Consider skipping dedicated page and just ensuring tags migrate with products

3. **Priority**: Low - most users won't need these as standalone features

4. **Alternative**: Add a note in documentation that attributes/tags are included in product migration

---

## Next Steps

After implementing attributes/tags (or deciding to skip), proceed to Shipping Zones (05_SHIPPING_TAXES_GUIDE.md).

