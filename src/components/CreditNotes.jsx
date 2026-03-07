import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, FileText, DollarSign, Calendar, X, Search } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { validateCreditNote } from '../utils/validation';

function CreditNotes() {
  const {
    getAllCreditNotes,
    getAllInvoices,
    getSavedItemBySku,
    getInvoice,
    createCreditNote,
    updateCreditNote,
    deleteCreditNote,
    generateCreditNoteNumber,
    getSettings
  } = useDatabase();

  const [creditNotes, setCreditNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [errors, setErrors] = useState({});

  // Invoice search states
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showInvoiceSearchResults, setShowInvoiceSearchResults] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);

  const [formData, setFormData] = useState({
    credit_note_number: '',
    invoice_id: '',
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    status: 'draft',
    notes: ''
  });

  const [items, setItems] = useState([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [notesData, invoicesData, settingsData] = await Promise.all([
        getAllCreditNotes(),
        getAllInvoices(),
        getSettings()
      ]);
      setCreditNotes(notesData);
      setInvoices(invoicesData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [getAllCreditNotes, getAllInvoices, getSettings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenForm = async (note = null) => {
    setErrors({}); // Clear errors when opening form
    if (note) {
      setEditingNote(note);
      setFormData({
        credit_note_number: note.credit_note_number,
        invoice_id: note.invoice_id,
        client_id: note.client_id,
        date: note.date,
        reason: note.reason || '',
        status: note.status,
        notes: note.notes || ''
      });
      if (note.items && note.items.length > 0) {
        setItems(note.items);
      }
    } else {
      const noteNum = await generateCreditNoteNumber();
      setFormData({
        credit_note_number: noteNum,
        invoice_id: '',
        client_id: '',
        date: new Date().toISOString().split('T')[0],
        reason: '',
        status: 'draft',
        notes: ''
      });
      setItems([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNote(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user makes changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-select client when invoice is selected
    if (name === 'invoice_id' && value) {
      const invoice = invoices.find(inv => inv.id === parseInt(value));
      if (invoice) {
        setFormData(prev => ({ ...prev, client_id: invoice.client_id }));
      }
    }
  };

  // Handle invoice search
  const handleInvoiceSearch = (value) => {
    setInvoiceSearch(value);
    setShowInvoiceSearchResults(value.length > 0);
  };

  // Select invoice from search results
  const handleSelectInvoice = async (invoice) => {
    try {
      // Get full invoice details with items
      const fullInvoice = await getInvoice(invoice.id);

      setFormData(prev => ({
        ...prev,
        invoice_id: invoice.id,
        client_id: invoice.client_id
      }));

      setSelectedInvoiceData(fullInvoice);
      setInvoiceSearch(invoice.invoice_number);
      setShowInvoiceSearchResults(false);
    } catch (error) {
      console.error('Error loading invoice:', error);
      console.error('Error loading invoice: ' + error.message);
    }
  };

  // Handle item number search for line items
  const handleItemNumberChange = async (index, itemNumber) => {
    const newItems = [...items];
    newItems[index].item_number = itemNumber;
    setItems(newItems);

    if (itemNumber && itemNumber.trim()) {
      try {
        const savedItem = await getSavedItemBySku(itemNumber);
        if (savedItem) {
          newItems[index] = {
            ...newItems[index],
            description: savedItem.description,
            rate: savedItem.rate,
            amount: newItems[index].quantity * savedItem.rate
          };
          setItems(newItems);
        }
      } catch (error) {
        // Item not found, user can enter manually
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].rate || 0);
    }

    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const taxRate = (settings?.tax_rate || 0) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validItems = items.filter(item => item.description.trim());

    const validation = validateCreditNote(formData, validItems);
    if (!validation.isValid) {
      setErrors(validation.errors);

      // Build a detailed error message
      const errorMessages = [];
      if (validation.errors.invoice_id) errorMessages.push(`• ${validation.errors.invoice_id}`);
      if (validation.errors.client_id) errorMessages.push(`• ${validation.errors.client_id}`);
      if (validation.errors.date) errorMessages.push(`• ${validation.errors.date}`);
      if (validation.errors.items) errorMessages.push(`• ${validation.errors.items}`);
      if (validation.errors.itemErrors) errorMessages.push(`• Some line items have validation errors`);

      console.error('Please fix the following errors:\n\n' + errorMessages.join('\n'));
      return;
    }

    try {
      const { subtotal, tax, total } = calculateTotals();
      const noteData = {
        ...formData,
        subtotal,
        tax,
        total
      };

      if (editingNote) {
        await updateCreditNote(editingNote.id, noteData, validItems);
      } else {
        await createCreditNote(noteData, validItems);
      }

      await loadData();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving credit note:', error);
      console.error('Error saving credit note: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this credit note?')) {
      try {
        await deleteCreditNote(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting credit note:', error);
        console.error('Error deleting credit note: ' + error.message);
      }
    }
  };

  const filteredNotes = creditNotes.filter(note => {
    if (filterStatus === 'all') return true;
    return note.status === filterStatus;
  });

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'applied': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = filteredNotes.reduce((sum, note) => sum + (note.total || 0), 0);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading credit notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credit Notes</h1>
            <p className="text-gray-600 mt-1">Manage refunds and adjustments</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Credit Note
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credit Notes</p>
                <p className="text-2xl font-bold text-gray-900">{filteredNotes.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-red-600">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Applied</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredNotes.filter(n => n.status === 'applied').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="applied">Applied</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Credit Notes Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Note #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No credit notes found. Click "New Credit Note" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map(note => (
                    <tr key={note.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {note.credit_note_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                        {note.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {note.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(note.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        -${note.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(note.status)}`}>
                          {note.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenForm(note)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credit Note Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingNote ? 'Edit Credit Note' : 'New Credit Note'}
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Note Number *
                    </label>
                    <input
                      type="text"
                      name="credit_note_number"
                      value={formData.credit_note_number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Number * (Type to search)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={invoiceSearch}
                        onChange={(e) => handleInvoiceSearch(e.target.value)}
                        onFocus={() => setShowInvoiceSearchResults(invoiceSearch.length > 0)}
                        placeholder="Type invoice number (e.g., INV-0001)"
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>

                    {/* Invoice Search Results Dropdown */}
                    {showInvoiceSearchResults && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {invoices
                          .filter(inv =>
                            inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                            inv.client_name?.toLowerCase().includes(invoiceSearch.toLowerCase())
                          )
                          .slice(0, 10)
                          .map(inv => (
                            <button
                              key={inv.id}
                              type="button"
                              onClick={() => handleSelectInvoice(inv)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">{inv.invoice_number}</div>
                                  <div className="text-sm text-gray-600">{inv.client_name}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">${inv.total.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">{inv.status}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        {invoices.filter(inv =>
                          inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                          inv.client_name?.toLowerCase().includes(invoiceSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No invoices found matching "{invoiceSearch}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Invoice Display */}
                    {selectedInvoiceData && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium text-blue-900">Selected: {selectedInvoiceData.invoice_number}</div>
                          <div className="text-blue-700">
                            Client: {selectedInvoiceData.client_name} | Total: ${selectedInvoiceData.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="draft">Draft</option>
                      <option value="issued">Issued</option>
                      <option value="applied">Applied</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Credit Note
                    </label>
                    <input
                      type="text"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Product return, Service issue, Pricing correction"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-3 items-start">
                          <input
                            type="text"
                            placeholder="Item # (optional)"
                            value={item.item_number || ''}
                            onChange={(e) => handleItemNumberChange(index, e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            title="Enter item number to auto-fill details"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                            step="0.01"
                            required
                          />
                          <input
                            type="number"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                            step="0.01"
                            required
                          />
                          <input
                            type="text"
                            value={`$${item.amount.toFixed(2)}`}
                            readOnly
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-900 p-2"
                            disabled={items.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">${calculateTotals().subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax ({settings?.tax_rate || 0}%):</span>
                          <span className="font-medium">${calculateTotals().tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2 text-red-600">
                          <span>Total Credit:</span>
                          <span>-${calculateTotals().total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingNote ? 'Update Credit Note' : 'Create Credit Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreditNotes;
