import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getZohoAPI } from '@/lib/zoho';

async function syncInvoiceHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const invoiceId = params.id;

    // Fetch the invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { 
        id: invoiceId,
        createdBy: user.userId // Ensure user owns this invoice
      },
      include: {
        salesOrder: {
          include: {
            lineItems: true
          }
        },
        factory: true,
        uad: {
          include: {
            lineItems: true
          }
        },
        lineItems: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.externalInvoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice already synced to Zoho Books' },
        { status: 400 }
      );
    }

    // Get Zoho API instance
    const zohoAPI = getZohoAPI();

    // Prepare invoice data for Zoho Books
    const zohoInvoiceData = {
      customer_id: invoice.salesOrder.customerId, // Assuming this maps to Zoho customer ID
      custom_fields: [
        {
          customfield_id: "2031676000008612118", // Factory custom field ID
          value: invoice.factory ? invoice.factory.name : "No Factory"
        },
        {
          customfield_id: "2031676000008612122", // UAD custom field ID
          value: `UAD-${invoice.uad.id.slice(-8)}` // Use last 8 chars of UAD ID
        }
      ],
      line_items: invoice.lineItems.map((lineItem, index) => ({
        item_id: lineItem.zohoItemId,
        quantity: lineItem.qty,
        rate: lineItem.rate
      }))
    };

    console.log('=== INVOICE SYNC REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    console.log('User ID:', user.userId);
    console.log('Sales Order:', {
      id: invoice.salesOrder.id,
      soNumber: invoice.salesOrder.soNumber,
      customerId: invoice.salesOrder.customerId,
      customerName: invoice.salesOrder.customerName
    });
    console.log('Invoice Details:', {
      id: invoice.id,
      amount: invoice.amount,
      cycleStart: invoice.cycleStart,
      cycleEnd: invoice.cycleEnd,
      prorated: invoice.prorated,
      lineItemsCount: invoice.lineItems.length
    });
    console.log('Factory:', invoice.factory ? {
      id: invoice.factory.id,
      name: invoice.factory.name
    } : 'No Factory');
    console.log('UAD:', {
      id: invoice.uad.id,
      startDate: invoice.uad.startDate,
      endDate: invoice.uad.endDate,
      lineItemsCount: invoice.uad.lineItems.length
    });
    console.log('Line Items:', invoice.lineItems.map(item => ({
      zohoItemId: item.zohoItemId,
      productName: item.productName,
      qty: item.qty,
      rate: item.rate,
      lineAmount: item.lineAmount
    })));
    console.log('Zoho API Request Data:', JSON.stringify(zohoInvoiceData, null, 2));
    console.log('=== END SYNC REQUEST ===');

    // Create invoice in Zoho Books
    console.log('Calling Zoho Books API...');
    const zohoResponse = await zohoAPI.createInvoice(zohoInvoiceData);
    
    console.log('=== ZOHO API RESPONSE ===');
    console.log('Response Code:', zohoResponse.code);
    console.log('Response Message:', zohoResponse.message);
    console.log('Full Response:', JSON.stringify(zohoResponse, null, 2));
    console.log('=== END ZOHO RESPONSE ===');

    if (zohoResponse.code === 0) {
      // Update local invoice with Zoho data
      console.log('Updating local invoice with Zoho data...');
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          externalInvoiceNumber: zohoResponse.invoice.invoice_number,
          externalInvoiceId: zohoResponse.invoice.invoice_id,
          invoiceUrl: zohoResponse.invoice.invoice_url
        }
      });

      console.log('=== INVOICE SYNC SUCCESS ===');
      console.log('Local Invoice ID:', invoiceId);
      console.log('Zoho Invoice ID:', zohoResponse.invoice.invoice_id);
      console.log('Zoho Invoice Number:', zohoResponse.invoice.invoice_number);
      console.log('Zoho Invoice URL:', zohoResponse.invoice.invoice_url);
      console.log('Updated Local Invoice:', {
        id: updatedInvoice.id,
        externalInvoiceNumber: updatedInvoice.externalInvoiceNumber,
        externalInvoiceId: updatedInvoice.externalInvoiceId,
        invoiceUrl: updatedInvoice.invoiceUrl
      });
      console.log('=== END SYNC SUCCESS ===');

      return NextResponse.json({
        success: true,
        message: 'Invoice synced to Zoho Books successfully',
        invoice: {
          id: updatedInvoice.id,
          externalInvoiceNumber: updatedInvoice.externalInvoiceNumber,
          externalInvoiceId: updatedInvoice.externalInvoiceId,
          invoiceUrl: updatedInvoice.invoiceUrl
        },
        zohoResponse: zohoResponse.invoice
      });
    } else {
      throw new Error(`Zoho API error: ${zohoResponse.message}`);
    }

  } catch (error) {
    console.error('Error syncing invoice to Zoho Books:', error);
    return NextResponse.json(
      { 
        error: `Failed to sync invoice: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(syncInvoiceHandler);
