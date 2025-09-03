import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getZohoAPI } from '@/lib/zoho';
import { prisma } from '@/lib/prisma';

async function handler(
  request: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  console.log('=== SALES ORDER API HANDLER STARTED ===');
  console.log('Request URL:', request.url);
  console.log('Context:', context);
  
  try {
    // In Next.js 15, params is a Promise that must be awaited
    const params = await context?.params;
    const { id } = params || {};
    const user = (request as any).user;

    console.log('Extracted ID:', id);
    console.log('User from request:', user);
    console.log('User ID:', user?.userId);

    if (!id) {
      console.log('ERROR: No ID found in params');
      return NextResponse.json(
        { error: 'Sales Order ID is required' },
        { status: 400 }
      );
    }

    if (!user) {
      console.log('ERROR: No user found in request');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('=== STEP 1: Getting Zoho API Instance ===');
    let zohoAPI;
    try {
      zohoAPI = getZohoAPI();
      console.log('✅ Zoho API instance created successfully');
    } catch (zohoInitError) {
      console.error('❌ Failed to create Zoho API instance:', zohoInitError);
      return NextResponse.json(
        { error: `Failed to initialize Zoho API: ${zohoInitError instanceof Error ? zohoInitError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('=== STEP 2: Fetching Sales Order from Zoho ===');
    let zohoSO;
    try {
      console.log('Calling zohoAPI.getSalesOrder with ID:', id);
      zohoSO = await zohoAPI.getSalesOrder(id);
      console.log('✅ Zoho sales order fetched successfully:', {
        id: zohoSO.salesorder_id,
        number: zohoSO.salesorder_number,
        customer: zohoSO.customer_name,
        date: zohoSO.date,
        lineItemsCount: zohoSO.line_items?.length || 0
      });
    } catch (zohoError) {
      console.error('❌ Failed to fetch sales order from Zoho:', zohoError);
      return NextResponse.json(
        { error: `Zoho API error: ${zohoError instanceof Error ? zohoError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('=== STEP 3: Checking Database for Existing Sales Order ===');
    let salesOrder;
    try {
      console.log('Querying database for sales order with zohoSoId:', id);
      // Use findFirst since zohoSoId is not a unique field in the schema
      salesOrder = await prisma.salesOrder.findFirst({
        where: { zohoSoId: id },
        include: {
          lineItems: true,
          factories: true,
          uads: true,
          invoices: true,
        },
      });

      if (salesOrder) {
        console.log('✅ Existing sales order found in database:', {
          id: salesOrder.id,
          soNumber: salesOrder.soNumber,
          customerName: salesOrder.customerName
        });
      } else {
        console.log('ℹ️ No existing sales order found, will create new one');
      }
    } catch (dbQueryError) {
      console.error('❌ Database query error:', dbQueryError);
      return NextResponse.json(
        { error: `Database query failed: ${dbQueryError instanceof Error ? dbQueryError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('=== STEP 4: Updating/Creating Sales Order ===');
    try {
      if (salesOrder) {
        console.log('Updating existing sales order...');
        salesOrder = await prisma.salesOrder.update({
          where: { id: salesOrder.id },
          data: {
            customerName: zohoSO.customer_name,
            startDate: new Date(zohoSO.date),
            endDate: new Date(zohoSO.date),
            billingCycle: 'monthly',
            billingDay: 15,
            currencyCode: zohoSO.currency_code,
          },
          include: {
            lineItems: true,
            factories: true,
            uads: true,
            invoices: true,
          },
        });
        console.log('✅ Sales order updated successfully');
      } else {
        console.log('Creating new sales order...');
        salesOrder = await prisma.salesOrder.create({
          data: {
            soNumber: zohoSO.salesorder_number,
            zohoSoId: zohoSO.salesorder_id,
            customerId: zohoSO.customer_id,
            customerName: zohoSO.customer_name,
            startDate: new Date(zohoSO.date),
            endDate: new Date(zohoSO.date),
            billingCycle: 'monthly',
            billingDay: 15,
            currencyCode: zohoSO.currency_code,
            createdBy: user.userId,
          },
          include: {
            lineItems: true,
            factories: true,
            uads: true,
            invoices: true,
          },
        });
        console.log('✅ New sales order created successfully');
      }
    } catch (dbWriteError) {
      console.error('❌ Database write error:', dbWriteError);
      return NextResponse.json(
        { error: `Failed to save sales order: ${dbWriteError instanceof Error ? dbWriteError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('=== STEP 5: Processing Line Items ===');
    try {
      // Check if line_items exists and is an array
      if (!zohoSO.line_items || !Array.isArray(zohoSO.line_items)) {
        console.log('⚠️ No line items found in Zoho sales order, skipping line item processing');
      } else {
        console.log(`Processing ${zohoSO.line_items.length} line items...`);
        for (const lineItem of zohoSO.line_items) {
          console.log('Processing line item:', {
            itemId: lineItem.item_id,
            name: lineItem.name,
            quantity: lineItem.quantity,
            rate: lineItem.rate
          });
          
          // Create new line item since there's no unique constraint for upsert
          await prisma.sOProduct.create({
            data: {
              zohoItemId: lineItem.item_id,
              name: lineItem.name,
              qtySo: lineItem.quantity,
              rate: lineItem.rate,
              soId: salesOrder.id,
            },
          });
        }
        console.log('✅ All line items processed successfully');
      }
    } catch (lineItemError) {
      console.error('❌ Line item processing error:', lineItemError);
      return NextResponse.json(
        { error: `Failed to process line items: ${lineItemError instanceof Error ? lineItemError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('=== STEP 6: Fetching Final Sales Order ===');
    let updatedSO;
    try {
      console.log('Fetching final sales order with all relations...');
      updatedSO = await prisma.salesOrder.findUnique({
        where: { id: salesOrder.id },
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
      });
      console.log('✅ Final sales order fetched successfully');
    } catch (finalQueryError) {
      console.error('❌ Final query error:', finalQueryError);
      return NextResponse.json(
        { error: `Failed to fetch final sales order: ${finalQueryError instanceof Error ? finalQueryError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('=== SUCCESS: Returning Response ===');
    console.log('Final sales order data:', {
      id: updatedSO?.id,
      soNumber: updatedSO?.soNumber,
      customerName: updatedSO?.customerName,
      lineItemsCount: updatedSO?.lineItems?.length || 0
    });

    return NextResponse.json({
      success: true,
      salesOrder: updatedSO,
    });
    
  } catch (error) {
    console.error('=== FATAL ERROR IN HANDLER ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    return NextResponse.json(
      { error: `Failed to fetch sales order: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    console.log('=== SALES ORDER API HANDLER COMPLETED ===');
  }
}

export const GET = withAuth(handler);
