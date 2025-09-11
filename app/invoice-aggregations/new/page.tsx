'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
}

interface Invoice {
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
}

export default function NewAggregationPage() {
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<string>('');
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    if (selectedSalesOrder) {
      fetchAvailableInvoices();
    }
  }, [selectedSalesOrder]);

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/salesorders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.salesOrders);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    }
  };

  const fetchAvailableInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices?salesOrderId=${selectedSalesOrder}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Only show invoices that haven't been synced to Zoho yet
        const unsyncedInvoices = data.invoices.filter((invoice: any) => !invoice.externalInvoiceId);
        setAvailableInvoices(unsyncedInvoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name for the aggregation' });
      return;
    }

    if (selectedInvoices.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one invoice to aggregate' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/invoice-aggregations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          salesOrderId: selectedSalesOrder,
          invoiceIds: Array.from(selectedInvoices),
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invoice aggregation created successfully!' });
        // Reset form
        setFormData({ name: '', notes: '' });
        setSelectedInvoices(new Set());
        setSelectedSalesOrder('');
        // Redirect to aggregations list after a short delay
        setTimeout(() => {
          window.location.href = '/invoice-aggregations';
        }, 1500);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to create aggregation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while creating the aggregation' });
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
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

  const totalAmount = Array.from(selectedInvoices).reduce((sum, invoiceId) => {
    const invoice = availableInvoices.find(inv => inv.id === invoiceId);
    return sum + (invoice?.amount || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create Invoice Aggregation
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Combine multiple UAD invoices into a single invoice
              </p>
            </div>
            <Link
              href="/invoice-aggregations"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Aggregations
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Aggregation Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Q1 2024 Aggregation"
                  required
                />
              </div>

              <div>
                <label htmlFor="salesOrder" className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Order *
                </label>
                <select
                  id="salesOrder"
                  value={selectedSalesOrder}
                  onChange={(e) => setSelectedSalesOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a sales order</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.soNumber} - {so.customerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional notes about this aggregation..."
              />
            </div>
          </div>

          {/* Invoice Selection */}
          {selectedSalesOrder && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select Invoices to Aggregate
                {selectedInvoices.size > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({selectedInvoices.size} selected, Total: {formatCurrency(totalAmount)})
                  </span>
                )}
              </h2>

              {availableInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No unsynced invoices found for this sales order.</p>
                  <p className="text-sm mt-1">Only invoices that haven't been synced to Zoho can be aggregated.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedInvoices.has(invoice.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleInvoiceSelection(invoice.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.has(invoice.id)}
                            onChange={() => toggleInvoiceSelection(invoice.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">
                              UAD: {formatDate(invoice.uad.startDate)} - {formatDate(invoice.uad.endDate)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Factory: {invoice.factory?.name || 'No Factory'} | 
                              Cycle: {formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)} |
                              Amount: {formatCurrency(invoice.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>
                          <p className="text-sm text-gray-600">{invoice.lineItems.length} line items</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {message.text && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/invoice-aggregations"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || selectedInvoices.size === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Aggregation'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

