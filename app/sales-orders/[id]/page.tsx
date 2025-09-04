'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesOrder {
  id: string;
  soNumber: string;
  zohoSoId: string;
  customerId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  billingCycle: string;
  billingDay?: number;
  currencyCode: string;
  createdAt: string;
  lineItems: Array<{
    id: string;
    zohoItemId: string;
    name: string;
    qtySo: number;
    rate: number;
    currency: string;
  }>;
  factories: Array<{
    id: string;
    name: string;
    notes?: string;
    allocations: Array<{
      id: string;
      zohoItemId: string;
      productName: string;
      qtyFactory: number;
      rate: number;
    }>;
  }>;
  uads: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    notes?: string;
    factory?: {
      id: string;
      name: string;
    };
    lineItems: Array<{
      id: string;
      zohoItemId: string;
      productName: string;
      qtyUad: number;
      rate: number;
    }>;
  }>;
  invoices: Array<{
    id: string;
    externalInvoiceNumber?: string;
    invoiceDate: string;
    cycleStart: string;
    cycleEnd: string;
    prorated: boolean;
    amount: number;
    breakdown?: any;
    factory?: {
      id: string;
      name: string;
    };
    uad: {
      id: string;
      startDate: string;
      endDate: string;
    };
    lineItems: Array<{
      id: string;
      zohoItemId: string;
      productName: string;
      qty: number;
      rate: number;
      lineAmount: number;
    }>;
  }>;
}

