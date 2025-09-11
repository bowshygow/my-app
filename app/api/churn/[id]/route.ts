import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET /api/churn/[id] - Get specific churn request
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const churnRequest = await prisma.churnRequest.findUnique({
      where: {
        id: params.id,
        createdBy: decoded.userId
      },
      include: {
        salesOrder: {
          select: {
            soNumber: true,
            customerName: true,
            billingCycle: true,
            startDate: true,
            endDate: true
          }
        },
        uad: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            lineItems: true
          }
        },
        churnItems: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!churnRequest) {
      return NextResponse.json({ error: 'Churn request not found' }, { status: 404 });
    }

    return NextResponse.json({ churnRequest });
  } catch (error) {
    console.error('Error fetching churn request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/churn/[id] - Update churn request (approve, process, cancel)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const body = await request.json();
    const { action, notes } = body; // action: 'approve', 'process', 'cancel'

    const churnRequest = await prisma.churnRequest.findUnique({
      where: {
        id: params.id,
        createdBy: decoded.userId
      },
      include: {
        uad: {
          include: {
            lineItems: true
          }
        },
        churnItems: true
      }
    });

    if (!churnRequest) {
      return NextResponse.json({ error: 'Churn request not found' }, { status: 404 });
    }

    let updatedChurnRequest;

    switch (action) {
      case 'approve':
        if (churnRequest.status !== 'Pending') {
          return NextResponse.json({ 
            error: 'Only pending churn requests can be approved' 
          }, { status: 400 });
        }
        
        updatedChurnRequest = await prisma.churnRequest.update({
          where: { id: params.id },
          data: { 
            status: 'Approved',
            notes: notes || churnRequest.notes
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
        break;

      case 'process':
        if (churnRequest.status !== 'Approved') {
          return NextResponse.json({ 
            error: 'Only approved churn requests can be processed' 
          }, { status: 400 });
        }

        // Process the churn - update UAD line items
        await prisma.$transaction(async (tx) => {
          // Update UAD line items to reflect cancelled quantities
          for (const churnItem of churnRequest.churnItems) {
            const uadLineItem = churnRequest.uad.lineItems.find(
              item => item.zohoItemId === churnItem.zohoItemId
            );
            
            if (uadLineItem) {
              const newQty = uadLineItem.qtyUad - churnItem.qtyToCancel;
              
              if (newQty <= 0) {
                // Remove the line item if quantity becomes 0 or negative
                await tx.uADLineItem.delete({
                  where: { id: uadLineItem.id }
                });
              } else {
                // Update the quantity
                await tx.uADLineItem.update({
                  where: { id: uadLineItem.id },
                  data: { qtyUad: newQty }
                });
              }
            }
          }

          // Check if all line items are cancelled, if so, end the UAD
          const remainingLineItems = await tx.uADLineItem.findMany({
            where: { uadId: churnRequest.uadId }
          });

          if (remainingLineItems.length === 0) {
            await tx.uAD.update({
              where: { id: churnRequest.uadId },
              data: { 
                status: 'Ended',
                endDate: churnRequest.effectiveDate
              }
            });
          }

          // Update churn request status
          updatedChurnRequest = await tx.churnRequest.update({
            where: { id: params.id },
            data: { 
              status: 'Processed',
              processedAt: new Date(),
              notes: notes || churnRequest.notes
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
        });
        break;

      case 'cancel':
        if (churnRequest.status === 'Processed') {
          return NextResponse.json({ 
            error: 'Processed churn requests cannot be cancelled' 
          }, { status: 400 });
        }
        
        updatedChurnRequest = await prisma.churnRequest.update({
          where: { id: params.id },
          data: { 
            status: 'Cancelled',
            notes: notes || churnRequest.notes
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
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Must be: approve, process, or cancel' 
        }, { status: 400 });
    }

    return NextResponse.json({ churnRequest: updatedChurnRequest });
  } catch (error) {
    console.error('Error updating churn request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/churn/[id] - Delete churn request (only if pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const churnRequest = await prisma.churnRequest.findUnique({
      where: {
        id: params.id,
        createdBy: decoded.userId
      }
    });

    if (!churnRequest) {
      return NextResponse.json({ error: 'Churn request not found' }, { status: 404 });
    }

    if (churnRequest.status !== 'Pending') {
      return NextResponse.json({ 
        error: 'Only pending churn requests can be deleted' 
      }, { status: 400 });
    }

    await prisma.churnRequest.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Churn request deleted successfully' });
  } catch (error) {
    console.error('Error deleting churn request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
