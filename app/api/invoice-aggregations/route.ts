import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch all invoice aggregations for a user
async function getAggregationsHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    const salesOrderId = searchParams.get('salesOrderId');

    const whereClause: any = {
      createdBy: user.userId,
    };

    if (salesOrderId) {
      whereClause.soId = salesOrderId;
    }

    const aggregations = await prisma.invoiceAggregation.findMany({
      where: whereClause,
      include: {
        salesOrder: {
          select: {
            id: true,
            soNumber: true,
            customerName: true,
          },
        },
        aggregatedInvoices: {
          include: {
            invoice: {
              include: {
                uad: {
                  select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                  },
                },
                factory: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                lineItems: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      aggregations,
      count: aggregations.length,
    });
  } catch (error) {
    console.error('Error fetching invoice aggregations:', error);
    return NextResponse.json(
      { error: `Failed to fetch aggregations: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST - Create new invoice aggregation
async function createAggregationHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    const { name, salesOrderId, invoiceIds, notes } = await request.json();

    if (!name || !salesOrderId || !invoiceIds || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, salesOrderId, invoiceIds' },
        { status: 400 }
      );
    }

    // Validate sales order exists
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: 'Sales Order not found' },
        { status: 404 }
      );
    }

    // Validate all invoices exist and belong to user
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        createdBy: user.userId,
        soId: salesOrderId,
        externalInvoiceId: null, // Only include unsynced invoices
      },
      include: {
        lineItems: true,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      return NextResponse.json(
        { error: 'Some invoices not found or already synced' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    // Create aggregation
    const aggregation = await prisma.invoiceAggregation.create({
      data: {
        name,
        totalAmount,
        notes,
        soId: salesOrderId,
        createdBy: user.userId,
        status: 'Ready', // Mark as ready for sync
      },
    });

    // Link invoices to aggregation
    await prisma.aggregatedInvoice.createMany({
      data: invoiceIds.map((invoiceId: string) => ({
        aggregationId: aggregation.id,
        invoiceId,
      })),
    });

    // Fetch complete aggregation with relations
    const completeAggregation = await prisma.invoiceAggregation.findUnique({
      where: { id: aggregation.id },
      include: {
        salesOrder: {
          select: {
            id: true,
            soNumber: true,
            customerName: true,
          },
        },
        aggregatedInvoices: {
          include: {
            invoice: {
              include: {
                uad: {
                  select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                  },
                },
                factory: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                lineItems: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      aggregation: completeAggregation,
    });
  } catch (error) {
    console.error('Error creating invoice aggregation:', error);
    return NextResponse.json(
      { error: `Failed to create aggregation: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAggregationsHandler);
export const POST = withAuth(createAggregationHandler);
