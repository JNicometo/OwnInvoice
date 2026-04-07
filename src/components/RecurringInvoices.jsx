import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Play, Pause, RefreshCcw, Calendar } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate, getCurrentDate, formatDateInput } from '../utils/formatting';
import SearchableSelect from './SearchableSelect';

function RecurringInvoices() {
  const [recurringInvoices, setRecurringInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [clients, setClients] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [formError, setFormError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    frequency: 'monthly',
    start_date: getCurrentDate(),
    end_date: '',
    template_name: '',
    notes: '',
    payment_terms: '',
  });

  const [items, setItems] = useState([
    { item_number: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [activeDescriptionIndex, setActiveDescriptionIndex] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const ITEMS_PER_PAGE = 50;

  const {
    getPaginatedRecurringInvoices,
    getRecurringInvoice,
    createRecurringInvoice,
    updateRecurringInvoice,
    deleteRecurringInvoice,
    generateInvoiceFromRecurring,
    getAllClients,
    getAllSavedItems,
    getSettings
  } = useDatabase();

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = { search: searchTerm };
      const [invoicesResult, clientsData, savedItemsData, settingsData] = await Promise.all([
        getPaginatedRecurringInvoices(currentPage, ITEMS_PER_PAGE, filters),
        getAllClients(),
        getAllSavedItems(),
        getSettings()
      ]);
      setRecurringInvoices(invoicesResult.invoices);
      setFilteredInvoices(invoicesResult.invoices);
      setPagination(invoicesResult.pagination);
      setClients(clientsData);
      setSavedItems(savedItemsData);
      setSettings(settingsData);

      if (settingsData) {
        setFormData(prev => ({
          ...prev,
          payment_terms: settingsData.payment_terms || ''
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [currentPage, searchTerm]);

  const handleDelete = async (id) => {
    if (await window.customConfirm('Are you sure you want to delete this recurring invoice?')) {
      try {
        await deleteRecurringInvoice(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting recurring invoice: ' + error.message);
      }
    }
  };

  const handleToggleActive = async (invoice) => {
    try {
      const fullInvoice = await getRecurringInvoice(invoice.id);

      if (!fullInvoice || !fullInvoice.items) {
        throw new Error('Could not load recurring invoice items');
      }

      await updateRecurringInvoice(
        invoice.id,
        { ...fullInvoice, active: fullInvoice.active ? 0 : 1 },
        fullInvoice.items
      );
      await loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
      console.error('Error: ' + error.message);
    }
  };

  const handleGenerateNow = async (id) => {
    if (await window.customConfirm('Generate an invoice from this schedule now?')) {
      try {
        const result = await generateInvoiceFromRecurring(id);
        if (result) {
          console.error(`Invoice ${result.invoice_number || ''} generated successfully!`);
          await loadData();
        }
      } catch (error) {
        console.error('Error generating invoice: ' + error.message);
      }
    }
  };

  const handleEdit = async (invoice) => {
    try {
      const fullInvoice = await getRecurringInvoice(invoice.id);
      setSelectedInvoice(fullInvoice);
      setFormData({
        client_id: fullInvoice.client_id,
        frequency: fullInvoice.frequency,
        start_date: formatDateInput(fullInvoice.start_date),
        end_date: fullInvoice.end_date ? formatDateInput(fullInvoice.end_date) : '',
        template_name: fullInvoice.template_name,
        notes: fullInvoice.notes || '',
        payment_terms: fullInvoice.payment_terms || '',
      });
      setItems(fullInvoice.items || [{ item_number: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
      setShowForm(true);
    } catch (error) {
      console.error('Error loading recurring invoice: ' + error.message);
    }
  };

  const handleOpenForm = async () => {
    setSelectedInvoice(null);
    setFormData({
      client_id: '',
      frequency: 'monthly',
      start_date: getCurrentDate(),
      end_date: '',
      template_name: '',
      notes: '',
      payment_terms: settings?.payment_terms || '',
    });
    setItems([{ item_number: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
    setShowForm(true);
  };

  const calculateItemAmount = (quantity, rate) => {
    return parseFloat(quantity || 0) * parseFloat(rate || 0);
  };

  const calculateItemAmountObj = (item) => {
    return parseFloat(item.quantity || 0) * parseFloat(item.rate || 0);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const taxRate = parseFloat(settings?.tax_rate || 0) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = calculateItemAmount(
        newItems[index].quantity,
        newItems[index].rate
      );
    }

    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { item_number: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id || !formData.template_name) {
      setFormError('Please fill in all required fields');
      return;
    }

    const validItems = items.filter(item => item.description.trim());
    if (validItems.length === 0) {
      setFormError('Please add at least one item');
      return;
    }

    try {
      const { subtotal, tax, total } = calculateTotals();

      // Calculate next_generation date based on start_date and frequency
      const startDate = new Date(formData.start_date);
      const nextGen = new Date(startDate);

      const invoiceData = {
        ...formData,
        subtotal,
        tax,
        total,
        next_generation: nextGen.toISOString().split('T')[0],
        active: 1,
      };

      if (selectedInvoice) {
        await updateRecurringInvoice(selectedInvoice.id, invoiceData, validItems);
      } else {
        await createRecurringInvoice(invoiceData, validItems);
      }

      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error saving recurring invoice:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      if (errorMessage.includes('Trial limit reached') || errorMessage.includes('Trial expired')) {
        setFormError(errorMessage + '\n\nVisit gritsoftware.dev to purchase a license.');
      } else {
        setFormError('Error saving recurring invoice: ' + errorMessage);
      }
    }
  };

  const getFrequencyBadge = (frequency) => {
    const colors = {
      weekly: 'bg-blue-100 text-blue-800',
      biweekly: 'bg-cyan-100 text-cyan-800',
      monthly: 'bg-green-100 text-green-800',
      quarterly: 'bg-yellow-100 text-yellow-800',
      yearly: 'bg-purple-100 text-purple-800'
    };
    return colors[frequency] || 'bg-gray-100 text-gray-800';
  };

  if (showForm) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedInvoice ? 'Edit Recurring Invoice' : 'Create Recurring Invoice'}
            </h1>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Header Section */}
            <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="template_name"
                  value={formData.template_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Monthly Retainer - Acme Corp"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={clients.map(client => ({
                    value: client.id,
                    label: `${client.name} (${client.email})`
                  }))}
                  value={formData.client_id ? {
                    value: formData.client_id,
                    label: clients.find(c => c.id === parseInt(formData.client_id))?.name || ''
                  } : null}
                  onChange={(option) => {
                    setFormData(prev => ({
                      ...prev,
                      client_id: option ? option.value : '',
                      payment_terms: option ? clients.find(c => c.id === option.value)?.payment_terms || settings?.payment_terms || '' : ''
                    }));
                  }}
                  placeholder="Search and select a client..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly (Every 2 weeks)</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (Every 3 months)</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for indefinite recurrence</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
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
                  <div key={index} className="flex gap-3 items-start">
                    <input
                      type="text"
                      placeholder="Item #"
                      value={item.item_number || ''}
                      onChange={(e) => handleItemChange(index, 'item_number', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Description (type to search saved items)"
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(index, 'description', e.target.value);
                          setActiveDescriptionIndex(e.target.value.length > 0 ? index : null);
                        }}
                        onFocus={() => {
                          if (item.description.length > 0) setActiveDescriptionIndex(index);
                        }}
                        onBlur={() => {
                          setTimeout(() => setActiveDescriptionIndex(null), 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                      {activeDescriptionIndex === index && item.description.length > 0 && (() => {
                        const query = item.description.toLowerCase();
                        const matches = savedItems.filter(si =>
                          si.description.toLowerCase().includes(query) ||
                          (si.sku && si.sku.toLowerCase().includes(query)) ||
                          (si.category && si.category.toLowerCase().includes(query))
                        ).slice(0, 6);
                        if (matches.length === 0) return null;
                        if (matches.length === 1 && matches[0].description === item.description) return null;
                        return (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {matches.map((si) => (
                              <button
                                key={si.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const newItems = [...items];
                                  newItems[index].item_number = si.sku || '';
                                  newItems[index].description = si.description;
                                  newItems[index].rate = si.rate;
                                  newItems[index].amount = calculateItemAmountObj({ ...newItems[index], rate: si.rate });
                                  setItems(newItems);
                                  setActiveDescriptionIndex(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between items-center text-sm border-b border-gray-100 last:border-0"
                              >
                                <div>
                                  <div className="font-medium text-gray-900">{si.description}</div>
                                  {si.sku && <span className="text-xs text-gray-500">{si.sku}</span>}
                                </div>
                                <span className="text-gray-600 font-medium ml-2">${si.rate.toFixed(2)}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                      step="0.01"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      min="0"
                      step="0.01"
                      required
                    />
                    <input
                      type="text"
                      value={`$${(item.amount || 0).toFixed(2)}`}
                      readOnly
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 p-2"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-80 space-y-2 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">${calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({settings?.tax_rate || 0}%):</span>
                  <span className="font-medium">${calculateTotals().tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span>Total:</span>
                  <span className="text-blue-600">${calculateTotals().total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes and Payment Terms */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                <textarea
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {selectedInvoice ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {formError && (
        <div style={{ background: '#fee', color: '#c00', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>
          {formError}
          <button onClick={() => setFormError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recurring Invoices</h1>
            <p className="text-gray-500 mt-1">Manage automated invoice schedules</p>
          </div>
          <button
            onClick={handleOpenForm}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Recurring Invoice
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing <strong>{filteredInvoices.length}</strong> of <strong>{recurringInvoices.length}</strong> schedules
        </div>
      </div>

      {/* Recurring Invoices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-500">Loading schedules...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recurring invoices found</p>
            <button
              onClick={handleOpenForm}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Schedule
            </button>
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-shadow ${
                invoice.active ? 'border-blue-200' : 'border-gray-200 opacity-70'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {invoice.template_name}
                  </h3>
                  <p className="text-sm text-gray-600">{invoice.client_name}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFrequencyBadge(invoice.frequency)}`}>
                  {invoice.frequency}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Next Invoice:</span>
                  <span className="font-medium text-blue-600">{formatDate(invoice.next_generation)}</span>
                </div>
                {invoice.last_generated && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Generated:</span>
                    <span className="text-gray-600">{formatDate(invoice.last_generated)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${invoice.active ? 'text-green-600' : 'text-gray-600'}`}>
                    {invoice.active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleGenerateNow(invoice.id)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  title="Generate Invoice Now"
                >
                  <RefreshCcw className="w-4 h-4 mr-1" />
                  Generate
                </button>
                <button
                  onClick={() => handleToggleActive(invoice)}
                  className={`flex-1 flex items-center justify-center px-3 py-2 text-sm rounded-lg ${
                    invoice.active
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={invoice.active ? 'Pause Schedule' : 'Resume Schedule'}
                >
                  {invoice.active ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleEdit(invoice)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(invoice.id)}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg mt-4">
          <div className="text-sm text-gray-700">
            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} recurring invoices
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

export default RecurringInvoices;
