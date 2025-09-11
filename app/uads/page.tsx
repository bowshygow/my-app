'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UAD {
  id: string;
  uadNumber?: string;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
  createdAt: string;
  salesOrder: {
    id: string;
    soNumber: string;
    customerName: string;
  };
  factory?: {
    id: string;
    name: string;
  };
  lineItems: Array<{
    id: string;
    productName: string;
    qtyUad: number;
    rate: number;
  }>;
  invoices: Array<{
    id: string;
    amount: number;
    invoiceDate: string;
  }>;
}

interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
}

interface Factory {
  id: string;
  name: string;
}

export default function UADsPage() {
  const [uads, setUads] = useState<UAD[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesOrder, setSelectedSalesOrder] = useState('');
  const [selectedFactory, setSelectedFactory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    fetchData(token);
  }, []);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      const [uadsRes, salesOrdersRes, factoriesRes] = await Promise.all([
        fetch('/api/uads', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/salesorders', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/factories', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!uadsRes.ok || !salesOrdersRes.ok || !factoriesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const uadsData = await uadsRes.json();
      const salesOrdersData = await salesOrdersRes.json();
      const factoriesData = await factoriesRes.json();

      setUads(uadsData.uads || []);
      setSalesOrders(salesOrdersData.salesOrders || []);
      setFactories(factoriesData.factories || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUADs = () => {
    let filtered = [...uads];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(uad =>
        (uad.uadNumber && uad.uadNumber.toLowerCase().includes(term)) ||
        uad.salesOrder.customerName.toLowerCase().includes(term) ||
        uad.salesOrder.soNumber.toLowerCase().includes(term) ||
        (uad.factory && uad.factory.name.toLowerCase().includes(term)) ||
        (uad.notes && uad.notes.toLowerCase().includes(term)) ||
        uad.lineItems.some(item => item.productName.toLowerCase().includes(term))
      );
    }

    // Sales Order filter
    if (selectedSalesOrder) {
      filtered = filtered.filter(uad => uad.salesOrder.id === selectedSalesOrder);
    }

    // Factory filter
    if (selectedFactory) {
      filtered = filtered.filter(uad => uad.factory?.id === selectedFactory);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(uad => uad.status === statusFilter);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(uad => 
        new Date(uad.startDate) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(uad => 
        new Date(uad.endDate) <= new Date(dateRange.end)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'uadNumber':
          aValue = a.uadNumber || '';
          bValue = b.uadNumber || '';
          break;
        case 'customer':
          aValue = a.salesOrder.customerName.toLowerCase();
          bValue = b.salesOrder.customerName.toLowerCase();
          break;
        case 'soNumber':
          aValue = a.salesOrder.soNumber;
          bValue = b.salesOrder.soNumber;
          break;
        case 'factory':
          aValue = a.factory?.name || '';
          bValue = b.factory?.name || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'startDate':
        default:
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredUADs = getFilteredUADs();
  const totalPages = Math.ceil(filteredUADs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUADs = filteredUADs.slice(startIndex, startIndex + itemsPerPage);

  const getTotalValue = (uad: UAD) => {
    return uad.lineItems.reduce((sum, item) => 
      sum + (item.qtyUad * item.rate), 0
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSalesOrder('');
    setSelectedFactory('');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  const getStatusCounts = () => {
    const counts = { active: 0, draft: 0, ended: 0 };
    uads.forEach(uad => {
      if (uad.status === 'Active') counts.active++;
      else if (uad.status === 'Draft') counts.draft++;
      else if (uad.status === 'Ended') counts.ended++;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading UADs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              if (token) {
                fetchData(token);
              } else {
                window.location.href = '/auth/login';
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UADs</h1>
              <p className="mt-2 text-gray-600">
                Manage and view all your User Acceptance Documents
              </p>
            </div>
            <Link
              href="/uads/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New UAD
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{uads.length}</div>
            <div className="text-gray-600">Total UADs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
            <div className="text-gray-600">Active</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.draft}</div>
            <div className="text-gray-600">Draft</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">
              {formatCurrency(uads.reduce((sum, uad) => sum + getTotalValue(uad), 0))}
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by UAD number, customer, product..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sales Order Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sales Order
              </label>
              <select
                value={selectedSalesOrder}
                onChange={(e) => setSelectedSalesOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sales Orders</option>
                {salesOrders.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.soNumber} - {so.customerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Factory Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Factory
              </label>
              <select
                value={selectedFactory}
                onChange={(e) => setSelectedFactory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Factories</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Ended">Ended</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="startDate">Start Date</option>
                  <option value="uadNumber">UAD Number</option>
                  <option value="customer">Customer</option>
                  <option value="soNumber">SO Number</option>
                  <option value="factory">Factory</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date From
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date To
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUADs.length)} of {filteredUADs.length} UADs
        </div>

        {/* UADs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {paginatedUADs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No UADs found</h3>
              <p className="text-gray-600 mb-4">
                {filteredUADs.length === 0 && uads.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first UAD'
                }
              </p>
              <Link
                href="/uads/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create UAD
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UAD
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUADs.map((uad) => {
                    const totalValue = getTotalValue(uad);
                    
                    return (
                      <tr key={uad.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {uad.uadNumber || `UAD-${uad.id.slice(-8)}`}
                            </div>
                            {uad.notes && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {uad.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {uad.salesOrder.soNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {uad.salesOrder.customerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {uad.factory?.name || 'No Factory'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(uad.startDate)} - {formatDate(uad.endDate)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {Math.ceil((new Date(uad.endDate).getTime() - new Date(uad.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(uad.status)}`}>
                            {uad.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {uad.lineItems.length} products
                          </div>
                          <div className="text-sm text-gray-500">
                            {uad.lineItems.reduce((sum, item) => sum + item.qtyUad, 0)} total qty
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/uads/${uad.id}`)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/churn/new?uadId=${uad.id}`)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Churn
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
