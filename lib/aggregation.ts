import { prisma } from './prisma';
import { calculateProratedAmount, BillingCycle } from './utils';

export interface AggregatedUADData {
  uadId: string;
  uadName: string;
  factoryName?: string;
  startDate: Date;
  endDate: Date;
  status: string;
  lineItems: Array<{
    zohoItemId: string;
    productName: string;
    qtyUad: number; // Full quantity (never prorated)
    rate: number;
    proratedAmount: number; // Prorated price based on usage time
    breakdown: any;
  }>;
}

export interface AggregatedPeriodData {
  periodStart: Date;
  periodEnd: Date;
  periodType: 'monthly' | 'quarterly' | 'halfyearly' | 'yearly';
  uads: AggregatedUADData[];
  totalQuantity: number; // Sum of all quantities
  totalAmount: number; // Sum of all prorated amounts
  breakdown: {
    byUAD: Array<{
      uadId: string;
      uadName: string;
      quantity: number;
      amount: number;
    }>;
    byProduct: Array<{
      zohoItemId: string;
      productName: string;
      totalQuantity: number;
      totalAmount: number;
    }>;
  };
}

/**
 * Calculate aggregated data for a specific period and factory
 * This is the core function that handles automatic aggregation
 */
export async function calculateAggregatedData(
  salesOrderId: string,
  factoryId: string,
  periodStart: Date,
  periodEnd: Date,
  billingCycle: BillingCycle
): Promise<AggregatedPeriodData> {
  try {
    // console.log(`Starting aggregation for SalesOrder: ${salesOrderId}, Factory: ${factoryId}`);
    // console.log(`Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    
    // Get all UADs for this factory and sales order that overlap with the period
    // Include both Active and Draft status for now
    const uads = await prisma.uAD.findMany({
      where: {
        soId: salesOrderId,
        factoryId: factoryId,
        status: { in: ['Active', 'Draft'] }, // Include both Active and Draft UADs
        OR: [
          {
            // UAD starts before period and ends during or after period
            startDate: { lte: periodEnd },
            endDate: { gte: periodStart }
          }
        ]
      },
      include: {
        lineItems: true,
        factory: true,
        salesOrder: true
      },
      orderBy: {
        startDate: 'asc'
      }
    });

  // console.log(`Found ${uads.length} UADs for aggregation`);
  // console.log(`Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

  const aggregatedUADs: AggregatedUADData[] = [];
  const productTotals = new Map<string, { quantity: number; amount: number; productName: string }>();

  // If no UADs found, return empty data
  if (uads.length === 0) {
    // console.log('No UADs found for this period and factory');
    return {
      periodStart,
      periodEnd,
      periodType: billingCycle,
      uads: [],
      totalQuantity: 0,
      totalAmount: 0,
      breakdown: {
        byUAD: [],
        byProduct: []
      }
    };
  }

  for (let i = 0; i < uads.length; i++) {
    const uad = uads[i];
    // console.log(`Processing UAD ${uad.id} (${uad.startDate.toISOString()} to ${uad.endDate.toISOString()})`);
    
    const uadLineItems = [];
    
    for (const lineItem of uad.lineItems) {
      // Calculate prorated amount for this line item
      const fullAmount = lineItem.qtyUad * lineItem.rate;
      const proration = calculateProratedAmount(
        uad.startDate,
        uad.endDate,
        periodStart,
        periodEnd,
        fullAmount
      );

      // console.log(`  Line Item: ${lineItem.productName}`);
      // console.log(`    Full Qty: ${lineItem.qtyUad}, Rate: ${lineItem.rate}, Full Amount: ${fullAmount}`);
      // console.log(`    Prorated Amount: ${proration.amount}`);

      uadLineItems.push({
        zohoItemId: lineItem.zohoItemId,
        productName: lineItem.productName,
        qtyUad: lineItem.qtyUad, // Always show full quantity
        rate: lineItem.rate,
        proratedAmount: proration.amount, // Show prorated price
        breakdown: proration.breakdown
      });

      // Track product totals
      const productKey = lineItem.zohoItemId;
      if (!productTotals.has(productKey)) {
        productTotals.set(productKey, {
          quantity: 0,
          amount: 0,
          productName: lineItem.productName
        });
      }
      
      const productTotal = productTotals.get(productKey)!;
      productTotal.quantity += lineItem.qtyUad; // Sum quantities
      productTotal.amount += proration.amount; // Sum prorated amounts
    }

    // Only include UAD if it has any amount for this period
    const totalUADAmount = uadLineItems.reduce((sum, item) => sum + item.proratedAmount, 0);
    if (totalUADAmount > 0) {
      aggregatedUADs.push({
        uadId: uad.id,
        uadName: `UAD-${i + 1}`, // Sequential numbering: UAD-1, UAD-2, UAD-3, etc.
        factoryName: uad.factory?.name,
        startDate: uad.startDate,
        endDate: uad.endDate,
        status: uad.status,
        lineItems: uadLineItems
      });
    }
  }

  // Calculate totals
  const totalQuantity = aggregatedUADs.reduce((sum, uad) => 
    sum + uad.lineItems.reduce((uadSum, item) => uadSum + item.qtyUad, 0), 0
  );
  
  const totalAmount = aggregatedUADs.reduce((sum, uad) => 
    sum + uad.lineItems.reduce((uadSum, item) => uadSum + item.proratedAmount, 0), 0
  );

  // Build breakdown
  const byUAD = aggregatedUADs.map(uad => ({
    uadId: uad.uadId,
    uadName: uad.uadName,
    quantity: uad.lineItems.reduce((sum, item) => sum + item.qtyUad, 0),
    amount: uad.lineItems.reduce((sum, item) => sum + item.proratedAmount, 0)
  }));

  const byProduct = Array.from(productTotals.entries()).map(([zohoItemId, totals]) => ({
    zohoItemId,
    productName: totals.productName,
    totalQuantity: totals.quantity,
    totalAmount: totals.amount
  }));

  return {
    periodStart,
    periodEnd,
    periodType: billingCycle,
    uads: aggregatedUADs,
    totalQuantity,
    totalAmount,
    breakdown: {
      byUAD,
      byProduct
    }
  };
  } catch (error) {
    console.error('Error in calculateAggregatedData:', error);
    throw new Error(`Failed to calculate aggregated data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get aggregated data for all periods in a sales order
 * This function generates the complete aggregation view
 */
export async function getSalesOrderAggregation(
  salesOrderId: string,
  factoryId: string
): Promise<AggregatedPeriodData[]> {
  try {
    // console.log(`Getting sales order aggregation for SalesOrder: ${salesOrderId}, Factory: ${factoryId}`);
    
    // Get sales order details
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId }
    });

    if (!salesOrder) {
      throw new Error('Sales Order not found');
    }

    const rawBillingCycle = salesOrder.billingCycle;
    const billingCycle = rawBillingCycle.toLowerCase().trim() as BillingCycle;
    // console.log(`Billing cycle from DB: "${rawBillingCycle}" -> normalized: "${billingCycle}"`);
    
    const periods: AggregatedPeriodData[] = [];

    // Generate periods based on billing cycle
    let currentDate = new Date(salesOrder.startDate);
    const endDate = new Date(salesOrder.endDate);

  while (currentDate <= endDate) {
    let periodEnd: Date;
    
    switch (billingCycle) {
      case 'monthly':
        periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(currentDate.getMonth() / 3);
        periodEnd = new Date(currentDate.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'halfyearly':
        const half = Math.floor(currentDate.getMonth() / 6);
        periodEnd = new Date(currentDate.getFullYear(), (half + 1) * 6, 0);
        break;
      case 'yearly':
        periodEnd = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate() - 1);
        break;
      default:
        console.error(`Unsupported billing cycle: ${billingCycle}`);
        // Fallback to monthly for unsupported cycles
        periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
    }

    // Don't exceed sales order end date
    if (periodEnd > endDate) {
      periodEnd = endDate;
    }

    // Calculate aggregated data for this period
    const periodData = await calculateAggregatedData(
      salesOrderId,
      factoryId,
      currentDate,
      periodEnd,
      billingCycle
    );

    // Only include periods with data
    if (periodData.uads.length > 0) {
      periods.push(periodData);
    }

    // Move to next period
    currentDate = new Date(periodEnd);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return periods;
  } catch (error) {
    console.error('Error in getSalesOrderAggregation:', error);
    throw new Error(`Failed to get sales order aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get aggregated data for a specific period
 */
export async function getPeriodAggregation(
  salesOrderId: string,
  factoryId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<AggregatedPeriodData | null> {
  try {
    // console.log(`Getting period aggregation for SalesOrder: ${salesOrderId}, Factory: ${factoryId}`);
    
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId }
    });

    if (!salesOrder) {
      throw new Error('Sales Order not found');
    }

    const rawBillingCycle = salesOrder.billingCycle;
    const billingCycle = rawBillingCycle.toLowerCase().trim() as BillingCycle;
    
    return await calculateAggregatedData(
      salesOrderId,
      factoryId,
      periodStart,
      periodEnd,
      billingCycle
    );
  } catch (error) {
    console.error('Error in getPeriodAggregation:', error);
    throw new Error(`Failed to get period aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * AUTOMATIC AGGREGATION FUNCTION
 * Creates invoice aggregations automatically when UADs are created
 * Groups invoices by billing cycle periods
 */
export async function createAutomaticAggregation(
  uadId: string,
  salesOrder: any,
  userId: string
): Promise<void> {
  try {
    console.log(`🚀 Starting automatic aggregation for UAD: ${uadId}`);
    
    // Get all invoices for this UAD
    const uadInvoices = await prisma.invoice.findMany({
      where: { 
        uadId,
        createdBy: userId,
        externalInvoiceId: null // Only include unsynced invoices
      },
      include: {
        uad: {
          include: {
            factory: true
          }
        },
        lineItems: true
      },
      orderBy: {
        cycleStart: 'asc'
      }
    });

    if (uadInvoices.length === 0) {
      console.log(`⚠️ No invoices found for UAD: ${uadId}`);
      return;
    }

    console.log(`📊 Found ${uadInvoices.length} invoices for automatic aggregation`);

    // Group invoices by billing cycle periods
    const periodGroups = new Map<string, typeof uadInvoices>();
    
    for (const invoice of uadInvoices) {
      const periodKey = `${invoice.cycleStart.toISOString().split('T')[0]}_to_${invoice.cycleEnd.toISOString().split('T')[0]}`;
      
      if (!periodGroups.has(periodKey)) {
        periodGroups.set(periodKey, []);
      }
      periodGroups.get(periodKey)!.push(invoice);
    }

    console.log(`📅 Grouped into ${periodGroups.size} billing periods`);

    // Create aggregation for each period
    for (const [periodKey, invoices] of periodGroups.entries()) {
      const firstInvoice = invoices[0];
      const factory = firstInvoice.uad?.factory;
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      
      // Generate aggregation name
      const periodStart = new Date(Math.min(...invoices.map(inv => inv.cycleStart.getTime())));
      const periodEnd = new Date(Math.max(...invoices.map(inv => inv.cycleEnd.getTime())));
      const factoryName = factory?.name || 'Unknown Factory';
      
      const aggregationName = `Auto-Aggregation ${factoryName} ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

      // Check if aggregation already exists for this period and factory
      const existingAggregation = await prisma.invoiceAggregation.findFirst({
        where: {
          soId: salesOrder.id,
          createdBy: userId,
          customFields: {
            path: ['autoGenerated'],
            equals: true
          },
          customFields: {
            path: ['periodKey'],
            equals: periodKey
          }
        }
      });

      if (existingAggregation) {
        console.log(`✅ Aggregation already exists for period: ${periodKey}`);
        continue;
      }

      // Create new aggregation
      const aggregation = await prisma.invoiceAggregation.create({
        data: {
          name: aggregationName,
          totalAmount,
          notes: `Automatically generated for ${factoryName} - ${periodKey}`,
          soId: salesOrder.id,
          createdBy: userId,
          status: 'Ready', // Ready for sync
          customFields: {
            autoGenerated: true,
            periodKey,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            factoryId: factory?.id,
            factoryName: factory?.name,
            uadId: uadId,
            invoiceCount: invoices.length
          }
        }
      });

      console.log(`✅ Created aggregation: ${aggregation.id} for period: ${periodKey}`);

      // Link invoices to aggregation
      const aggregatedInvoiceData = invoices.map(invoice => ({
        aggregationId: aggregation.id,
        invoiceId: invoice.id
      }));

      await prisma.aggregatedInvoice.createMany({
        data: aggregatedInvoiceData
      });

      console.log(`🔗 Linked ${invoices.length} invoices to aggregation: ${aggregation.id}`);
    }

    console.log(`🎉 Automatic aggregation completed for UAD: ${uadId}`);
    
  } catch (error) {
    console.error('❌ Error in automatic aggregation:', error);
    throw new Error(`Failed to create automatic aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}