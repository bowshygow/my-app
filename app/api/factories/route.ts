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

    console.log('Fetching factories for user:', user.userId);

    // Fetch all factories for the authenticated user
    const factories = await prisma.factory.findMany({
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
        allocations: true,
        uads: true,
        invoices: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${factories.length} factories for user`);

    return NextResponse.json({
      success: true,
      factories,
      count: factories.length,
    });
    
  } catch (error) {
    console.error('Error fetching factories:', error);
    return NextResponse.json(
      { error: `Failed to fetch factories: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);

