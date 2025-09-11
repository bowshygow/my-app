'use client';

import { useState, useEffect } from 'react';
import { AggregatedPeriodData } from '@/lib/aggregation';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AggregationViewProps {
  salesOrderId: string;
  factoryId: string;
  periodStart?: Date;
  periodEnd?: Date;
}

// Helper function to convert date strings back to Date objects
function convertDatesInData(data: AggregatedPeriodData[] | AggregatedPeriodData | null): AggregatedPeriodData[] | AggregatedPeriodData | null {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(period => ({
      ...period,
      periodStart: new Date(period.periodStart),
      periodEnd: new Date(period.periodEnd),
      uads: period.uads.map(uad => ({
        ...uad,
        startDate: new Date(uad.startDate),
        endDate: new Date(uad.endDate)
      }))
    }));
  } else {
    return {
      ...data,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      uads: data.uads.map(uad => ({
        ...uad,
        startDate: new Date(uad.startDate),
        endDate: new Date(uad.endDate)
      }))
    };
  }
}

export default function AggregationView({ 
  salesOrderId, 
  factoryId, 
  periodStart, 
  periodEnd 
}: AggregationViewProps) {
  const [data, setData] = useState<AggregatedPeriodData[] | AggregatedPeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUADs, setExpandedUADs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAggregationData();
  }, [salesOrderId, factoryId, periodStart, periodEnd]);

  const fetchAggregationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let url = `/api/aggregation?salesOrderId=${salesOrderId}&factoryId=${factoryId}`;
      if (periodStart && periodEnd) {
        url += `&periodStart=${periodStart.toISOString()}&periodEnd=${periodEnd.toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch aggregation data: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert date strings back to Date objects
      const processedData = convertDatesInData(result.data);
      setData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleUADExpansion = (uadId: string) => {
    const newExpanded = new Set(expandedUADs);
    if (newExpanded.has(uadId)) {
      newExpanded.delete(uadId);
    } else {
      newExpanded.add(uadId);
    }
    setExpandedUADs(newExpanded);
  };

  const renderPeriodData = (periodData: AggregatedPeriodData) => (
    <div key={`${periodData.periodStart.toISOString()}-${periodData.periodEnd.toISOString()}`} 
         className="bg-white rounded-lg shadow-md p-6 mb-6">
      
      {/* Period Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {periodData.periodType.charAt(0).toUpperCase() + periodData.periodType.slice(1)} Period
        </h3>
        <p className="text-sm text-gray-600">
          {formatDate(periodData.periodStart)} - {formatDate(periodData.periodEnd)}
        </p>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="font-medium text-gray-700">
            Total Quantity: <span className="text-blue-600">{periodData.totalQuantity}</span>
          </span>
          <span className="font-medium text-gray-700">
            Total Amount: <span className="text-green-600">{formatCurrency(periodData.totalAmount)}</span>
          </span>
        </div>
      </div>

      {/* UADs List */}
      <div className="space-y-4">
        {periodData.uads.map((uad) => (
          <div key={uad.uadId} className="border border-gray-200 rounded-lg p-4">
            {/* UAD Header */}
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900">{uad.uadName}</h4>
                <p className="text-sm text-gray-600">
                  {formatDate(uad.startDate)} - {formatDate(uad.endDate)}
                  {uad.factoryName && ` • ${uad.factoryName}`}
                </p>
                <p className="text-xs text-gray-500">Status: {uad.status}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  Qty: <span className="text-blue-600">{uad.lineItems.reduce((sum, item) => sum + item.qtyUad, 0)}</span>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  Amount: <span className="text-green-600">{formatCurrency(uad.lineItems.reduce((sum, item) => sum + item.proratedAmount, 0))}</span>
                </div>
                <button
                  onClick={() => toggleUADExpansion(uad.uadId)}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  {expandedUADs.has(uad.uadId) ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>

            {/* UAD Line Items (Expandable) */}
            {expandedUADs.has(uad.uadId) && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Line Items:</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Product</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Quantity</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Rate</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600">Prorated Amount</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-600">Calculation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uad.lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">{item.productName}</td>
                          <td className="py-2 px-3 text-right text-blue-600 font-medium">
                            {item.qtyUad}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2 px-3 text-right text-green-600 font-medium">
                            {formatCurrency(item.proratedAmount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => {
                                // Show breakdown details in a modal or tooltip
                                alert(`Breakdown: ${JSON.stringify(item.breakdown, null, 2)}`);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary by Product */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Summary by Product:</h5>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Product</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Total Quantity</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {periodData.breakdown.byProduct.map((product, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-900">{product.productName}</td>
                  <td className="py-2 px-3 text-right text-blue-600 font-medium">
                    {product.totalQuantity}
                  </td>
                  <td className="py-2 px-3 text-right text-green-600 font-medium">
                    {formatCurrency(product.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading aggregation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading aggregation data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchAggregationData}
                className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No aggregation data available</p>
        <p className="text-sm text-gray-400 mt-2">This could mean there are no UADs for this factory or no overlapping periods.</p>
      </div>
    );
  }

  // Handle both single period and multiple periods
  const periods = Array.isArray(data) ? data : [data];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Invoice Aggregation</h2>
        <button
          onClick={fetchAggregationData}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No UADs found for the selected period</p>
        </div>
      ) : (
        periods.map((periodData, index) => (
          <div key={`${periodData.periodStart.toISOString()}-${periodData.periodEnd.toISOString()}-${index}`}>
            {renderPeriodData(periodData)}
          </div>
        ))
      )}
    </div>
  );
}