export default function SalesOrderDetailPage({ params }: { params: { id: string } }) {
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSalesOrder();
  }, [params.id]);

  const fetchSalesOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      console.log('Fetching sales order with ID:', params.id);
      const response = await fetch(`/api/salesorders/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sales order data:', data);
        setSalesOrder(data.salesOrder);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        setError(errorData.error || 'Failed to fetch sales order details');
      }
    } catch (error) {
      console.error('Error fetching sales order:', error);
      setError('Failed to fetch sales order details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getBillingCycleDisplay = (cycle: string, billingDay?: number) => {
    switch (cycle.toLowerCase()) {
      case 'monthly':
        return `Monthly (Day ${billingDay || 'N/A'})`;
      case 'quarterly':
        return 'Quarterly (Mar 31, Jun 30, Sep 30, Dec 31)';
      case 'halfyearly':
        return 'Half-Yearly (Jun 30, Dec 31)';
      case 'yearly':
        return 'Yearly (12 months rolling)';
      default:
        return cycle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const generateUADName = (uad: any, index: number) => {
    const startDate = formatDate(uad.startDate);
    const endDate = formatDate(uad.endDate);
    const factoryName = uad.factory ? ` - ${uad.factory.name}` : '';
    return `UAD-${String(index + 1).padStart(2, '0')} (${startDate} to ${endDate})${factoryName}`;
  };

  const toggleInvoiceExpansion = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const calculateDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const calculateProrationDetails = (invoice: any) => {
    if (!invoice.prorated || !invoice.breakdown) {
      return null;
    }

    const breakdown = invoice.breakdown;
    const details: any[] = [];

    // Parse breakdown if it's a string
    let parsedBreakdown;
    try {
      parsedBreakdown = typeof breakdown === 'string' ? JSON.parse(breakdown) : breakdown;
    } catch {
      return null;
    }

    if (Array.isArray(parsedBreakdown)) {
      parsedBreakdown.forEach((item: any) => {
        if (item.months) {
          item.months.forEach((month: any) => {
            details.push({
              product: item.productId || 'Unknown Product',
              year: month.year,
              month: month.month,
              activeDays: month.activeDays,
              daysInMonth: month.daysInMonth,
              fraction: month.fraction,
              amount: month.amount,
              fullMonthAmount: item.fullMonthAmount || 0
            });
          });
        }
      });
    }

    return details;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales order details...</p>
        </div>
      </div>
    );
  }

  if (error || !salesOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Order Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested sales order could not be found.'}</p>
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Back to Dashboard
          </Link>
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
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Sales Order: {salesOrder.soNumber}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {salesOrder.customerName} • Created {formatDate(salesOrder.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                {salesOrder.billingCycle}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sales Order Overview */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Customer</p>
              <p className="text-lg text-gray-900">{salesOrder.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Zoho SO ID</p>
              <p className="text-lg text-gray-900">{salesOrder.zohoSoId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Billing Cycle</p>
              <p className="text-lg text-gray-900">{getBillingCycleDisplay(salesOrder.billingCycle, salesOrder.billingDay)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Start Date</p>
              <p className="text-lg text-gray-900">{formatDate(salesOrder.startDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">End Date</p>
              <p className="text-lg text-gray-900">{formatDate(salesOrder.endDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Currency</p>
              <p className="text-lg text-gray-900">{salesOrder.currencyCode}</p>
            </div>
          </div>
        </div>

        {/* Sales Order Line Items */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Line Items</h2>
            <span className="text-sm text-gray-500">
              {salesOrder.lineItems.length} product{salesOrder.lineItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>Debug:</strong> Line items count: {salesOrder.lineItems.length}
              {salesOrder.lineItems.length > 0 && (
                <div className="mt-1">
                  First item: {JSON.stringify(salesOrder.lineItems[0], null, 2)}
                </div>
              )}
            </div>
          )}
          
          {!salesOrder.lineItems || salesOrder.lineItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No line items found</p>
              <p className="text-sm mt-2">Line items will appear here when the sales order is fetched from Zoho Books</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zoho Item ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity (SO)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate per Unit/Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Monthly Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesOrder.lineItems.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.zohoItemId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{(item.qtySo || 0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(item.rate || 0, item.currency || 'INR')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency((item.qtySo || 0) * (item.rate || 0), item.currency || 'INR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.currency || 'INR'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Factories */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Factories</h2>
            <span className="text-sm text-gray-500">
              {salesOrder.factories.length} factor{salesOrder.factories.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          
          {salesOrder.factories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No factories allocated yet</p>
              <Link
                href="/factories/new"
                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
              >
                + Add Factory
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {salesOrder.factories.map((factory) => (
                <div key={factory.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{factory.name}</h3>
                      {factory.notes && (
                        <p className="text-sm text-gray-600 mt-1">{factory.notes}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {factory.allocations.length} allocation{factory.allocations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {factory.allocations.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Qty Factory
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rate
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monthly Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {factory.allocations.map((allocation) => (
                            <tr key={allocation.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{allocation.productName}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{allocation.qtyFactory.toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(allocation.rate)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                {formatCurrency(allocation.qtyFactory * allocation.rate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UADs */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">User Acceptance Documents (UADs)</h2>
            <span className="text-sm text-gray-500">
              {salesOrder.uads.length} UAD{salesOrder.uads.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {salesOrder.uads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No UADs created yet</p>
              <Link
                href="/uads/new"
                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
              >
                + Create UAD
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {salesOrder.uads.map((uad, index) => (
                <div key={uad.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {generateUADName(uad, index)}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(uad.status)}`}>
                          {uad.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Period:</span> {formatDate(uad.startDate)} - {formatDate(uad.endDate)}
                        {uad.factory && (
                          <span className="ml-4"><span className="font-medium">Factory:</span> {uad.factory.name}</span>
                        )}
                      </div>
                      {uad.notes && (
                        <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Notes:</span> {uad.notes}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {uad.lineItems.length} line item{uad.lineItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {uad.lineItems.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Qty UAD
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rate
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monthly Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {uad.lineItems.map((lineItem) => (
                            <tr key={lineItem.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{lineItem.productName}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{lineItem.qtyUad.toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(lineItem.rate)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                {formatCurrency(lineItem.qtyUad * lineItem.rate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Generated Invoices</h2>
            <span className="text-sm text-gray-500">
              {salesOrder.invoices.length} invoice{salesOrder.invoices.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {salesOrder.invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No invoices generated yet</p>
              <p className="text-sm mt-2">Invoices are generated automatically when UADs are created</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cycle Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UAD Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prorated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      External Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesOrder.invoices.map((invoice) => (
                    <>
                      <tr 
                        key={invoice.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleInvoiceExpansion(invoice.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(invoice.invoiceDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.uad.startDate)} - {formatDate(invoice.uad.endDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {invoice.factory ? invoice.factory.name : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.prorated 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {invoice.prorated ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {invoice.externalInvoiceNumber || 'Not synced'}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expandable Calculation Details */}
                      {expandedInvoices.has(invoice.id) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium text-gray-900">
                                  Invoice Calculation Details
                                </h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleInvoiceExpansion(invoice.id);
                                  }}
                                  className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                  ✕ Close
                                </button>
                              </div>
                              
                              {/* Invoice Line Items */}
                              {invoice.lineItems && invoice.lineItems.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <h5 className="text-sm font-medium text-gray-900 mb-3">Line Items</h5>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {invoice.lineItems.map((lineItem) => (
                                          <tr key={lineItem.id}>
                                            <td className="px-3 py-2 text-sm text-gray-900">{lineItem.productName}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900">{lineItem.qty.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(lineItem.rate)}</td>
                                            <td className="px-3 py-2 text-sm font-medium text-gray-900">{formatCurrency(lineItem.lineAmount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                              
                              {/* Detailed Calculation Process */}
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-3">📊 Detailed Calculation Process</h5>
                                
                                {/* Step 1: Billing Cycle Analysis */}
                                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                                  <h6 className="text-sm font-semibold text-gray-900 mb-2">Step 1: Billing Cycle Analysis</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Billing Cycle:</span>
                                      <div className="text-gray-900">{getBillingCycleDisplay(salesOrder.billingCycle, salesOrder.billingDay)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Cycle Period:</span>
                                      <div className="text-gray-900">{formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">UAD Period:</span>
                                      <div className="text-gray-900">{formatDate(invoice.uad.startDate)} - {formatDate(invoice.uad.endDate)}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Overlap Days:</span>
                                      <div className="text-gray-900">{(() => {
                                        const cycleStart = new Date(invoice.cycleStart);
                                        const cycleEnd = new Date(invoice.cycleEnd);
                                        const uadStart = new Date(invoice.uad.startDate);
                                        const uadEnd = new Date(invoice.uad.endDate);
                                        
                                        const overlapStart = new Date(Math.max(cycleStart.getTime(), uadStart.getTime()));
                                        const overlapEnd = new Date(Math.min(cycleEnd.getTime(), uadEnd.getTime()));
                                        const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                                        
                                        return `${overlapDays} days`;
                                      })()}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 2: Rate Calculations */}
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                  <h6 className="text-sm font-semibold text-blue-900 mb-2">Step 2: Rate Calculations</h6>
                                  {invoice.lineItems && invoice.lineItems.map((lineItem, index) => (
                                    <div key={index} className="mb-3 p-2 bg-white border border-blue-100 rounded">
                                      <div className="text-sm">
                                        <div className="font-medium text-blue-900 mb-1">{lineItem.productName}</div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                          <div>
                                            <span className="text-blue-700">UAD Qty:</span>
                                            <div className="font-medium">{lineItem.qty.toLocaleString()}</div>
                                          </div>
                                          <div>
                                            <span className="text-blue-700">Rate/Month:</span>
                                            <div className="font-medium">{formatCurrency(lineItem.rate)}</div>
                                          </div>
                                          <div>
                                            <span className="text-blue-700">Full Cycle Value:</span>
                                            <div className="font-medium">{formatCurrency(lineItem.qty * lineItem.rate)}</div>
                                          </div>
                                          <div>
                                            <span className="text-blue-700">Formula:</span>
                                            <div className="font-mono text-xs">Qty × Rate</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Step 3: Proration Details */}
                                {invoice.prorated && (
                                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <h6 className="text-sm font-semibold text-yellow-900 mb-2">Step 3: Proration Calculation</h6>
                                    {(() => {
                                      const prorationDetails = calculateProrationDetails(invoice);
                                      if (prorationDetails && prorationDetails.length > 0) {
                                        return (
                                          <div className="space-y-3">
                                            {prorationDetails.map((detail, index) => (
                                              <div key={index} className="bg-white border border-yellow-100 rounded p-3">
                                                <div className="text-sm font-medium text-yellow-900 mb-2">
                                                  {detail.product} - {detail.month}/{detail.year}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                  <div>
                                                    <span className="text-yellow-700">Active Days:</span>
                                                    <div className="font-medium">{detail.activeDays}/{detail.daysInMonth}</div>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-700">Fraction:</span>
                                                    <div className="font-medium">{(detail.fraction * 100).toFixed(2)}%</div>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-700">Full Amount:</span>
                                                    <div className="font-medium">{formatCurrency(detail.fullMonthAmount)}</div>
                                                  </div>
                                                  <div>
                                                    <span className="text-yellow-700">Prorated:</span>
                                                    <div className="font-medium">{formatCurrency(detail.amount)}</div>
                                                  </div>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-yellow-200 text-xs">
                                                  <div className="font-mono text-yellow-800">
                                                    Formula: {formatCurrency(detail.fullMonthAmount)} × {detail.fraction.toFixed(4)} = {formatCurrency(detail.amount)}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="text-sm text-yellow-800">
                                            <p>Proration applied based on date overlap:</p>
                                            <div className="mt-2 p-2 bg-white border border-yellow-100 rounded">
                                              <div className="font-mono text-xs">
                                                Proration Factor = Overlap Days ÷ Total Cycle Days
                                              </div>
                                              <div className="mt-1 font-mono text-xs">
                                                Prorated Amount = Full Amount × Proration Factor
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                )}

                                {/* Step 4: Final Calculation Summary */}
                                <div className="p-3 bg-green-50 border border-green-200 rounded">
                                  <h6 className="text-sm font-semibold text-green-900 mb-2">Step 4: Final Calculation Summary</h6>
                                  <div className="space-y-2 text-sm">
                                    {invoice.lineItems && invoice.lineItems.map((lineItem, index) => (
                                      <div key={index} className="flex justify-between items-center p-2 bg-white border border-green-100 rounded">
                                        <span className="text-green-800">{lineItem.productName}</span>
                                        <span className="font-medium text-green-900">{formatCurrency(lineItem.lineAmount)}</span>
                                      </div>
                                    ))}
                                    <div className="pt-2 border-t border-green-200">
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold text-green-900">Total Invoice Amount:</span>
                                        <span className="text-lg font-bold text-green-900">{formatCurrency(invoice.amount)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Full Cycle Details */}
                              {!invoice.prorated && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <h5 className="text-sm font-medium text-gray-900 mb-3">Full Cycle Calculation</h5>
                                  <div className="text-sm text-gray-600">
                                    <p>This invoice covers a complete billing cycle with no proration required.</p>
                                    <div className="mt-2 grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium">Cycle Period:</span>
                                        <div>{formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)}</div>
                                      </div>
                                      <div>
                                        <span className="font-medium">UAD Period:</span>
                                        <div>{formatDate(invoice.uad.startDate)} - {formatDate(invoice.uad.endDate)}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Summary */}
                              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-900">Total Invoice Amount:</span>
                                  <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                                </div>
                                {invoice.externalInvoiceNumber && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <span className="font-medium">External Invoice:</span> {invoice.externalInvoiceNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
