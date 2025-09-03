'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Demo - UAD-Based Invoicing
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                See the application in action
              </p>
            </div>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📋' },
              { id: 'workflow', name: 'Workflow', icon: '🔄' },
              { id: 'examples', name: 'Examples', icon: '💡' },
              { id: 'features', name: 'Features', icon: '✨' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Application Overview
              </h2>
              <p className="text-gray-600 mb-6">
                The UAD-Based Invoicing Application is designed to streamline the process of 
                managing User Acceptance Documents and generating prorated invoices based on 
                billing cycles. Here's how it works:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sales Orders</h3>
                  <p className="text-sm text-gray-600">
                    Fetch and manage sales orders from Zoho Books with automatic line item tracking
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-4xl mb-4">🏭</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Factory Allocations</h3>
                  <p className="text-sm text-gray-600">
                    Create factory allocations and manage product quantities across locations
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Invoicing</h3>
                  <p className="text-sm text-gray-600">
                    Generate prorated invoices based on UAD dates and billing cycles
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Application Workflow
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sales Order Setup</h3>
                    <p className="text-gray-600">
                      Fetch sales orders from Zoho Books using the SO ID. The system automatically 
                      stores line items, customer details, and billing information.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Factory Allocation</h3>
                    <p className="text-gray-600">
                      Create factories and allocate products with specific quantities. This helps 
                      track where and how much of each product is being used.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">UAD Creation</h3>
                    <p className="text-gray-600">
                      Create User Acceptance Documents with start/end dates, factory assignments, 
                      and product line items. The system validates allocations.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 text-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Invoice Generation</h3>
                    <p className="text-gray-600">
                      Automatically generate invoices for each billing cycle. Calculate prorated 
                      amounts for partial periods and push to Zoho Books.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Calculation Examples
              </h2>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Example: Monthly Billing with Proration</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Sales Order:</strong> May 1 → Aug 31 (Monthly, Day 15)
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>UAD:</strong> May 10 → Jun 20, Qty=50, Rate=₹1000
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Billing Cycles:</strong>
                    </p>
                    <ul className="text-sm text-gray-700 ml-4 space-y-1">
                      <li>• May 15: 6/31 × ₹50,000 = <strong>₹9,677.42</strong></li>
                      <li>• Jun 15: Full = <strong>₹50,000.00</strong></li>
                      <li>• Jul 15: 5/30 × ₹50,000 = <strong>₹8,333.33</strong></li>
                    </ul>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Total: ₹68,010.75</strong>
                    </p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Billing Cycle Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Monthly</h4>
                      <p className="text-sm text-gray-600">Ends on billing day or last day of month</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Quarterly</h4>
                      <p className="text-sm text-gray-600">Mar 31, Jun 30, Sep 30, Dec 31</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Half-Yearly</h4>
                      <p className="text-sm text-gray-600">Jun 30, Dec 31</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Yearly</h4>
                      <p className="text-sm text-gray-600">12 months from SO start</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Key Features
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 text-xl">✓</div>
                    <div>
                      <h4 className="font-medium text-gray-900">Zoho Books Integration</h4>
                      <p className="text-sm text-gray-600">Seamless API integration for sales orders and invoices</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 text-xl">✓</div>
                    <div>
                      <h4 className="font-medium text-gray-900">Smart Proration</h4>
                      <p className="text-sm text-gray-600">Automatic calculation of prorated amounts for partial periods</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 text-xl">✓</div>
                    <div>
                      <h4 className="font-medium text-gray-900">Factory Management</h4>
                      <p className="text-sm text-gray-600">Track product allocations across different locations</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 text-xl">✓</div>
                    <div>
                      <h4 className="font-medium text-gray-900">Flexible Billing Cycles</h4>
                      <p className="text-sm text-gray-600">Support for monthly, quarterly, half-yearly, and yearly billing</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 text-xl">✓</div>
                    <div>
                      <h4 className="font-medium text-gray-900">User Authentication</h4>
                      <p className="text-sm text-gray-600">Secure JWT-based authentication system</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="text-green-500 text-xl">✓</div>
                    <div>
                      <h4 className="font-medium text-gray-900">Modern UI/UX</h4>
                      <p className="text-sm text-gray-600">Responsive design built with Tailwind CSS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to Get Started?</h3>
              <div className="flex space-x-4">
                <Link
                  href="/auth/register"
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Account
                </Link>
                <Link
                  href="/auth/login"
                  className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
