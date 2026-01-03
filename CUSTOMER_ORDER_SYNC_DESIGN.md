# Customer & Order Sync Features - Design Document

## Overview

Building two new sync tools following the same pattern as Inventory Sync and Product Audit:
1. **Customer Sync** - Compare and migrate customers between platforms
2. **Order Sync** - Compare and migrate orders between platforms

## Customer Sync Feature

### Purpose
Identify customers that exist in WooCommerce but not in Shopify, and migrate them.

### Matching Logic
**Primary Match**: Email address (case-insensitive)
- Customers are uniquely identified by email
- Email is required in both platforms
- Most reliable matching field

**Secondary Match**: First Name + Last Name + Phone (if email missing)
- Fallback for edge cases
- Less reliable but better than nothing

### API Endpoints

#### 1. `/api/customers/compare` (POST)
**Purpose**: Compare customers between platforms

**Request**:
```json
{
  "sourceOfTruth": "woocommerce" | "shopify"
}
```

**Response**:
```json
{
  "differences": [
    {
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "sourceCustomerId": "123",
      "existsInSource": true,
      "existsInDestination": false,
      "sourcePlatform": "woocommerce",
      "destinationPlatform": "shopify"
    }
  ],
  "summary": {
    "sourceOfTruth": "woocommerce",
    "sourceCustomerCount": 150,
    "destinationCustomerCount": 120,
    "matchedCustomers": 120,
    "customersOnlyInSource": 30
  }
}
```

#### 2. `/api/customers/sync` (POST)
**Purpose**: Migrate customers from source to destination

**Request**:
```json
{
  "sourceOfTruth": "woocommerce",
  "customers": [
    {
      "email": "customer@example.com",
      "sourceCustomerId": "123"
    }
  ]
}
```

**Response**:
```json
{
  "results": [
    {
      "email": "customer@example.com",
      "success": true,
      "newCustomerId": "gid://shopify/Customer/123456"
    }
  ],
  "summary": {
    "total": 30,
    "succeeded": 28,
    "failed": 2
  }
}
```

### UI Page: `/customer-sync`

**Features**:
- Source of truth selector (WooCommerce or Shopify)
- "Compare Customers" button
- Results table showing customers only in source
- Checkbox selection (individual + select all)
- "Export to CSV" button
- "Sync Selected" button with confirmation
- Progress indicator during sync
- Results summary with success/failure details

## Order Sync Feature

### Purpose
Identify orders that exist in WooCommerce but not in Shopify, and migrate them.

### Matching Logic
**Primary Match**: Order Number
- Most reliable unique identifier
- Both platforms have order numbers

**Secondary Match**: Email + Total Price + Created Date
- For orders without matching order numbers
- Combination provides high confidence

### Important Considerations

**Order Migration Complexity**:
1. **Customer Dependency**: Orders reference customers - must migrate customers first
2. **Product Dependency**: Line items reference products - products must exist in destination
3. **Read-Only in Shopify**: Shopify orders are typically created through checkout, not API
4. **Draft Orders**: May need to use Draft Orders API instead of Orders API

### API Endpoints

#### 1. `/api/orders/compare` (POST)
**Purpose**: Compare orders between platforms

**Request**:
```json
{
  "sourceOfTruth": "woocommerce" | "shopify"
}
```

**Response**:
```json
{
  "differences": [
    {
      "orderNumber": "1234",
      "email": "customer@example.com",
      "totalPrice": "99.99",
      "createdAt": "2024-01-15T10:30:00Z",
      "sourceOrderId": "123",
      "existsInSource": true,
      "existsInDestination": false,
      "sourcePlatform": "woocommerce",
      "destinationPlatform": "shopify",
      "lineItemCount": 3,
      "financialStatus": "paid",
      "fulfillmentStatus": "fulfilled"
    }
  ],
  "summary": {
    "sourceOfTruth": "woocommerce",
    "sourceOrderCount": 500,
    "destinationOrderCount": 450,
    "matchedOrders": 450,
    "ordersOnlyInSource": 50
  }
}
```

#### 2. `/api/orders/sync` (POST)
**Purpose**: Migrate orders from source to destination

**Request**:
```json
{
  "sourceOfTruth": "woocommerce",
  "orders": [
    {
      "orderNumber": "1234",
      "sourceOrderId": "123"
    }
  ]
}
```

**Response**:
```json
{
  "results": [
    {
      "orderNumber": "1234",
      "success": true,
      "newOrderId": "gid://shopify/DraftOrder/123456",
      "warnings": ["Created as draft order - requires manual completion"]
    }
  ],
  "summary": {
    "total": 50,
    "succeeded": 45,
    "failed": 5
  }
}
```

### UI Page: `/order-sync`

**Features**:
- Source of truth selector (WooCommerce or Shopify)
- "Compare Orders" button
- Results table showing orders only in source
- Display: Order #, Customer Email, Total, Date, Status
- Checkbox selection (individual + select all)
- "Export to CSV" button
- "Sync Selected" button with confirmation
- Warning about draft orders
- Progress indicator during sync
- Results summary with success/failure details

## Navigation Updates

Add to sidebar under "Tools" section:
- Customer Sync (Users icon)
- Order Sync (ShoppingCart icon)

## Type Definitions

Add to `src/lib/types.ts`:

```typescript
export interface CustomerDifference {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  sourceCustomerId: string;
  existsInSource: boolean;
  existsInDestination: boolean;
  sourcePlatform: Platform;
  destinationPlatform: Platform;
}

export interface OrderDifference {
  orderNumber: string;
  email: string;
  totalPrice: string;
  createdAt: string;
  sourceOrderId: string;
  existsInSource: boolean;
  existsInDestination: boolean;
  sourcePlatform: Platform;
  destinationPlatform: Platform;
  lineItemCount: number;
  financialStatus: string;
  fulfillmentStatus: string;
}
```

## Implementation Order

1. ✅ Design document (this file)
2. Customer Sync:
   - Add type definitions
   - Create `/api/customers/compare` endpoint
   - Create `/api/customers/sync` endpoint
   - Create `/customer-sync` UI page
   - Add to navigation
3. Order Sync:
   - Add type definitions
   - Create `/api/orders/compare` endpoint
   - Create `/api/orders/sync` endpoint (with draft order support)
   - Create `/order-sync` UI page
   - Add to navigation
4. Testing with real store data

## Safety Features

Both features include:
- Dry run (compare before sync)
- Confirmation dialogs
- CSV export for records
- Progress tracking
- Detailed error messages
- Results summary

