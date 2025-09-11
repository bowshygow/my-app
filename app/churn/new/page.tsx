'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { calculateChurnImpact, validateChurnRequest, formatCurrency as formatChurnCurrency } from '@/lib/churn';

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  billingCycle: string;
  startDate: string;
  endDate: string;
}

interface Factory {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  salesOrder: {
    soNumber: string;
    customerName: string;
  };
}

interface UAD {
  id: string;
  uadNumber?: string;
  startDate: string;
  endDate: string;
  status: string;
  factory?: {
    id: string;
    name: string;
  };
  salesOrder: {
    id: string;
    soNumber: string;
    customerName: string;
  };
  lineItems: Array<{
    id: string;
    zohoItemId: string;
    productName: string;
    qtyUad: number;
    rate: number;
  }>;
}

interface ChurnItem {
  zohoItemId: string;
  productName: string;
  qtyToCancel: number;
  currentQty: number;
  rate: number;
  lineAmount: number;
}

export default function NewChurnPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [uads, setUads] = useState<UAD[]>([]);
  const [selectedSO, setSelectedSO] = useState<string>('');
  const [selectedFactory, setSelectedFactory] = useState<string>('');
  const [selectedUAD, setSelectedUAD] = useState<string>('');
  const [churnType, setChurnType] = useState<'end_of_period' | 'prorated'>('end_of_period');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [churnItems, setChurnItems] = useState<ChurnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      window.location.href = '/auth/login';
      return;
    }

    setUser(JSON.parse(userData));
    fetchData(token);
  }, []);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      
      // Fetch sales orders, factories, and UADs
      const [salesOrdersRes, factoriesRes, uadsRes] = await Promise.all([
        fetch('/api/salesorders', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/factories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/uads', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (salesOrdersRes.ok) {
        const salesOrdersData = await salesOrdersRes.json();
        setSalesOrders(salesOrdersData.salesOrders || []);
      }

      if (factoriesRes.ok) {
        const factoriesData = await factoriesRes.json();
        setFactories(factoriesData.factories || []);
      }

      if (uadsRes.ok) {
        const uadsData = await uadsRes.json();
        setUads(uadsData.uads || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSOChange = (soId: string) => {
    setSelectedSO(soId);
    setSelectedFactory('');
    setSelectedUAD('');
    setChurnItems([]);
  };

  const handleFactoryChange = (factoryId: string) => {
    setSelectedFactory(factoryId);
    setSelectedUAD('');
    setChurnItems([]);
  };

  const handleUADChange = (uadId: string) => {
    setSelectedUAD(uadId);
    const uad = uads.find(u => u.id === uadId);
    if (uad) {
      // Initialize churn items from UAD line items
      const items: ChurnItem[] = uad.lineItems.map(item => ({
        zohoItemId: item.zohoItemId,
        productName: item.productName,
        qtyToCancel: 0,
        currentQty: item.qtyUad,
        rate: item.rate,
        lineAmount: 0
      }));
      setChurnItems(items);
    }
  };

  const handleChurnItemChange = (index: number, field: keyof ChurnItem, value: any) => {
    const updatedItems = [...churnItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Recalculate line amount
    if (field === 'qtyToCancel' || field === 'rate') {
      updatedItems[index].lineAmount = updatedItems[index].qtyToCancel * updatedItems[index].rate;
    }

    setChurnItems(updatedItems);
  };

  const getFilteredFactories = () => {
    if (!selectedSO) return [];
    return factories.filter(factory => factory.salesOrder?.id === selectedSO);
  };

  const getFilteredUADs = () => {
    if (!selectedSO) return [];
    let filteredUADs = uads.filter(uad => uad.salesOrder?.id === selectedSO);
    
    // If a factory is selected, filter UADs by that factory
    if (selectedFactory) {
      filteredUADs = filteredUADs.filter(uad => uad.factory?.id === selectedFactory);
    }
    
    return filteredUADs;
  };

  const getSelectedUADData = () => {
    return uads.find(uad => uad.id === selectedUAD);
  };

  const getChurnCalculation = () => {
    if (!selectedUAD || !effectiveDate) return null;
    
    const uad = getSelectedUADData();
    if (!uad) return null;

    const effectiveDateObj = new Date(effectiveDate);
    const uadStartDate = new Date(uad.startDate);
    const uadEndDate = new Date(uad.endDate);

    return calculateChurnImpact(
      churnType,
      effectiveDateObj,
      uadStartDate,
      uadEndDate,
      churnItems.filter(item => item.qtyToCancel > 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateChurnRequest({
      churnType,
      effectiveDate,
      soId: selectedSO,
      uadId: selectedUAD,
      churnItems: churnItems.filter(item => item.qtyToCancel > 0)
    });

    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/churn', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          churnType,
          effectiveDate,
          reason,
          notes,
          soId: selectedSO,
          uadId: selectedUAD,
          churnItems: churnItems.filter(item => item.qtyToCancel > 0)
        })
      });

      if (response.ok) {
        router.push('/churn');
      } else {
        const errorData = await response.json();
        setError(errorData.error);
      }
    } catch (error) {
      console.error('Error creating churn request:', error);
      setError('Failed to create churn request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const calculation = getChurnCalculation();
  const filteredFactories = getFilteredFactories();
  const filteredUADs = getFilteredUADs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create Churn Request
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Submit a new UAD cancellation request
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/churn"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Back to Churn
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Order *
                </label>
                <select
                  value={selectedSO}
                  onChange={(e) => handleSOChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Sales Order</option>
                  {salesOrders.map((so) => (
                    <option key={so.id} value={so.id}>
                      {so.soNumber} - {so.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factory (Optional)
                </label>
                <select
                  value={selectedFactory}
                  onChange={(e) => handleFactoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedSO}
                >
                  <option value="">All Factories</option>
                  {filteredFactories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UAD *
                </label>
                <select
                  value={selectedUAD}
                  onChange={(e) => handleUADChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!selectedSO}
                >
                  <option value="">Select UAD</option>
                  {filteredUADs.map((uad) => (
                    <option key={uad.id} value={uad.id}>
                      {uad.uadNumber || `UAD-${uad.id.slice(-8)}`} - {formatDate(new Date(uad.startDate))} to {formatDate(new Date(uad.endDate))}
                      {uad.factory && ` (${uad.factory.name})`}
                    </option>
                  ))}
                </select>
                {selectedSO && filteredUADs.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    No UADs found for this sales order{selectedFactory ? ' and factory' : ''}.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Churn Type *
                </label>
                <select
                  value={churnType}
                  onChange={(e) => setChurnType(e.target.value as 'end_of_period' | 'prorated')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="end_of_period">End of Period Cancellation</option>
                  <option value="prorated">Prorated Cancellation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date *
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for cancellation"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Churn Items */}
          {selectedUAD && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items to Cancel</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty to Cancel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Line Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {churnItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.currentQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatChurnCurrency(item.rate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max={item.currentQty}
                            value={item.qtyToCancel}
                            onChange={(e) => handleChurnItemChange(index, 'qtyToCancel', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatChurnCurrency(item.lineAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Impact */}
          {calculation && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Impact</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Current Period Amount:</span>
                    <span className="text-sm text-gray-900">{formatChurnCurrency(calculation.currentPeriodAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">New Monthly Amount:</span>
                    <span className="text-sm text-gray-900">{formatChurnCurrency(calculation.newMonthlyAmount)}</span>
                  </div>
                  {calculation.refundAmount && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-green-600">Refund Amount:</span>
                      <span className="text-sm text-green-600">{formatChurnCurrency(calculation.refundAmount)}</span>
                    </div>
                  )}
                </div>
                
                {churnType === 'prorated' && (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Days Used:</span>
                      <span className="text-sm text-gray-900">{calculation.usedDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Total Days:</span>
                      <span className="text-sm text-gray-900">{calculation.totalDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Remaining Days:</span>
                      <span className="text-sm text-gray-900">{calculation.remainingDays}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/churn"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedSO || !selectedUAD || churnItems.every(item => item.qtyToCancel === 0)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Churn Request'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
