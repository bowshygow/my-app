import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function handler(request: NextRequest) {
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

    console.log('Fetching invoices for user:', user.userId, salesOrderId ? `for sales order: ${salesOrderId}` : '');

    // Build where clause
    const whereClause: any = {
      createdBy: user.userId,
    };

    if (salesOrderId) {
      whereClause.soId = salesOrderId;
    }

    // Fetch invoices for the authenticated user
    const invoices = await prisma.invoice.findMany({
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
        uad: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          },
        },
        lineItems: true,
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });

    console.log(`Found ${invoices.length} invoices for user`);

    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length,
    });
    
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: `Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
