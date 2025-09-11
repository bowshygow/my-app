'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { getChurnStatusColor, getChurnTypeDisplayName } from '@/lib/churn';

interface ChurnRequest {
  id: string;
  churnType: string;
  effectiveDate: string;
  reason?: string;
  notes?: string;
  status: string;
  totalRefund?: number;
  createdAt: string;
  processedAt?: string;
  currentPeriodAmount: number;
  refundAmount?: number;
  newMonthlyAmount: number;
  salesOrder: {
    soNumber: string;
    customerName: string;
    billingCycle: string;
  };
  uad: {
    id: string;
    uadNumber?: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  churnItems: Array<{
    id: string;
    zohoItemId: string;
    productName: string;
    qtyToCancel: number;
    currentQty: number;
    rate: number;
    lineAmount: number;
  }>;
  user: {
    name?: string;
    email: string;
  };
}

export default function ChurnPage() {
  const [churnRequests, setChurnRequests] = useState<ChurnRequest[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchChurnRequests(token);
  }, []);

  const fetchChurnRequests = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/churn', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setChurnRequests(data.churnRequests || []);
      } else {
        setError('Failed to load churn requests');
      }
    } catch (error) {
      console.error('Error fetching churn requests:', error);
      setError('Failed to load churn requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (churnId: string, action: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/churn/${churnId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        // Refresh the list
        fetchChurnRequests(token!);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading churn requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-xl text-gray-900 mb-2">Error Loading Churn Requests</p>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => fetchChurnRequests(localStorage.getItem('token') || '')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
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
                Churn Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage UAD cancellations and churn requests
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/churn/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Churn Request
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-yellow-600 text-2xl mr-4">⏳</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {churnRequests.filter(r => r.status === 'Pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-blue-600 text-2xl mr-4">✅</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {churnRequests.filter(r => r.status === 'Approved').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-4">✅</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {churnRequests.filter(r => r.status === 'Processed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-red-600 text-2xl mr-4">❌</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {churnRequests.filter(r => r.status === 'Cancelled').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Churn Requests Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Churn Requests</h3>
          </div>
          
          {churnRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-xl text-gray-900 mb-2">No churn requests found</p>
              <p className="text-gray-600 mb-6">Create your first churn request to get started</p>
              <Link
                href="/churn/new"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Churn Request
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Financial Impact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {churnRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{request.salesOrder.customerName}</div>
                          <div className="text-gray-500">{request.salesOrder.soNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getChurnTypeDisplayName(request.churnType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(new Date(request.effectiveDate))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getChurnStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div>Current: {formatCurrency(request.currentPeriodAmount)}</div>
                          <div>New: {formatCurrency(request.newMonthlyAmount)}</div>
                          {request.refundAmount && (
                            <div className="text-green-600">
                              Refund: {formatCurrency(request.refundAmount)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          href={`/churn/${request.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        {request.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleAction(request.id, 'approve')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(request.id, 'cancel')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {request.status === 'Approved' && (
                          <button
                            onClick={() => handleAction(request.id, 'process')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Process
                          </button>
                        )}
                      </td>
                    </tr>
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
