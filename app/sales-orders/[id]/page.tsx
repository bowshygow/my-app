'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  startDate: string;
  endDate: string;
  billingCycle: string;
  billingDay: number;
  currencyCode: string;
  lineItems: Array<{
    id: string;
    zohoItemId: string;
    name: string;
    qtySo: number;
    rate: number;
  }>;
}

interface Factory {
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
}

interface UAD {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
  factory?: {
    id: string;
    name: string;
  };
  invoices: Array<{
    id: string;
    invoiceDate: string;
    cycleStart: string;
    cycleEnd: string;
    amount: number;
    prorated: boolean;
    breakdown: any[];
  }>;
}

interface Invoice {
  id: string;
  invoiceDate: string;
  cycleStart: string;
  cycleEnd: string;
  amount: number;
  prorated: boolean;
  breakdown: any[];
  factory?: {
    id: string;
    name: string;
  };
  uad: {
    id: string;
    startDate: string;
    endDate: string;
  };
}

type TabType = 'factories' | 'uads' | 'invoices';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const salesOrderId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<TabType>('factories');
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [uads, setUads] = useState<UAD[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFactoryModal, setShowAddFactoryModal] = useState(false);
  const [showAddUADModal, setShowAddUADModal] = useState(false);
  const [expandedInvoiceRows, setExpandedInvoiceRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (salesOrderId) {
      fetchSalesOrderData();
    }
  }, [salesOrderId]);

  const fetchSalesOrderData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      // Fetch sales order details
      const soResponse = await fetch(`/api/salesorders/${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (soResponse.ok) {
        const soData = await soResponse.json();
        setSalesOrder(soData.salesOrder);
      }

      // Fetch factories for this sales order
      const factoriesResponse = await fetch(`/api/factories?salesOrderId=${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (factoriesResponse.ok) {
        const factoriesData = await factoriesResponse.json();
        setFactories(factoriesData.factories || []);
      }

      // Fetch UADs for this sales order
      const uadsResponse = await fetch(`/api/uads?salesOrderId=${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (uadsResponse.ok) {
        const uadsData = await uadsResponse.json();
        setUads(uadsData.uads || []);
      }

      // Fetch invoices for this sales order
      const invoicesResponse = await fetch(`/api/invoices?salesOrderId=${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setInvoices(invoicesData.invoices || []);
      }

    } catch (error) {
      console.error('Error fetching sales order data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoiceRow = (invoiceId: string) => {
    const newExpandedRows = new Set(expandedInvoiceRows);
    if (newExpandedRows.has(invoiceId)) {
      newExpandedRows.delete(invoiceId);
    } else {
      newExpandedRows.add(invoiceId);
    }
    setExpandedInvoiceRows(newExpandedRows);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sales order...</p>
        </div>
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-xl text-gray-900 mb-2">Sales Order Not Found</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
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
              <h1 className="text-3xl font-bold text-gray-900">
                Sales Order: {salesOrder.soNumber}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sales Order Header Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="text-lg font-semibold text-gray-900">{salesOrder.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(salesOrder.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(salesOrder.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Cycle</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{salesOrder.billingCycle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Day</p>
              <p className="text-lg font-semibold text-gray-900">{salesOrder.billingDay}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Currency</p>
              <p className="text-lg font-semibold text-gray-900">{salesOrder.currencyCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Line Items</p>
              <p className="text-lg font-semibold text-gray-900">{salesOrder.lineItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(salesOrder.lineItems.reduce((sum, item) => sum + (item.qtySo * item.rate), 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('factories')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'factories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Factories ({factories.length})
              </button>
              <button
                onClick={() => setActiveTab('uads')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'uads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                UADs ({uads.length})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoices'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Invoices ({invoices.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Factories Tab */}
            {activeTab === 'factories' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Factories</h3>
                  <button
                    onClick={() => setShowAddFactoryModal(true)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    + Add Factory
                  </button>
                </div>

                {factories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No factories created yet</p>
                    <p className="text-sm mt-1">Create a factory to allocate products</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Factory Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Allocations
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {factories.map((factory) => (
                          <tr key={factory.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {factory.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {factory.notes || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {factory.allocations.length} products
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* UADs Tab */}
            {activeTab === 'uads' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">User Acceptance Documents</h3>
                  <button
                    onClick={() => setShowAddUADModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    + Add UAD
                  </button>
                </div>

                {uads.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No UADs created yet</p>
                    <p className="text-sm mt-1">Create a UAD to track user acceptance</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UAD ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Factory
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            End Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoices
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uads.map((uad) => (
                          <tr key={uad.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {uad.id.slice(-8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {uad.factory ? uad.factory.name : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(uad.startDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(uad.endDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                uad.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {uad.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {uad.invoices.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Generated Invoices</h3>

                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No invoices generated yet</p>
                    <p className="text-sm mt-1">Invoices are created automatically when UADs are saved</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice No
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cycle Start-End
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prorated
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Factory
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            UAD
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map((invoice) => (
                          <>
                            <tr key={invoice.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {invoice.id.slice(-8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(invoice.invoiceDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(invoice.cycleStart)} - {formatDate(invoice.cycleEnd)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(invoice.amount)}
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {invoice.factory ? invoice.factory.name : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(invoice.uad.startDate)} - {formatDate(invoice.uad.endDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button 
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleInvoiceRow(invoice.id);
                                  }}
                                >
                                  {expandedInvoiceRows.has(invoice.id) ? 'Hide' : 'View'} Details
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expandable Breakdown Row */}
                            {expandedInvoiceRows.has(invoice.id) && (
                              <tr>
                                <td colSpan={8} className="px-6 py-4 bg-gray-50">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                                        Invoice Breakdown
                                      </h4>
                                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="mb-4">
                                          <p className="text-sm text-gray-600 mb-2">Proration Details:</p>
                                          <div className="bg-gray-100 rounded p-3">
                                            <pre className="text-xs text-gray-800 overflow-x-auto">
                                              {JSON.stringify(invoice.breakdown, null, 2)}
                                            </pre>
                                          </div>
                                        </div>
                                      </div>
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
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Report</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{factories.length}</p>
              <p className="text-sm text-gray-600">Factories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{uads.length}</p>
              <p className="text-sm text-gray-600">UADs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{invoices.length}</p>
              <p className="text-sm text-gray-600">Invoices</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(invoices.reduce((sum, inv) => sum + inv.amount, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Billed</p>
            </div>
          </div>
        </div>
      </main>

      {/* Add Factory Modal */}
      {showAddFactoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Factory</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factory Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter factory name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddFactoryModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                    Add Factory
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add UAD Modal */}
      {showAddUADModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add UAD</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factory
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                    <option value="">Select a factory</option>
                    {factories.map((factory) => (
                      <option key={factory.id} value={factory.id}>
                        {factory.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddUADModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
                    Add UAD
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

