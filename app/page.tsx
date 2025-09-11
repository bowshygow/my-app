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
}

export default function Home() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you would fetch from your API
    // For now, we'll show a demo message
    setLoading(false);
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                UAD-Based Invoicing
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage sales orders, UADs, and generate invoices
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/auth/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome to UAD-Based Invoicing
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              This application helps you manage User Acceptance Documents (UADs) and generate 
              prorated invoices based on billing cycles. Integrate with Zoho Books for seamless 
              invoice management with automatic aggregation.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/demo"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                View Demo
              </Link>
              <Link
                href="/docs"
                className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
              >
                Documentation
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-blue-600 text-2xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Order Management</h3>
            <p className="text-gray-600 text-sm">
              Fetch and manage sales orders from Zoho Books with automatic line item tracking.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-green-600 text-2xl mb-4">🏭</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Factory Allocations</h3>
            <p className="text-gray-600 text-sm">
              Create factory allocations and manage product quantities across different locations.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-purple-600 text-2xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Invoicing</h3>
            <p className="text-gray-600 text-sm">
              Generate prorated invoices based on UAD dates and billing cycles with automatic aggregation.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/sales-orders"
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
            >
              <div className="text-blue-600 text-xl mb-2">📋</div>
              <h4 className="font-medium text-gray-900">Sales Orders</h4>
              <p className="text-sm text-gray-600">View all sales orders</p>
            </Link>
            
            <Link
              href="/factories"
              className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
            >
              <div className="text-green-600 text-xl mb-2">🏭</div>
              <h4 className="font-medium text-gray-900">Factories</h4>
              <p className="text-sm text-gray-600">Manage factory allocations</p>
            </Link>
            
            <Link
              href="/uads"
              className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors"
            >
              <div className="text-purple-600 text-xl mb-2">📄</div>
              <h4 className="font-medium text-gray-900">UADs</h4>
              <p className="text-sm text-gray-600">User acceptance documents</p>
            </Link>
            
            <Link
              href="/invoices"
              className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-colors"
            >
              <div className="text-orange-600 text-xl mb-2">💰</div>
              <h4 className="font-medium text-gray-900">Invoices</h4>
              <p className="text-sm text-gray-600">View and manage invoices</p>
            </Link>
            
            <Link
              href="/churn"
              className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors"
            >
              <div className="text-red-600 text-xl mb-2">🔄</div>
              <h4 className="font-medium text-gray-900">Churn Management</h4>
              <p className="text-sm text-gray-600">Manage UAD cancellations</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}