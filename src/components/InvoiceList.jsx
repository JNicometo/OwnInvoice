import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Archive, FileText, User, CheckCircle2, Clock, AlertTriangle, X, ArrowRight, Upload, FilePen } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate, getStatusBadgeColor } from '../utils/formatting';
import SearchableSelect from './SearchableSelect';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';
import QuotePreview from './QuotePreview';
import QuoteForm from './QuoteForm';
import CSVImport from './CSVImport';

function InvoiceList({ selectedClientId, selectedStatusFilter, onClearFilter }) {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(selectedStatusFilter || 'all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [clientName, setClientName] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [viewType, setViewType] = useState('invoices');
  const [showCSVImport, setShowCSVImport] = useState(false);

  // Update status filter when prop changes
  useEffect(() => {
    if (selectedStatusFilter) {
      setStatusFilter(selectedStatusFilter);
    }
  }, [selectedStatusFilter]);

  const {
    getPaginatedInvoices,
    getPaginatedQuotes,
    deleteInvoice,
    archiveInvoice,
    deleteQuote,
    archiveQuote,
    convertQuoteToInvoice,
    getClient,
    getAllClients,
    batchUpdateInvoiceStatus,
    batchArchiveInvoices,
    batchDeleteInvoices,
  } = useDatabase();

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);

      if (viewType === 'invoices') {
        const result = await getPaginatedInvoices({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          status: statusFilter === 'all' ? '' : statusFilter,
          clientId: selectedClientId || clientFilter || null,
          dateFrom: dateFrom,
          dateTo: dateTo,
          sortBy: sortBy,
          sortOrder: sortOrder
        });

        setInvoices(result.invoices);
        setFilteredInvoices(result.invoices);
        setTotalPages(result.totalPages);
        setTotalInvoices(result.total);
      } else {
        // Quotes come ONLY from the quotes table - completely separate from invoices
        const filters = {
          search: searchTerm,
          status: statusFilter === 'all' ? '' : statusFilter,
          clientId: selectedClientId || clientFilter || null,
          dateFrom: dateFrom,
          dateTo: dateTo,
          sortBy: sortBy,
          sortOrder: sortOrder
        };
        const result = await getPaginatedQuotes(currentPage, ITEMS_PER_PAGE, filters);

        setInvoices(result.quotes);
        setFilteredInvoices(result.quotes);
        setTotalInvoices(result.total);
        setTotalPages(result.totalPages || Math.ceil(result.total / ITEMS_PER_PAGE) || 1);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [viewType, currentPage, searchTerm, statusFilter, selectedClientId, clientFilter, dateFrom, dateTo, sortBy, sortOrder, getPaginatedInvoices, getPaginatedQuotes]);

  const loadClients = useCallback(async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, [getAllClients]);

  const loadClientName = useCallback(async () => {
    if (selectedClientId) {
      try {
        const client = await getClient(selectedClientId);
        setClientName(client?.name || '');
      } catch (error) {
        console.error('Error loading client:', error);
      }
    }
  }, [selectedClientId, getClient]);

  useEffect(() => {
    loadInvoices();
    loadClients();
  }, [loadInvoices, loadClients]);

  useEffect(() => {
    if (selectedClientId) {
      loadClientName();
    }
  }, [selectedClientId, loadClientName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, clientFilter, dateFrom, dateTo, sortBy, sortOrder, viewType]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setClientFilter('');
    if (onClearFilter) {
      onClearFilter();
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFrom || dateTo || clientFilter || selectedClientId;

  const handleDelete = async (id) => {
    const label = viewType === 'invoices' ? 'invoice' : 'quote';
    if (window.confirm(`Are you sure you want to delete this ${label}?`)) {
      try {
        if (viewType === 'quotes') {
          await deleteQuote(id);
        } else {
          await deleteInvoice(id);
        }
        await loadInvoices();
      } catch (error) {
        alert(`Error deleting ${label}: ` + error.message);
      }
    }
  };

  const handleArchive = async (id) => {
    const label = viewType === 'invoices' ? 'invoice' : 'quote';
    if (window.confirm(`Archive this ${label}?`)) {
      try {
        if (viewType === 'quotes') {
          await archiveQuote(id);
        } else {
          await archiveInvoice(id);
        }
        await loadInvoices();
      } catch (error) {
        alert(`Error archiving ${label}: ` + error.message);
      }
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handleConvertToInvoice = async (quoteId) => {
    if (window.confirm('Convert this quote to an invoice? This cannot be undone.')) {
      try {
        const result = await convertQuoteToInvoice(quoteId);
        alert(`Quote converted to Invoice #${result.invoice.invoice_number}!`);
        await loadInvoices();
      } catch (error) {
        console.error('Error converting quote:', error);
        alert('Failed to convert quote: ' + error.message);
      }
    }
  };

  const handleFormClose = async (reload) => {
    setShowForm(false);
    setSelectedInvoice(null);
    if (reload) {
      await loadInvoices();
    }
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setSelectedInvoice(null);
  };

  const handleToggleInvoice = (id) => {
    setSelectedInvoices(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedInvoices.length === 0) return;

    if (window.confirm(`Mark ${selectedInvoices.length} invoice(s) as paid?`)) {
      try {
        await batchUpdateInvoiceStatus(selectedInvoices, 'paid');
        setSelectedInvoices([]);
        await loadInvoices();
      } catch (error) {
        alert('Error updating invoices: ' + error.message);
      }
    }
  };

  const handleBulkArchive = async () => {
    if (selectedInvoices.length === 0) return;

    if (window.confirm(`Archive ${selectedInvoices.length} invoice(s)?`)) {
      try {
        await batchArchiveInvoices(selectedInvoices);
        setSelectedInvoices([]);
        await loadInvoices();
      } catch (error) {
        alert('Error archiving invoices: ' + error.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;

    if (window.confirm(`Delete ${selectedInvoices.length} invoice(s) permanently? This cannot be undone.`)) {
      try {
        await batchDeleteInvoices(selectedInvoices);
        setSelectedInvoices([]);
        await loadInvoices();
      } catch (error) {
        alert('Error deleting invoices: ' + error.message);
      }
    }
  };

  if (showForm) {
    if (viewType === 'quotes') {
      return <QuoteForm quote={selectedInvoice} onClose={handleFormClose} />;
    }
    return <InvoiceForm invoice={selectedInvoice} onClose={handleFormClose} />;
  }

  if (showPreview) {
    if (viewType === 'quotes') {
      return <QuotePreview quote={selectedInvoice} onClose={handlePreviewClose} />;
    }
    return <InvoicePreview invoice={selectedInvoice} onClose={handlePreviewClose} />;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {viewType === 'invoices' ? 'Invoices' : 'Quotes'}
            </h1>
            <p className="text-gray-500 mt-1">
              Manage all your {viewType === 'invoices' ? 'invoices' : 'quotes'}
            </p>
          </div>
          <div className="flex gap-2">
            {viewType === 'invoices' && (
              <button
                onClick={() => setShowCSVImport(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Import CSV
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              {viewType === 'invoices' ? 'New Invoice' : 'New Quote'}
            </button>
          </div>
        </div>

        {/* View Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewType('invoices')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'invoices'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            Invoices Only
          </button>
          <button
            onClick={() => setViewType('quotes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'quotes'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            Quotes Only
          </button>
        </div>

        {/* Client Filter Banner */}
        {selectedClientId && clientName && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              <span className="text-sm text-blue-900">
                Showing invoices for <strong>{clientName}</strong>
              </span>
            </div>
            <button
              onClick={onClearFilter}
              className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
            >
              Clear filter
              <span className="ml-1 text-lg">×</span>
            </button>
          </div>
        )}

        {/* Quick Status Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            All
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              statusFilter === 'draft'
                ? 'bg-gray-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FilePen className="w-4 h-4 inline mr-1.5" />
            Draft
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white shadow-md'
                : 'bg-white text-yellow-700 border border-yellow-300 hover:bg-yellow-50'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" />
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              statusFilter === 'paid'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-green-700 border border-green-300 hover:bg-green-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              statusFilter === 'overdue'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-1.5" />
            Overdue
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="ml-auto px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all flex items-center"
            >
              <X className="w-4 h-4 mr-1.5" />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={viewType === 'invoices' ? 'Search invoices...' : 'Search quotes...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="min-w-[200px]">
            <SearchableSelect
              options={clients.map(client => ({
                value: client.id.toString(),
                label: client.name
              }))}
              value={clientFilter ? {
                value: clientFilter,
                label: clients.find(c => c.id === parseInt(clientFilter))?.name || ''
              } : null}
              onChange={(option) => setClientFilter(option ? option.value : '')}
              placeholder="All Clients"
            />
          </div>

          <input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 items-center mt-4">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at">Date Created</option>
            <option value="date">Invoice Date</option>
            <option value="due_date">Due Date</option>
            <option value="total">Amount</option>
            <option value="invoice_number">Invoice #</option>
            <option value="status">Status</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title={sortOrder === 'DESC' ? 'Newest first' : 'Oldest first'}
          >
            {sortOrder === 'DESC' ? '\u2193' : '\u2191'}
          </button>
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalInvoices)}-{Math.min(currentPage * ITEMS_PER_PAGE, totalInvoices)}</strong> of <strong>{totalInvoices}</strong> {viewType === 'invoices' ? 'invoices' : 'quotes'}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedInvoices.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm font-medium text-blue-900">
              {selectedInvoices.length} {viewType === 'invoices' ? 'invoice' : 'quote'}{selectedInvoices.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-2">
            {viewType === 'invoices' && (
              <button
                onClick={handleBulkMarkPaid}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Mark as Paid
              </button>
            )}
            <button
              onClick={handleBulkArchive}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center"
            >
              <Archive className="w-4 h-4 mr-1.5" />
              Archive
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </button>
            <button
              onClick={() => setSelectedInvoices([])}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading {viewType === 'invoices' ? 'invoices' : 'quotes'}...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No {viewType === 'invoices' ? 'invoices' : 'quotes'} found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First {viewType === 'invoices' ? 'Invoice' : 'Quote'}
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={handleToggleAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {viewType === 'invoices' ? 'Invoice #' : 'Quote #'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {viewType === 'invoices' ? 'Due Date' : 'Expiry Date'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                {viewType === 'invoices' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className={`hover:bg-gray-50 ${selectedInvoices.includes(invoice.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleToggleInvoice(invoice.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {viewType === 'invoices' ? invoice.invoice_number : (invoice.quote_number || invoice.invoice_number)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(viewType === 'invoices' ? invoice.due_date : invoice.expiry_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.total)}
                  </td>
                  {viewType === 'invoices' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {(() => {
                        const balance = invoice.total - (invoice.amount_paid || 0) - (invoice.credits_applied || 0);
                        const isFullyPaid = balance <= 0;
                        return (
                          <span className={isFullyPaid ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(Math.max(0, balance))}
                          </span>
                        );
                      })()}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleView(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(invoice)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(invoice.type === 'quote' || (viewType === 'quotes' && !invoice.converted_to_invoice_id)) && (
                        <button
                          onClick={() => handleConvertToInvoice(invoice.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Convert to Invoice"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(invoice.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {totalInvoices > 0 && (
          <div className="flex justify-between items-center mt-4 px-4 py-3 border-t">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalInvoices)}-{Math.min(currentPage * ITEMS_PER_PAGE, totalInvoices)} of {totalInvoices} {viewType === 'invoices' ? 'invoices' : 'quotes'}
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              <span className="px-3 py-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCSVImport && (
        <CSVImport
          onClose={() => setShowCSVImport(false)}
          onImportComplete={() => {
            loadInvoices();
            setShowCSVImport(false);
          }}
        />
      )}
    </div>
  );
}

export default InvoiceList;
