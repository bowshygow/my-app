import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateCycleDates, calculateProratedAmount } from '@/lib/utils';

async function createUADHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    const { salesOrderId, factoryId, startDate, endDate, notes, lineItems } = await request.json();

    if (!salesOrderId || !startDate || !endDate || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate sales order exists
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { lineItems: true },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: 'Sales Order not found' },
        { status: 404 }
      );
    }

    // Generate UAD number - try to get the last UAD by ID if createdAt is not available
    let lastUAD;
    try {
      lastUAD = await prisma.uAD.findFirst({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      // Fallback to ordering by ID if createdAt doesn't exist
      lastUAD = await prisma.uAD.findFirst({
        orderBy: { id: 'desc' }
      });
    }

    const nextNumber = lastUAD ? 
      parseInt(lastUAD.uadNumber?.split('-')[1] || '0') + 1 : 1;

    const uadNumber = `UAD-${nextNumber.toString().padStart(3, '0')}`;

    // Create UAD - try with uadNumber first, fallback to without it
    let uad;
    try {
      uad = await prisma.uAD.create({
        data: {
          uadNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          notes,
          soId: salesOrderId,
          factoryId: factoryId || null,
          createdBy: user.userId,
        },
      });
    } catch (error) {
      // Fallback: create without uadNumber if the field doesn't exist
      uad = await prisma.uAD.create({
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          notes,
          soId: salesOrderId,
          factoryId: factoryId || null,
          createdBy: user.userId,
        },
      });
    }

    // Create UAD line items
    for (const item of lineItems) {
      await prisma.uADLineItem.create({
        data: {
          zohoItemId: item.zohoItemId,
          productName: item.productName,
          qtyUad: item.qtyUad,
          rate: item.rate,
          uadId: uad.id,
        },
      });
    }

    // Generate invoices for the UAD period
    const invoices = await generateInvoicesForUAD(uad.id, salesOrder, user.userId);

    // Fetch complete UAD with relations
    const completeUAD = await prisma.uAD.findUnique({
      where: { id: uad.id },
      include: {
        lineItems: true,
        invoices: true,
        salesOrder: {
          include: {
            lineItems: true,
          },
        },
        factory: true,
      },
    });

    return NextResponse.json({
      success: true,
      uad: completeUAD,
      invoices,
    });
  } catch (error) {
    console.error('UAD creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create UAD' },
      { status: 500 }
    );
  }
}

