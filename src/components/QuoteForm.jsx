import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Save, Search } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { getCurrentDate, calculateDueDate, formatDateInput, formatCurrency } from '../utils/formatting';
import SearchableSelect from './SearchableSelect';
const validateQuote = (quote, items) => {
  const errors = {};

  if (!quote.client_id) {
    errors.client_id = 'Client is required';
  }

  if (!quote.quote_number || !quote.quote_number.trim()) {
    errors.quote_number = 'Quote number is required';
  }

  if (!quote.date) {
    errors.date = 'Quote date is required';
  }

  if (!quote.expiry_date) {
    errors.expiry_date = 'Expiry date is required';
  }

  if (!items || items.length === 0) {
    errors.items = 'At least one line item is required';
  } else {
    let hasItemErrors = false;
    items.forEach((item, index) => {
      if (!item.description || !item.description.trim()) {
        errors[`item_${index}_description`] = 'Description is required';
        hasItemErrors = true;
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
        hasItemErrors = true;
      }
      if (item.rate < 0) {
        errors[`item_${index}_rate`] = 'Rate cannot be negative';
        hasItemErrors = true;
      }
    });
    if (hasItemErrors) {
      errors.itemErrors = 'Some line items have validation errors';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

function QuoteForm({ quote, onClose }) {
  const isEdit = !!quote;
  const {
    getAllClients,
    getAllSavedItems,
    createQuote,
    updateQuote,
    generateQuoteNumber,
    peekNextQuoteNumber,
    getSettings,
    getQuote,
    getClientByCustomerNumber,
    getSavedItemBySku,
    createClient,
    createSavedItem
  } = useDatabase();

  const [clients, setClients] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    quote_number: '',
    client_id: '',
    date: getCurrentDate(),
    expiry_date: calculateDueDate(getCurrentDate(), 30),
    status: 'draft',
    notes: '',
    terms: '',
    tax_rate: '',
    discount_type: 'none',
    discount_value: 0,
    shipping: 0,
    adjustment: 0,
    adjustment_label: '',
  });

  const [items, setItems] = useState([
    { item_number: '', description: '', quantity: 1, rate: 0, discount_type: 'none', discount_value: 0, amount: 0 }
  ]);

  const [customerNumberSearch, setCustomerNumberSearch] = useState('');
  const [showItemSearchModal, setShowItemSearchModal] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [activeDescriptionIndex, setActiveDescriptionIndex] = useState(null);

  // Quick create modals
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [pendingCustomerNumber, setPendingCustomerNumber] = useState('');
  const [pendingItemNumber, setPendingItemNumber] = useState('');

  const [newCustomerData, setNewCustomerData] = useState({
    customer_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });

  const [newItemData, setNewItemData] = useState({
    sku: '',
    description: '',
    rate: 0,
    category: 'General'
  });

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsData, savedItemsData, settingsData, previewNumber] = await Promise.all([
        getAllClients(),
        getAllSavedItems(),
        getSettings(),
        !isEdit ? peekNextQuoteNumber() : Promise.resolve(null)
      ]);

      setClients(clientsData);
      setSavedItems(savedItemsData);
      setSettings(settingsData);

      if (!isEdit) {
        setFormData(prev => ({
          ...prev,
          quote_number: previewNumber,
          terms: settingsData.terms || ''
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [getAllClients, getAllSavedItems, getSettings, peekNextQuoteNumber, isEdit]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const loadQuoteData = async () => {
      if (quote && quote.id) {
        try {
          // Fetch full quote with items using the hook
          const fullQuote = await getQuote(quote.id);

          setFormData({
            quote_number: fullQuote.quote_number,
            client_id: fullQuote.client_id,
            date: formatDateInput(fullQuote.date),
            expiry_date: formatDateInput(fullQuote.expiry_date),
            status: fullQuote.status,
            notes: fullQuote.notes || '',
            terms: fullQuote.terms || '',
            tax_rate: fullQuote.tax_rate != null ? fullQuote.tax_rate : '',
            discount_type: fullQuote.discount_type || 'none',
            discount_value: fullQuote.discount_value || 0,
            shipping: fullQuote.shipping || 0,
            adjustment: fullQuote.adjustment || 0,
            adjustment_label: fullQuote.adjustment_label || '',
          });

          if (fullQuote.items && fullQuote.items.length > 0) {
            setItems(fullQuote.items);
          }
        } catch (error) {
          console.error('Error loading quote:', error);
        }
      } else if (quote) {
        // If quote object is passed but no id (shouldn't happen)
        setFormData({
          quote_number: quote.quote_number,
          client_id: quote.client_id,
          date: formatDateInput(quote.date),
          expiry_date: formatDateInput(quote.expiry_date),
          status: quote.status,
          notes: quote.notes || '',
          terms: quote.terms || '',
        });
        if (quote.items && quote.items.length > 0) {
          setItems(quote.items);
        }
      }
    };

    loadQuoteData();
  }, [quote, getQuote]);

  const calculateItemAmount = (item) => {
    const quantity = parseFloat(item.quantity || 0);
    const rate = parseFloat(item.rate || 0);
    const lineTotal = quantity * rate;

    // Apply line-item discount
    let discountAmount = 0;
    if (item.discount_type === 'percentage') {
      discountAmount = (lineTotal * parseFloat(item.discount_value || 0)) / 100;
    } else if (item.discount_type === 'fixed') {
      discountAmount = parseFloat(item.discount_value || 0);
    }

    return lineTotal - discountAmount;
  };

  const calculateTotals = () => {
    // Calculate subtotal from all line items (already discounted at item level)
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // Apply quote-level discount
    let quoteDiscount = 0;
    if (formData.discount_type === 'percentage') {
      quoteDiscount = (subtotal * parseFloat(formData.discount_value || 0)) / 100;
    } else if (formData.discount_type === 'fixed') {
      quoteDiscount = parseFloat(formData.discount_value || 0);
    }

    const afterDiscount = subtotal - quoteDiscount;

    // Add shipping
    const shipping = parseFloat(formData.shipping || 0);

    // Calculate tax on (subtotal - discount + shipping)
    const taxableAmount = afterDiscount + shipping;
    const effectiveTaxRate = formData.tax_rate !== '' && formData.tax_rate != null
      ? parseFloat(formData.tax_rate)
      : parseFloat(settings?.tax_rate || 0);
    const taxRate = effectiveTaxRate / 100;
    const tax = taxableAmount * taxRate;

    // Add adjustment (can be positive or negative)
    const adjustment = parseFloat(formData.adjustment || 0);

    // Final total
    const total = taxableAmount + tax + adjustment;

    return {
      subtotal,
      quoteDiscount,
      afterDiscount,
      shipping,
      tax,
      adjustment,
      total
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Recalculate amount when quantity, rate, or discount changes
    if (field === 'quantity' || field === 'rate' || field === 'discount_type' || field === 'discount_value') {
      newItems[index].amount = calculateItemAmount(newItems[index]);
    }

    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { item_number: '', description: '', quantity: 1, rate: 0, discount_type: 'none', discount_value: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSearchCustomerNumber = async () => {
    if (!customerNumberSearch.trim()) {
      setFormError('Please enter a customer number');
      return;
    }

    try {
      const client = await getClientByCustomerNumber(customerNumberSearch.trim());
      if (client) {
        setFormData(prev => ({ ...prev, client_id: client.id }));
        setCustomerNumberSearch('');
      } else {
        // Customer not found - offer to create
        setPendingCustomerNumber(customerNumberSearch.trim());
        setNewCustomerData({
          customer_number: customerNumberSearch.trim(),
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: ''
        });
        setShowCreateCustomerModal(true);
      }
    } catch (error) {
      console.error('Error searching for customer:', error);
      console.error('Error searching for customer: ' + error.message);
    }
  };

  const handleCreateCustomer = async () => {
    // Validate required fields
    if (!newCustomerData.name || !newCustomerData.email) {
      setFormError('Please fill in Name and Email (required fields)');
      return;
    }

    try {
      const result = await createClient(newCustomerData);
      const clientId = result.lastInsertRowid || result.id;

      // Refresh clients list
      const clientsData = await getAllClients();
      setClients(clientsData);

      // Auto-select the new client
      setFormData(prev => ({ ...prev, client_id: clientId }));

      // Clear search and close modal
      setCustomerNumberSearch('');
      setShowCreateCustomerModal(false);
      setPendingCustomerNumber('');

      console.log('Customer created successfully!');
    } catch (error) {
      console.error('Error creating customer:', error);
      console.error('Error creating customer: ' + error.message);
    }
  };

  const handleItemNumberBlur = async (index) => {
    const itemNumber = items[index].item_number;
    if (!itemNumber || !itemNumber.trim()) {
      return; // No SKU entered, do nothing
    }

    try {
      const savedItem = await getSavedItemBySku(itemNumber.trim());
      if (savedItem) {
        const newItems = [...items];
        newItems[index].description = savedItem.description;
        newItems[index].rate = savedItem.rate;
        newItems[index].amount = calculateItemAmount(newItems[index]);
        setItems(newItems);
      }
    } catch (error) {
      console.error('Error searching for item:', error);
    }
  };

  const handleCreateItem = async () => {
    // Validate required fields
    if (!newItemData.description || !newItemData.rate) {
      setFormError('Please fill in Description and Rate (required fields)');
      return;
    }

    try {
      await createSavedItem(newItemData);

      // Refresh saved items list
      const itemsData = await getAllSavedItems();
      setSavedItems(itemsData);

      // Close modal
      setShowCreateItemModal(false);
      setPendingItemNumber('');

      console.log('Item saved successfully! You can now use it in future quotes.');
    } catch (error) {
      console.error('Error creating item:', error);
      console.error('Error creating item: ' + error.message);
    }
  };

  const handleOpenItemSearch = (index) => {
    setCurrentItemIndex(index);
    setShowItemSearchModal(true);
  };

  const handleSelectSavedItem = (savedItem) => {
    if (currentItemIndex !== null) {
      const newItems = [...items];
      newItems[currentItemIndex].item_number = savedItem.sku || '';
      newItems[currentItemIndex].description = savedItem.description;
      newItems[currentItemIndex].rate = savedItem.rate;
      newItems[currentItemIndex].amount = calculateItemAmount(newItems[currentItemIndex]);
      setItems(newItems);
    }
    setShowItemSearchModal(false);
    setCurrentItemIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateQuote(formData, items);
    if (!validation.isValid) {
      setErrors(validation.errors);

      // Build a detailed error message
      const errorMessages = [];
      if (validation.errors.quote_number) errorMessages.push(`• ${validation.errors.quote_number}`);
      if (validation.errors.client_id) errorMessages.push(`• ${validation.errors.client_id}`);
      if (validation.errors.date) errorMessages.push(`• ${validation.errors.date}`);
      if (validation.errors.expiry_date) errorMessages.push(`• Valid until date is required`);
      if (validation.errors.items) errorMessages.push(`• ${validation.errors.items}`);
      if (validation.errors.itemErrors) errorMessages.push(`• Some line items have validation errors`);

      console.error('Please fix the following errors:\n\n' + errorMessages.join('\n'));
      return;
    }

    try {
      // Generate quote number - always generate for new quotes to ensure counter increments
      let quoteNumber = formData.quote_number;
      if (!isEdit) {
        quoteNumber = await generateQuoteNumber();
      }

      const totals = calculateTotals();
      const effectiveTaxRate = formData.tax_rate !== '' && formData.tax_rate != null
        ? parseFloat(formData.tax_rate)
        : parseFloat(settings?.tax_rate || 0);
      const quoteData = {
        ...formData,
        quote_number: quoteNumber,
        subtotal: totals.subtotal,
        tax: totals.tax,
        tax_rate: effectiveTaxRate,
        discount_type: formData.discount_type || 'none',
        discount_value: parseFloat(formData.discount_value || 0),
        discount_amount: totals.quoteDiscount,
        shipping: parseFloat(formData.shipping || 0),
        adjustment: parseFloat(formData.adjustment || 0),
        adjustment_label: formData.adjustment_label || '',
        total: totals.total,
      };

      // Prepare items with discount fields
      const itemsData = items.map(item => ({
        ...item,
        discount_type: item.discount_type || 'none',
        discount_value: parseFloat(item.discount_value || 0),
        discount_amount: item.discount_type !== 'none' ?
          (item.discount_type === 'percentage' ?
            (item.quantity * item.rate * item.discount_value / 100) :
            item.discount_value) : 0,
      }));

      if (isEdit) {
        await updateQuote(quote.id, quoteData, itemsData);
      } else {
        await createQuote(quoteData, itemsData);
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving quote:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      if (errorMessage.includes('Trial limit reached') || errorMessage.includes('Trial expired')) {
        setFormError(errorMessage + '\n\nVisit gritsoftware.dev to purchase a license.');
      } else {
        setFormError('Error saving quote: ' + errorMessage);
      }
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {formError && (
          <div style={{ background: '#fee', color: '#c00', padding: '10px 16px', borderRadius: 6, marginBottom: 16 }}>
            {formError}
            <button onClick={() => setFormError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Quote' : 'New Quote'}
          </h1>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote Number *
                </label>
                <input
                  type="text"
                  name="quote_number"
                  value={formData.quote_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {errors.quote_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.quote_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={clients.map(client => ({
                        value: client.id,
                        label: `${client.name} (${client.email})`
                      }))}
                      value={formData.client_id ? {
                        value: parseInt(formData.client_id),
                        label: clients.find(c => c.id === parseInt(formData.client_id))?.name || ''
                      } : null}
                      onChange={(option) => {
                        handleInputChange({
                          target: { name: 'client_id', value: option ? option.value : '', type: 'text' }
                        });
                      }}
                      placeholder="Search clients..."
                    />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Customer #"
                      value={customerNumberSearch}
                      onChange={(e) => setCustomerNumberSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchCustomerNumber())}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSearchCustomerNumber}
                      className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                      title="Search by customer number"
                    >
                      <Search className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                {errors.client_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>
                )}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until *
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
                    onBlur={() => handleItemNumberBlur(index)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleItemNumberBlur(index))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    title="Enter item number and press Enter or Tab to auto-fill"
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
                                newItems[index].amount = calculateItemAmount({ ...newItems[index], rate: si.rate });
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
                    value={`$${item.amount.toFixed(2)}`}
                    readOnly
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenItemSearch(index)}
                    className="text-gray-600 hover:text-gray-900 p-2"
                    title="Browse saved items"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 hover:text-red-900 p-2"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end">
                <div className="w-96 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>

                  {/* Quote-Level Discount */}
                  <div className="border-t pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-gray-700">Discount:</label>
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value, discount_value: e.target.value === 'none' ? 0 : prev.discount_value }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="none">None</option>
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                      {formData.discount_type !== 'none' && (
                        <input
                          type="number"
                          value={formData.discount_value}
                          onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                          placeholder={formData.discount_type === 'percentage' ? '%' : '$'}
                        />
                      )}
                    </div>
                    {totals.quoteDiscount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount Amount:</span>
                        <span>-${totals.quoteDiscount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Shipping */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Shipping:</label>
                      <input
                        type="number"
                        value={formData.shipping}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping: e.target.value }))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Tax (</span>
                      <input
                        type="number"
                        value={formData.tax_rate !== '' && formData.tax_rate != null ? formData.tax_rate : (settings?.tax_rate || 0)}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-sm text-center"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="text-gray-600">%):</span>
                    </div>
                    <span className="font-medium">${totals.tax.toFixed(2)}</span>
                  </div>

                  {/* Adjustment */}
                  <div className="border-t pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={formData.adjustment_label}
                        onChange={(e) => setFormData(prev => ({ ...prev, adjustment_label: e.target.value }))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Adjustment label"
                      />
                      <input
                        type="number"
                        value={formData.adjustment}
                        onChange={(e) => setFormData(prev => ({ ...prev, adjustment: e.target.value }))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                        step="0.01"
                        placeholder="±0.00"
                      />
                    </div>
                    {formData.adjustment !== 0 && formData.adjustment !== '' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{formData.adjustment_label || 'Adjustment'}:</span>
                        <span className={parseFloat(formData.adjustment) < 0 ? 'text-red-600' : 'text-green-600'}>
                          {parseFloat(formData.adjustment) >= 0 ? '+' : ''}${parseFloat(formData.adjustment).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Payment terms and conditions..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Update Quote' : 'Create Quote'}
            </button>
          </div>
        </form>

        {/* Item Search Modal */}
        {showItemSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Select Saved Item</h2>
                <button
                  onClick={() => setShowItemSearchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {savedItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No saved items available</p>
                ) : (
                  <div className="space-y-2">
                    {savedItems.map((savedItem) => (
                      <button
                        key={savedItem.id}
                        onClick={() => handleSelectSavedItem(savedItem)}
                        className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {savedItem.sku && (
                              <div className="text-xs font-mono text-gray-500 mb-1">
                                {savedItem.sku}
                              </div>
                            )}
                            <div className="font-medium text-gray-900">{savedItem.description}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {savedItem.category}
                              </span>
                            </div>
                          </div>
                          <div className="text-lg font-bold text-gray-900 ml-4">
                            ${savedItem.rate.toFixed(2)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Customer Modal */}
        {showCreateCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Customer Not Found</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      No customer found with number "{pendingCustomerNumber}". Would you like to create a new customer?
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateCustomerModal(false);
                      setPendingCustomerNumber('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ This will create a new customer and save it to your database for future use.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Number
                    </label>
                    <input
                      type="text"
                      value={newCustomerData.customer_number}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, customer_number: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg font-mono"
                      placeholder="e.g., CUST-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Customer name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newCustomerData.email}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="customer@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="(555) 555-5555"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={newCustomerData.address}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={newCustomerData.city}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={newCustomerData.state}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, state: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="ST"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP
                      </label>
                      <input
                        type="text"
                        value={newCustomerData.zip}
                        onChange={(e) => setNewCustomerData({ ...newCustomerData, zip: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateCustomerModal(false);
                    setPendingCustomerNumber('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Customer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Item Modal */}
        {showCreateItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Save This Item?</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Item number "{pendingItemNumber}" doesn't exist. Would you like to save it for future quotes?
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateItemModal(false);
                      setPendingItemNumber('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      💡 Saving this item will allow you to quickly add it to future quotes using the item number.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Number
                    </label>
                    <input
                      type="text"
                      value={newItemData.sku}
                      onChange={(e) => setNewItemData({ ...newItemData, sku: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg font-mono"
                      placeholder="e.g., ITEM-001, SRV-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newItemData.description}
                      onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="What is this item/service?"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemData.rate}
                      onChange={(e) => setNewItemData({ ...newItemData, rate: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newItemData.category}
                      onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="General">General</option>
                      <option value="Service">Service</option>
                      <option value="Product">Product</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateItemModal(false);
                    setPendingItemNumber('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Skip
                </button>
                <button
                  onClick={handleCreateItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Item
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuoteForm;
