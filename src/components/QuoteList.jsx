import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Archive, FileText, User, CheckCircle2, Clock, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate, getStatusBadgeColor } from '../utils/formatting';
import SearchableSelect from './SearchableSelect';
import QuoteForm from './QuoteForm';
import QuotePreview from './QuotePreview';

function QuoteList({ selectedClientId, selectedStatusFilter, onClearFilter }) {
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(selectedStatusFilter || 'all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [clientName, setClientName] = useState('');
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const ITEMS_PER_PAGE = 50;

  // Update status filter when prop changes
  useEffect(() => {
    if (selectedStatusFilter) {
      setStatusFilter(selectedStatusFilter);
    }
  }, [selectedStatusFilter]);

  const {
    getAllQuotes,
    getPaginatedQuotes,
    deleteQuote,
    archiveQuote,
    getClient,
    getAllClients,
    convertQuoteToInvoice,
  } = useDatabase();

  const loadQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchTerm,
        status: statusFilter,
        clientId: clientFilter || selectedClientId,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      };
      const result = await getPaginatedQuotes(currentPage, ITEMS_PER_PAGE, filters);
      setQuotes(result.quotes);
      setFilteredQuotes(result.quotes);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, clientFilter, selectedClientId, dateFrom, dateTo, sortBy, sortOrder, getPaginatedQuotes]);

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
    loadQuotes();
    loadClients();
  }, [loadQuotes, loadClients]);

  useEffect(() => {
    if (selectedClientId) {
      loadClientName();
    }
  }, [selectedClientId, loadClientName]);

  const clearAllFilters = async () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setClientFilter('');
    setCurrentPage(1);
    if (onClearFilter) {
      onClearFilter();
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFrom || dateTo || clientFilter || selectedClientId;

  const handleDelete = async (id) => {
    if (await window.customConfirm('Are you sure you want to delete this quote?')) {
      try {
        await deleteQuote(id);
        await loadQuotes();
      } catch (error) {
        console.error('Error deleting quote: ' + error.message);
      }
    }
  };


  const handleArchive = async (id) => {
    if (await window.customConfirm('Archive this quote?')) {
      try {
        await archiveQuote(id);
        await loadQuotes();
      } catch (error) {
        console.error('Error archiving quote: ' + error.message);
      }
    }
  };

  const handleConvertToInvoice = async (quoteId) => {
    if (await window.customConfirm('Convert this quote to an invoice? This cannot be undone.')) {
      try {
        const result = await convertQuoteToInvoice(quoteId);
        console.log(`Quote converted! Invoice #${result.invoice.invoice_number} created.`);
        await loadQuotes();
      } catch (error) {
        console.error('Error converting quote:', error);
        console.error('Failed to convert quote: ' + error.message);
      }
    }
  };

  const handleEdit = async (quote) => {
    setSelectedQuote(quote);
    setShowForm(true);
  };

  const handleView = async (quote) => {
    console.log('QuoteList: handleView called with quote:', quote);
    console.log('QuoteList: Quote ID:', quote.id, 'Quote Number:', quote.quote_number);
    setSelectedQuote(quote);
    setShowPreview(true);
  };

  const handleFormClose = async (reload) => {
    setShowForm(false);
    setSelectedQuote(null);
    if (reload) {
      await loadQuotes();
    }
  };

  const handlePreviewClose = async () => {
    setShowPreview(false);
    setSelectedQuote(null);
  };

  const handleToggleInvoice = async (id) => {
    setSelectedQuotes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleAll = async () => {
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map(inv => inv.id));
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedQuotes.length === 0) return;
    console.error('Bulk operations for quotes are not yet available. Please update quotes individually.');
    // Batch operations not yet implemented
    // if (await window.customConfirm(`Mark ${selectedQuotes.length} quote(s) as paid?`)) {
    //   try {
    //     await batchUpdateQuoteStatus(selectedQuotes, 'paid');
    //     setSelectedQuotes([]);
    //     await loadQuotes();
    //   } catch (error) {
    //     console.error('Error updating quotes: ' + error.message);
    //   }
    // }
  };

  const handleBulkArchive = async () => {
    if (selectedQuotes.length === 0) return;
    console.error('Bulk operations for quotes are not yet available. Please archive quotes individually.');
    // Batch operations not yet implemented
    // if (await window.customConfirm(`Archive ${selectedQuotes.length} quote(s)?`)) {
    //   try {
    //     await batchArchiveQuotes(selectedQuotes);
    //     setSelectedQuotes([]);
    //     await loadQuotes();
    //   } catch (error) {
    //     console.error('Error archiving quotes: ' + error.message);
    //   }
    // }
  };

  const handleBulkDelete = async () => {
    if (selectedQuotes.length === 0) return;
    console.error('Bulk operations for quotes are not yet available. Please delete quotes individually.');
    // Batch operations not yet implemented
    // if (await window.customConfirm(`Delete ${selectedQuotes.length} quote(s) permanently? This cannot be undone.`)) {
    //   try {
    //     await batchDeleteQuotes(selectedQuotes);
    //     setSelectedQuotes([]);
    //     await loadQuotes();
    //   } catch (error) {
    //     console.error('Error deleting quotes: ' + error.message);
    //   }
    // }
  };

  if (showForm) {
    return <QuoteForm quote={selectedQuote} onClose={handleFormClose} />;
  }

  if (showPreview) {
    return <QuotePreview quote={selectedQuote} onClose={handlePreviewClose} />;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quotes</h1>
            <p className="text-gray-500 mt-1">Manage all your quotes</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Quote
          </button>
        </div>

        {/* Client Filter Banner */}
        {selectedClientId && clientName && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              <span className="text-sm text-blue-900">
                Showing quotes for <strong>{clientName}</strong>
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
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
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
            onClick={() => { setStatusFilter('unpaid'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              statusFilter === 'unpaid'
                ? 'bg-yellow-600 text-white shadow-md'
                : 'bg-white text-yellow-700 border border-yellow-300 hover:bg-yellow-50'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" />
            Unpaid
          </button>
          <button
            onClick={() => { setStatusFilter('paid'); setCurrentPage(1); }}
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
            onClick={() => { setStatusFilter('overdue'); setCurrentPage(1); }}
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
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
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
              onChange={(option) => { setClientFilter(option ? option.value : ''); setCurrentPage(1); }}
              placeholder="All Clients"
            />
          </div>

          <input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
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
            <option value="date">Quote Date</option>
            <option value="expiry_date">Expiry Date</option>
            <option value="total">Amount</option>
            <option value="quote_number">Quote #</option>
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
          Showing <strong>{filteredQuotes.length}</strong> of <strong>{quotes.length}</strong> quotes
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedQuotes.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm font-medium text-blue-900">
              {selectedQuotes.length} quote{selectedQuotes.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBulkMarkPaid}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Mark as Paid
            </button>
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
              onClick={() => setSelectedQuotes([])}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quotes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No quotes found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Quote
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                    onChange={handleToggleAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quote #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className={`hover:bg-gray-50 ${selectedQuotes.includes(quote.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedQuotes.includes(quote.id)}
                      onChange={() => handleToggleInvoice(quote.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {quote.quote_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quote.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(quote.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(quote.expiry_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(quote.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(quote.status)}`}>
                        {quote.status}
                      </span>
                      {quote.converted_to_invoice_id && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Converted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleView(quote)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(quote)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleConvertToInvoice(quote.id)}
                        disabled={quote.status === 'accepted' || quote.converted_to_invoice_id}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title={quote.converted_to_invoice_id ? 'Already converted' : 'Convert to invoice'}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(quote.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(quote.id)}
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
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} quotes
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteList;
