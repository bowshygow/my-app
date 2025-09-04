import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function handler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = (request as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // In Next.js 15, params is a Promise that must be awaited
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Sales Order ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching sales order:', id, 'for user:', user.userId);

    // Fetch sales order with all related data
    const salesOrder = await prisma.salesOrder.findUnique({
      where: {
        id: id,
      },
      include: {
        lineItems: true,
        factories: {
          include: {
            allocations: true,
          },
        },
        uads: {
          include: {
            lineItems: true,
            factory: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        invoices: {
          include: {
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
          },
        },
      },
    });

    // Check if user has access to this sales order
    if (salesOrder && salesOrder.createdBy !== user.userId) {
      console.log('User does not have access to sales order:', id);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!salesOrder) {
      console.log('Sales order not found:', id);
      return NextResponse.json(
        { error: 'Sales Order not found' },
        { status: 404 }
      );
    }

    console.log('Found sales order:', salesOrder.soNumber);

    return NextResponse.json({
      success: true,
      salesOrder,
    });
    
  } catch (error) {
    console.error('Error fetching sales order:', error);
    return NextResponse.json(
      { error: `Failed to fetch sales order: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
