'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface InvoiceAggregation {
  id: string;
  name: string;
  status: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  syncedAt?: string;
  externalInvoiceNumber?: string;
  externalInvoiceId?: string;
  invoiceUrl?: string;
  salesOrder: {
    id: string;
    soNumber: string;
    customerName: string;
  };
  aggregatedInvoices: Array<{
    invoice: {
      id: string;
      amount: number;
      cycleStart: string;
      cycleEnd: string;
      uad: {
        id: string;
        startDate: string;
        endDate: string;
      };
      factory?: {
        id: string;
        name: string;
      };
      lineItems: Array<{
        id: string;
        productName: string;
        qty: number;
        rate: number;
        lineAmount: number;
      }>;
    };
  }>;
}

export default function InvoiceAggregationsPage() {
  const [aggregations, setAggregations] = useState<InvoiceAggregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAggregations, setExpandedAggregations] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAggregations();
  }, []);

  const fetchAggregations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      const response = await fetch('/api/invoice-aggregations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch aggregations');
      }

      const data = await response.json();
      setAggregations(data.aggregations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (aggregationId: string) => {
    const newExpanded = new Set(expandedAggregations);
    if (newExpanded.has(aggregationId)) {
      newExpanded.delete(aggregationId);
    } else {
      newExpanded.add(aggregationId);
    }
    setExpandedAggregations(newExpanded);
  };

  const syncAggregation = async (aggregationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoice-aggregations/${aggregationId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to sync aggregation');
      }

      // Refresh the list
      await fetchAggregations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync aggregation');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading aggregations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Invoice Aggregations
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage aggregated invoices from multiple UADs
              </p>
            </div>
            <Link
              href="/invoice-aggregations/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Aggregation
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {aggregations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No aggregations found</h3>
            <p className="text-gray-500 mb-6">Create your first invoice aggregation to combine multiple UAD invoices.</p>
            <Link
              href="/invoice-aggregations/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Aggregation
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {aggregations.map((aggregation) => (
              <div key={aggregation.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {aggregation.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          aggregation.status === 'Synced' 
                            ? 'bg-green-100 text-green-800'
                            : aggregation.status === 'Ready'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {aggregation.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Sales Order:</strong> {aggregation.salesOrder.soNumber} - {aggregation.salesOrder.customerName}</p>
                        <p><strong>Total Amount:</strong> {formatCurrency(aggregation.totalAmount)}</p>
                        <p><strong>UADs:</strong> {aggregation.aggregatedInvoices.length} invoices</p>
                        <p><strong>Created:</strong> {formatDate(aggregation.createdAt)}</p>
                        {aggregation.syncedAt && (
                          <p><strong>Synced:</strong> {formatDate(aggregation.syncedAt)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {aggregation.externalInvoiceNumber && (
                        <a
                          href={aggregation.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View in Zoho ({aggregation.externalInvoiceNumber})
                        </a>
                      )}
                      {aggregation.status === 'Ready' && (
                        <button
                          onClick={() => syncAggregation(aggregation.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Sync to Zoho
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpanded(aggregation.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedAggregations.has(aggregation.id) ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>

                  {expandedAggregations.has(aggregation.id) && (
                    <div className="mt-6 border-t pt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-4">
                        UAD Breakdown ({aggregation.aggregatedInvoices.length} invoices)
                      </h4>
                      <div className="space-y-4">
                        {aggregation.aggregatedInvoices.map((aggregatedInvoice, index) => {
                          const invoice = aggregatedInvoice.invoice;
                          return (
                            <div key={invoice.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h5 className="font-medium text-gray-900">
                                    UAD {index + 1}: {formatDate(invoice.uad.startDate)} - {formatDate(invoice.uad.endDate)}
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    Factory: {invoice.factory?.name || 'No Factory'} | 
                                    Amount: {formatCurrency(invoice.amount)} |
                                    Cycle: {formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700 mb-2">Line Items:</p>
                                <div className="space-y-1">
                                  {invoice.lineItems.map((lineItem) => (
                                    <div key={lineItem.id} className="flex justify-between text-gray-600">
                                      <span>{lineItem.productName}</span>
                                      <span>{lineItem.qty} × {formatCurrency(lineItem.rate)} = {formatCurrency(lineItem.lineAmount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
