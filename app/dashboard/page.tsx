'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  startDate: string;
  endDate: string;
  billingCycle: string;
  currencyCode: string;
  lineItems: any[];
  factories: any[];
  uads: any[];
  invoices: any[];
  createdAt: string;
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
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
  createdAt: string;
  salesOrder: {
    soNumber: string;
    customerName: string;
  };
  factory?: {
    name: string;
  };
}

interface Invoice {
  id: string;
  externalInvoiceNumber?: string;
  invoiceDate: string;
  amount: number;
  status: string;
  salesOrder: {
    soNumber: string;
    customerName: string;
  };
}

export default function DashboardPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [uads, setUads] = useState<UAD[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
    fetchDashboardData(token);
  }, []);

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [salesOrdersRes, factoriesRes, uadsRes, invoicesRes] = await Promise.all([
        fetch('/api/salesorders', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/factories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/uads', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/invoices', {
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

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-xl text-gray-900 mb-2">Error Loading Dashboard</p>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => fetchDashboardData(localStorage.getItem('token') || '')}
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
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {user?.name || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
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
              <div className="text-blue-600 text-2xl mr-4">📋</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{salesOrders.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-green-600 text-2xl mr-4">🏭</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Factories</p>
                <p className="text-2xl font-semibold text-gray-900">{factories.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-purple-600 text-2xl mr-4">📄</div>
              <div>
                <p className="text-sm font-medium text-gray-600">UADs</p>
                <p className="text-2xl font-semibold text-gray-900">{uads.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="text-orange-600 text-2xl mr-4">💰</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Invoices</p>
                <p className="text-2xl font-semibold text-gray-900">{invoices.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/sales-orders/new"
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors text-center"
            >
              <div className="text-blue-600 text-xl mb-2">➕</div>
              <h4 className="font-medium text-gray-900">Add Sales Order</h4>
              <p className="text-sm text-gray-600">Fetch from Zoho</p>
            </Link>
            
            <Link
              href="/factories/new"
              className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors text-center"
            >
              <div className="text-green-600 text-xl mb-2">🏭</div>
              <h4 className="font-medium text-gray-900">Add Factory</h4>
              <p className="text-sm text-gray-600">Create allocations</p>
            </Link>
            
            <Link
              href="/uads/new"
              className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors text-center"
            >
              <div className="text-purple-600 text-xl mb-2">📄</div>
              <h4 className="font-medium text-gray-900">Create UAD</h4>
              <p className="text-sm text-gray-600">User acceptance doc</p>
            </Link>
            
            <Link
              href="/invoices"
              className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-colors text-center"
            >
              <div className="text-orange-600 text-xl mb-2">💰</div>
              <h4 className="font-medium text-gray-900">View Invoices</h4>
              <p className="text-sm text-gray-600">Manage billing</p>
            </Link>
          </div>
        </div>

        {/* Recent Sales Orders */}
        {salesOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales Orders</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Cycle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Items</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesOrders.slice(0, 5).map((so) => (
                    <tr key={so.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {so.soNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {so.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(new Date(so.startDate))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {so.billingCycle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {so.lineItems.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {salesOrders.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  href="/sales-orders"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View all {salesOrders.length} sales orders →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {salesOrders.length === 0 && factories.length === 0 && uads.length === 0 && invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity to display</p>
              <p className="text-sm mt-2">Start by adding a sales order or creating a UAD</p>
            </div>
          ) : (
            <div className="space-y-4">
              {salesOrders.slice(0, 3).map((so) => (
                <div key={so.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-blue-600">📋</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Sales Order {so.soNumber} created for {so.customerName}
                    </p>
                                         <p className="text-xs text-gray-500">
                       {formatDate(new Date(so.createdAt))}
                     </p>
                  </div>
                </div>
              ))}
              {factories.slice(0, 2).map((factory) => (
                <div key={factory.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="text-green-600">🏭</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Factory {factory.name} created for {factory.salesOrder.soNumber}
                    </p>
                                         <p className="text-xs text-gray-500">
                       {formatDate(new Date(factory.createdAt))}
                     </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
