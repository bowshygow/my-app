# Invoice Calculation Logs

This directory contains detailed logs of all invoice calculations performed by the system.

## Directory Structure

```
logs/
├── invoice-calculations/     # Detailed invoice calculation logs
│   ├── invoice-calc-2025-01-15T10-30-45-123Z-SO-abc123-UAD-def456.log
│   └── invoice-calc-2025-01-15T11-15-22-456Z-SO-xyz789-UAD-ghi012.log
└── README.md                # This file
```

## Log File Naming Convention

Log files are named using the following pattern:
```
invoice-calc-{timestamp}-SO-{salesOrderId}-UAD-{uadId}.log
```

Example: `invoice-calc-2025-01-15T10-30-45-123Z-SO-abc123-UAD-def456.log`

## Log Content Structure

Each log file contains:

### 1. **Sales Order Details**
- SO ID, start/end dates
- Billing cycle and billing day
- Currency information

### 2. **UAD Details**
- UAD ID, start/end dates
- Factory ID and notes
- Product line items with quantities and rates

### 3. **Cycle Generation Logic**
- Date analysis and first cycle calculation
- Step-by-step cycle progression

### 4. **Per-Cycle Analysis**
- Cycle start/end dates and duration
- Overlap calculations with detailed Max/Min logic
- Full vs partial cycle detection
- Month-wise breakdown for partial cycles

### 5. **Amount Calculations**
- Raw vs rounded values
- Cumulative tracking
- Detailed product-wise calculations

### 6. **Invoice Creation**
- Invoice details and line items
- Database operations

### 7. **Final Summary**
- Total cycles processed
- Total invoices generated
- Final cumulative amounts
- All generated invoice details

## Viewing Logs

### Method 1: Using the Script (Recommended)
```bash
# List all available logs
node scripts/view-invoice-logs.js

# View the most recent log
node scripts/view-invoice-logs.js 1

# View a specific log by filename
node scripts/view-invoice-logs.js invoice-calc-2025-01-15T10-30-45-123Z-SO-abc123-UAD-def456.log
```

### Method 2: Direct File Access
```bash
# Navigate to logs directory
cd logs/invoice-calculations

# List files
ls -la

# View a specific log
cat invoice-calc-2025-01-15T10-30-45-123Z-SO-abc123-UAD-def456.log
```

## Debugging Tips

1. **Check Cycle Generation**: Look for "CYCLE GENERATION LOGIC" section
2. **Verify Overlap Calculations**: Check "Overlap Calculation" entries
3. **Review Amount Calculations**: Look for "Full Cycle Check" and month-wise breakdowns
4. **Validate Final Results**: Check "FINAL SUMMARY" section

## Log Retention

- Logs are kept permanently for debugging purposes
- Consider implementing log rotation for production environments
- Logs can be safely deleted when no longer needed

## Troubleshooting

If you don't see logs being generated:

1. Check that the `logs/invoice-calculations/` directory exists
2. Verify file system permissions
3. Check console output for any file writing errors
4. Ensure the UAD creation process completed successfully

## Example Log Entry

```
[2025-01-15T10:30:45.123Z] INFO: Sales Order Details
{
  "soId": "abc123",
  "soStartDate": "2025-04-22",
  "soEndDate": "2025-08-10",
  "billingCycle": "monthly",
  "billingDay": 15,
  "currency": "INR"
}
```

This logging system provides complete transparency into the invoice calculation process, making debugging and validation much easier.
