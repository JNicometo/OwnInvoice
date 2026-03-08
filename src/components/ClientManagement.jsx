import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, X, Save, DollarSign, FileText, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency } from '../utils/formatting';
import { validateClient } from '../utils/validation';

function ClientManagement({ onNavigateToInvoices }) {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientStats, setClientStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [errors, setErrors] = useState({});
  const [clientAddresses, setClientAddresses] = useState([]);
  const [addressFormData, setAddressFormData] = useState({
    label: '', address: '', city: '', state: '', zip: '', country: '', is_default: false
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const ITEMS_PER_PAGE = 50;

  const {
    getAllClients,
    getPaginatedClients,
    createClient,
    updateClient,
    deleteClient,
    getClientStats,
    getClientAddresses,
    createClientAddress,
    updateClientAddress,
    deleteClientAddress
  } = useDatabase();

  const [formData, setFormData] = useState({
    customer_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
    // Credit Management
    credit_limit: 0,
    current_credit: 0,
    payment_terms: 'NET 30',
    tax_exempt: 0,
    tax_id: '',
    // Business Information
    website: '',
    industry: '',
    company_size: '',
    account_status: 'Active',
    // Billing Address
    billing_email: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    // Shipping Address
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    // Contact Information
    contact_person: '',
    contact_title: '',
    secondary_contact: '',
    secondary_email: '',
    secondary_phone: '',
    // Account Management
    account_manager: '',
    preferred_payment_method: '',
    default_discount_rate: 0,
    currency: 'USD',
    language: 'en',
    tags: ''
  });

  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    loadClients();
  }, [currentPage, searchTerm]);

  const loadClients = async () => {
    try {
      setLoading(true);
      console.log('Loading clients - Page:', currentPage, 'Search:', searchTerm);

      // Try paginated first
      if (getPaginatedClients) {
        const filters = { search: searchTerm };
        const result = await getPaginatedClients(currentPage, ITEMS_PER_PAGE, filters);

        console.log('Clients result:', result);

        if (result && result.clients) {
          setClients(result.clients);
          setFilteredClients(result.clients);
          setPagination(result.pagination);

          // Load stats
          const stats = {};
          for (const client of result.clients) {
            try {
              const clientStat = await getClientStats(client.id);
              stats[client.id] = clientStat;
            } catch (err) {
              console.error(`Error loading stats for client ${client.id}:`, err);
            }
          }
          setClientStats(stats);
          return;
        }
      }

      // Fallback to old method
      console.log('Falling back to getAllClients');
      const allClients = await getAllClients();
      setClients(allClients);
      setFilteredClients(allClients);
      setPagination(null);

      const stats = {};
      for (const client of allClients) {
        const clientStat = await getClientStats(client.id);
        stats[client.id] = clientStat;
      }
      setClientStats(stats);

    } catch (error) {
      console.error('Error loading clients:', error);
      console.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (client = null) => {
    if (client) {
      setEditingClient(client);
      // Load shipping addresses for this client
      try {
        const addresses = await getClientAddresses(client.id);
        setClientAddresses(addresses);
      } catch (err) {
        console.error('Error loading addresses:', err);
        setClientAddresses([]);
      }
      setFormData({
        customer_number: client.customer_number || '',
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || '',
        notes: client.notes || '',
        // Credit Management
        credit_limit: client.credit_limit || 0,
        current_credit: client.current_credit || 0,
        payment_terms: client.payment_terms || 'NET 30',
        tax_exempt: client.tax_exempt || 0,
        tax_id: client.tax_id || '',
        // Business Information
        website: client.website || '',
        industry: client.industry || '',
        company_size: client.company_size || '',
        account_status: client.account_status || 'Active',
        // Billing Address
        billing_email: client.billing_email || '',
        billing_address: client.billing_address || '',
        billing_city: client.billing_city || '',
        billing_state: client.billing_state || '',
        billing_zip: client.billing_zip || '',
        // Shipping Address
        shipping_address: client.shipping_address || '',
        shipping_city: client.shipping_city || '',
        shipping_state: client.shipping_state || '',
        shipping_zip: client.shipping_zip || '',
        // Contact Information
        contact_person: client.contact_person || '',
        contact_title: client.contact_title || '',
        secondary_contact: client.secondary_contact || '',
        secondary_email: client.secondary_email || '',
        secondary_phone: client.secondary_phone || '',
        // Account Management
        account_manager: client.account_manager || '',
        preferred_payment_method: client.preferred_payment_method || '',
        default_discount_rate: client.default_discount_rate || 0,
        currency: client.currency || 'USD',
        language: client.language || 'en',
        tags: client.tags || ''
      });
    } else {
      setEditingClient(null);
      setClientAddresses([]);
      setFormData({
        customer_number: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        notes: '',
        // Credit Management
        credit_limit: 0,
        current_credit: 0,
        payment_terms: 'NET 30',
        tax_exempt: 0,
        tax_id: '',
        // Business Information
        website: '',
        industry: '',
        company_size: '',
        account_status: 'Active',
        // Billing Address
        billing_email: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_zip: '',
        // Shipping Address
        shipping_address: '',
        shipping_city: '',
        shipping_state: '',
        shipping_zip: '',
        // Contact Information
        contact_person: '',
        contact_title: '',
        secondary_contact: '',
        secondary_email: '',
        secondary_phone: '',
        // Account Management
        account_manager: '',
        preferred_payment_method: '',
        default_discount_rate: 0,
        currency: 'USD',
        language: 'en',
        tags: ''
      });
    }
    setErrors({});
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleCloseModal = async () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      customer_number: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: ''
    });
    setErrors({});
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateClient(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      await loadClients();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving client:', error);
      console.error('Error saving client: ' + error.message);
    }
  };

  const handleDelete = async (id, name) => {
    const stats = clientStats[id];
    if (stats && stats.total_invoices > 0) {
      const confirmed = await window.customConfirm(
        `${name} has ${stats.total_invoices} invoice(s). Deleting this client will not delete the invoices, but they will lose the client reference. Are you sure?`
      );
      if (!confirmed) return;
    } else {
      if (!await window.customConfirm(`Delete client ${name}?`)) return;
    }

    try {
      await deleteClient(id);
      await loadClients();
    } catch (error) {
      console.error('Error deleting client: ' + error.message);
    }
  };

  // Shipping Address CRUD
  const loadClientAddresses = async (clientId) => {
    try {
      const addresses = await getClientAddresses(clientId);
      setClientAddresses(addresses);
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  const handleAddressInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setAddressFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveAddress = async () => {
    if (!addressFormData.label.trim()) {
      console.error('Please enter a label for the address');
      return;
    }
    if (!editingClient) return;

    try {
      const addrData = { ...addressFormData, client_id: editingClient.id };
      if (editingAddressId) {
        await updateClientAddress(editingAddressId, addrData);
      } else {
        await createClientAddress(addrData);
      }
      await loadClientAddresses(editingClient.id);
      setAddressFormData({ label: '', address: '', city: '', state: '', zip: '', country: '', is_default: false });
      setEditingAddressId(null);
    } catch (err) {
      console.error('Error saving address:', err);
      console.error('Error saving address: ' + err.message);
    }
  };

  const handleEditAddress = async (addr) => {
    setEditingAddressId(addr.id);
    setAddressFormData({
      label: addr.label || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      country: addr.country || '',
      is_default: !!addr.is_default
    });
  };

  const handleDeleteAddress = async (addrId) => {
    if (!await window.customConfirm('Delete this shipping address?')) return;
    try {
      await deleteClientAddress(addrId);
      await loadClientAddresses(editingClient.id);
    } catch (err) {
      console.error('Error deleting address:', err);
      console.error('Error deleting address: ' + err.message);
    }
  };

  const handleCancelEditAddress = async () => {
    setEditingAddressId(null);
    setAddressFormData({ label: '', address: '', city: '', state: '', zip: '', country: '', is_default: false });
  };

  // CSV Import Functions
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      console.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = async (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateCSVData(results.data);
      },
      error: (error) => {
        console.error('Error parsing CSV: ' + error.message);
      }
    });
  };

  const validateCSVData = async (data) => {
    const requiredFields = ['customer_number', 'name', 'email'];
    const errors = [];
    const validData = [];

    // Check if headers exist
    if (data.length === 0) {
      console.error('CSV file is empty');
      return;
    }

    const headers = Object.keys(data[0]);
    const missingFields = requiredFields.filter(field => !headers.includes(field));

    if (missingFields.length > 0) {
      console.error(`CSV file must have these columns: ${missingFields.join(', ')}`);
      return;
    }

    // Validate each row
    data.forEach((row, index) => {
      const rowErrors = [];

      // Check required fields
      if (!row.customer_number || !row.customer_number.trim()) {
        rowErrors.push('Customer number is required');
      }
      if (!row.name || !row.name.trim()) {
        rowErrors.push('Name is required');
      }
      if (!row.email || !row.email.trim()) {
        rowErrors.push('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        rowErrors.push('Invalid email format');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors }); // +2 because row 1 is headers, and index starts at 0
      } else {
        validData.push(row);
      }
    });

    setCsvData(validData);
    setCsvErrors(errors);
  };

  const handleImportCSV = async () => {
    if (csvData.length === 0) {
      console.error('No valid records to import');
      return;
    }

    try {
      setImporting(true);
      let imported = 0;
      let skipped = 0;
      const duplicates = [];

      for (const row of csvData) {
        try {
          // Check if customer number already exists
          const existingClient = clients.find(c => c.customer_number === row.customer_number);
          if (existingClient) {
            duplicates.push(row.customer_number);
            skipped++;
            continue;
          }

          await createClient({
            customer_number: row.customer_number,
            name: row.name,
            email: row.email,
            phone: row.phone || '',
            address: row.address || '',
            city: row.city || '',
            state: row.state || '',
            zip: row.zip || '',
            notes: ''
          });
          imported++;
        } catch (error) {
          console.error('Error importing row:', error);
          skipped++;
        }
      }

      await loadClients();

      let message = `Successfully imported ${imported} customer(s).`;
      if (skipped > 0) {
        message += `\n${skipped} record(s) were skipped.`;
      }
      if (duplicates.length > 0) {
        message += `\n\nDuplicate customer numbers: ${duplicates.join(', ')}`;
      }

      console.error(message);
      handleCloseImportModal();
    } catch (error) {
      console.error('Error importing CSV: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportModal = async () => {
    setShowImportModal(false);
    setCsvFile(null);
    setCsvData([]);
    setCsvErrors([]);
  };

  const downloadTemplate = async () => {
    const template = 'customer_number,name,email,phone,address,city,state,zip\nCUST001,Example Customer,customer@example.com,(555) 000-0000,123 Example St,Sample City,CA,90000';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">Manage your client information</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-5 h-5 mr-2" />
              Import CSV
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Client
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No clients found</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => {
                const stats = clientStats[client.id] || {};
                return (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onNavigateToInvoices && onNavigateToInvoices(client.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                      {client.customer_number || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      {client.address && (
                        <div className="text-sm text-gray-500">
                          {client.city && `${client.city}, `}{client.state}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {client.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <FileText className="w-4 h-4 mr-2 text-gray-400" />
                        {stats.total_invoices || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(stats.total_paid || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      {formatCurrency(stats.total_outstanding || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className={`font-medium ${(client.current_credit || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {formatCurrency(client.current_credit || 0)}
                        </div>
                        {(client.credit_limit || 0) > 0 && (
                          <div className="text-xs text-gray-500">
                            of {formatCurrency(client.credit_limit)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenModal(client)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingClient ? 'Edit Client' : 'New Client'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'basic'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Basic Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('credit')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'credit'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Credit & Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shipping')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'shipping'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Shipping & Contacts
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('account')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeTab === 'account'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Account Management
                  </button>
                </nav>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Number
                      </label>
                      <input
                        type="text"
                        name="customer_number"
                        value={formData.customer_number}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        placeholder="e.g., C-001, CUST-001, etc."
                      />
                      {errors.customer_number && <p className="text-red-500 text-xs mt-1">{errors.customer_number}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <input
                        type="text"
                        name="industry"
                        value={formData.industry}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Retail, Technology"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP
                        </label>
                        <input
                          type="text"
                          name="zip"
                          value={formData.zip}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Credit & Billing Tab */}
                {activeTab === 'credit' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                      <h3 className="font-semibold text-blue-900 mb-1">Credit Management</h3>
                      <p className="text-sm text-blue-700">Set credit limits and track customer credit balances</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credit Limit
                      </label>
                      <input
                        type="number"
                        name="credit_limit"
                        value={formData.credit_limit}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum credit allowed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Credit Balance
                      </label>
                      <input
                        type="number"
                        name="current_credit"
                        value={formData.current_credit}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Available credit</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Terms
                      </label>
                      <select
                        name="payment_terms"
                        value={formData.payment_terms}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="NET 15">NET 15</option>
                        <option value="NET 30">NET 30</option>
                        <option value="NET 45">NET 45</option>
                        <option value="NET 60">NET 60</option>
                        <option value="NET 90">NET 90</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Prepaid">Prepaid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Status
                      </label>
                      <select
                        name="account_status"
                        value={formData.account_status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Active">Active</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="tax_exempt"
                          checked={formData.tax_exempt === 1}
                          onChange={(e) => handleInputChange({target: {name: 'tax_exempt', value: e.target.checked ? 1 : 0}})}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Tax Exempt</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax ID / EIN
                      </label>
                      <input
                        type="text"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Discount Rate (%)
                      </label>
                      <input
                        type="number"
                        name="default_discount_rate"
                        value={formData.default_discount_rate}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="md:col-span-2 mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Billing Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Billing Email
                          </label>
                          <input
                            type="email"
                            name="billing_email"
                            value={formData.billing_email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="billing@company.com"
                          />
                          <p className="text-xs text-gray-500 mt-1">If different from primary email</p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
                          </label>
                          <input
                            type="text"
                            name="billing_address"
                            value={formData.billing_address}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            name="billing_city"
                            value={formData.billing_city}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              name="billing_state"
                              value={formData.billing_state}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ZIP
                            </label>
                            <input
                              type="text"
                              name="billing_zip"
                              value={formData.billing_zip}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shipping & Contacts Tab */}
                {activeTab === 'shipping' && (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Shipping Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
                          </label>
                          <input
                            type="text"
                            name="shipping_address"
                            value={formData.shipping_address}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            name="shipping_city"
                            value={formData.shipping_city}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              name="shipping_state"
                              value={formData.shipping_state}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ZIP
                            </label>
                            <input
                              type="text"
                              name="shipping_zip"
                              value={formData.shipping_zip}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Shipping Addresses */}
                    {editingClient && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">Additional Shipping Addresses</h3>
                        </div>

                        {/* Existing addresses list */}
                        {clientAddresses.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {clientAddresses.map(addr => (
                              <div key={addr.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-gray-900">{addr.label}</span>
                                    {addr.is_default ? (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>
                                    ) : null}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    {[addr.address, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditAddress(addr)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddress(addr.id)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add/Edit address form */}
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            {editingAddressId ? 'Edit Address' : 'Add New Address'}
                          </p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                              type="text"
                              name="label"
                              value={addressFormData.label}
                              onChange={handleAddressInputChange}
                              placeholder="Label (e.g. Warehouse)"
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              name="country"
                              value={addressFormData.country}
                              onChange={handleAddressInputChange}
                              placeholder="Country"
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <input
                            type="text"
                            name="address"
                            value={addressFormData.address}
                            onChange={handleAddressInputChange}
                            placeholder="Street Address"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                          />
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <input
                              type="text"
                              name="city"
                              value={addressFormData.city}
                              onChange={handleAddressInputChange}
                              placeholder="City"
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              name="state"
                              value={addressFormData.state}
                              onChange={handleAddressInputChange}
                              placeholder="State"
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                              type="text"
                              name="zip"
                              value={addressFormData.zip}
                              onChange={handleAddressInputChange}
                              placeholder="ZIP"
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                name="is_default"
                                checked={addressFormData.is_default}
                                onChange={handleAddressInputChange}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              Set as default
                            </label>
                            <div className="flex gap-2">
                              {editingAddressId && (
                                <button
                                  type="button"
                                  onClick={handleCancelEditAddress}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleSaveAddress}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                {editingAddressId ? 'Update' : 'Add'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!editingClient && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-700">
                          Save the client first, then edit to add multiple shipping addresses.
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Primary Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            name="contact_person"
                            value={formData.contact_person}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="John Doe"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            name="contact_title"
                            value={formData.contact_title}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Purchasing Manager"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Secondary Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            name="secondary_contact"
                            value={formData.secondary_contact}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            name="secondary_email"
                            value={formData.secondary_email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            name="secondary_phone"
                            value={formData.secondary_phone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Management Tab */}
                {activeTab === 'account' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Manager
                      </label>
                      <input
                        type="text"
                        name="account_manager"
                        value={formData.account_manager}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Sales rep name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Payment Method
                      </label>
                      <select
                        name="preferred_payment_method"
                        value={formData.preferred_payment_method}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="Cash">Cash</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="ACH">ACH</option>
                        <option value="Wire Transfer">Wire Transfer</option>
                        <option value="PayPal">PayPal</option>
                        <option value="Venmo">Venmo</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Stripe">Stripe</option>
                        <option value="Square">Square</option>
                        <option value="Apple Pay">Apple Pay</option>
                        <option value="Google Pay">Google Pay</option>
                        <option value="Cryptocurrency">Cryptocurrency</option>
                        <option value="Money Order">Money Order</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Size
                      </label>
                      <select
                        name="company_size"
                        value={formData.company_size}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501-1000">501-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="CNY">CNY - Chinese Yuan</option>
                        <option value="INR">INR - Indian Rupee</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        name="language"
                        value={formData.language}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="vip, wholesale, retail (comma-separated)"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated tags for categorization</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Import Customers from CSV</h2>
                <button
                  onClick={handleCloseImportModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Required columns: <code className="bg-blue-100 px-1">customer_number</code>, <code className="bg-blue-100 px-1">name</code>, <code className="bg-blue-100 px-1">email</code></li>
                  <li>• Optional columns: phone, address, city, state, zip</li>
                  <li>• First row must contain column headers</li>
                  <li>• Customer numbers must be unique</li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download CSV Template
                </button>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {csvFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: <strong>{csvFile.name}</strong>
                  </p>
                )}
              </div>

              {/* Preview/Errors */}
              {csvData.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Preview: {csvData.length} valid record(s) ready to import
                  </h3>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Customer #</th>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{row.customer_number}</td>
                            <td className="px-4 py-2">{row.name}</td>
                            <td className="px-4 py-2">{row.email}</td>
                            <td className="px-4 py-2">{row.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 10 && (
                      <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                        Showing first 10 of {csvData.length} records
                      </div>
                    )}
                  </div>
                </div>
              )}

              {csvErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-2">
                    {csvErrors.length} error(s) found:
                  </h3>
                  <div className="max-h-40 overflow-y-auto">
                    {csvErrors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-800 mb-1">
                        <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                      </div>
                    ))}
                    {csvErrors.length > 10 && (
                      <p className="text-sm text-red-700 mt-2">
                        ...and {csvErrors.length - 10} more errors
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-red-800 mt-3">
                    These rows will be skipped during import.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseImportModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={importing || csvData.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {importing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Customers
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-700">
            Showing {Math.min(((pagination.currentPage - 1) * pagination.itemsPerPage) + 1, pagination.totalItems)} to{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} clients
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
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

export default ClientManagement;
