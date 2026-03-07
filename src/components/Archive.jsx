import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Trash2, Eye, Archive as ArchiveIcon } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate, getStatusBadgeColor } from '../utils/formatting';
import InvoicePreview from './InvoicePreview';

function Archive() {
  const [archivedInvoices, setArchivedInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [archivePage, setArchivePage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { getArchivedInvoices, restoreInvoice, deleteInvoice } = useDatabase();

  useEffect(() => {
    loadArchivedInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchTerm, archivedInvoices]);

  const loadArchivedInvoices = async () => {
    try {
      setLoading(true);
      const data = await getArchivedInvoices();
      setArchivedInvoices(data);
    } catch (error) {
      console.error('Error loading archived invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    if (!searchTerm) {
      setFilteredInvoices(archivedInvoices);
      return;
    }

    const filtered = archivedInvoices.filter(inv =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInvoices(filtered);
  };

  const handleRestore = async (id, invoiceNumber) => {
    if (window.confirm(`Restore invoice ${invoiceNumber}?`)) {
      try {
        await restoreInvoice(id);
        await loadArchivedInvoices();
      } catch (error) {
        console.error('Error restoring invoice: ' + error.message);
      }
    }
  };

  const handlePermanentDelete = async (id, invoiceNumber) => {
    if (window.confirm(
      `PERMANENTLY delete invoice ${invoiceNumber}? This action cannot be undone!`
    )) {
      try {
        await deleteInvoice(id);
        await loadArchivedInvoices();
      } catch (error) {
        console.error('Error deleting invoice: ' + error.message);
      }
    }
  };

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setSelectedInvoice(null);
  };

  if (showPreview) {
    return <InvoicePreview invoice={selectedInvoice} onClose={handlePreviewClose} />;
  }

  const totalArchived = archivedInvoices.length;
  const totalArchivedAmount = archivedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
            <p className="text-gray-500 mt-1">View and manage archived invoices</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Archived</p>
                <p className="text-2xl font-bold text-gray-900">{totalArchived}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <ArchiveIcon className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalArchivedAmount)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArchiveIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search archived invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Archived Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading archived invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <ArchiveIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No archived invoices</p>
            {archivedInvoices.length > 0 && searchTerm && (
              <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
            )}
          </div>
        ) : (() => {
          const totalFiltered = filteredInvoices.length;
          const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE);
          const startIndex = (archivePage - 1) * ITEMS_PER_PAGE;
          const endIndex = startIndex + ITEMS_PER_PAGE;
          const paginatedArchived = filteredInvoices.slice(startIndex, endIndex);

          return (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                  {paginatedArchived.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                      </td>
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
                            onClick={() => handleRestore(invoice.id, invoice.invoice_number)}
                            className="text-green-600 hover:text-green-900"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(invoice.id, invoice.invoice_number)}
                            className="text-red-600 hover:text-red-900"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalFiltered)} of {totalFiltered} archived invoices
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setArchivePage(prev => Math.max(1, prev - 1))}
                      disabled={archivePage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                      Page {archivePage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setArchivePage(prev => Math.min(totalPages, prev + 1))}
                      disabled={archivePage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {archivedInvoices.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Important
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Archived invoices are hidden from the main invoice list but can be restored at any time.
                  Permanently deleting an invoice cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Archive;