async function getUADsHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if we're filtering by sales order
    const { searchParams } = new URL(request.url);
    const salesOrderId = searchParams.get('salesOrderId');

    console.log('Fetching UADs for user:', user.userId, salesOrderId ? `for sales order: ${salesOrderId}` : '');

    // Build where clause
    const whereClause: any = {
      createdBy: user.userId,
    };

    if (salesOrderId) {
      whereClause.soId = salesOrderId;
    }

    // Fetch UADs for the authenticated user
    const uads = await prisma.uAD.findMany({
      where: whereClause,
      include: {
        salesOrder: {
          select: {
            id: true,
            soNumber: true,
            customerName: true,
          },
        },
        factory: {
          select: {
            id: true,
            name: true,
          },
        },
        lineItems: true,
        invoices: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    console.log(`Found ${uads.length} UADs for user`);

    return NextResponse.json({
      success: true,
      uads,
      count: uads.length,
    });
    
  } catch (error) {
    console.error('Error fetching UADs:', error);
    return NextResponse.json(
      { error: `Failed to fetch UADs: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Generate invoices for a UAD based on billing cycles
 */
async function generateInvoicesForUAD(
  uadId: string,
  salesOrder: any,
  userId: string
): Promise<any[]> {
  const invoices: any[] = [];
  const uad = await prisma.uAD.findUnique({
    where: { id: uadId },
    include: { lineItems: true },
  });

  if (!uad) return invoices;

  // Calculate billing cycles based on the actual billing cycle type
  let cycleNumber = 0;
  let currentDate = new Date(salesOrder.startDate);
  const endDate = new Date(salesOrder.endDate);
  
  console.log(`=== INVOICE GENERATION START ===`);
  console.log(`Sales Order Start Date: ${salesOrder.startDate}`);
  console.log(`Sales Order End Date: ${salesOrder.endDate}`);
  console.log(`UAD Start Date: ${uad.startDate}`);
  console.log(`UAD End Date: ${uad.endDate}`);
  console.log(`Billing Cycle: "${salesOrder.billingCycle}"`);

  // Calculate how many cycles we need to generate
  let maxCycles = 0;
  const normalizedCycle = salesOrder.billingCycle.toLowerCase().replace('-', '').trim();
  
  switch (normalizedCycle) {
    case 'monthly':
      maxCycles = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      break;
    case 'quarterly':
      maxCycles = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 90));
      break;
    case 'halfyearly':
      maxCycles = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 180));
      break;
    case 'yearly':
      maxCycles = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      break;
    default:
      maxCycles = 12; // fallback
  }
  
  console.log(`Max cycles to generate: ${maxCycles}`);

  for (let cycleNumber = 0; cycleNumber < maxCycles; cycleNumber++) {
    console.log(`=== GENERATING CYCLE ${cycleNumber} ===`);
    
    try {
      const cycleDates = calculateCycleDates(
        new Date(salesOrder.startDate),
        cycleNumber,
        salesOrder.billingCycle as any,
        salesOrder.billingDay
      );
      
      console.log(`Cycle ${cycleNumber} dates:`, {
        start: cycleDates.start,
        end: cycleDates.end
      });

      // Check if UAD overlaps with this cycle
      if (uad.startDate <= cycleDates.end && uad.endDate >= cycleDates.start) {
        console.log(`✅ UAD overlaps with cycle ${cycleNumber}`);
        
        // Calculate invoice amount for this cycle
        let totalAmount = 0;
        const breakdown: any[] = [];

        for (const lineItem of uad.lineItems) {
          const fullAmount = lineItem.qtyUad * lineItem.rate;
          console.log(`Processing line item: ${lineItem.productName}, Full amount: ${fullAmount}`);
          
          const proration = calculateProratedAmount(
            uad.startDate,
            uad.endDate,
            cycleDates.start,
            cycleDates.end,
            fullAmount
          );
          
          // Clean debug logs
          if (proration.breakdown.reason === 'Prorated' && proration.breakdown.months) {
            console.log(`Month-by-month breakdown:`);
            proration.breakdown.months.forEach((month: any) => {
              console.log(`  ${month.year}-${month.month.toString().padStart(2, '0')}: ${month.activeDays}/${month.daysInMonth} days = ${(month.fraction * 100).toFixed(1)}% = ₹${month.amount.toFixed(2)}`);
            });
          } else {
            console.log(`Proration result: ${proration.breakdown.reason}`);
          }

          totalAmount += proration.amount;
          if (proration.breakdown) {
            breakdown.push({
              productName: lineItem.productName,
              ...proration.breakdown
            });
          }
        }

        console.log(`Total amount for cycle ${cycleNumber}: ${totalAmount}`);

        if (totalAmount > 0) {
          console.log(`Creating invoice for cycle ${cycleNumber} with amount ${totalAmount}`);
          
          const invoice = await prisma.invoice.create({
            data: {
              invoiceDate: new Date(),
              cycleStart: cycleDates.start,
              cycleEnd: cycleDates.end,
              prorated: totalAmount !== (uad.lineItems.reduce((sum: number, item: any) => sum + (item.qtyUad * item.rate), 0)),
              amount: totalAmount,
              breakdown,
              customFields: {
                factory: uad.factoryId ? 'Factory ID: ' + uad.factoryId : null,
                uad: uad.id,
              },
              soId: salesOrder.id,
              factoryId: uad.factoryId,
              uadId: uad.id,
              createdBy: userId,
            },
          });

          console.log(`✅ Invoice created: ${invoice.id}`);

          // Create invoice line items
          for (const lineItem of uad.lineItems) {
            const fullAmount = lineItem.qtyUad * lineItem.rate;
            const proration = calculateProratedAmount(
              uad.startDate,
              uad.endDate,
              cycleDates.start,
              cycleDates.end,
              fullAmount
            );

            await prisma.invoiceLineItem.create({
              data: {
                zohoItemId: lineItem.zohoItemId,
                productName: lineItem.productName,
                qty: proration.amount / lineItem.rate,
                rate: lineItem.rate,
                lineAmount: proration.amount,
                invoiceId: invoice.id,
              },
            });
          }

          invoices.push(invoice);
          console.log(`✅ Invoice line items created for invoice ${invoice.id}`);
        } else {
          console.log(`⚠️ No amount to invoice for cycle ${cycleNumber}`);
        }
      } else {
        console.log(`❌ UAD does not overlap with cycle ${cycleNumber}`);
      }
    } catch (error) {
      console.error(`❌ Error generating cycle ${cycleNumber}:`, error);
      // Continue with next cycle instead of failing completely
    }
  }
  
  console.log(`=== INVOICE GENERATION COMPLETE ===`);
  console.log(`Total invoices generated: ${invoices.length}`);

  return invoices;
}

function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

export const POST = withAuth(createUADHandler);
export const GET = withAuth(getUADsHandler);
