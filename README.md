# WooCommerce ↔ Shopify Migrator

A powerful Next.js application that enables bidirectional data migration between WooCommerce and Shopify platforms.

## Features

### ✅ Implemented

- **Dashboard Layout**: Modern UI with left sidebar navigation using shadcn/ui components
- **Platform Connections**: 
  - WooCommerce REST API integration
  - Shopify GraphQL Admin API integration
  - Connection testing and validation
  - Secure credential storage
- **Product Migration**:
  - View products from either platform
  - Single product migration
  - Bulk product migration with job queue
  - Real-time progress tracking
  - Support for variants, images, pricing, inventory, and metafields
- **Data Transformation**: Bidirectional transformers for seamless data conversion
- **Migration Queue**: Background job processing for bulk operations
- **Error Handling**: Comprehensive validation and user feedback

### 🚧 Coming Soon

- Customer migration UI (infrastructure ready)
- Order migration UI (infrastructure ready)
- Collections/Categories migration UI (infrastructure ready)
- Migration history and logs viewer
- Dry-run mode for previewing migrations
- Advanced field mapping customization

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **UI**: React, shadcn/ui, Tailwind CSS
- **State Management**: Zustand
- **Database**: SQLite (better-sqlite3)
- **APIs**: 
  - WooCommerce REST API
  - Shopify GraphQL Admin API
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- WooCommerce store with REST API credentials
- Shopify store with Admin API access token

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd woocommerce-to-shopify-migrator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
# WooCommerce Configuration
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxx

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2024-01

# Database
DATABASE_PATH=./data/migrator.db

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Connect Platforms

1. Navigate to **Connections** from the sidebar
2. Enter your WooCommerce credentials:
   - Store URL
   - Consumer Key
   - Consumer Secret
3. Enter your Shopify credentials:
   - Store Domain (e.g., yourstore.myshopify.com)
   - Admin API Access Token
4. Test and save each connection

### 2. Select Migration Direction

Use the header controls to:
- Select **source** platform (where data comes from)
- Select **destination** platform (where data goes to)
- Swap direction with the arrow button

### 3. Migrate Products

1. Navigate to **Products**
2. View products from the source platform
3. Use search to filter products
4. **Single Migration**: Click "Migrate" on any product row
5. **Bulk Migration**: 
   - Select multiple products using checkboxes
   - Click "Migrate Selected"
   - Monitor progress in real-time

## API Credentials Setup

### WooCommerce

1. Go to **WooCommerce → Settings → Advanced → REST API**
2. Click **Add key**
3. Set description and permissions (Read/Write)
4. Copy the Consumer Key and Consumer Secret

### Shopify

1. Go to **Shopify Admin → Apps → Develop apps**
2. Click **Create an app**
3. Configure Admin API scopes:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
4. Install the app and copy the Admin API access token

## Architecture

### Directory Structure

```
/src
  /app                      # Next.js App Router
    /api                    # API routes
      /woocommerce         # WooCommerce endpoints
      /shopify             # Shopify endpoints
      /migrate             # Migration endpoints
    /dashboard            # Dashboard pages
    /products             # Product pages
    /customers            # Customer pages
    /orders               # Order pages
    /collections          # Collection pages
    /connections          # Connection management
  /components
    /ui                    # shadcn/ui components
    /dashboard            # Dashboard components
    /migration            # Migration components
    /connections          # Connection forms
  /lib
    /woocommerce          # WooCommerce client & transformers
    /shopify              # Shopify client & transformers
    /migration            # Migration logic & queue
    /db                   # Database utilities
```

### Data Flow

1. **Fetch**: Retrieve data from source platform API
2. **Transform**: Convert to universal format
3. **Validate**: Check required fields and data integrity
4. **Transform**: Convert to destination platform format
5. **Create**: Send to destination platform API
6. **Track**: Log results and update progress

## Migratable Data

### Products
- ✅ Basic info (title, description, slug/handle, status)
- ✅ Pricing (price, compare-at-price)
- ✅ Variants (options, SKU, barcode, weight, inventory)
- ✅ Images and media
- ✅ Categories/Collections
- ✅ Tags
- ✅ SEO metadata
- ✅ Metafields/custom attributes

### Customers (Infrastructure Ready)
- Contact info (name, email, phone)
- Addresses (billing, shipping)
- Customer notes
- Tags
- Metafields

### Orders (Infrastructure Ready)
- Order details (line items, quantities, prices)
- Customer information
- Shipping/billing addresses
- Order status
- Financial status
- Fulfillment status
- Notes and tags
- Discounts applied

### Collections/Categories (Infrastructure Ready)
- Name, description, handle
- Images
- SEO metadata
- Product associations

## Development

### Build for Production

```bash
npm run build
npm start
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Connection Issues

- **WooCommerce**: Ensure your store has SSL enabled and the REST API is accessible
- **Shopify**: Verify your access token has the required scopes
- Check that your store URLs are correct (no trailing slashes)

### Migration Errors

- Check the browser console for detailed error messages
- Verify both platforms are properly connected
- Ensure products have all required fields (name, price, etc.)
- Check API rate limits if bulk migrations fail

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
