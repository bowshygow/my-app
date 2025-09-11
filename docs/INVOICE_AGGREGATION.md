# Invoice Aggregation Feature

## Overview

The Invoice Aggregation feature allows users to combine multiple UAD (User Acceptance Document) invoices into a single invoice while maintaining full visibility of which UADs contributed to the aggregated invoice.

## Features

### 1. Create Invoice Aggregations
- Users can select multiple unsynced invoices from the same sales order
- Give the aggregation a meaningful name (e.g., "Q1 2024 ABC Corp Aggregation")
- Add optional notes for context
- System automatically calculates the total amount

### 2. UAD Visibility
- Each aggregated invoice shows exactly which UADs contributed to it
- Displays factory information for each UAD
- Shows line item breakdown for each contributing UAD
- Maintains complete audit trail

### 3. Zoho Integration
- Aggregated invoices sync to Zoho Books as a single invoice
- Custom fields indicate it's an aggregated invoice
- Line items are consolidated by product (quantities summed)
- UAD breakdown stored in custom fields for reference

### 4. Status Tracking
- **Draft**: Newly created aggregation
- **Ready**: Ready to sync to Zoho
- **Synced**: Successfully synced to Zoho Books

## Database Schema

### New Models

#### InvoiceAggregation
```prisma
model InvoiceAggregation {
  id        String   @id @default(cuid())
  name      String   // User-defined name
  status    String   @default("Draft") // Draft | Ready | Synced
  totalAmount Float
  notes     String?
  createdAt DateTime @default(now())
  syncedAt  DateTime?
  externalInvoiceId  String?   // Zoho Books invoice_id
  externalInvoiceNumber String? // e.g., "INV-000227"
  invoiceUrl         String?   // deep link to Zoho invoice
  customFields       Json?     // UAD breakdown and metadata
  
  soId      String
  salesOrder SalesOrder @relation(fields: [soId], references: [id])
  createdBy String
  user      User @relation("UserInvoiceAggregations", fields: [createdBy], references: [id])
  
  aggregatedInvoices AggregatedInvoice[]
}
```

#### AggregatedInvoice
```prisma
model AggregatedInvoice {
  id        String   @id @default(cuid())
  aggregationId String
  aggregation   InvoiceAggregation @relation(fields: [aggregationId], references: [id])
  invoiceId String
  invoice   Invoice @relation(fields: [invoiceId], references: [id])
  createdAt DateTime @default(now())
  
  @@unique([aggregationId, invoiceId])
}
```

## API Endpoints

### GET /api/invoice-aggregations
- Fetch all aggregations for the authenticated user
- Optional `salesOrderId` query parameter to filter by sales order

### POST /api/invoice-aggregations
- Create a new invoice aggregation
- Body: `{ name, salesOrderId, invoiceIds, notes }`

### POST /api/invoice-aggregations/[id]/sync
- Sync an aggregated invoice to Zoho Books
- Updates status to "Synced" and stores Zoho invoice details

## UI Pages

### /invoice-aggregations
- List all invoice aggregations
- Shows status, total amount, UAD count
- Expandable UAD breakdown
- Sync to Zoho button for ready aggregations

### /invoice-aggregations/new
- Create new aggregation form
- Sales order selection
- Invoice selection with checkboxes
- Real-time total calculation

## Usage Example

1. **Create UADs**: User creates multiple UADs for the same sales order
2. **Generate Invoices**: System automatically generates individual invoices for each UAD
3. **Create Aggregation**: User selects multiple invoices and creates an aggregation
4. **Sync to Zoho**: User syncs the aggregated invoice to Zoho Books
5. **Customer Receives**: Customer gets one combined invoice instead of multiple separate invoices

## Benefits

- **Customer Experience**: Single invoice instead of multiple separate invoices
- **Internal Tracking**: Full visibility of which UADs contributed to each invoice
- **Flexibility**: Users choose which invoices to aggregate
- **Audit Trail**: Complete history of aggregations and their components
- **Zoho Compatibility**: Works seamlessly with existing Zoho Books integration

## Technical Notes

- Only unsynced invoices can be aggregated
- Line items are automatically consolidated by product
- UAD breakdown is stored in custom fields for reference
- Aggregated invoices cannot be modified once synced to Zoho
- All aggregations are user-scoped for security

