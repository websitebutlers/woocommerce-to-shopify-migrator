# Inventory Sync Fix - Shopify GraphQL API Issue

## Problem

When attempting to sync inventory from WooCommerce to Shopify, the sync was failing with this error:

```
Inventory update failed: [{"field":["input","ignoreCompareQuantity"],"message":"The compareQuantity argument must be given to each quantity or ignored using ignoreCompareQuantity."}]
```

## Root Cause

The initial implementation used the `inventorySetQuantities` mutation, which requires either:
1. A `compareQuantity` parameter for optimistic locking (to prevent race conditions)
2. An `ignoreCompareQuantity` flag to bypass the check

The mutation was structured incorrectly and Shopify was rejecting it.

## Solution

Switched from `inventorySetQuantities` to `inventoryAdjustQuantities` mutation, which:
1. **Doesn't require compareQuantity** - Simpler API, no optimistic locking needed
2. **Uses delta-based updates** - Adjusts inventory by a difference rather than setting absolute values
3. **More reliable** - Better suited for sync operations where we know the target quantity

## Implementation Changes

### Before (inventorySetQuantities):
```typescript
const input = {
  reason: 'correction',
  name: 'available',
  ignoreCompareQuantity: true,  // This wasn't working correctly
  quantities: [
    {
      inventoryItemId,
      locationId,
      quantity,  // Absolute quantity
    },
  ],
};
```

### After (inventoryAdjustQuantities):
```typescript
// First, get current quantity
const currentQuantity = inventoryLevel.available || 0;
const delta = quantity - currentQuantity;

// Then adjust by delta
const input = {
  reason: 'correction',
  name: 'available',
  changes: [
    {
      inventoryItemId,
      locationId,
      delta,  // Difference to apply
    },
  ],
};
```

## Additional Improvements

1. **Fetches current inventory** - Gets the current quantity before updating
2. **Calculates delta** - Computes the difference between target and current
3. **Skips unnecessary updates** - If delta is 0, returns early without making API call
4. **More efficient** - Single query gets both inventory item ID and current quantity

## Updated Query

The new implementation uses a more comprehensive query that gets:
- Inventory item ID
- Current inventory level
- Location ID
- Current available quantity

```graphql
query getVariant($id: ID!) {
  productVariant(id: $id) {
    id
    inventoryItem {
      id
      inventoryLevels(first: 1) {
        edges {
          node {
            id
            location {
              id
            }
            available
          }
        }
      }
    }
  }
}
```

## Testing

The fix has been:
- ✅ Built successfully (TypeScript compilation passed)
- ✅ Dev server restarted with new code
- ⏳ Ready for testing with real store data

## How to Test

1. Navigate to http://localhost:3000/inventory-sync
2. Select "WooCommerce is the source of truth"
3. Click "Compare Inventory"
4. Select a few products with inventory differences
5. Click "Sync Selected"
6. Confirm the action
7. Verify the sync succeeds and inventory is updated in Shopify

## Expected Result

You should now see:
```
Sync Results
2 succeeded, 0 failed

✓ TORCH PULSE 6G LIVE RESIN THC-A DISPOSABLE PURPLE PUNCH-INDICA
  Variant: Default Title
  Updated: 15 → 13

✓ TORCH PULSE 6G LIVE RESIN THC-A DISPOSABLE PINK LEMONADE-SATIVA
  Variant: Default Title
  Updated: 15 → 12
```

## Files Modified

- `src/lib/shopify/client.ts` - Updated `updateInventory()` method to use `inventoryAdjustQuantities`

## Technical Notes

### Why inventoryAdjustQuantities is Better for Sync

1. **No race condition concerns** - We're syncing from a source of truth, not handling concurrent updates
2. **Simpler API** - Fewer required parameters
3. **Delta-based** - More intuitive for sync operations (adjust by difference)
4. **No compareQuantity needed** - Shopify handles the adjustment internally

### Shopify GraphQL Mutations Comparison

| Mutation | Use Case | Requires compareQuantity | Complexity |
|----------|----------|-------------------------|------------|
| `inventorySetQuantities` | Set absolute quantities | Yes (or ignore flag) | High |
| `inventoryAdjustQuantities` | Adjust by delta | No | Low |
| `inventoryActivate` | Enable inventory tracking | No | Low |
| `inventoryDeactivate` | Disable inventory tracking | No | Low |

For sync operations, `inventoryAdjustQuantities` is the right choice.

## References

- [Shopify GraphQL Admin API - Inventory](https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventoryAdjustQuantities)
- [Inventory Management Best Practices](https://shopify.dev/docs/apps/build/graphql/inventory-management)

---

**Status**: ✅ Fixed and ready for testing  
**Impact**: All inventory sync operations from WooCommerce to Shopify  
**Breaking Changes**: None (internal implementation change only)

