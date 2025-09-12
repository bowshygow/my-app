'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  startDate: string;
  endDate: string;
}

interface Factory {
  id: string;
  name: string;
  allocations: Array<{
    id: string;
    zohoItemId: string;
    productName: string;
    qtyFactory: number;
    rate: number;
  }>;
}

interface UADLineItem {
  factoryAllocationId: string;
  zohoItemId: string;
  productName: string;
  qtyUad: number;
  rate: number;
  maxQty: number; // Remaining allocation quantity
}

export default function NewUADPage() {
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<string>('');
  const [selectedFactory, setSelectedFactory] = useState<string>('');
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<UADLineItem[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateDDMMYYYY = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };


  useEffect(() => {
    fetchSalesOrders();
  }, []);

  useEffect(() => {
    if (selectedSalesOrder) {
      fetchFactoriesForSalesOrder(selectedSalesOrder);
    }
  }, [selectedSalesOrder]);

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      const response = await fetch('/api/salesorders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.salesOrders || []);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      setMessage({ type: 'error', text: 'Failed to load sales orders' });
    }
  };

  const fetchFactoriesForSalesOrder = async (salesOrderId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/factories?salesOrderId=${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFactories(data.factories || []);
        setSelectedFactory(''); // Reset factory selection
        setLineItems([]); // Reset line items
      }
    } catch (error) {
      console.error('Error fetching factories:', error);
      setMessage({ type: 'error', text: 'Failed to load factories' });
    }
  };

  const handleSalesOrderChange = (salesOrderId: string) => {
    setSelectedSalesOrder(salesOrderId);
    setSelectedFactory('');
    setLineItems([]);
  };

  const handleFactoryChange = (factoryId: string) => {
    setSelectedFactory(factoryId);
    setLineItems([]);
  };

  const addLineItem = () => {
    if (!selectedFactory) {
      setMessage({ type: 'error', text: 'Please select a factory first' });
      return;
    }

    const factory = factories.find(f => f.id === selectedFactory);
    if (!factory) return;

    // Find allocations that haven't been used yet
    const usedAllocationIds = lineItems.map(item => item.factoryAllocationId);
    const availableAllocations = factory.allocations.filter(allocation => 
      !usedAllocationIds.includes(allocation.id)
    );

    if (availableAllocations.length === 0) {
      setMessage({ type: 'error', text: 'All factory allocations have been used in this UAD' });
      return;
    }

    const newLineItem: UADLineItem = {
      factoryAllocationId: availableAllocations[0].id,
      zohoItemId: availableAllocations[0].zohoItemId,
      productName: availableAllocations[0].productName,
      qtyUad: 0,
      rate: availableAllocations[0].rate,
      maxQty: availableAllocations[0].qtyFactory,
    };

    setLineItems([...lineItems, newLineItem]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof UADLineItem, value: string | number) => {
    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
    setLineItems(updatedLineItems);
  };

  const updateAllocationSelection = (index: number, factoryAllocationId: string) => {
    const factory = factories.find(f => f.id === selectedFactory);
    if (!factory) return;

    const allocation = factory.allocations.find(a => a.id === factoryAllocationId);
    if (!allocation) return;

    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      factoryAllocationId: allocation.id,
      zohoItemId: allocation.zohoItemId,
      productName: allocation.productName,
      rate: allocation.rate,
      maxQty: allocation.qtyFactory,
      qtyUad: Math.min(updatedLineItems[index].qtyUad, allocation.qtyFactory), // Adjust qty if needed
    };
    setLineItems(updatedLineItems);
  };

  const validateForm = (): boolean => {
    if (!formData.startDate) {
      setMessage({ type: 'error', text: 'UAD start date is required' });
      return false;
    }

    if (!formData.endDate) {
      setMessage({ type: 'error', text: 'UAD end date is required' });
      return false;
    }

    if (!selectedSalesOrder) {
      setMessage({ type: 'error', text: 'Please select a sales order' });
      return false;
    }

    if (lineItems.length === 0) {
      setMessage({ type: 'error', text: 'At least one UAD line item is required' });
      return false;
    }

    // Validate UAD dates are within SO window
    const selectedSO = salesOrders.find(so => so.id === selectedSalesOrder);
    if (selectedSO) {
      const uadStart = new Date(formData.startDate);
      const uadEnd = new Date(formData.endDate);
      const soStart = new Date(selectedSO.startDate);
      const soEnd = new Date(selectedSO.endDate);

      if (uadStart < soStart || uadEnd > soEnd) {
        setMessage({ type: 'error', text: 'UAD dates must be within the sales order window' });
        return false;
      }

      if (uadStart >= uadEnd) {
        setMessage({ type: 'error', text: 'UAD end date must be after start date' });
        return false;
      }
    }

    // Validate quantities
    for (const lineItem of lineItems) {
      if (lineItem.qtyUad <= 0) {
        setMessage({ type: 'error', text: `Quantity for ${lineItem.productName} must be greater than 0` });
        return false;
      }
      if (lineItem.qtyUad > lineItem.maxQty) {
        setMessage({ type: 'error', text: `Quantity for ${lineItem.productName} cannot exceed ${lineItem.maxQty}` });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }

      const response = await fetch('/api/uads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          salesOrderId: selectedSalesOrder,
          factoryId: selectedFactory || null,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes,
          lineItems: lineItems.map(item => ({
            zohoItemId: item.zohoItemId,
            productName: item.productName,
            qtyUad: item.qtyUad,
            rate: item.rate,
          })),
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'UAD created successfully!' });
        setTimeout(() => {
      window.location.href = '/dashboard';
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to create UAD' });
      }
    } catch (error) {
      console.error('Error creating UAD:', error);
      setMessage({ type: 'error', text: 'Failed to create UAD' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const selectedSO = salesOrders.find(so => so.id === selectedSalesOrder);
  const selectedFactoryData = factories.find(f => f.id === selectedFactory);
  const availableAllocations = selectedFactoryData ? selectedFactoryData.allocations.filter(allocation => 
    !lineItems.some(item => item.factoryAllocationId === allocation.id)
  ) : [];

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
                Create UAD
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Create User Acceptance Document
            </h2>
            <p className="text-gray-600">
              Create a new UAD to track user acceptance and generate invoices.
            </p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sales Order Selection */}
            <div>
              <label htmlFor="salesOrder" className="block text-sm font-medium text-gray-700 mb-2">
                Sales Order *
              </label>
                              <select
                  id="salesOrder"
                  value={selectedSalesOrder}
                  onChange={(e) => handleSalesOrderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                <option value="">Select a sales order...</option>
                {salesOrders.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.soNumber} - {so.customerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Factory Selection */}
            {selectedSalesOrder && (
              <div>
                <label htmlFor="factory" className="block text-sm font-medium text-gray-700 mb-2">
                  Factory (Optional)
                </label>
                <select
                  id="factory"
                  value={selectedFactory}
                  onChange={(e) => handleFactoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">No factory selected</option>
                  {factories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name} ({factory.allocations.length} allocations)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Select a factory if this UAD is specific to a particular facility.
                </p>
              </div>
            )}

            {/* UAD Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  UAD Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={selectedSO?.startDate}
                  max={selectedSO?.endDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  UAD End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || selectedSO?.startDate}
                  max={selectedSO?.endDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            {/* Sales Order Date Range Info */}
            {selectedSO && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Sales Order Date Range</h4>
                <div className="text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Start Date:</span>
                    <span>{formatDateDDMMYYYY(selectedSO.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Date:</span>
                    <span>{formatDateDDMMYYYY(selectedSO.endDate)}</span>
                  </div>
            </div>
            </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Additional notes about the UAD..."
              />
            </div>

            {/* UAD Line Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">UAD Line Items</h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  disabled={!selectedFactory || availableAllocations.length === 0}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Line Item
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <p>No line items added yet.</p>
                  <p className="text-sm mt-1">
                    {!selectedFactory 
                      ? 'Select a factory to add line items.' 
                      : 'Add line items from factory allocations to continue.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty UAD
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate (₹)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Max Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lineItems.map((lineItem, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <select
                              value={lineItem.factoryAllocationId}
                              onChange={(e) => updateAllocationSelection(index, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              {selectedFactoryData?.allocations.map((allocation) => (
                                <option key={allocation.id} value={allocation.id}>
                                  {allocation.productName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max={lineItem.maxQty}
                              value={lineItem.qtyUad}
                              onChange={(e) => updateLineItem(index, 'qtyUad', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₹{lineItem.rate.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {lineItem.maxQty}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {lineItems.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Validation Summary</h4>
                  <div className="text-sm text-blue-800">
                    {lineItems.map((lineItem, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{lineItem.productName}:</span>
                        <span className={lineItem.qtyUad > lineItem.maxQty ? 'text-red-600 font-medium' : ''}>
                          {lineItem.qtyUad} / {lineItem.maxQty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>


            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || lineItems.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create UAD'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
