import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET /api/churn - List all churn requests
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const churnRequests = await prisma.churnRequest.findMany({
      where: {
        createdBy: decoded.userId
      },
      include: {
        salesOrder: {
          select: {
            soNumber: true,
            customerName: true,
            billingCycle: true
          }
        },
        uad: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true
          }
        },
        churnItems: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ churnRequests });
  } catch (error) {
    console.error('Error fetching churn requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/churn - Create new churn request
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const body = await request.json();
    const {
      churnType,
      effectiveDate,
      reason,
      notes,
      soId,
      uadId,
      churnItems
    } = body;

    // Validate required fields
    if (!churnType || !effectiveDate || !soId || !uadId || !churnItems?.length) {
      return NextResponse.json({ 
        error: 'Missing required fields: churnType, effectiveDate, soId, uadId, churnItems' 
      }, { status: 400 });
    }

    // Get UAD and its line items to calculate financial impact
    const uad = await prisma.uAD.findUnique({
      where: { id: uadId },
      include: {
        lineItems: true,
        salesOrder: true
      }
    });

    if (!uad) {
      return NextResponse.json({ error: 'UAD not found' }, { status: 404 });
    }

    // Calculate financial impact
    const currentPeriodAmount = uad.lineItems.reduce((sum, item) => sum + (item.qtyUad * item.rate), 0);
    
    // Calculate new monthly amount after churn
    const totalCancelledAmount = churnItems.reduce((sum: number, item: any) => sum + (item.qtyToCancel * item.rate), 0);
    const newMonthlyAmount = currentPeriodAmount - totalCancelledAmount;

    // Calculate refund for prorated cancellations
    let refundAmount = null;
    if (churnType === 'prorated') {
      const effectiveDateObj = new Date(effectiveDate);
      const currentDate = new Date();
      const periodStart = new Date(uad.startDate);
      const periodEnd = new Date(uad.endDate);
      
      // Calculate prorated amount
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const usedDays = Math.ceil((effectiveDateObj.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = totalDays - usedDays;
      
      const proratedAmount = totalCancelledAmount * (usedDays / totalDays);
      refundAmount = totalCancelledAmount - proratedAmount;
    }

    // Create churn request
    const churnRequest = await prisma.churnRequest.create({
      data: {
        churnType,
        effectiveDate: new Date(effectiveDate),
        reason,
        notes,
        status: 'Pending',
        currentPeriodAmount,
        refundAmount,
        newMonthlyAmount,
        soId,
        uadId,
        createdBy: decoded.userId,
        churnItems: {
          create: churnItems.map((item: any) => ({
            zohoItemId: item.zohoItemId,
            productName: item.productName,
            qtyToCancel: item.qtyToCancel,
            currentQty: item.currentQty,
            rate: item.rate,
            lineAmount: item.qtyToCancel * item.rate
          }))
        }
      },
      include: {
        salesOrder: {
          select: {
            soNumber: true,
            customerName: true
          }
        },
        uad: {
          select: {
            id: true,
            startDate: true,
            endDate: true
          }
        },
        churnItems: true
      }
    });

    return NextResponse.json({ churnRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating churn request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
