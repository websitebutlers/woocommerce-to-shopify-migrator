# Quick Start: Find Products to Delete from Shopify

## Your Situation
- WooCommerce has the correct inventory (source of truth)
- Shopify has extra products that were removed from WooCommerce
- You need a list of products to delete from Shopify

## Solution: 5-Minute Quick Start

### Step 1: Start the Application
```bash
npm run dev
```
Open http://localhost:3000

### Step 2: Verify Connections
1. Click **"Connections"** in the sidebar
2. Make sure both platforms show "Connected"
3. If not connected, add your credentials

### Step 3: Run Product Audit
1. Click **"Product Audit"** in the sidebar (under Tools)
2. Select **"WooCommerce is the source of truth"** (should be pre-selected)
3. Click **"Find Orphaned Products"**
4. Wait 1-2 minutes while it analyzes

### Step 4: Review Results
You'll see:
- **Summary**: How many products in each platform
- **Orphaned Count**: Products in Shopify but NOT in WooCommerce
- **Detailed List**: Each orphaned product with ID, name, SKU

### Step 5: Export the List
1. Click **"Export CSV"** button
2. Open the CSV file in Excel/Google Sheets
3. Review the list to confirm these are products you want to delete

### Step 6: Delete Products
You now have THREE options:

**Option A: Delete from the Tool (NEW!)**
- Click the red "Delete" button next to any product
- Confirm the deletion in the popup dialog
- Product is immediately deleted from the platform
- Product disappears from the list
- Repeat for each product you want to delete

**Option B: Manual Deletion in Platform**
- Go to Shopify Admin → Products
- Search for each product by name or SKU
- Delete individually

**Option C: Bulk Operations in Platform**
- Go to Shopify Admin → Products
- Use filters to find the products
- Select multiple products
- Click "More actions" → "Delete products"

## Example Workflow

### Before Running Audit
- WooCommerce: 150 products
- Shopify: 175 products
- Difference: 25 products (unknown which ones)

### After Running Audit
You get a CSV with 25 products:
```csv
ID,Name,SKU,Status,Platform
gid://shopify/Product/123,Old Product 1,OLD-001,ACTIVE,shopify
gid://shopify/Product/124,Old Product 2,OLD-002,ACTIVE,shopify
...
```

### After Deletion
- WooCommerce: 150 products
- Shopify: 150 products
- ✅ Inventories match!

## Important Safety Tips

1. **Review Before Deleting**
   - Always review the CSV before deleting anything
   - Check for false positives (products with different SKUs)
   - Verify these are actually products you want to remove

2. **Backup First**
   - Export your Shopify products before deleting
   - Shopify Admin → Products → Export

3. **Test with Small Batch**
   - Delete 5-10 products first
   - Verify they're the right ones
   - Then proceed with the rest

4. **No Undo**
   - Once deleted from Shopify, they're gone
   - Make sure you have backups

## Troubleshooting

### "Missing connection" Error
**Solution**: Go to Connections page and add your WooCommerce/Shopify credentials

### No Orphaned Products Found
**Meaning**: All Shopify products exist in WooCommerce - you're already in sync!

### Too Many Orphaned Products
**Possible Causes**:
- SKUs don't match between platforms
- Product names are different
- Variations counted separately

**Solution**: Review the CSV to see if the matches make sense

### Slow Performance
**Normal**: Large inventories (500+ products) take 1-2 minutes
**Wait**: Let it complete - don't refresh the page

## What Happens Behind the Scenes

1. **Fetch WooCommerce Products**
   - Gets ALL products from WooCommerce
   - Uses pagination (100 per page)
   - Stores SKUs and names

2. **Fetch Shopify Products**
   - Gets ALL products from Shopify
   - Uses cursor pagination (250 per page)
   - Stores SKUs and names

3. **Compare**
   - For each Shopify product:
     - Check if SKU exists in WooCommerce
     - Check if name exists in WooCommerce
     - If neither match → mark as orphaned

4. **Display Results**
   - Show summary statistics
   - List all orphaned products
   - Provide CSV export

## Next Steps After This Tool

Once you have the list of orphaned products:

1. **Immediate**: Delete the orphaned products from Shopify
2. **Short-term**: Set up regular audits to catch drift early
3. **Long-term**: Consider automated sync to prevent this issue

## Need Help?

Check these files for more details:
- `PRODUCT_AUDIT_FEATURE.md` - Complete feature documentation
- `SOLUTION_SUMMARY.md` - Technical details
- Server logs - Check terminal for error messages

## That's It!

You now have everything you need to:
1. Find products in Shopify that don't exist in WooCommerce
2. Get a detailed list with IDs and SKUs
3. Delete them from Shopify to sync your inventories

**Ready to start?** Just run `npm run dev` and click "Product Audit"!

