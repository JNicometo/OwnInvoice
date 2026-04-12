import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, FileText, Edit, Eye, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency } from '../utils/formatting';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';

function Dashboard({ onNavigateToInvoices }) {
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getOptimizedDashboardStats, getAllInvoices } = useDatabase();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, invoicesData] = await Promise.all([
        getOptimizedDashboardStats(),
        getAllInvoices()
      ]);
      setStats(statsData);
      setRecentInvoices(invoicesData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [getOptimizedDashboardStats, getAllInvoices]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handleFormClose = async (reload) => {
    setShowForm(false);
    setSelectedInvoice(null);
    if (reload) {
      await loadDashboardData();
    }
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setSelectedInvoice(null);
  };

  if (showForm) {
    return <InvoiceForm invoice={selectedInvoice} onClose={handleFormClose} />;
  }

  if (showPreview) {
    return <InvoicePreview invoice={selectedInvoice} onClose={handlePreviewClose} />;
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Revenue',
      value: stats?.total_revenue || 0,
      icon: DollarSign,
      bgGradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-600',
      description: 'All-time earnings',
      filter: null, // No filter for total
    },
    {
      name: 'Total Invoices',
      value: stats?.total_invoices || 0,
      icon: FileText,
      bgGradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500',
      textColor: 'text-purple-600',
      description: 'Created invoices',
      isCount: true,
      filter: null, // Show all invoices
    },
    {
      name: 'Paid',
      value: stats?.paid_amount || 0,
      icon: CheckCircle2,
      bgGradient: 'bg-gradient-to-br from-green-500 to-green-600',
      iconBg: 'bg-green-500',
      textColor: 'text-green-600',
      description: 'Received payments',
      percentage: stats?.total_revenue ? ((stats?.paid_amount || 0) / stats.total_revenue * 100).toFixed(1) : 0,
      filter: 'paid',
    },
    {
      name: 'Pending',
      value: stats?.pending_amount || 0,
      icon: Clock,
      bgGradient: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      iconBg: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      description: 'Awaiting payment',
      percentage: stats?.total_revenue ? ((stats?.pending_amount || 0) / stats.total_revenue * 100).toFixed(1) : 0,
      filter: 'pending',
    },
    {
      name: 'Overdue',
      value: stats?.overdue_amount || 0,
      icon: AlertTriangle,
      bgGradient: 'bg-gradient-to-br from-red-500 to-red-600',
      iconBg: 'bg-red-500',
      textColor: 'text-red-600',
      description: 'Needs attention',
      percentage: stats?.total_revenue ? ((stats?.overdue_amount || 0) / stats.total_revenue * 100).toFixed(1) : 0,
      highlight: (stats?.overdue_amount || 0) > 0,
      filter: 'overdue',
    },
  ];

  const handleStatClick = (filter) => {
    if (onNavigateToInvoices) {
      onNavigateToInvoices(filter);
    }
  };

  return (
    <div className="p-4 lg:p-6 xl:p-8">
      <div className="mb-6 xl:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm lg:text-base">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6 mb-6 xl:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isClickable = stat.filter !== undefined;
          return (
            <div
              key={stat.name}
              onClick={() => isClickable && handleStatClick(stat.filter)}
              className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all hover:shadow-xl ${
                stat.highlight ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'
              } ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.name}</p>
                  <p className="text-sm text-gray-400 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.iconBg} p-2.5 rounded-lg shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="mt-3 text-center">
                <p className={`text-3xl font-bold ${stat.textColor}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
                  {stat.isCount ? stat.value : formatCurrency(stat.value)}
                </p>

                {stat.percentage !== undefined && stat.percentage > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>of total</span>
                      <span className="font-semibold">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${stat.bgGradient}`}
                        style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {isClickable && (
                  <p className="text-xs text-gray-400 mt-2">Click to view</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
        </div>
        <div className="p-6">
          {recentInvoices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No invoices yet. Create your first invoice to get started!</p>
          ) : (
            <div className="space-y-4">
              {recentInvoices.map((invoice) => {
                const statusConfig = {
                  paid: {
                    bg: 'bg-green-100',
                    text: 'text-green-800',
                    border: 'border-green-300',
                    icon: CheckCircle2,
                  },
                  pending: {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-800',
                    border: 'border-yellow-300',
                    icon: Clock,
                  },
                  overdue: {
                    bg: 'bg-red-100',
                    text: 'text-red-800',
                    border: 'border-red-300',
                    icon: AlertTriangle,
                  },
                  draft: {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    border: 'border-gray-300',
                    icon: FileText,
                  },
                };

                const config = statusConfig[invoice.status] || statusConfig.draft;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={invoice.id}
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all border-l-4 ${config.border}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${config.bg} ${config.text}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{invoice.client_name}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          invoice.status === 'paid' ? 'text-green-600' :
                          invoice.status === 'overdue' ? 'text-red-600' :
                          'text-gray-900'
                        }`}>
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(invoice)}
                          className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
