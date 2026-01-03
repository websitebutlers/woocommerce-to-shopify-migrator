# Product Audit Feature - Find Orphaned Products

## Overview

The Product Audit feature helps you identify "orphaned" products - products that exist in one platform but not in the other. This is particularly useful when:

- You've removed products from one platform and want to clean up the other
- You want to verify inventory synchronization between platforms
- You need to identify products that were migrated but shouldn't have been

## Use Case: WooCommerce as Source of Truth

**Your Scenario:**
- Both stores have almost identical inventories
- Client removed some items from WooCommerce
- Client wants to remove the same items from Shopify
- WooCommerce is the current source of truth

**Solution:**
The Product Audit tool will:
1. Fetch ALL products from WooCommerce (source of truth)
2. Fetch ALL products from Shopify
3. Compare them using SKU and product name matching
4. Identify products that exist in Shopify but NOT in WooCommerce
5. Provide a list of these "orphaned" products for review

## How to Use

### Step 1: Navigate to Product Audit
- Open your migrator application
- Click on **"Product Audit"** in the sidebar (under Tools section)

### Step 2: Select Source of Truth
- Choose **"WooCommerce is the source of truth"**
- This tells the tool to find products in Shopify that don't exist in WooCommerce

### Step 3: Run the Audit
- Click **"Find Orphaned Products"**
- The tool will:
  - Fetch all products from both platforms (this may take a minute)
  - Compare them using SKU and name matching
  - Display results

### Step 4: Review Results

The audit summary will show:
- **Source of Truth**: WooCommerce (with product count)
- **Checking Platform**: Shopify (with product count)
- **Orphaned Products**: Number of products in Shopify that don't exist in WooCommerce

### Step 5: Export the List
- Click **"Export CSV"** to download a spreadsheet
- The CSV contains: ID, Name, SKU, Status, Platform
- Use this list to manually delete products from Shopify

## Matching Logic

The tool uses two methods to match products:

1. **SKU Matching** (Primary)
   - Compares product SKUs (case-insensitive)
   - Most reliable method if SKUs are consistent

2. **Name Matching** (Fallback)
   - Compares product names (case-insensitive, trimmed)
   - Used when SKU is not available or doesn't match

A product is considered "orphaned" if it exists in the destination platform but:
- No SKU match found in source platform
- No name match found in source platform

## Technical Details

### API Endpoint
- **URL**: `/api/products/find-orphaned`
- **Method**: POST
- **Body**: `{ "sourceOfTruth": "woocommerce" | "shopify" }`

### Files Created
1. **API Route**: `src/app/api/products/find-orphaned/route.ts`
   - Fetches all products from both platforms
   - Performs comparison logic
   - Returns orphaned products list

2. **UI Page**: `src/app/product-audit/page.tsx`
   - User interface for the audit tool
   - Displays results and summary
   - Provides CSV export functionality

3. **Layout**: `src/app/product-audit/layout.tsx`
   - Wraps page in dashboard layout

4. **Component**: `src/components/ui/radio-group.tsx`
   - Radio button component for selecting source of truth

5. **Navigation**: Updated `src/components/dashboard/sidebar.tsx`
   - Added "Product Audit" link under Tools section

### Performance Considerations
- Fetches ALL products from both platforms (can be slow for large inventories)
- Uses pagination to fetch products in batches
- Safety limits: 100 pages for WooCommerce, 10,000 products for Shopify
- Results are not cached (run fresh each time)

## Example Output

### Audit Summary
```
Source of Truth: WooCommerce (150 products)
Checking Platform: Shopify (175 products)
Orphaned Products: 25
```

### Orphaned Products List
```
ID: gid://shopify/Product/123456789
Name: Old Product That Was Removed
SKU: OLD-PROD-001
Status: ACTIVE
Platform: shopify
```

## Next Steps After Audit

Once you have the list of orphaned products:

1. **Review the List**
   - Verify these are actually products you want to remove
   - Check for any false positives (products with different SKUs/names)

2. **Manual Deletion** (Current Approach)
   - Use the CSV export
   - Manually delete products from Shopify admin
   - Or use Shopify bulk operations

3. **Future Enhancement** (Not Yet Implemented)
   - Bulk delete functionality directly from the tool
   - Archive instead of delete option
   - Sync recommendations

## Limitations

1. **No Automatic Deletion**
   - Tool only identifies orphaned products
   - You must manually delete them from Shopify

2. **Matching Accuracy**
   - Relies on SKU and name matching
   - Products with different SKUs/names won't match
   - Variations and bundles may cause false positives

3. **Performance**
   - Can be slow for large inventories (1000+ products)
   - No progress indicator during fetch

4. **No Undo**
   - Once you delete products in Shopify, they're gone
   - Always review the list carefully before deleting

## Troubleshooting

### "Missing connection" Error
- Ensure both WooCommerce and Shopify are connected
- Go to Connections page and verify credentials

### No Orphaned Products Found
- Great! Your inventories are in sync
- All Shopify products exist in WooCommerce

### Too Many Orphaned Products
- Review matching logic
- Check if SKUs are consistent between platforms
- Verify product names are similar

### Slow Performance
- Normal for large inventories
- Wait for the process to complete
- Consider running during off-peak hours

## Future Enhancements

Potential improvements for this feature:

1. **Bulk Delete** - Delete orphaned products directly from the tool
2. **Archive Option** - Archive instead of delete
3. **Progress Indicator** - Show progress during fetch
4. **Filtering** - Filter orphaned products by status, category, etc.
5. **Sync Recommendations** - Suggest which products to sync
6. **Scheduled Audits** - Run audits automatically on a schedule
7. **Detailed Comparison** - Show differences in product details
8. **Reverse Sync** - Option to add missing products to source platform

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify both platform connections are working
3. Test with a small subset of products first
4. Review the CSV export for any unexpected results

