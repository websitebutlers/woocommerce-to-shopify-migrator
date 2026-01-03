# Quick Start Guide

Get up and running with the WooCommerce ↔ Shopify Migrator in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A WooCommerce store with admin access
- A Shopify store with admin access

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env.local
```

3. **Start development server:**
```bash
npm run dev
```

4. **Open the app:**
Navigate to [http://localhost:3000](http://localhost:3000)

## First-Time Setup

### Step 1: Connect WooCommerce

1. Click **Connections** in the sidebar
2. In the WooCommerce section, enter:
   - **Store URL**: Your WooCommerce site (e.g., `https://yourstore.com`)
   - **Consumer Key**: From WooCommerce → Settings → Advanced → REST API
   - **Consumer Secret**: From the same location
3. Click **Test Connection** to verify
4. Click **Save Connection**

### Step 2: Connect Shopify

1. In the Shopify section, enter:
   - **Store Domain**: Your Shopify domain (e.g., `yourstore.myshopify.com`)
   - **Access Token**: From Shopify Admin → Apps → Develop apps
2. Click **Test Connection** to verify
3. Click **Save Connection**

### Step 3: Select Migration Direction

1. In the header, use the dropdowns to select:
   - **From**: Source platform (where data comes from)
   - **To**: Destination platform (where data goes to)
2. Use the swap button (↔) to reverse direction

### Step 4: Migrate Products

1. Click **Products** in the sidebar
2. Products from your source platform will load
3. **For single product:**
   - Click **Migrate** button on any product row
   - Wait for success notification
4. **For bulk migration:**
   - Check boxes next to products you want to migrate
   - Click **Migrate Selected** button
   - Monitor progress in real-time

## Getting API Credentials

### WooCommerce REST API

1. Log in to your WordPress admin
2. Go to **WooCommerce → Settings**
3. Click **Advanced** tab
4. Click **REST API** sub-tab
5. Click **Add key** button
6. Fill in:
   - **Description**: "Migration App"
   - **User**: Your admin user
   - **Permissions**: Read/Write
7. Click **Generate API key**
8. Copy the **Consumer key** and **Consumer secret**
9. ⚠️ Save these immediately - you won't see the secret again!

### Shopify Admin API

1. Log in to your Shopify admin
2. Go to **Apps → Develop apps**
3. Click **Create an app**
4. Enter app name (e.g., "Migration Tool")
5. Click **Configure Admin API scopes**
6. Select these scopes:
   - `read_products`
   - `write_products`
   - `read_customers`
   - `write_customers`
   - `read_orders`
   - `write_orders`
7. Click **Save**
8. Click **Install app**
9. Copy the **Admin API access token**
10. ⚠️ Save this immediately - you won't see it again!

## Common Issues

### "Connection failed"
- ✅ Check your store URL is correct (no trailing slash)
- ✅ Verify API credentials are correct
- ✅ Ensure WooCommerce REST API is enabled
- ✅ Check Shopify app has required scopes

### "Migration failed"
- ✅ Verify both platforms are connected
- ✅ Check product has required fields (name, price)
- ✅ Look at browser console for detailed errors
- ✅ Try migrating a single product first

### Products not showing
- ✅ Select a source platform in the header
- ✅ Check your connection is active
- ✅ Verify products exist in source platform
- ✅ Try refreshing the page

## What Gets Migrated

When you migrate a product, the following data is transferred:

✅ Product name and description
✅ Price and compare-at price
✅ SKU and barcode
✅ Product images
✅ Variants (size, color, etc.)
✅ Inventory quantities
✅ Categories/Collections
✅ Tags
✅ SEO metadata
✅ Custom fields/metafields

## Tips for Success

1. **Start Small**: Test with 1-2 products first
2. **Check Results**: Verify migrated products in destination
3. **Bulk Carefully**: Use bulk migration for tested product types
4. **Monitor Progress**: Watch the progress tracker for bulk jobs
5. **Keep Credentials Safe**: Never commit `.env.local` to git

## Next Steps

- Explore the dashboard to see migration statistics
- Try migrating products in both directions
- Check out the README.md for advanced features
- Review IMPLEMENTATION_SUMMARY.md for technical details

## Need Help?

- Check the browser console for errors
- Review the README.md for detailed documentation
- Open an issue on GitHub for bugs or questions

## Production Deployment

For production use:

1. Set up a proper database (PostgreSQL recommended)
2. Use Redis for the job queue
3. Add authentication for multi-user support
4. Set up monitoring and error tracking
5. Configure rate limiting
6. Use environment variables for all credentials

---

**Ready to migrate?** Start by connecting your platforms! 🚀

