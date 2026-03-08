import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Save, X, Tag, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency } from '../utils/formatting';
import { validateSavedItem } from '../utils/validation';

function SavedItems() {
  const [savedItems, setSavedItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [errors, setErrors] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const ITEMS_PER_PAGE = 10;

  const { getAllSavedItems, getPaginatedSavedItems, createSavedItem, updateSavedItem, deleteSavedItem } = useDatabase();

  const [formData, setFormData] = useState({
    description: '',
    rate: '',
    category: 'General',
    // Product Details
    sku: '',
    barcode: '',
    unit_of_measure: 'Each',
    // Pricing
    cost_price: '',
    markup_percentage: '',
    // Settings
    taxable: true,
    is_active: true,
    notes: ''
  });

  const categories = ['General', 'Consulting', 'Development', 'Design', 'Marketing', 'Support', 'Other'];

  useEffect(() => {
    loadSavedItems();
  }, [currentPage, searchTerm, categoryFilter]);

  const loadSavedItems = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchTerm,
        category: categoryFilter
      };
      const result = await getPaginatedSavedItems(currentPage, ITEMS_PER_PAGE, filters);
      setSavedItems(result.items);
      setFilteredItems(result.items);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error loading saved items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = async (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        description: item.description,
        rate: item.rate.toString(),
        category: item.category,
        // Product Details
        sku: item.sku || item.item_number || '',
        barcode: item.barcode || '',
        unit_of_measure: item.unit_of_measure || 'Each',
        // Pricing
        cost_price: item.cost_price ? item.cost_price.toString() : '',
        markup_percentage: item.markup_percentage ? item.markup_percentage.toString() : '',
        // Settings
        taxable: item.taxable !== 0,
        is_active: item.is_active !== 0,
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        description: '',
        rate: '',
        category: 'General',
        // Product Details
        sku: '',
        barcode: '',
        unit_of_measure: 'Each',
        // Pricing
        cost_price: '',
        markup_percentage: '',
        // Settings
        taxable: true,
        is_active: true,
        notes: ''
      });
    }
    setErrors({});
    setShowForm(true);
  };

  const handleCloseForm = async () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      description: '',
      rate: '',
      category: 'General',
      // Product Details
      sku: '',
      barcode: '',
      unit_of_measure: 'Each',
      // Pricing
      cost_price: '',
      markup_percentage: '',
      // Settings
      taxable: true,
      is_active: true,
      notes: ''
    });
    setErrors({});
  };

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Auto-calculate rate from cost_price and markup_percentage
      if (name === 'cost_price' || name === 'markup_percentage') {
        const costPrice = parseFloat(name === 'cost_price' ? value : prev.cost_price) || 0;
        const markupPct = parseFloat(name === 'markup_percentage' ? value : prev.markup_percentage) || 0;
        if (costPrice > 0) {
          updated.rate = (costPrice * (1 + markupPct / 100)).toFixed(2);
        }
      }

      return updated;
    });
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateSavedItem({
      ...formData,
      rate: parseFloat(formData.rate)
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      const itemData = {
        description: formData.description,
        rate: parseFloat(formData.rate),
        category: formData.category,
        // Product Details
        sku: formData.sku || '',
        barcode: formData.barcode || '',
        unit_of_measure: formData.unit_of_measure || 'Each',
        // Pricing
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
        markup_percentage: formData.markup_percentage ? parseFloat(formData.markup_percentage) : 0,
        // Settings
        taxable: formData.taxable ? 1 : 0,
        is_active: formData.is_active ? 1 : 0,
        notes: formData.notes || ''
      };

      if (editingItem) {
        await updateSavedItem(editingItem.id, itemData);
      } else {
        await createSavedItem(itemData);
      }

      await loadSavedItems();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving item:', error);
      console.error('Error saving item: ' + error.message);
    }
  };

  const handleDelete = async (id, description) => {
    if (await window.customConfirm(`Delete "${description}"?`)) {
      try {
        await deleteSavedItem(id);
        await loadSavedItems();
      } catch (error) {
        console.error('Error deleting item: ' + error.message);
      }
    }
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
    const requiredFields = ['item_number', 'description', 'rate'];
    const errors = [];
    const validData = [];

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

    data.forEach((row, index) => {
      const rowErrors = [];

      if (!row.item_number || !row.item_number.trim()) {
        rowErrors.push('Item number is required');
      }
      if (!row.description || !row.description.trim()) {
        rowErrors.push('Description is required');
      }
      if (!row.rate || isNaN(parseFloat(row.rate))) {
        rowErrors.push('Rate must be a number');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors });
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
          const existingItem = savedItems.find(i => (i.sku || i.item_number) === row.item_number);
          if (existingItem) {
            duplicates.push(row.item_number);
            skipped++;
            continue;
          }

          await createSavedItem({
            sku: row.sku || row.item_number,
            description: row.description,
            rate: parseFloat(row.rate),
            category: row.category || 'General'
          });
          imported++;
        } catch (error) {
          console.error('Error importing row:', error);
          skipped++;
        }
      }

      await loadSavedItems();

      let message = `Successfully imported ${imported} item(s).`;
      if (skipped > 0) {
        message += `\n${skipped} record(s) were skipped.`;
      }
      if (duplicates.length > 0) {
        message += `\n\nDuplicate item numbers: ${duplicates.join(', ')}`;
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
    const template = 'item_number,description,rate,category\nITEM001,Example Service,100.00,Services';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'items_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading saved items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Items</h1>
            <p className="text-gray-500 mt-1">Reusable line items for your invoices</p>
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
              onClick={() => handleOpenForm()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Item
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Save className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No saved items found</p>
            <button
              onClick={() => handleOpenForm()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Item
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                    {item.sku || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      <Tag className="w-3 h-3 mr-1" />
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleOpenForm(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.description)}
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
            {pagination.totalItems} items
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Saved Item' : 'New Saved Item'}
              </h2>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Section Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    type="button"
                    onClick={() => setActiveSection('basic')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeSection === 'basic'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Basic Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('inventory')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 ${
                      activeSection === 'inventory'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pricing
                  </button>
                </nav>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Basic Info Section */}
                {activeSection === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Web Development - Hourly"
                        required
                      />
                      {errors.description && (
                        <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., SKU-12345"
                      />
                      <p className="text-xs text-gray-500 mt-1">Optional: Used for quick searching</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Barcode
                      </label>
                      <input
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 123456789012"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit of Measure
                      </label>
                      <select
                        name="unit_of_measure"
                        value={formData.unit_of_measure}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Each">Each</option>
                        <option value="Hour">Hour</option>
                        <option value="Day">Day</option>
                        <option value="Week">Week</option>
                        <option value="Month">Month</option>
                        <option value="Kilogram">Kilogram</option>
                        <option value="Pound">Pound</option>
                        <option value="Liter">Liter</option>
                        <option value="Meter">Meter</option>
                        <option value="Foot">Foot</option>
                        <option value="Box">Box</option>
                        <option value="Case">Case</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sell Price (Rate) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          name="rate"
                          value={formData.rate}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      {errors.rate && (
                        <p className="text-red-500 text-xs mt-1">{errors.rate}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="taxable"
                          checked={formData.taxable}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Taxable</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
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
                        placeholder="Additional notes about this item..."
                      />
                    </div>
                  </div>
                )}

                {/* Pricing Section */}
                {activeSection === 'inventory' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Information</h3>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          name="cost_price"
                          value={formData.cost_price}
                          onChange={handleInputChange}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">What you pay for this item</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Markup Percentage
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="markup_percentage"
                          value={formData.markup_percentage}
                          onChange={handleInputChange}
                          className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          step="0.01"
                          min="0"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Profit margin on cost price</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingItem ? 'Update Item' : 'Create Item'}
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
                <h2 className="text-2xl font-bold text-gray-900">Import Items from CSV</h2>
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
                  <li>• Required columns: <code className="bg-blue-100 px-1">item_number</code>, <code className="bg-blue-100 px-1">description</code>, <code className="bg-blue-100 px-1">rate</code></li>
                  <li>• Optional columns: category</li>
                  <li>• First row must contain column headers</li>
                  <li>• Item numbers must be unique</li>
                  <li>• Rate must be a valid number</li>
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
                          <th className="px-4 py-2 text-left">Item #</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-right">Rate</th>
                          <th className="px-4 py-2 text-left">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{row.item_number}</td>
                            <td className="px-4 py-2">{row.description}</td>
                            <td className="px-4 py-2 text-right">${parseFloat(row.rate).toFixed(2)}</td>
                            <td className="px-4 py-2">{row.category || 'General'}</td>
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
                      Import Items
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedItems;
