import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Search, Edit3 } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { getCurrentDate, calculateDueDate, formatDateInput } from '../utils/formatting';
import { validateInvoice } from '../utils/validation';

function InvoiceForm({ invoice, onClose }) {
  const isEdit = !!invoice;
  const {
    getAllClients,
    getAllSavedItems,
    createInvoice,
    updateInvoice,
    generateInvoiceNumber,
    peekNextInvoiceNumber,
    getSettings,
    getInvoice,
    getClientByCustomerNumber,
    getSavedItemBySku,
    createClient,
    updateClient,
    getClient,
    createSavedItem,
    getClientAddresses,
    createClientAddress
  } = useDatabase();

  const [clients, setClients] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    date: getCurrentDate(),
    due_date: calculateDueDate(getCurrentDate(), 30),
    status: 'draft',
    type: 'invoice',
    notes: '',
    payment_terms: '',
    discount_type: 'none',
    discount_value: 0,
    shipping: 0,
    adjustment: 0,
    adjustment_label: '',
  });

  const [items, setItems] = useState([
    { item_number: '', description: '', quantity: 1, rate: 0, discount_type: 'none', discount_value: 0, amount: 0 }
  ]);

  const [clientAddresses, setClientAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false);
  const [showShippingOnInvoice, setShowShippingOnInvoice] = useState(true);
  const [customerNumberSearch, setCustomerNumberSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showItemSearchModal, setShowItemSearchModal] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(null);
  const [activeDescriptionIndex, setActiveDescriptionIndex] = useState(null);

  // Quick create/edit modals
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [pendingCustomerNumber, setPendingCustomerNumber] = useState('');
  const [pendingItemNumber, setPendingItemNumber] = useState('');
  const [pendingItemIndex, setPendingItemIndex] = useState(null);

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

  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddressData, setNewAddressData] = useState({
    label: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    is_default: false
  });

  const [newItemData, setNewItemData] = useState({
    sku: '',
    description: '',
    rate: 0,
    category: 'General'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const loadInvoiceData = async () => {
      if (invoice && invoice.id) {
        try {
          // Fetch full invoice with items using the hook
          const fullInvoice = await getInvoice(invoice.id);

          setFormData({
            invoice_number: fullInvoice.invoice_number,
            client_id: fullInvoice.client_id,
            date: formatDateInput(fullInvoice.date),
            due_date: formatDateInput(fullInvoice.due_date),
            status: fullInvoice.status,
            type: fullInvoice.type || 'invoice',
            notes: fullInvoice.notes || '',
            payment_terms: fullInvoice.payment_terms || '',
            discount_type: fullInvoice.discount_type || 'none',
            discount_value: fullInvoice.discount_value || 0,
            shipping: fullInvoice.shipping || 0,
            adjustment: fullInvoice.adjustment || 0,
            adjustment_label: fullInvoice.adjustment_label || '',
            shipping_address: fullInvoice.shipping_address || '',
            shipping_city: fullInvoice.shipping_city || '',
            shipping_state: fullInvoice.shipping_state || '',
            shipping_zip: fullInvoice.shipping_zip || '',
          });

          setShowShippingOnInvoice(fullInvoice.show_shipping_address !== 0);

          if (fullInvoice.items && fullInvoice.items.length > 0) {
            setItems(fullInvoice.items);
          }
        } catch (error) {
          console.error('Error loading invoice:', error);
        }
      } else if (invoice) {
        // If invoice object is passed but no id (shouldn't happen)
        setFormData({
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id,
          date: formatDateInput(invoice.date),
          due_date: formatDateInput(invoice.due_date),
          status: invoice.status,
          type: invoice.type || 'invoice',
          notes: invoice.notes || '',
          payment_terms: invoice.payment_terms || '',
        });
        if (invoice.items && invoice.items.length > 0) {
          setItems(invoice.items);
        }
      }
    };

    loadInvoiceData();
  }, [invoice, getInvoice]);

  // Load shipping addresses when client changes
  useEffect(() => {
    if (formData.client_id) {
      loadClientAddresses(formData.client_id);
    } else {
      setClientAddresses([]);
      setSelectedAddressId(null);
    }
  }, [formData.client_id]);

  const loadClientAddresses = async (clientId) => {
    try {
      const addresses = await getClientAddresses(parseInt(clientId));
      console.log('Loaded addresses for client', clientId, ':', addresses);
      setClientAddresses(addresses);

      // Auto-select default address
      const defaultAddr = addresses.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        fillAddressFields(defaultAddr);
      } else {
        setSelectedAddressId(null);
      }
    } catch (error) {
      console.error('Error loading client addresses:', error);
      setClientAddresses([]);
      setSelectedAddressId(null);
    }
  };

  const fillAddressFields = (addr) => {
    setFormData(prev => ({
      ...prev,
      shipping_address: addr.address || '',
      shipping_city: addr.city || '',
      shipping_state: addr.state || '',
      shipping_zip: addr.zip || ''
    }));
  };

  // Auto-sync billing address to shipping when checkbox is checked
  useEffect(() => {
    if (shippingSameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shipping_address: prev.billing_address || prev.client_address || '',
        shipping_city: prev.billing_city || prev.client_city || '',
        shipping_state: prev.billing_state || prev.client_state || '',
        shipping_zip: prev.billing_zip || prev.client_zip || ''
      }));
    }
  }, [
    shippingSameAsBilling,
    formData.billing_address,
    formData.billing_city,
    formData.billing_state,
    formData.billing_zip,
    formData.client_address,
    formData.client_city,
    formData.client_state,
    formData.client_zip
  ]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [clientsData, savedItemsData, settingsData, previewNumber] = await Promise.all([
        getAllClients(),
        getAllSavedItems(),
        getSettings(),
        !isEdit ? peekNextInvoiceNumber('invoice') : Promise.resolve(null)
      ]);

      setClients(clientsData);
      setSavedItems(savedItemsData);
      setSettings(settingsData);

      if (!isEdit && previewNumber) {
        setFormData(prev => ({
          ...prev,
          invoice_number: previewNumber,
          payment_terms: settingsData.payment_terms || ''
        }));
      } else if (!isEdit) {
        setFormData(prev => ({
          ...prev,
          payment_terms: settingsData.payment_terms || ''
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

    // Apply invoice-level discount
    let invoiceDiscount = 0;
    if (formData.discount_type === 'percentage') {
      invoiceDiscount = (subtotal * parseFloat(formData.discount_value || 0)) / 100;
    } else if (formData.discount_type === 'fixed') {
      invoiceDiscount = parseFloat(formData.discount_value || 0);
    }

    const afterDiscount = subtotal - invoiceDiscount;

    // Add shipping
    const shipping = parseFloat(formData.shipping || 0);

    // Calculate tax on (subtotal - discount + shipping)
    const taxableAmount = afterDiscount + shipping;
    const taxRate = parseFloat(settings?.tax_rate || 0) / 100;
    const tax = taxableAmount * taxRate;

    // Add adjustment (can be positive or negative)
    const adjustment = parseFloat(formData.adjustment || 0);

    // Final total
    const total = taxableAmount + tax + adjustment;

    return {
      subtotal,
      invoiceDiscount,
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

  const handleSavedItemSelect = (index, savedItemId) => {
    if (!savedItemId) return;

    const savedItem = savedItems.find(item => item.id === parseInt(savedItemId));
    if (savedItem) {
      const newItems = [...items];
      newItems[index].description = savedItem.description;
      newItems[index].rate = savedItem.rate;
      newItems[index].amount = calculateItemAmount(newItems[index]);
      setItems(newItems);
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
    if (!newCustomerData.name || !newCustomerData.email) {
      setFormError('Name and email are required');
      return;
    }

    try {
      if (editingCustomer) {
        await updateClient(editingCustomer.id, newCustomerData);

        // Refresh clients list
        const updatedClients = await getAllClients();
        setClients(updatedClients);

        // Close modal and clear state
        setShowCreateCustomerModal(false);
        setEditingCustomer(null);
        setPendingCustomerNumber('');
        setNewCustomerData({ customer_number: '', name: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });

        console.log('Customer updated successfully!');
      } else {
        const result = await createClient(newCustomerData);
        const newClientId = result.lastInsertRowid || result.id;

        console.log('Created customer with ID:', newClientId);

        // IMPORTANT: Reload clients list FIRST
        const updatedClients = await getAllClients();
        setClients(updatedClients);

        // THEN select the new client
        setFormData(prev => ({
          ...prev,
          client_id: newClientId,
          billing_address: newCustomerData.address || '',
          billing_city: newCustomerData.city || '',
          billing_state: newCustomerData.state || '',
          billing_zip: newCustomerData.zip || '',
          client_name: newCustomerData.name,
          client_email: newCustomerData.email,
          client_phone: newCustomerData.phone || ''
        }));

        // Clear search to show selected client
        setClientSearch('');
        setCustomerNumberSearch('');

        // Close modal and clear state
        setShowCreateCustomerModal(false);
        setEditingCustomer(null);
        setPendingCustomerNumber('');
        setNewCustomerData({ customer_number: '', name: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });

        console.log('Customer created and selected!');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      console.error('Failed to create customer: ' + error.message);
    }
  };

  const handleEditSelectedClient = async () => {
    if (!formData.client_id) return;
    try {
      const client = await getClient(parseInt(formData.client_id));
      setEditingCustomer(client);
      setNewCustomerData({
        customer_number: client.customer_number || '',
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || ''
      });
      setShowCreateCustomerModal(true);
    } catch (error) {
      console.error('Error loading client for edit:', error);
      console.error('Error loading client: ' + error.message);
    }
  };

  const handleAddShippingAddress = async () => {
    if (!newAddressData.label || !newAddressData.address) {
      setFormError('Please fill in Label and Address (required fields)');
      return;
    }

    try {
      const addrData = { ...newAddressData, client_id: parseInt(formData.client_id) };
      await createClientAddress(addrData);

      // Refresh addresses for this client
      await loadClientAddresses(formData.client_id);

      // Reset form and close modal
      setNewAddressData({ label: '', address: '', city: '', state: '', zip: '', country: '', is_default: false });
      setShowAddAddressModal(false);

      console.log('Shipping address added successfully!');
    } catch (error) {
      console.error('Error adding address:', error);
      console.error('Error adding address: ' + error.message);
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
      } else {
        // Item not found and has description - offer to save as new item
        if (items[index].description && items[index].description.trim()) {
          setPendingItemNumber(itemNumber.trim());
          setPendingItemIndex(index);
          setNewItemData({
            sku: itemNumber.trim(),
            description: items[index].description,
            rate: parseFloat(items[index].rate) || 0,
            category: 'General'
          });
          setShowCreateItemModal(true);
        }
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
      setPendingItemIndex(null);

      console.log('Item saved successfully! You can now use it in future invoices.');
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

    const validation = validateInvoice(formData, items);
    if (!validation.isValid) {
      setErrors(validation.errors);
      console.error('Please fix the errors in the form');
      return;
    }

    try {
      // Generate invoice number - always generate for new invoices to ensure counter increments
      let invoiceNumber = formData.invoice_number;
      if (!isEdit) {
        invoiceNumber = await generateInvoiceNumber('invoice');
      }

      const totals = calculateTotals();

      const invoiceData = {
        ...formData,
        invoice_number: invoiceNumber,
        created_from_quote_id: formData.created_from_quote_id || null,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount_type: formData.discount_type || 'none',
        discount_value: parseFloat(formData.discount_value || 0),
        discount_amount: totals.invoiceDiscount,
        shipping: parseFloat(formData.shipping || 0),
        adjustment: parseFloat(formData.adjustment || 0),
        adjustment_label: formData.adjustment_label || '',
        total: totals.total,
        shipping_address: formData.shipping_address || '',
        shipping_city: formData.shipping_city || '',
        shipping_state: formData.shipping_state || '',
        shipping_zip: formData.shipping_zip || '',
        show_shipping_address: showShippingOnInvoice ? 1 : 0,
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
        await updateInvoice(invoice.id, invoiceData, itemsData);
      } else {
        await createInvoice(invoiceData, itemsData);
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving invoice:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      if (errorMessage.includes('Trial limit reached') || errorMessage.includes('Trial expired')) {
        setFormError(errorMessage + '\n\nVisit gritsoftware.dev to purchase a license.');
      } else {
        setFormError('Error saving invoice: ' + errorMessage);
      }
    }
  };

  const totals = calculateTotals();

  const filteredClients = clientSearch
    ? clients.filter(client =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.customer_number && client.customer_number.toLowerCase().includes(clientSearch.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase()))
      )
    : clients;

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
            {isEdit ? 'Edit Invoice' : 'New Invoice'}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {errors.invoice_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.invoice_number}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search clients by name, email, or number..."
                      value={clientSearch || (formData.client_id ? (clients.find(c => c.id === parseInt(formData.client_id))?.name || '') : '')}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        if (!e.target.value) {
                          setFormData(prev => ({ ...prev, client_id: '' }));
                        }
                      }}
                      onFocus={() => {
                        if (formData.client_id && !clientSearch) {
                          setClientSearch('');
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input type="hidden" name="client_id" value={formData.client_id} required />
                    {clientSearch && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, client_id: client.id }));
                              setClientSearch('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm"
                          >
                            <div className="font-medium">{client.name}</div>
                            {client.customer_number && (
                              <span className="text-xs text-gray-500">{client.customer_number}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {clientSearch && filteredClients.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                        <div className="text-gray-500 p-2 text-sm">No clients found</div>
                      </div>
                    )}
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
                    {formData.client_id && (
                      <button
                        type="button"
                        onClick={handleEditSelectedClient}
                        className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                        title="Edit selected client"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
                {errors.client_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>
                )}
                {formData.client_id && (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={shippingSameAsBilling}
                        onChange={(e) => {
                          setShippingSameAsBilling(e.target.checked);
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              shipping_address: prev.billing_address || prev.client_address || '',
                              shipping_city: prev.billing_city || prev.client_city || '',
                              shipping_state: prev.billing_state || prev.client_state || '',
                              shipping_zip: prev.billing_zip || prev.client_zip || ''
                            }));
                            setSelectedAddressId(null);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Shipping address same as billing address
                      </span>
                    </label>

                    {!shippingSameAsBilling && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Shipping Address {clientAddresses.length > 0 ? `(${clientAddresses.length} saved)` : ''}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAddAddressModal(true)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Address
                          </button>
                        </div>

                        {clientAddresses.length > 0 ? (
                          <select
                            value={selectedAddressId || ''}
                            onChange={(e) => {
                              const addrId = parseInt(e.target.value);
                              setSelectedAddressId(addrId || null);
                              const addr = clientAddresses.find(a => a.id === addrId);
                              if (addr) {
                                fillAddressFields(addr);
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  shipping_address: '',
                                  shipping_city: '',
                                  shipping_state: '',
                                  shipping_zip: ''
                                }));
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Enter custom address below</option>
                            {clientAddresses.map(addr => (
                              <option key={addr.id} value={addr.id}>
                                {addr.label} - {addr.address}, {addr.city}, {addr.state}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No saved addresses yet.
                          </p>
                        )}
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={showShippingOnInvoice}
                        onChange={(e) => setShowShippingOnInvoice(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        Show shipping address on invoice
                      </span>
                    </label>
                  </div>
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
                  Due Date *
                </label>
                <input
                  type="date"
                  name="due_date"
                  value={formData.due_date}
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
                        // Delay to allow click on dropdown item
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
                      // Don't show if current description exactly matches a saved item
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

                  {/* Invoice-Level Discount */}
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
                    {totals.invoiceDiscount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount Amount:</span>
                        <span>-${totals.invoiceDiscount.toFixed(2)}</span>
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

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax ({settings?.tax_rate || 0}%):</span>
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
                  Payment Terms
                </label>
                <textarea
                  name="payment_terms"
                  value={formData.payment_terms}
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
              {isEdit ? 'Update Invoice' : 'Create Invoice'}
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
                    <h3 className="font-semibold mb-3">
                      {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {editingCustomer
                        ? `Editing customer "${editingCustomer.name}".`
                        : `No customer found with number "${pendingCustomerNumber}". Would you like to create a new customer?`
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateCustomerModal(false);
                      setPendingCustomerNumber('');
                      setEditingCustomer(null);
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
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCustomer ? 'Update Customer' : 'Create Customer'}
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
                      Item number "{pendingItemNumber}" doesn't exist. Would you like to save it for future invoices?
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateItemModal(false);
                      setPendingItemNumber('');
                      setPendingItemIndex(null);
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
                      💡 Saving this item will allow you to quickly add it to future invoices using the item number.
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
                    setPendingItemIndex(null);
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

        {/* Add Shipping Address Modal */}
        {showAddAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Add Shipping Address</h2>
                  <button
                    onClick={() => {
                      setShowAddAddressModal(false);
                      setNewAddressData({ label: '', address: '', city: '', state: '', zip: '', country: '', is_default: false });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAddressData.label}
                      onChange={(e) => setNewAddressData({ ...newAddressData, label: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="e.g., Warehouse, Main Office"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAddressData.address}
                      onChange={(e) => setNewAddressData({ ...newAddressData, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="123 Main St"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={newAddressData.city}
                        onChange={(e) => setNewAddressData({ ...newAddressData, city: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={newAddressData.state}
                        onChange={(e) => setNewAddressData({ ...newAddressData, state: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="ST"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                      <input
                        type="text"
                        value={newAddressData.zip}
                        onChange={(e) => setNewAddressData({ ...newAddressData, zip: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={newAddressData.country}
                      onChange={(e) => setNewAddressData({ ...newAddressData, country: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="USA"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAddressData.is_default}
                      onChange={(e) => setNewAddressData({ ...newAddressData, is_default: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Set as default shipping address</span>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddAddressModal(false);
                    setNewAddressData({ label: '', address: '', city: '', state: '', zip: '', country: '', is_default: false });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddShippingAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoiceForm;
