import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getFactoriesHandler(request: NextRequest) {
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

    console.log('Fetching factories for user:', user.userId, salesOrderId ? `for sales order: ${salesOrderId}` : '');

    // Build where clause
    const whereClause: any = {
      createdBy: user.userId,
    };

    if (salesOrderId) {
      whereClause.soId = salesOrderId;
    }

    // Fetch factories for the authenticated user
    const factories = await prisma.factory.findMany({
      where: whereClause,
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

export const GET = withAuth(getFactoriesHandler);

async function createFactoryHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    const { name, notes, salesOrderId, allocations } = await request.json();

    if (!name || !salesOrderId || !allocations || allocations.length === 0) {
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

    // Validate allocations
    for (const allocation of allocations) {
      const lineItem = salesOrder.lineItems.find((item: any) => item.zohoItemId === allocation.zohoItemId);
      if (!lineItem) {
        return NextResponse.json(
          { error: `Product with ID ${allocation.zohoItemId} not found in sales order` },
          { status: 400 }
        );
      }
      if (allocation.qtyFactory > lineItem.qtySo) {
        return NextResponse.json(
          { error: `Factory quantity (${allocation.qtyFactory}) cannot exceed sales order quantity (${lineItem.qtySo}) for product ${lineItem.name}` },
          { status: 400 }
        );
      }
    }

    // Create factory
    const factory = await prisma.factory.create({
      data: {
        name,
        notes,
        soId: salesOrderId,
        createdBy: user.userId,
      },
    });

    // Create factory allocations
    for (const allocation of allocations) {
      await prisma.factoryAllocation.create({
        data: {
          zohoItemId: allocation.zohoItemId,
          productName: allocation.productName,
          qtyFactory: allocation.qtyFactory,
          rate: allocation.rate,
          factoryId: factory.id,
        },
      });
    }

    // Fetch complete factory with relations
    const completeFactory = await prisma.factory.findUnique({
      where: { id: factory.id },
      include: {
        allocations: true,
        salesOrder: {
          include: {
            lineItems: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      factory: completeFactory,
    });
    
  } catch (error) {
    console.error('Factory creation error:', error);
    return NextResponse.json(
      { error: `Failed to create factory: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createFactoryHandler);

