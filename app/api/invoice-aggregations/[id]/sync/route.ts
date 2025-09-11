import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getZohoAPI } from '@/lib/zoho';

async function syncAggregatedInvoiceHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user;
    const aggregationId = params.id;

    // Fetch the aggregation with all related data
    const aggregation = await prisma.invoiceAggregation.findUnique({
      where: { 
        id: aggregationId,
        createdBy: user.userId,
      },
      include: {
        salesOrder: true,
        aggregatedInvoices: {
          include: {
            invoice: {
              include: {
                uad: {
                  include: {
                    lineItems: true,
                  },
                },
                factory: true,
                lineItems: true,
              },
            },
          },
        },
      },
    });

    if (!aggregation) {
      return NextResponse.json(
        { error: 'Aggregation not found' },
        { status: 404 }
      );
    }

    if (aggregation.externalInvoiceId) {
      return NextResponse.json(
        { error: 'Aggregated invoice already synced to Zoho Books' },
        { status: 400 }
      );
    }

    // Get Zoho API instance
    const zohoAPI = getZohoAPI();

    // Prepare aggregated invoice data for Zoho Books
    const zohoInvoiceData: any = {
      customer_id: aggregation.salesOrder.customerId,
      custom_fields: [
        {
          customfield_id: "2031676000008612118", // Factory custom field ID
          value: "Multiple Factories" // Since we're aggregating multiple UADs
        },
        {
          customfield_id: "2031676000008612122", // UAD custom field ID
          value: `Aggregated: ${aggregation.name}` // Show it's an aggregated invoice
        }
      ],
      line_items: []
    };

    // Group line items by product and sum quantities
    const lineItemMap = new Map();
    
    for (const aggregatedInvoice of aggregation.aggregatedInvoices) {
      const invoice = aggregatedInvoice.invoice;
      
      for (const lineItem of invoice.lineItems) {
        const key = lineItem.zohoItemId;
        if (lineItemMap.has(key)) {
          const existing = lineItemMap.get(key);
          existing.quantity += lineItem.qty;
          existing.line_amount += lineItem.lineAmount;
          existing.uad_breakdown.push({
            uad_id: invoice.uad.id,
            uad_start: invoice.uad.startDate,
            uad_end: invoice.uad.endDate,
            factory: invoice.factory?.name || 'No Factory',
            quantity: lineItem.qty,
            amount: lineItem.lineAmount,
          });
        } else {
          lineItemMap.set(key, {
            item_id: lineItem.zohoItemId,
            quantity: lineItem.qty,
            rate: lineItem.rate,
            line_amount: lineItem.lineAmount,
            uad_breakdown: [{
              uad_id: invoice.uad.id,
              uad_start: invoice.uad.startDate,
              uad_end: invoice.uad.endDate,
              factory: invoice.factory?.name || 'No Factory',
              quantity: lineItem.qty,
              amount: lineItem.lineAmount,
            }]
          });
        }
      }
    }

    // Convert map to array for Zoho API
    zohoInvoiceData.line_items = Array.from(lineItemMap.values()).map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
      rate: item.rate
    }));

    console.log('=== AGGREGATED INVOICE SYNC REQUEST ===');
    console.log('Aggregation ID:', aggregationId);
    console.log('Aggregation Name:', aggregation.name);
    console.log('Total Amount:', aggregation.totalAmount);
    console.log('Number of UADs:', aggregation.aggregatedInvoices.length);
    console.log('Line Items:', zohoInvoiceData.line_items);
    console.log('UAD Breakdown:', Array.from(lineItemMap.values()).map(item => item.uad_breakdown));
    console.log('=== END SYNC REQUEST ===');

    // Create invoice in Zoho Books
    const zohoResponse = await zohoAPI.createInvoice(zohoInvoiceData);
    
    if (zohoResponse.code === 0) {
      // Update aggregation with Zoho data
      const updatedAggregation = await prisma.invoiceAggregation.update({
        where: { id: aggregationId },
        data: {
          externalInvoiceNumber: zohoResponse.invoice.invoice_number,
          externalInvoiceId: zohoResponse.invoice.invoice_id,
          invoiceUrl: zohoResponse.invoice.invoice_url,
          syncedAt: new Date(),
          status: 'Synced',
          customFields: {
            uad_breakdown: Array.from(lineItemMap.values()).map(item => item.uad_breakdown),
            original_invoice_count: aggregation.aggregatedInvoices.length,
            aggregation_name: aggregation.name,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Aggregated invoice synced to Zoho Books successfully',
        aggregation: {
          id: updatedAggregation.id,
          externalInvoiceNumber: updatedAggregation.externalInvoiceNumber,
          externalInvoiceId: updatedAggregation.externalInvoiceId,
          invoiceUrl: updatedAggregation.invoiceUrl,
        },
        zohoResponse: zohoResponse.invoice
      });
    } else {
      throw new Error(`Zoho API error: ${zohoResponse.message}`);
    }

  } catch (error) {
    console.error('Error syncing aggregated invoice to Zoho Books:', error);
    return NextResponse.json(
      { 
        error: `Failed to sync aggregated invoice: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(syncAggregatedInvoiceHandler);
