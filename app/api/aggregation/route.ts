import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSalesOrderAggregation, getPeriodAggregation } from '@/lib/aggregation';

async function getAggregationHandler(request: NextRequest) {
  try {
    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    
    const salesOrderId = searchParams.get('salesOrderId');
    const factoryId = searchParams.get('factoryId');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    if (!salesOrderId || !factoryId) {
      return NextResponse.json(
        { error: 'salesOrderId and factoryId are required' },
        { status: 400 }
      );
    }

    let aggregationData;

    if (periodStart && periodEnd) {
      // Get specific period aggregation
      aggregationData = await getPeriodAggregation(
        salesOrderId,
        factoryId,
        new Date(periodStart),
        new Date(periodEnd)
      );
      
      if (!aggregationData) {
        return NextResponse.json(
          { error: 'No data found for the specified period' },
          { status: 404 }
        );
      }
    } else {
      // Get all periods aggregation
      aggregationData = await getSalesOrderAggregation(salesOrderId, factoryId);
    }

    return NextResponse.json({
      success: true,
      data: aggregationData
    });

  } catch (error) {
    console.error('Error fetching aggregation data:', error);
    return NextResponse.json(
      { error: `Failed to fetch aggregation data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAggregationHandler);

