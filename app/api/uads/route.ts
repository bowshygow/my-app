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

    // Create UAD
    const uad = await prisma.uAD.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        soId: salesOrderId,
        factoryId: factoryId || null,
        createdBy: user.userId,
      },
    });

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

    console.log('Fetching UADs for user:', user.userId);

    // Fetch all UADs for the authenticated user
    const uads = await prisma.uAD.findMany({
      where: {
        createdBy: user.userId,
      },
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

  // Calculate billing cycles
  let cycleNumber = 0;
  let currentDate = new Date(salesOrder.startDate);
  const endDate = new Date(salesOrder.endDate);

  while (currentDate <= endDate) {
    const cycleDates = calculateCycleDates(
      new Date(salesOrder.startDate),
      cycleNumber,
      salesOrder.billingCycle as any,
      salesOrder.billingDay
    );

    // Check if UAD overlaps with this cycle
    if (uad.startDate <= cycleDates.end && uad.endDate >= cycleDates.start) {
      // Calculate invoice amount for this cycle
      let totalAmount = 0;
      const breakdown: any = {};

      for (const lineItem of uad.lineItems) {
        const fullAmount = lineItem.qtyUad * lineItem.rate;
        const proration = calculateProratedAmount(
          uad.startDate,
          uad.endDate,
          cycleDates.start,
          cycleDates.end,
          fullAmount
        );

        totalAmount += proration.amount;
        breakdown[lineItem.productName] = proration;
      }

      if (totalAmount > 0) {
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
      }
    }

    cycleNumber++;
    currentDate = addMonths(currentDate, 1);
  }

  return invoices;
}

function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

export const POST = withAuth(createUADHandler);
export const GET = withAuth(getUADsHandler);
