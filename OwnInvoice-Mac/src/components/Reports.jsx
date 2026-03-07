import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Download,
  Calendar,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import Papa from 'papaparse';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate } from '../utils/formatting';

function Reports() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [dateRange, setDateRange] = useState('12months');

  const { getAllInvoices, getAllClients } = useDatabase();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, clientsData] = await Promise.all([
        getAllInvoices(),
        getAllClients()
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate key metrics
  const calculateMetrics = () => {
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const thisMonth = new Date();
    const monthRevenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.date);
        return inv.status === 'paid' &&
          invDate.getMonth() === thisMonth.getMonth() &&
          invDate.getFullYear() === thisMonth.getFullYear();
      })
      .reduce((sum, inv) => sum + inv.total, 0);

    const avgInvoiceValue = invoices.length > 0
      ? invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length
      : 0;

    const outstandingBalance = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    return {
      totalRevenue,
      monthRevenue,
      avgInvoiceValue,
      outstandingBalance
    };
  };

  // Generate monthly revenue data for charts
  const getMonthlyRevenueData = () => {
    const months = [];
    const today = new Date();

    // Get last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const revenue = invoices
        .filter(inv => {
          const invDate = new Date(inv.date);
          return inv.status === 'paid' &&
            invDate.getMonth() === date.getMonth() &&
            invDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.total, 0);

      months.push({
        month: monthName,
        revenue: revenue
      });
    }

    return months;
  };

  // Get top clients by revenue
  const getTopClients = () => {
    const clientRevenue = {};

    invoices.forEach(inv => {
      if (inv.status === 'paid') {
        if (!clientRevenue[inv.client_id]) {
          clientRevenue[inv.client_id] = {
            client_name: inv.client_name,
            revenue: 0,
            invoice_count: 0
          };
        }
        clientRevenue[inv.client_id].revenue += inv.total;
        clientRevenue[inv.client_id].invoice_count += 1;
      }
    });

    // Calculate outstanding balance per client
    const clientOutstanding = {};
    invoices.forEach(inv => {
      if (inv.status !== 'paid') {
        if (!clientOutstanding[inv.client_id]) {
          clientOutstanding[inv.client_id] = 0;
        }
        clientOutstanding[inv.client_id] += inv.total;
      }
    });

    return Object.entries(clientRevenue)
      .map(([clientId, data]) => ({
        ...data,
        outstanding: clientOutstanding[clientId] || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  // Get revenue by client for pie chart
  const getRevenueByClient = () => {
    const topClients = getTopClients().slice(0, 5);
    return topClients.map(client => ({
      name: client.client_name,
      value: client.revenue
    }));
  };

  // Get outstanding invoices
  const getOutstandingInvoices = () => {
    return invoices
      .filter(inv => inv.status !== 'paid')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  };

  // Calculate tax summary
  const getTaxSummary = () => {
    const months = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return inv.status === 'paid' &&
          invDate.getMonth() === date.getMonth() &&
          invDate.getFullYear() === date.getFullYear();
      });

      const sales = monthInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
      const tax = monthInvoices.reduce((sum, inv) => sum + inv.tax, 0);

      months.push({
        month: monthName,
        sales: sales,
        tax: tax
      });
    }

    return months;
  };

  // Accounts Receivable Aging Report
  const getARAgingReport = () => {
    const today = new Date();
    const aging = {};

    invoices.forEach(inv => {
      if (inv.status !== 'paid') {
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        if (!aging[inv.client_id]) {
          aging[inv.client_id] = {
            client_name: inv.client_name,
            current: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            days_over_90: 0,
            total: 0
          };
        }

        if (daysOverdue < 0) {
          aging[inv.client_id].current += inv.total;
        } else if (daysOverdue <= 30) {
          aging[inv.client_id].days_1_30 += inv.total;
        } else if (daysOverdue <= 60) {
          aging[inv.client_id].days_31_60 += inv.total;
        } else if (daysOverdue <= 90) {
          aging[inv.client_id].days_61_90 += inv.total;
        } else {
          aging[inv.client_id].days_over_90 += inv.total;
        }

        aging[inv.client_id].total += inv.total;
      }
    });

    return Object.values(aging).sort((a, b) => b.total - a.total);
  };

  // Export functions
  const exportToCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportOutstandingInvoices = () => {
    const data = getOutstandingInvoices().map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Client': inv.client_name,
      'Date': formatDate(inv.date),
      'Due Date': formatDate(inv.due_date),
      'Amount': inv.total,
      'Status': inv.status
    }));
    exportToCSV(data, 'outstanding_invoices');
  };

  const exportMonthlyRevenue = () => {
    const data = getMonthlyRevenueData().map(month => ({
      'Month': month.month,
      'Revenue': month.revenue
    }));
    exportToCSV(data, 'monthly_revenue');
  };

  const exportAllInvoices = () => {
    const data = invoices.map(inv => ({
      'Invoice Number': inv.invoice_number,
      'Client': inv.client_name,
      'Date': formatDate(inv.date),
      'Due Date': formatDate(inv.due_date),
      'Subtotal': inv.subtotal || '',
      'Tax': inv.tax_amount || '',
      'Total': inv.total,
      'Status': inv.status,
      'Payment Date': inv.payment_date ? formatDate(inv.payment_date) : ''
    }));
    exportToCSV(data, 'all_invoices');
  };

  const exportTopClients = () => {
    const data = getTopClients().map(client => ({
      'Client Name': client.client_name,
      'Total Revenue': client.revenue,
      'Invoice Count': client.invoice_count,
      'Outstanding Balance': client.outstanding
    }));
    exportToCSV(data, 'top_clients');
  };

  const exportTaxSummary = () => {
    const data = getTaxSummary().map(month => ({
      'Month': month.month,
      'Sales': month.sales,
      'Tax Collected': month.tax,
      'Total': month.sales + month.tax
    }));
    exportToCSV(data, 'tax_summary');
  };

  const exportARAgingReport = () => {
    const data = getARAgingReport().map(client => ({
      'Client Name': client.client_name,
      'Current (Not Due)': client.current,
      '1-30 Days': client.days_1_30,
      '31-60 Days': client.days_31_60,
      '61-90 Days': client.days_61_90,
      'Over 90 Days': client.days_over_90,
      'Total Outstanding': client.total
    }));
    exportToCSV(data, 'ar_aging_report');
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const metrics = calculateMetrics();
  const monthlyData = getMonthlyRevenueData();
  const topClients = getTopClients();
  const revenueByClient = getRevenueByClient();
  const outstandingInvoices = getOutstandingInvoices();
  const taxSummary = getTaxSummary();
  const arAgingData = getARAgingReport();

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">Business insights and financial reports</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">This Month</h3>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.monthRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Avg Invoice Value</h3>
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.avgInvoiceValue)}</p>
          <p className="text-xs text-gray-500 mt-1">{invoices.length} total invoices</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.outstandingBalance)}</p>
          <p className="text-xs text-gray-500 mt-1">{outstandingInvoices.length} unpaid invoices</p>
        </div>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Line Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Monthly Revenue (Last 12 Months)</h2>
            <div className="flex gap-2">
              <button
                onClick={exportMonthlyRevenue}
                className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Monthly CSV
              </button>
              <button
                onClick={exportAllInvoices}
                className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                All Invoices CSV
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Client Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue by Top Clients</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={revenueByClient}
                cx="50%"
                cy="45%"
                labelLine={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueByClient.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value) => {
                  const entry = revenueByClient.find(e => e.name === value);
                  const total = revenueByClient.reduce((sum, e) => sum + e.value, 0);
                  const pct = total > 0 ? ((entry?.value / total) * 100).toFixed(0) : 0;
                  return `${value} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Top Clients by Revenue</h2>
          <button
            onClick={exportTopClients}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoices</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topClients.map((client, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                    {formatCurrency(client.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{client.invoice_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                    {formatCurrency(client.outstanding)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding Invoices */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Outstanding Invoices</h2>
          <button
            onClick={exportOutstandingInvoices}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {outstandingInvoices.sort((a, b) => b.total - a.total).slice(0, 20).map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(invoice.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(invoice.due_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-orange-600">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {outstandingInvoices.length > 20 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing top 20 of {outstandingInvoices.length} outstanding invoices. Export CSV for full list.
            </div>
          )}
        </div>
      </div>

      {/* Accounts Receivable Aging Report */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Accounts Receivable Aging</h2>
            <p className="text-sm text-gray-500 mt-1">Outstanding amounts by client and age</p>
          </div>
          <button
            onClick={exportARAgingReport}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">1-30 Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60 Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90 Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Over 90</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {arAgingData.slice(0, 20).map((client, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                    {formatCurrency(client.current)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                    {formatCurrency(client.days_1_30)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                    {formatCurrency(client.days_31_60)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                    {formatCurrency(client.days_61_90)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-700 font-semibold">
                    {formatCurrency(client.days_over_90)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    {formatCurrency(client.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
              <tr>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                  {formatCurrency(arAgingData.reduce((sum, c) => sum + c.current, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-yellow-600">
                  {formatCurrency(arAgingData.reduce((sum, c) => sum + c.days_1_30, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-orange-600">
                  {formatCurrency(arAgingData.reduce((sum, c) => sum + c.days_31_60, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                  {formatCurrency(arAgingData.reduce((sum, c) => sum + c.days_61_90, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-700">
                  {formatCurrency(arAgingData.reduce((sum, c) => sum + c.days_over_90, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 text-lg">
                  {formatCurrency(arAgingData.reduce((sum, c) => sum + c.total, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
          {arAgingData.length > 20 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing top 20 of {arAgingData.length} clients. Export CSV for full list.
            </div>
          )}
          {arAgingData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No outstanding invoices</p>
            </div>
          )}
        </div>
      </div>

      {/* Tax Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tax Summary</h2>
          <button
            onClick={exportTaxSummary}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={taxSummary}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="sales" fill="#3B82F6" name="Sales" />
            <Bar dataKey="tax" fill="#10B981" name="Tax Collected" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Sales</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(taxSummary.reduce((sum, month) => sum + month.sales, 0))}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Tax Collected</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(taxSummary.reduce((sum, month) => sum + month.tax, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
