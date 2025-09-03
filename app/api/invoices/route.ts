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

    console.log('Fetching invoices for user:', user.userId);

    // Fetch all invoices for the authenticated user
    const invoices = await prisma.invoice.findMany({
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
