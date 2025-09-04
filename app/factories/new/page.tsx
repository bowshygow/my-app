'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  lineItems: Array<{
    zohoItemId: string;
    name: string;
    qtySo: number;
    rate: number;
  }>;
}

interface ProductAllocation {
  zohoItemId: string;
  productName: string;
  qtyFactory: number;
  rate: number;
  maxQty: number;
}

export default function NewFactoryPage() {
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
  });
  const [allocations, setAllocations] = useState<ProductAllocation[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  useEffect(() => {
    fetchSalesOrders();
  }, []);

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

  const handleSalesOrderChange = (salesOrderId: string) => {
    setSelectedSalesOrder(salesOrderId);
    setAllocations([]); // Reset allocations when sales order changes
  };

  const addAllocation = () => {
    if (!selectedSalesOrder) {
      setMessage({ type: 'error', text: 'Please select a sales order first' });
      return;
    }

    const salesOrder = salesOrders.find(so => so.id === selectedSalesOrder);
    if (!salesOrder) return;

    // Find products that haven't been allocated yet
    const allocatedProductIds = allocations.map(a => a.zohoItemId);
    const availableProducts = salesOrder.lineItems.filter(item => !allocatedProductIds.includes(item.zohoItemId));

    if (availableProducts.length === 0) {
      setMessage({ type: 'error', text: 'All products from this sales order have been allocated' });
      return;
    }

    const newAllocation: ProductAllocation = {
      zohoItemId: availableProducts[0].zohoItemId,
      productName: availableProducts[0].name,
      qtyFactory: 0,
      rate: availableProducts[0].rate,
      maxQty: availableProducts[0].qtySo,
    };

    setAllocations([...allocations, newAllocation]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof ProductAllocation, value: string | number) => {
    const updatedAllocations = [...allocations];
    updatedAllocations[index] = { ...updatedAllocations[index], [field]: value };
    setAllocations(updatedAllocations);
  };

  const updateProductSelection = (index: number, zohoItemId: string) => {
    const salesOrder = salesOrders.find(so => so.id === selectedSalesOrder);
    if (!salesOrder) return;

    const lineItem = salesOrder.lineItems.find(item => item.zohoItemId === zohoItemId);
    if (!lineItem) return;

    const updatedAllocations = [...allocations];
    updatedAllocations[index] = {
      ...updatedAllocations[index],
      zohoItemId: lineItem.zohoItemId,
      productName: lineItem.name,
      rate: lineItem.rate,
      maxQty: lineItem.qtySo,
      qtyFactory: Math.min(updatedAllocations[index].qtyFactory, lineItem.qtySo), // Adjust qty if needed
    };
    setAllocations(updatedAllocations);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Factory name is required' });
      return false;
    }

    if (!selectedSalesOrder) {
      setMessage({ type: 'error', text: 'Please select a sales order' });
      return false;
    }

    if (allocations.length === 0) {
      setMessage({ type: 'error', text: 'At least one product allocation is required' });
      return false;
    }

    // Validate quantities
    for (const allocation of allocations) {
      if (allocation.qtyFactory <= 0) {
        setMessage({ type: 'error', text: `Quantity for ${allocation.productName} must be greater than 0` });
        return false;
      }
      if (allocation.qtyFactory > allocation.maxQty) {
        setMessage({ type: 'error', text: `Quantity for ${allocation.productName} cannot exceed ${allocation.maxQty}` });
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

      const response = await fetch('/api/factories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          notes: formData.notes,
          salesOrderId: selectedSalesOrder,
          allocations: allocations.map(a => ({
            zohoItemId: a.zohoItemId,
            productName: a.productName,
            qtyFactory: a.qtyFactory,
            rate: a.rate,
          })),
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Factory created successfully!' });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to create factory' });
      }
    } catch (error) {
      console.error('Error creating factory:', error);
      setMessage({ type: 'error', text: 'Failed to create factory' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const selectedSO = salesOrders.find(so => so.id === selectedSalesOrder);
  const availableProducts = selectedSO ? selectedSO.lineItems.filter(item => 
    !allocations.some(a => a.zohoItemId === item.zohoItemId)
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
                Add Factory
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
              Create New Factory
            </h2>
            <p className="text-gray-600">
              Create a new factory to allocate products from sales orders.
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
            {/* Factory Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Factory Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Main Production Facility"
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
                  onChange={(e) => handleSalesOrderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-green-500 focus:border-green-500"
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
            </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Additional notes about the factory..."
              />
            </div>

            {/* Product Allocations */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Product Allocations</h3>
                <button
                  type="button"
                  onClick={addAllocation}
                  disabled={!selectedSalesOrder || availableProducts.length === 0}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Product
                </button>
              </div>

              {allocations.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <p>No product allocations added yet.</p>
                  <p className="text-sm mt-1">Select a sales order and add products to continue.</p>
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
                          Qty Factory
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
                      {allocations.map((allocation, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <select
                              value={allocation.zohoItemId}
                              onChange={(e) => updateProductSelection(index, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                              {selectedSO?.lineItems.map((item) => (
                                <option key={item.zohoItemId} value={item.zohoItemId}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max={allocation.maxQty}
                              value={allocation.qtyFactory}
                              onChange={(e) => updateAllocation(index, 'qtyFactory', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₹{allocation.rate.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {allocation.maxQty}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeAllocation(index)}
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

              {allocations.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Validation Summary</h4>
                  <div className="text-sm text-blue-800">
                    {allocations.map((allocation, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{allocation.productName}:</span>
                        <span className={allocation.qtyFactory > allocation.maxQty ? 'text-red-600 font-medium' : ''}>
                          {allocation.qtyFactory} / {allocation.maxQty}
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || allocations.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Factory'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
