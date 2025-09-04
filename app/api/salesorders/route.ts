import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getZohoAPI } from '@/lib/zoho';

// GET handler - fetch existing sales orders
async function getSalesOrdersHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('=== GET SALES ORDERS ===');
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
    console.log('=== GET SALES ORDERS COMPLETE ===');

    return NextResponse.json({
      success: true,
      salesOrders,
      count: salesOrders.length,
    });
    
  } catch (error) {
    console.error('=== GET SALES ORDERS ERROR ===');
    console.error('Error fetching sales orders:', error);
    return NextResponse.json(
      { error: `Failed to fetch sales orders: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST handler - create new sales order from Zoho
async function createSalesOrderHandler(request: NextRequest) {
  console.log('=== POST HANDLER START ===');
  
  try {
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    
    const user = (request as any).user;
    console.log('User object:', user);
    
    if (!user) {
      console.log('No user found in request');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('=== CREATE SALES ORDER START ===');
    console.log('User ID:', user.userId);
    console.log('User email:', user.email);

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Request body parsed successfully:', requestBody);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { zohoSoId } = requestBody;
    console.log('Zoho Sales Order ID received:', zohoSoId);

    if (!zohoSoId) {
      console.log('ERROR: No Zoho Sales Order ID provided');
      return NextResponse.json(
        { error: 'Zoho Sales Order ID is required' },
        { status: 400 }
      );
    }

    // Check if sales order already exists
    console.log('=== STEP 1: Checking if sales order already exists ===');
    const existingSO = await prisma.salesOrder.findFirst({
      where: { zohoSoId: zohoSoId },
      include: { lineItems: true }
    });

    if (existingSO) {
      console.log('Sales order already exists in database:', {
        id: existingSO.id,
        soNumber: existingSO.soNumber,
        customerName: existingSO.customerName
      });
      return NextResponse.json({
        success: true,
        message: 'Sales order already exists',
        salesOrder: existingSO
      });
    }

    console.log('Sales order not found in database, proceeding to fetch from Zoho');

    // Initialize Zoho API
    console.log('=== STEP 2: Initializing Zoho API ===');
    let zohoAPI;
    try {
      zohoAPI = getZohoAPI();
      console.log('✅ Zoho API initialized successfully');
    } catch (zohoInitError) {
      console.error('❌ Failed to initialize Zoho API:', zohoInitError);
      console.error('Error details:', {
        message: zohoInitError instanceof Error ? zohoInitError.message : 'Unknown error',
        stack: zohoInitError instanceof Error ? zohoInitError.stack : 'No stack trace'
      });
      return NextResponse.json(
        { error: `Failed to initialize Zoho API: ${zohoInitError instanceof Error ? zohoInitError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Fetch sales order from Zoho
    console.log('=== STEP 3: Fetching from Zoho Books API ===');
    console.log('Calling zohoAPI.getSalesOrder with ID:', zohoSoId);
    
    let zohoSO;
    try {
      zohoSO = await zohoAPI.getSalesOrder(zohoSoId);
      console.log('✅ Zoho API call successful');
      console.log('Zoho response received:', {
        salesorder_id: zohoSO.salesorder_id,
        salesorder_number: zohoSO.salesorder_number,
        customer_name: zohoSO.customer_name,
        date: zohoSO.date,
        line_items_count: zohoSO.line_items?.length || 0,
        has_custom_fields: !!zohoSO.custom_fields,
        custom_fields_count: zohoSO.custom_fields?.length || 0
      });
    } catch (zohoError) {
      console.error('❌ Zoho API call failed');
      console.error('Zoho error details:', {
        message: zohoError instanceof Error ? zohoError.message : 'Unknown error',
        stack: zohoError instanceof Error ? zohoError.stack : 'No stack trace',
        zohoSoId: zohoSoId
      });
      
      // Check if it's a "not found" error
      if (zohoError instanceof Error && zohoError.message.includes('not found')) {
        return NextResponse.json(
          { error: `Sales Order ${zohoSoId} not found in Zoho Books. Please verify the ID is correct.` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Zoho API error: ${zohoError instanceof Error ? zohoError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Extract custom fields
    console.log('=== STEP 4: Processing custom fields ===');
    let startDate = new Date(zohoSO.date);
    let endDate = new Date(zohoSO.date);
    let billingCycle = 'monthly';
    let billingDay = 15;

    if (zohoSO.custom_fields && Array.isArray(zohoSO.custom_fields)) {
      console.log(`Processing ${zohoSO.custom_fields.length} custom fields`);
      
      for (const customField of zohoSO.custom_fields) {
        console.log('Processing custom field:', {
          apiName: customField.api_name,
          label: customField.label,
          value: customField.value,
          dataType: customField.data_type
        });

        switch (customField.api_name) {
          case 'cf_start_date':
            if (customField.value) {
              startDate = new Date(customField.value);
              console.log('✅ Extracted start date:', startDate);
            }
            break;
          case 'cf_end_date':
            if (customField.value) {
              endDate = new Date(customField.value);
              console.log('✅ Extracted end date:', endDate);
            }
            break;
          case 'cf_billing_cycle':
            if (customField.value) {
              billingCycle = customField.value.toLowerCase();
              console.log('✅ Extracted billing cycle:', billingCycle);
            }
            break;
          case 'cf_billing_cycle_date':
            if (customField.value) {
              billingDay = parseInt(customField.value);
              console.log('✅ Extracted billing day:', billingDay);
            }
            break;
        }
      }
    } else {
      console.log('⚠️ No custom fields found, using default values');
    }

    console.log('Final extracted values:', {
      startDate,
      endDate,
      billingCycle,
      billingDay
    });

    // Create sales order in database
    console.log('=== STEP 5: Creating sales order in database ===');
    let salesOrder;
    try {
      salesOrder = await prisma.salesOrder.create({
        data: {
          soNumber: zohoSO.salesorder_number,
          zohoSoId: zohoSO.salesorder_id,
          customerId: zohoSO.customer_id,
          customerName: zohoSO.customer_name,
          startDate,
          endDate,
          billingCycle,
          billingDay,
          currencyCode: zohoSO.currency_code,
          createdBy: user.userId,
        },
      });
      console.log('✅ Sales order created in database:', {
        id: salesOrder.id,
        soNumber: salesOrder.soNumber,
        customerName: salesOrder.customerName
      });
    } catch (dbError) {
      console.error('❌ Database creation failed');
      console.error('Database error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : 'No stack trace'
      });
      return NextResponse.json(
        { error: `Failed to create sales order in database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Process line items
    console.log('=== STEP 6: Processing line items ===');
    if (zohoSO.line_items && Array.isArray(zohoSO.line_items)) {
      console.log(`Processing ${zohoSO.line_items.length} line items`);
      
      for (const lineItem of zohoSO.line_items) {
        console.log('Processing line item:', {
          itemId: lineItem.item_id,
          name: lineItem.name,
          quantity: lineItem.quantity,
          rate: lineItem.rate
        });
        
        try {
          await prisma.sOProduct.create({
            data: {
              zohoItemId: lineItem.item_id,
              name: lineItem.name,
              qtySo: lineItem.quantity,
              rate: lineItem.rate,
              soId: salesOrder.id,
            },
          });
          console.log('✅ Line item created:', lineItem.name);
        } catch (lineItemError) {
          console.error('❌ Failed to create line item:', lineItem.name);
          console.error('Line item error:', lineItemError);
        }
      }
    } else {
      console.log('⚠️ No line items found in Zoho response');
    }

    // Fetch complete sales order with relations
    console.log('=== STEP 7: Fetching complete sales order ===');
    const completeSO = await prisma.salesOrder.findUnique({
      where: { id: salesOrder.id },
      include: {
        lineItems: true,
        factories: true,
        uads: true,
        invoices: true,
      },
    });

    console.log('=== CREATE SALES ORDER SUCCESS ===');
    console.log('Final sales order data:', {
      id: completeSO?.id,
      soNumber: completeSO?.soNumber,
      customerName: completeSO?.customerName,
      lineItemsCount: completeSO?.lineItems?.length || 0
    });

    return NextResponse.json({
      success: true,
      message: 'Sales order created successfully',
      salesOrder: completeSO,
    });
    
  } catch (error) {
    console.error('=== CREATE SALES ORDER FATAL ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
    return NextResponse.json(
      { error: `Failed to create sales order: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSalesOrdersHandler);
export const POST = withAuth(createSalesOrderHandler);
