# New Features Implementation Plan

## Overview
This document tracks the implementation of additional data types for migration between WooCommerce and Shopify.

## Implementation Status

### ✅ Completed Infrastructure
- [x] Added type definitions for all new data types (Coupon, Review, Page, ProductAttribute, Tag, ShippingZone, TaxRate)
- [x] Updated store to include selection state for new data types
- [x] Added WooCommerce API client methods for all new data types
- [x] Added Shopify API client methods for coupons, pages, tags, metafields, and delivery profiles

### Phase 1: Quick Wins 🚀

#### 1. Coupons/Discounts
**Status:** In Progress
**Priority:** High
**Bidirectional:** Yes

**Remaining Tasks:**
- [ ] Create transformer functions (WooCommerce ↔ Shopify)
- [ ] Add coupon API routes
- [ ] Create coupon list component
- [ ] Create coupons page
- [ ] Update sidebar navigation
- [ ] Update mapper and migration logic

**Notes:**
- WooCommerce: Full REST API support (`/wc/v3/coupons`)
- Shopify: GraphQL discount codes API
- Mapping considerations:
  - WooCommerce `percentage` → Shopify `DiscountPercentage`
  - WooCommerce `fixed_cart` → Shopify `DiscountAmount`
  - WooCommerce `fixed_product` → Shopify product-specific discounts

