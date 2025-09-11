'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Factory {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  salesOrder: {
    id: string;
    soNumber: string;
    customerName: string;
  };
  allocations: Array<{
    id: string;
    productName: string;
    qtyFactory: number;
    rate: number;
  }>;
  uads: Array<{
    id: string;
    uadNumber?: string;
    startDate: string;
    endDate: string;
    status: string;
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

export default function FactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesOrder, setSelectedSalesOrder] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [factoriesRes, salesOrdersRes] = await Promise.all([
        fetch('/api/factories'),
        fetch('/api/salesorders')
      ]);

      if (!factoriesRes.ok || !salesOrdersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const factoriesData = await factoriesRes.json();
      const salesOrdersData = await salesOrdersRes.json();

      setFactories(factoriesData.factories || []);
      setSalesOrders(salesOrdersData.salesOrders || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFactories = () => {
    let filtered = [...factories];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(factory =>
        factory.name.toLowerCase().includes(term) ||
        factory.salesOrder.customerName.toLowerCase().includes(term) ||
        factory.salesOrder.soNumber.toLowerCase().includes(term) ||
        (factory.notes && factory.notes.toLowerCase().includes(term))
      );
    }

    // Sales Order filter
    if (selectedSalesOrder) {
      filtered = filtered.filter(factory => factory.salesOrder.id === selectedSalesOrder);
    }

    // Status filter (based on UAD status)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(factory => {
        if (statusFilter === 'active') {
          return factory.uads.some(uad => uad.status === 'Active');
        } else if (statusFilter === 'draft') {
          return factory.uads.some(uad => uad.status === 'Draft');
        } else if (statusFilter === 'ended') {
          return factory.uads.some(uad => uad.status === 'Ended');
        } else if (statusFilter === 'no-uads') {
          return factory.uads.length === 0;
        }
        return true;
      });
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(factory => 
        new Date(factory.createdAt) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(factory => 
        new Date(factory.createdAt) <= new Date(dateRange.end)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'customer':
          aValue = a.salesOrder.customerName.toLowerCase();
          bValue = b.salesOrder.customerName.toLowerCase();
          break;
        case 'soNumber':
          aValue = a.salesOrder.soNumber;
          bValue = b.salesOrder.soNumber;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredFactories = getFilteredFactories();
  const totalPages = Math.ceil(filteredFactories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFactories = filteredFactories.slice(startIndex, startIndex + itemsPerPage);

  const getTotalValue = (factory: Factory) => {
    return factory.allocations.reduce((sum, allocation) => 
      sum + (allocation.qtyFactory * allocation.rate), 0
    );
  };

  const getUADStatusCounts = (factory: Factory) => {
    const counts = { active: 0, draft: 0, ended: 0 };
    factory.uads.forEach(uad => {
      if (uad.status === 'Active') counts.active++;
      else if (uad.status === 'Draft') counts.draft++;
      else if (uad.status === 'Ended') counts.ended++;
    });
    return counts;
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
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading factories...</p>
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
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Factories</h1>
              <p className="mt-2 text-gray-600">
                Manage and view all your factory allocations
              </p>
            </div>
            <Link
              href="/factories/new"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Factory
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{factories.length}</div>
            <div className="text-gray-600">Total Factories</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {factories.filter(f => f.uads.some(u => u.status === 'Active')).length}
            </div>
            <div className="text-gray-600">Active UADs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">
              {factories.filter(f => f.uads.some(u => u.status === 'Draft')).length}
            </div>
            <div className="text-gray-600">Draft UADs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-600">
              {formatCurrency(factories.reduce((sum, f) => sum + getTotalValue(f), 0))}
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, customer, SO number..."
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
                <option value="active">Active UADs</option>
                <option value="draft">Draft UADs</option>
                <option value="ended">Ended UADs</option>
                <option value="no-uads">No UADs</option>
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
                  <option value="createdAt">Created Date</option>
                  <option value="name">Name</option>
                  <option value="customer">Customer</option>
                  <option value="soNumber">SO Number</option>
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
                Created From
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
                Created To
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
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredFactories.length)} of {filteredFactories.length} factories
        </div>

        {/* Factories Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {paginatedFactories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No factories found</h3>
              <p className="text-gray-600 mb-4">
                {filteredFactories.length === 0 && factories.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first factory'
                }
              </p>
              <Link
                href="/factories/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Factory
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UADs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allocations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedFactories.map((factory) => {
                    const uadCounts = getUADStatusCounts(factory);
                    const totalValue = getTotalValue(factory);
                    
                    return (
                      <tr key={factory.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {factory.name}
                            </div>
                            {factory.notes && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {factory.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {factory.salesOrder.soNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {factory.salesOrder.customerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {uadCounts.active > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {uadCounts.active} Active
                              </span>
                            )}
                            {uadCounts.draft > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {uadCounts.draft} Draft
                              </span>
                            )}
                            {uadCounts.ended > 0 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {uadCounts.ended} Ended
                              </span>
                            )}
                            {factory.uads.length === 0 && (
                              <span className="text-sm text-gray-500">No UADs</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {factory.allocations.length} products
                          </div>
                          <div className="text-sm text-gray-500">
                            {factory.allocations.reduce((sum, a) => sum + a.qtyFactory, 0)} total qty
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(factory.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/factories/${factory.id}`)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push(`/uads/new?factoryId=${factory.id}`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Create UAD
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
