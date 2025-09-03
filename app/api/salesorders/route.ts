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

    console.log('Fetching sales orders for user:', user.userId);

    // Fetch all sales orders for the authenticated user
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        createdBy: user.userId,
      },
      include: {
        lineItems: true,
        factories: true,
        uads: true,
        invoices: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${salesOrders.length} sales orders for user`);

    return NextResponse.json({
      success: true,
      salesOrders,
      count: salesOrders.length,
    });
    
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    return NextResponse.json(
      { error: `Failed to fetch sales orders: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