#### 2. Product Reviews
**Status:** Pending
**Priority:** High
**Bidirectional:** WooCommerce → Shopify only (Shopify doesn't have native reviews)

**Remaining Tasks:**
- [ ] Create transformer functions (WooCommerce → Shopify apps)
- [ ] Add review API routes
- [ ] Create review list component
- [ ] Create reviews page
- [ ] Add note about Shopify limitations
- [ ] Update sidebar navigation

**Notes:**
- WooCommerce: Native reviews API (`/wc/v3/products/reviews`)
- Shopify: No native API - would need to integrate with review apps (Judge.me, Yotpo, etc.)
- Consider implementing as "export only" feature initially

#### 3. Pages/Content
**Status:** Pending
**Priority:** Medium
**Bidirectional:** Yes

**Remaining Tasks:**
- [ ] Create transformer functions (WooCommerce ↔ Shopify)
- [ ] Add page API routes
- [ ] Create page list component
- [ ] Create pages migration page
- [ ] Update sidebar navigation

**Notes:**
- WooCommerce: WordPress Pages API
- Shopify: Pages API (GraphQL)
- Both platforms support similar page structures

### Phase 2: Enhanced Features 📈

#### 4. Product Attributes (as Metafields)
**Status:** Pending
**Priority:** Medium
**Bidirectional:** WooCommerce → Shopify

**Remaining Tasks:**
- [ ] Create transformer functions (WooCommerce → Shopify metafields)
- [ ] Add attribute API routes
- [ ] Create attribute list component
- [ ] Create attributes page
- [ ] Update sidebar navigation

**Notes:**
- WooCommerce: Product attributes API (`/wc/v3/products/attributes`)
- Shopify: Map to metafields or product options
- One-way migration (Shopify metafields → WooCommerce attributes is complex)

#### 5. Product Tags (Dedicated Page)
**Status:** Pending
**Priority:** Low
**Bidirectional:** Yes

**Remaining Tasks:**
- [ ] Create transformer functions (WooCommerce ↔ Shopify)
- [ ] Add tag API routes
- [ ] Create tag list component
- [ ] Create tags page
- [ ] Update sidebar navigation

**Notes:**
- WooCommerce: Product tags API (`/wc/v3/products/tags`)
- Shopify: Product tags (part of product data)
- Tags are already partially migrated with products

### Phase 3: Advanced 🔧

#### 6. Shipping Zones
**Status:** Pending
**Priority:** Low
**Bidirectional:** Limited (view/reference only recommended)

**Remaining Tasks:**
- [ ] Create transformer functions (with limitations)
- [ ] Add shipping API routes
- [ ] Create shipping zone list component (view-only)
- [ ] Create shipping page with warnings
- [ ] Update sidebar navigation
- [ ] Add comprehensive documentation about limitations

**Notes:**
- WooCommerce: Shipping zones API (`/wc/v3/shipping/zones`)
- Shopify: Delivery profiles (GraphQL)
- **Major differences in structure - recommend view-only or manual recreation**
- Shopify's shipping is more complex with carrier services

#### 7. Tax Rates
**Status:** Pending
**Priority:** Low
**Bidirectional:** Limited (view/reference only recommended)

**Remaining Tasks:**
- [ ] Create transformer functions (with limitations)
- [ ] Add tax API routes
- [ ] Create tax rate list component (view-only)
- [ ] Create tax page with warnings
- [ ] Update sidebar navigation
- [ ] Add comprehensive documentation about limitations

**Notes:**
- WooCommerce: Tax rates API (`/wc/v3/taxes`)
- Shopify: Tax settings (different model - often automated)
- **Different tax calculation models - recommend view-only**
- Shopify has more automated tax features (Shopify Tax, Avalara integration)

## File Structure

### New Files to Create

```
src/
├── lib/
│   ├── woocommerce/
│   │   └── transformers.ts (add new transformer functions)
│   ├── shopify/
│   │   └── transformers.ts (add new transformer functions)
│   └── migration/
│       └── mapper.ts (update with new data types)
├── components/
│   └── migration/
│       ├── coupon-list.tsx
│       ├── review-list.tsx
│       ├── page-list.tsx
│       ├── attribute-list.tsx
│       ├── tag-list.tsx
│       ├── shipping-list.tsx
│       └── tax-list.tsx
├── app/
│   ├── api/
│   │   ├── woocommerce/
│   │   │   ├── coupons/route.ts
│   │   │   ├── reviews/route.ts
│   │   │   ├── pages/route.ts
│   │   │   ├── attributes/route.ts
│   │   │   ├── tags/route.ts
│   │   │   ├── shipping/route.ts
│   │   │   └── taxes/route.ts
│   │   └── shopify/
│   │       ├── discounts/route.ts
│   │       ├── pages/route.ts
│   │       ├── tags/route.ts
│   │       ├── metafields/route.ts
│   │       └── delivery-profiles/route.ts
│   ├── coupons/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── reviews/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── pages/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── attributes/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── tags/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── shipping/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── taxes/
│       ├── page.tsx
│       └── layout.tsx
```

## Testing Checklist

For each feature:
- [ ] Test fetching data from WooCommerce
- [ ] Test fetching data from Shopify
- [ ] Test single item migration
- [ ] Test bulk migration
- [ ] Test error handling
- [ ] Test with empty data
- [ ] Test with large datasets
- [ ] Verify data integrity after migration
- [ ] Test duplicate detection (where applicable)

## Documentation Updates Needed

- [ ] Update main README.md with new features
- [ ] Update in-app documentation page
- [ ] Create feature-specific guides for complex migrations
- [ ] Add migration best practices for each data type
- [ ] Document known limitations and workarounds

## Estimated Implementation Time

- **Phase 1 (Coupons, Reviews, Pages):** 6-8 hours
- **Phase 2 (Attributes, Tags):** 3-4 hours
- **Phase 3 (Shipping, Taxes):** 4-5 hours
- **Testing & Documentation:** 3-4 hours
- **Total:** 16-21 hours

## Next Steps

1. **Immediate:** Complete coupons/discounts implementation (highest value)
2. **Short-term:** Implement reviews and pages (Phase 1 completion)
3. **Medium-term:** Add attributes and tags (Phase 2)
4. **Long-term:** Add shipping and tax viewing capabilities (Phase 3)

## Notes

- All API client methods have been added to WooCommerce and Shopify clients
- Type definitions are complete
- Store state management is ready
- Focus should be on creating UI components and API routes
- Consider implementing features incrementally to allow for testing

