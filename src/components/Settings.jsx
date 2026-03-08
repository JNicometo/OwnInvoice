import React, { useState, useEffect, useRef } from 'react';
import { Save, Building, FileText, Palette, Check, Settings as SettingsIcon, Globe, Mail, Hash, Upload, X as XIcon, Type, Layout, Paintbrush, Eye, CreditCard, HardDrive, Download, UploadCloud, Database, Server, DollarSign, ChevronDown, Sun, Moon, Monitor } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { validateSettings } from '../utils/validation';

function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [expandedPaymentGateways, setExpandedPaymentGateways] = useState({
    stripe: false,
    paypal: false,
    square: false,
    gocardless: false,
    authorizenet: false,
  });

  const fileInputRef = useRef(null);
  const { getSettings, updateSettings } = useDatabase();

  const [formData, setFormData] = useState({
    // Company Info
    company_name: '',
    company_email: '',
    company_phone: '',
    company_website: '',
    company_address: '',
    company_city: '',
    company_state: '',
    company_zip: '',
    company_country: '',
    tax_id: '',
    business_registration: '',
    logo_url: '',

    // Invoice Settings
    invoice_prefix: '',
    invoice_suffix: '',
    invoice_start_number: '',
    quote_prefix: '',
    tax_rate: '',
    tax_label: '',
    currency_symbol: '',
    currency_code: '',
    payment_terms: '',
    bank_details: '',
    default_due_days: '',
    default_notes: '',
    invoice_footer: '',

    // Formatting
    date_format: '',
    number_format: '',
    decimal_separator: '',
    thousand_separator: '',

    // Numbering Formats
    customer_number_prefix: '',
    item_number_prefix: '',

    // Email Templates
    email_subject_template: '',
    email_body_template: '',
    email_cc: '',
    email_bcc: '',

    // SMTP Configuration
    smtp_host: '',
    smtp_port: '',
    smtp_secure: true,
    smtp_user: '',
    smtp_password: '',
    smtp_from_name: '',
    smtp_from_email: '',

    // Payment Gateway
    stripe_secret_key: '',
    stripe_publishable_key: '',
    stripe_enabled: false,
    paypal_client_id: '',
    paypal_client_secret: '',
    paypal_enabled: false,

    // Square Integration
    square_access_token: '',
    square_location_id: '',
    square_enabled: false,
    square_environment: 'sandbox',

    // GoCardless Integration
    gocardless_access_token: '',
    gocardless_enabled: false,
    gocardless_environment: 'sandbox',

    // Authorize.Net Integration
    authorizenet_api_login_id: '',
    authorizenet_transaction_key: '',
    authorizenet_enabled: false,
    authorizenet_environment: 'sandbox',

    // Display Options
    show_item_numbers: true,
    show_customer_numbers: true,
    show_tax_breakdown: true,
    show_payment_terms: true,

    // Invoice Field Display Options
    show_client_email_on_invoice: true,
    show_client_phone_on_invoice: true,
    show_client_billing_address_on_invoice: false,
    show_client_shipping_address_on_invoice: false,
    show_client_tax_id_on_invoice: false,
    show_item_sku_on_invoice: false,
    show_item_unit_on_invoice: true,

    // Theme - Basic
    dark_mode: 'off',
    theme: 'blue',

    // Theme - Colors
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    accent_color: '#10B981',
    invoice_header_color: '#1F2937',
    invoice_accent_color: '#3B82F6',
    text_primary_color: '#111827',
    text_secondary_color: '#6B7280',

    // Theme - Invoice Layout
    invoice_template: 'modern',
    invoice_header_style: 'left',
    invoice_border_style: 'subtle',
    invoice_spacing: 'normal',
    invoice_table_style: 'striped',

    // Theme - Typography
    heading_font: 'Inter',
    body_font: 'Inter',
    heading_size: 'normal',
    body_size: 'normal',

    // Theme - Invoice Elements
    show_logo_on_invoice: true,
    show_company_address_on_invoice: true,
    show_invoice_border: true,
    invoice_corner_style: 'rounded',

    // Theme - PDF Options
    pdf_page_size: 'letter',
    pdf_margin_size: 'normal',
    pdf_header_height: 'normal',

    // Navigation Tabs
    tab_configuration: null,

    // SQL Server Settings
    use_sql_server: false,
    sql_server_type: 'mysql',
    sql_server_host: 'localhost',
    sql_server_port: '3306',
    sql_server_database: 'invoicepro',
    sql_server_username: '',
    sql_server_password: '',
    sql_server_ssl: false,

    // Backup Schedule Settings
    backup_enabled: false,
    backup_schedule: 'daily',
    backup_time: '02:00',
    backup_day_of_week: 0,
    backup_day_of_month: 1,
    backup_location: '',
    backup_retention: 7,
    backup_last_run: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSettings();
      if (data) {
        setFormData({
          // Company Info
          company_name: data.company_name || '',
          company_email: data.company_email || '',
          company_phone: data.company_phone || '',
          company_website: data.company_website || '',
          company_address: data.company_address || '',
          company_city: data.company_city || '',
          company_state: data.company_state || '',
          company_zip: data.company_zip || '',
          company_country: data.company_country || '',
          tax_id: data.tax_id || '',
          business_registration: data.business_registration || '',
          logo_url: data.logo_url || '',

          // Invoice Settings
          invoice_prefix: data.invoice_prefix || 'INV-',
          invoice_suffix: data.invoice_suffix || '',
          invoice_start_number: data.invoice_start_number || '1',
          quote_prefix: data.quote_prefix || 'QUO-',
          tax_rate: data.tax_rate !== null && data.tax_rate !== undefined ? data.tax_rate.toString() : '0',
          tax_label: data.tax_label || 'Tax',
          currency_symbol: data.currency_symbol || '$',
          currency_code: data.currency_code || 'USD',
          payment_terms: data.payment_terms || 'Payment due within 30 days',
          bank_details: data.bank_details || '',
          default_due_days: data.default_due_days || '30',
          default_notes: data.default_notes || '',
          invoice_footer: data.invoice_footer || 'Thank you for your business!',

          // Formatting
          date_format: data.date_format || 'MM/DD/YYYY',
          number_format: data.number_format || '1,000.00',
          decimal_separator: data.decimal_separator || '.',
          thousand_separator: data.thousand_separator || ',',

          // Numbering Formats
          customer_number_prefix: data.customer_number_prefix || 'CUST-',
          item_number_prefix: data.item_number_prefix || 'ITEM-',

          // Email Templates
          email_subject_template: data.email_subject_template || 'Invoice {invoice_number} from {company_name}',
          email_body_template: data.email_body_template || 'Dear {client_name},\n\nPlease find attached invoice {invoice_number} for {total}.\n\nThank you for your business!\n\nBest regards,\n{company_name}',
          email_cc: data.email_cc || '',
          email_bcc: data.email_bcc || '',

          // SMTP Configuration
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || '587',
          smtp_secure: data.smtp_secure !== undefined ? data.smtp_secure : false,
          smtp_user: data.smtp_user || '',
          smtp_password: data.smtp_password || '',
          smtp_from_name: data.smtp_from_name || '',
          smtp_from_email: data.smtp_from_email || '',

          // Payment Gateway
          stripe_secret_key: data.stripe_secret_key || '',
          stripe_publishable_key: data.stripe_publishable_key || '',
          stripe_enabled: data.stripe_enabled !== undefined ? data.stripe_enabled : false,
          paypal_client_id: data.paypal_client_id || '',
          paypal_client_secret: data.paypal_client_secret || '',
          paypal_enabled: data.paypal_enabled !== undefined ? data.paypal_enabled : false,

          // Square Integration
          square_access_token: data.square_access_token || '',
          square_location_id: data.square_location_id || '',
          square_enabled: data.square_enabled !== undefined ? data.square_enabled : false,
          square_environment: data.square_environment || 'sandbox',

          // GoCardless Integration
          gocardless_access_token: data.gocardless_access_token || '',
          gocardless_enabled: data.gocardless_enabled !== undefined ? data.gocardless_enabled : false,
          gocardless_environment: data.gocardless_environment || 'sandbox',

          // Authorize.Net Integration
          authorizenet_api_login_id: data.authorizenet_api_login_id || '',
          authorizenet_transaction_key: data.authorizenet_transaction_key || '',
          authorizenet_enabled: data.authorizenet_enabled !== undefined ? data.authorizenet_enabled : false,
          authorizenet_environment: data.authorizenet_environment || 'sandbox',

          // Display Options
          show_item_numbers: data.show_item_numbers !== undefined ? data.show_item_numbers : true,
          show_customer_numbers: data.show_customer_numbers !== undefined ? data.show_customer_numbers : true,
          show_tax_breakdown: data.show_tax_breakdown !== undefined ? data.show_tax_breakdown : true,
          show_payment_terms: data.show_payment_terms !== undefined ? data.show_payment_terms : true,

          // Invoice Field Display Options
          show_client_email_on_invoice: data.show_client_email_on_invoice !== undefined ? data.show_client_email_on_invoice : true,
          show_client_phone_on_invoice: data.show_client_phone_on_invoice !== undefined ? data.show_client_phone_on_invoice : true,
          show_client_billing_address_on_invoice: data.show_client_billing_address_on_invoice !== undefined ? data.show_client_billing_address_on_invoice : false,
          show_client_shipping_address_on_invoice: data.show_client_shipping_address_on_invoice !== undefined ? data.show_client_shipping_address_on_invoice : false,
          show_client_tax_id_on_invoice: data.show_client_tax_id_on_invoice !== undefined ? data.show_client_tax_id_on_invoice : false,
          show_item_sku_on_invoice: data.show_item_sku_on_invoice !== undefined ? data.show_item_sku_on_invoice : false,
          show_item_unit_on_invoice: data.show_item_unit_on_invoice !== undefined ? data.show_item_unit_on_invoice : true,

          // Theme - Basic
          dark_mode: data.dark_mode || 'off',
          theme: data.theme || 'blue',

          // Theme - Colors
          primary_color: data.primary_color || '#3B82F6',
          secondary_color: data.secondary_color || '#8B5CF6',
          accent_color: data.accent_color || '#10B981',
          invoice_header_color: data.invoice_header_color || '#1F2937',
          invoice_accent_color: data.invoice_accent_color || '#3B82F6',
          text_primary_color: data.text_primary_color || '#111827',
          text_secondary_color: data.text_secondary_color || '#6B7280',

          // Theme - Invoice Layout
          invoice_template: data.invoice_template || 'modern',
          invoice_header_style: data.invoice_header_style || 'left',
          invoice_border_style: data.invoice_border_style || 'subtle',
          invoice_spacing: data.invoice_spacing || 'normal',
          invoice_table_style: data.invoice_table_style || 'striped',

          // Theme - Typography
          heading_font: data.heading_font || 'Inter',
          body_font: data.body_font || 'Inter',
          heading_size: data.heading_size || 'normal',
          body_size: data.body_size || 'normal',

          // Theme - Invoice Elements
          show_logo_on_invoice: data.show_logo_on_invoice !== undefined ? data.show_logo_on_invoice : true,
          show_company_address_on_invoice: data.show_company_address_on_invoice !== undefined ? data.show_company_address_on_invoice : true,
          show_invoice_border: data.show_invoice_border !== undefined ? data.show_invoice_border : true,
          invoice_corner_style: data.invoice_corner_style || 'rounded',

          // Theme - PDF Options
          pdf_page_size: data.pdf_page_size || 'letter',
          pdf_margin_size: data.pdf_margin_size || 'normal',
          pdf_header_height: data.pdf_header_height || 'normal',

          // Navigation Tabs
          tab_configuration: data.tab_configuration || null,

          // SQL Server Settings
          use_sql_server: data.use_sql_server !== undefined ? data.use_sql_server : false,
          sql_server_type: data.sql_server_type || 'mysql',
          sql_server_host: data.sql_server_host || 'localhost',
          sql_server_port: data.sql_server_port || '3306',
          sql_server_database: data.sql_server_database || 'invoicepro',
          sql_server_username: data.sql_server_username || '',
          sql_server_password: data.sql_server_password || '',
          sql_server_ssl: data.sql_server_ssl !== undefined ? data.sql_server_ssl : false,

          // Backup Schedule Settings
          backup_enabled: data.backup_enabled !== undefined ? Boolean(data.backup_enabled) : false,
          backup_schedule: data.backup_schedule || 'daily',
          backup_time: data.backup_time || '02:00',
          backup_day_of_week: data.backup_day_of_week !== undefined ? data.backup_day_of_week : 0,
          backup_day_of_month: data.backup_day_of_month !== undefined ? data.backup_day_of_month : 1,
          backup_location: data.backup_location || '',
          backup_retention: data.backup_retention !== undefined ? data.backup_retention : 7,
          backup_last_run: data.backup_last_run || ''
        });

        // Set logo preview if exists
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      console.error('Please upload a valid image file (PNG, JPG, SVG, or WebP)');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      console.error('Image size must be less than 2MB. Please choose a smaller file.');
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      setFormData(prev => ({ ...prev, logo_url: base64String }));
      setLogoPreview(base64String);
      setSuccessMessage('');
    };
    reader.onerror = () => {
      console.error('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = async () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogoButtonClick = async () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateSettings({
      ...formData,
      tax_rate: parseFloat(formData.tax_rate)
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSaving(true);
      await updateSettings({
        ...formData,
        tax_rate: parseFloat(formData.tax_rate)
      });
      setSuccessMessage('Settings saved successfully!');

      // Dispatch event to reload navigation without restarting
      window.dispatchEvent(new CustomEvent('navigation-updated'));

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'company', name: 'Company Info', icon: Building },
    { id: 'invoice', name: 'Invoice Settings', icon: FileText },
    { id: 'formatting', name: 'Formatting', icon: Globe },
    { id: 'numbering', name: 'Numbering', icon: Hash },
    { id: 'email', name: 'Email Templates', icon: Mail },
    { id: 'payments', name: 'Payment Gateways', icon: CreditCard },
    { id: 'display', name: 'Display Options', icon: SettingsIcon },
    { id: 'navigation', name: 'Navigation', icon: Layout },
    { id: 'backup', name: 'Backup & Restore', icon: HardDrive },
    { id: 'sqlserver', name: 'SQL Server', icon: Database },
    { id: 'theme', name: 'Theme', icon: Palette },
  ];

  const themes = [
    { id: 'blue', name: 'Blue', color: 'bg-blue-600' },
    { id: 'green', name: 'Green', color: 'bg-green-600' },
    { id: 'purple', name: 'Purple', color: 'bg-purple-600' },
    { id: 'red', name: 'Red', color: 'bg-red-600' },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Customize your application settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Company Info Tab */}
              {activeTab === 'company' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      This information will appear on your invoices
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {errors.company_name && (
                        <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="company_email"
                        value={formData.company_email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      {errors.company_email && (
                        <p className="text-red-500 text-xs mt-1">{errors.company_email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="company_phone"
                        value={formData.company_phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        name="company_website"
                        value={formData.company_website}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://www.yourcompany.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax ID / VAT Number
                      </label>
                      <input
                        type="text"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 12-3456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Registration #
                      </label>
                      <input
                        type="text"
                        name="business_registration"
                        value={formData.business_registration}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Registration number"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        name="company_address"
                        value={formData.company_address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123 Business Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="company_city"
                        value={formData.company_city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State / Province
                      </label>
                      <input
                        type="text"
                        name="company_state"
                        value={formData.company_state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP / Postal Code
                      </label>
                      <input
                        type="text"
                        name="company_zip"
                        value={formData.company_zip}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12345"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        name="company_country"
                        value={formData.company_country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="United States"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Logo
                      </label>

                      <div className="flex items-start space-x-4">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                          {logoPreview ? (
                            <div className="relative">
                              <img
                                src={logoPreview}
                                alt="Company Logo"
                                className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg bg-white p-2"
                              />
                              <button
                                type="button"
                                onClick={handleLogoRemove}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                                title="Remove logo"
                              >
                                <XIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                              <div className="text-center">
                                <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">No logo</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Upload Button */}
                        <div className="flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={handleLogoButtonClick}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                          </button>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600">
                              <strong>Accepted formats:</strong> PNG, JPG, SVG, WebP
                            </p>
                            <p className="text-xs text-gray-600">
                              <strong>Max size:</strong> 2MB
                            </p>
                            <p className="text-xs text-gray-600">
                              <strong>Recommended:</strong> 200x200px square
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Settings Tab */}
              {activeTab === 'invoice' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Invoice Settings</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Configure default invoice options and templates
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Numbering Format Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">📝 Flexible Numbering System</h4>
                      <p className="text-xs text-blue-700">
                        Enter the next invoice/quote number in any format you want. The system will automatically increment the number portion while keeping your format.
                        <br />
                        <span className="font-medium">Examples:</span> INV-0001, 2024-001, ABC-12345, BILL-00001
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Due Days
                      </label>
                      <input
                        type="number"
                        name="default_due_days"
                        value={formData.default_due_days}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Days until payment is due
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        name="tax_rate"
                        value={formData.tax_rate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      {errors.tax_rate && (
                        <p className="text-red-500 text-xs mt-1">{errors.tax_rate}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Label
                      </label>
                      <select
                        name="tax_label"
                        value={formData.tax_label}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Tax">Tax</option>
                        <option value="VAT">VAT</option>
                        <option value="GST">GST</option>
                        <option value="Sales Tax">Sales Tax</option>
                        <option value="HST">HST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        name="currency_symbol"
                        value={formData.currency_symbol}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="$"
                        maxLength="3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency Code
                      </label>
                      <input
                        type="text"
                        name="currency_code"
                        value={formData.currency_code}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="USD"
                        maxLength="3"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        ISO code (USD, EUR, GBP, etc.)
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Payment Terms
                      </label>
                      <textarea
                        name="payment_terms"
                        value={formData.payment_terms}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Payment due within 30 days..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Invoice Notes
                      </label>
                      <textarea
                        name="default_notes"
                        value={formData.default_notes}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Thank you for your business! Please contact us with any questions."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Footer Text
                      </label>
                      <textarea
                        name="invoice_footer"
                        value={formData.invoice_footer}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Thank you for your business!"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank/Payment Details
                      </label>
                      <textarea
                        name="bank_details"
                        value={formData.bank_details}
                        onChange={handleInputChange}
                        rows="4"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Bank Name: &#10;Account Number: &#10;Routing Number: &#10;PayPal: "
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This will appear on your invoices
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Formatting Tab */}
              {activeTab === 'formatting' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Formatting Options</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Customize date and number formats
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Format
                      </label>
                      <select
                        name="date_format"
                        value={formData.date_format}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                        <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                        <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2024)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number Format
                      </label>
                      <select
                        name="number_format"
                        value={formData.number_format}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="1,000.00">1,000.00 (US/UK)</option>
                        <option value="1.000,00">1.000,00 (Europe)</option>
                        <option value="1 000,00">1 000,00 (France)</option>
                        <option value="1'000.00">1'000.00 (Switzerland)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Decimal Separator
                      </label>
                      <select
                        name="decimal_separator"
                        value={formData.decimal_separator}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value=".">. (Period)</option>
                        <option value=",">, (Comma)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thousand Separator
                      </label>
                      <select
                        name="thousand_separator"
                        value={formData.thousand_separator}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value=",">, (Comma)</option>
                        <option value=".">. (Period)</option>
                        <option value=" ">(Space)</option>
                        <option value="'">' (Apostrophe)</option>
                        <option value="">None</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Preview:</strong> {formData.currency_symbol}1{formData.thousand_separator}234{formData.decimal_separator}56
                    </p>
                  </div>
                </div>
              )}

              {/* Numbering Tab */}
              {activeTab === 'numbering' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Numbering Formats</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Set default prefixes for auto-generated numbers
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Number Prefix
                      </label>
                      <input
                        type="text"
                        name="customer_number_prefix"
                        value={formData.customer_number_prefix}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        placeholder="CUST-"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Suggested format: CUST-001, CL-0001
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Number Prefix
                      </label>
                      <input
                        type="text"
                        name="item_number_prefix"
                        value={formData.item_number_prefix}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        placeholder="ITEM-"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Suggested format: ITEM-001, SRV-001
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Note:</strong> These prefixes are suggestions for manual numbering. They won't automatically generate numbers but provide consistent formatting guidelines.
                    </p>
                  </div>
                </div>
              )}

              {/* Email Templates Tab */}
              {activeTab === 'email' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Configuration</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Configure SMTP settings and email templates for sending invoices
                    </p>
                  </div>

                  {/* SMTP Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Mail className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">SMTP Settings</h3>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Email Provider Examples:</strong>
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1 ml-4">
                        <li><strong>Gmail:</strong> smtp.gmail.com, Port 587 (Enable "App Passwords" in Google Account)</li>
                        <li><strong>Outlook/Hotmail:</strong> smtp-mail.outlook.com, Port 587</li>
                        <li><strong>Yahoo:</strong> smtp.mail.yahoo.com, Port 587</li>
                        <li><strong>Custom SMTP:</strong> Contact your email provider for settings</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Host <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="smtp_host"
                          value={formData.smtp_host}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="smtp.gmail.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your email provider's SMTP server address
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Port <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="smtp_port"
                          value={formData.smtp_port}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="587"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usually 587 (TLS) or 465 (SSL)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Encryption
                        </label>
                        <select
                          name="smtp_secure"
                          value={formData.smtp_secure.toString()}
                          onChange={(e) => setFormData(prev => ({ ...prev, smtp_secure: e.target.value === 'true' }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="false">TLS (Port 587)</option>
                          <option value="true">SSL (Port 465)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="smtp_user"
                          value={formData.smtp_user}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your-email@gmail.com"
                          autoComplete="username"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Usually your full email address
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SMTP Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="smtp_password"
                          value={formData.smtp_password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="••••••••"
                          autoComplete="current-password"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use App Password for Gmail (not your account password)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          From Name
                        </label>
                        <input
                          type="text"
                          name="smtp_from_name"
                          value={formData.smtp_from_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your Company Name"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Name that appears in recipient's inbox
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          From Email Address
                        </label>
                        <input
                          type="email"
                          name="smtp_from_email"
                          value={formData.smtp_from_email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="invoices@yourcompany.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Email address emails will be sent from
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Email Templates */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Subject Template
                      </label>
                      <input
                        type="text"
                        name="email_subject_template"
                        value={formData.email_subject_template}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Invoice {invoice_number} from {company_name}"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available variables: {'{invoice_number}'}, {'{company_name}'}, {'{total}'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Body Template
                      </label>
                      <textarea
                        name="email_body_template"
                        value={formData.email_body_template}
                        onChange={handleInputChange}
                        rows="8"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="Dear {client_name},&#10;&#10;Please find attached invoice {invoice_number} for {total}.&#10;&#10;Thank you for your business!&#10;&#10;Best regards,&#10;{company_name}"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available variables: {'{client_name}'}, {'{invoice_number}'}, {'{total}'}, {'{due_date}'}, {'{company_name}'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CC Email Addresses
                        </label>
                        <input
                          type="text"
                          name="email_cc"
                          value={formData.email_cc}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="accounting@company.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separate multiple emails with commas
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          BCC Email Addresses
                        </label>
                        <input
                          type="text"
                          name="email_bcc"
                          value={formData.email_bcc}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="records@company.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separate multiple emails with commas
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✓ Email Sending Enabled:</strong> Configure your SMTP settings above and save to start sending invoices via email with PDF attachments.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Gateways Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Gateway Integration</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Connect payment gateways to accept online payments. Click on a gateway to configure it.
                    </p>
                  </div>

                  {/* Payment Gateway Comparison Table */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                      Compare Payment Gateways
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-semibold text-gray-900">Gateway</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-900">Fees</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-900">Payment Methods</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-900">Best For</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200">
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                <span className="font-semibold text-gray-900">GoCardless</span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Lowest Fees</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-green-700">1% + $0.25</div>
                              <div className="text-xs text-gray-600">Save 65% vs cards</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-gray-700">ACH (US)</div>
                              <div className="text-gray-700">SEPA (EU)</div>
                              <div className="text-xs text-gray-500">Bank transfers</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">
                              <div>• Large invoices ($1,000+)</div>
                              <div>• Recurring payments</div>
                              <div>• B2B transactions</div>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                <span className="font-semibold text-gray-900">Stripe</span>
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">Popular</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-700">2.9% + $0.30</div>
                              <div className="text-xs text-gray-600">Standard rate</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-gray-700">Credit/Debit cards</div>
                              <div className="text-gray-700">Apple Pay, Google Pay</div>
                              <div className="text-xs text-gray-500">Digital wallets</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">
                              <div>• Online businesses</div>
                              <div>• International clients</div>
                              <div>• Quick payments</div>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                                <span className="font-semibold text-gray-900">Square</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-700">2.9% + $0.30</div>
                              <div className="text-xs text-gray-600">Online rate</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-gray-700">Credit/Debit cards</div>
                              <div className="text-gray-700">Apple Pay, Google Pay</div>
                              <div className="text-gray-700">Cash App Pay</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">
                              <div>• Small businesses</div>
                              <div>• In-person + online</div>
                              <div>• US market</div>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                                <span className="font-semibold text-gray-900">Authorize.Net</span>
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">Enterprise</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-700">2.9% + $0.30</div>
                              <div className="text-xs text-gray-600">Standard rate</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-gray-700">Credit/Debit cards</div>
                              <div className="text-gray-700">eChecks</div>
                              <div className="text-xs text-gray-500">Digital wallets</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">
                              <div>• Enterprise clients</div>
                              <div>• Government contracts</div>
                              <div>• B2B invoicing</div>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span className="font-semibold text-gray-900">PayPal</span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Easy Setup</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-700">2.99% + $0.49</div>
                              <div className="text-xs text-gray-600">PayPal.me</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-gray-700">PayPal balance</div>
                              <div className="text-gray-700">Credit/Debit cards</div>
                              <div className="text-xs text-gray-500">via PayPal</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">
                              <div>• Simple setup</div>
                              <div>• Trusted brand</div>
                              <div>• Consumer invoices</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                      <p className="text-xs text-gray-700">
                        <strong className="text-blue-900">💡 Recommendation:</strong> Enable multiple gateways to give clients payment options.
                        GoCardless offers lowest fees. Authorize.Net for enterprise/government. Stripe/PayPal for quick consumer payments.
                      </p>
                    </div>
                  </div>

                  {/* Payment Gateway Cards - Compact Accordion View
                      Each card is collapsible to save space. Cards show active status with colored borders.
                      Available Gateways:
                      - Stripe: Credit/debit cards (2.9% + $0.30) - Most popular
                      - PayPal: PayPal.me links (2.99% + $0.49) - Easiest setup
                      - Square: Credit/debit cards (2.9% + $0.30) - POS integration
                      - GoCardless: ACH/SEPA bank transfers (1% + $0.25) - Lowest fees
                      - Authorize.Net: Enterprise/B2B (2.9% + $0.30) - Government contracts
                  */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stripe Card */}
                    <div className={`border rounded-lg ${formData.stripe_enabled ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}>
                      <button
                        onClick={() => setExpandedPaymentGateways(prev => ({ ...prev, stripe: !prev.stripe }))}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <CreditCard className={`w-5 h-5 ${formData.stripe_enabled ? 'text-purple-600' : 'text-gray-400'}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">Stripe</h3>
                            <p className="text-xs text-gray-500">Credit/Debit Cards</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.stripe_enabled && <Check className="w-4 h-4 text-green-600" />}
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedPaymentGateways.stripe ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {expandedPaymentGateways.stripe && (
                        <div className="px-4 pb-4 space-y-4 border-t">
                          <div className="flex items-center justify-between pt-4">
                            <span className="text-sm font-medium text-gray-700">Enable Stripe</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="stripe_enabled"
                                checked={formData.stripe_enabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, stripe_enabled: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>

                          <div className="p-3 bg-purple-50 border border-purple-100 rounded text-xs text-gray-700">
                            <strong className="block text-purple-900 mb-1">Setup:</strong>
                            1. Sign up at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">stripe.com</a><br/>
                            2. Get API keys from Developers → API keys
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                            <input
                              type="password"
                              name="stripe_secret_key"
                              value={formData.stripe_secret_key}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="sk_test_..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
                            <input
                              type="text"
                              name="stripe_publishable_key"
                              value={formData.stripe_publishable_key}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="pk_test_..."
                            />
                          </div>

                          {formData.stripe_enabled && formData.stripe_secret_key && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                              ✓ Stripe enabled - Payment links will be generated
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Square Card */}
                    <div className={`border rounded-lg ${formData.square_enabled ? 'border-gray-400 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                      <button
                        onClick={() => setExpandedPaymentGateways(prev => ({ ...prev, square: !prev.square }))}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <CreditCard className={`w-5 h-5 ${formData.square_enabled ? 'text-gray-900' : 'text-gray-400'}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">Square</h3>
                            <p className="text-xs text-gray-500">Cards, Apple Pay, Google Pay</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.square_enabled && <Check className="w-4 h-4 text-green-600" />}
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedPaymentGateways.square ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {expandedPaymentGateways.square && (
                        <div className="px-4 pb-4 space-y-4 border-t">
                          <div className="flex items-center justify-between pt-4">
                            <span className="text-sm font-medium text-gray-700">Enable Square</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="square_enabled"
                                checked={formData.square_enabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, square_enabled: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                            </label>
                          </div>

                          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                            <strong className="block text-gray-900 mb-1">Setup:</strong>
                            1. Sign up at <a href="https://squareup.com" target="_blank" rel="noopener noreferrer" className="text-gray-700 underline">squareup.com</a><br/>
                            2. Go to <a href="https://developer.squareup.com" target="_blank" rel="noopener noreferrer" className="text-gray-700 underline">developer.squareup.com</a> → Credentials
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                            <input
                              type="password"
                              name="square_access_token"
                              value={formData.square_access_token}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="EAAAxxxx..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location ID <span className="text-gray-400 text-xs">(Optional)</span></label>
                            <input
                              type="text"
                              name="square_location_id"
                              value={formData.square_location_id}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Leave blank for default"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                            <select
                              name="square_environment"
                              value={formData.square_environment}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="sandbox">Sandbox (Testing)</option>
                              <option value="production">Production (Live)</option>
                            </select>
                          </div>

                          {formData.square_enabled && formData.square_access_token && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                              ✓ Square enabled - Payment links will be generated
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* GoCardless Card */}
                    <div className={`border rounded-lg ${formData.gocardless_enabled ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                      <button
                        onClick={() => setExpandedPaymentGateways(prev => ({ ...prev, gocardless: !prev.gocardless }))}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <DollarSign className={`w-5 h-5 ${formData.gocardless_enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">GoCardless</h3>
                            <p className="text-xs text-indigo-600 font-medium">ACH/SEPA - Lowest Fees (1%)</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.gocardless_enabled && <Check className="w-4 h-4 text-green-600" />}
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedPaymentGateways.gocardless ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {expandedPaymentGateways.gocardless && (
                        <div className="px-4 pb-4 space-y-4 border-t">
                          <div className="flex items-center justify-between pt-4">
                            <span className="text-sm font-medium text-gray-700">Enable GoCardless</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="gocardless_enabled"
                                checked={formData.gocardless_enabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, gocardless_enabled: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>

                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded text-xs">
                            <strong className="block text-indigo-900 mb-1">💰 Save 65% on fees!</strong>
                            <p className="text-indigo-800 mb-2">1% + $0.25 vs 2.9% + $0.30 (cards). On a $5,000 invoice, save $95!</p>
                            <strong className="block text-gray-900 mb-1">Setup:</strong>
                            <p className="text-gray-700">
                              1. Sign up at <a href="https://gocardless.com" target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">gocardless.com</a><br/>
                              2. Get access token from developer.gocardless.com
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                            <input
                              type="password"
                              name="gocardless_access_token"
                              value={formData.gocardless_access_token}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="live_xxxx..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                            <select
                              name="gocardless_environment"
                              value={formData.gocardless_environment}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="sandbox">Sandbox (Testing)</option>
                              <option value="live">Live (Production)</option>
                            </select>
                          </div>

                          {formData.gocardless_enabled && formData.gocardless_access_token && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                              ✓ GoCardless enabled - Bank transfer payment links will be generated
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* PayPal Card */}
                    <div className={`border rounded-lg ${formData.paypal_enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                      <button
                        onClick={() => setExpandedPaymentGateways(prev => ({ ...prev, paypal: !prev.paypal }))}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <DollarSign className={`w-5 h-5 ${formData.paypal_enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">PayPal</h3>
                            <p className="text-xs text-gray-500">PayPal.me Simple Links</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.paypal_enabled && <Check className="w-4 h-4 text-green-600" />}
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedPaymentGateways.paypal ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {expandedPaymentGateways.paypal && (
                        <div className="px-4 pb-4 space-y-4 border-t">
                          <div className="flex items-center justify-between pt-4">
                            <span className="text-sm font-medium text-gray-700">Enable PayPal</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="paypal_enabled"
                                checked={formData.paypal_enabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, paypal_enabled: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-gray-700">
                            <strong className="block text-blue-900 mb-1">Setup:</strong>
                            1. Create PayPal account at <a href="https://paypal.com" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">paypal.com</a><br/>
                            2. Set up your PayPal.me link<br/>
                            3. Enter your username or email below
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PayPal.me Username or Email</label>
                            <input
                              type="text"
                              name="paypal_client_id"
                              value={formData.paypal_client_id}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="yourname or email@example.com"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter your PayPal.me username or PayPal email
                            </p>
                          </div>

                          {formData.paypal_enabled && formData.paypal_client_id && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                              ✓ PayPal enabled - Payment links will be generated
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Authorize.Net Card - Enterprise Payment Gateway
                        Uses hosted payment pages with HMAC-MD5 fingerprint authentication
                        Best for: Government contracts, B2B transactions, enterprise customers
                        Features: PCI compliant, industry standard, high trust factor
                    */}
                    <div className={`border rounded-lg ${formData.authorizenet_enabled ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                      <button
                        onClick={() => setExpandedPaymentGateways(prev => ({ ...prev, authorizenet: !prev.authorizenet }))}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <CreditCard className={`w-5 h-5 ${formData.authorizenet_enabled ? 'text-orange-600' : 'text-gray-400'}`} />
                          <div>
                            <h3 className="font-semibold text-gray-900">Authorize.Net</h3>
                            <p className="text-xs text-orange-600 font-medium">Enterprise & B2B</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {formData.authorizenet_enabled && <Check className="w-4 h-4 text-green-600" />}
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedPaymentGateways.authorizenet ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {expandedPaymentGateways.authorizenet && (
                        <div className="px-4 pb-4 space-y-4 border-t">
                          <div className="flex items-center justify-between pt-4">
                            <span className="text-sm font-medium text-gray-700">Enable Authorize.Net</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="authorizenet_enabled"
                                checked={formData.authorizenet_enabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorizenet_enabled: e.target.checked }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                          </div>

                          <div className="p-3 bg-orange-50 border border-orange-100 rounded text-xs">
                            <strong className="block text-orange-900 mb-1">🏢 Trusted by Enterprise</strong>
                            <p className="text-orange-800 mb-2">Industry standard for large businesses, government contracts, and B2B transactions.</p>
                            <strong className="block text-gray-900 mb-1">Setup:</strong>
                            <p className="text-gray-700">
                              1. Sign up at <a href="https://authorize.net" target="_blank" rel="noopener noreferrer" className="text-orange-700 underline">authorize.net</a><br/>
                              2. Go to Account → Settings → API Credentials & Keys<br/>
                              3. Generate API Login ID and Transaction Key
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">API Login ID</label>
                            <input
                              type="text"
                              name="authorizenet_api_login_id"
                              value={formData.authorizenet_api_login_id}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="API Login ID"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Key</label>
                            <input
                              type="password"
                              name="authorizenet_transaction_key"
                              value={formData.authorizenet_transaction_key}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Transaction Key"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                            <select
                              name="authorizenet_environment"
                              value={formData.authorizenet_environment}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="sandbox">Sandbox (Testing)</option>
                              <option value="production">Production (Live)</option>
                            </select>
                          </div>

                          {formData.authorizenet_enabled && formData.authorizenet_api_login_id && formData.authorizenet_transaction_key && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                              ✓ Authorize.Net enabled - Enterprise payment links will be generated
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <div className="flex items-start space-x-3">
                      <CreditCard className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-purple-900 mb-1">Payment Integration Features</p>
                        <ul className="text-purple-800 space-y-0.5 text-xs">
                          <li>• Generate secure payment links for each invoice</li>
                          <li>• Support for credit cards, bank transfers, and digital wallets</li>
                          <li>• Choose the lowest-fee option for your clients (GoCardless recommended)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Display Options Tab */}
              {activeTab === 'display' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Options</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Control what information appears on invoices and in the app
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Show Item Numbers</p>
                        <p className="text-sm text-gray-500">Display item numbers in invoices and tables</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="show_item_numbers"
                          checked={formData.show_item_numbers}
                          onChange={(e) => setFormData(prev => ({ ...prev, show_item_numbers: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Show Customer Numbers</p>
                        <p className="text-sm text-gray-500">Display customer numbers in clients section</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="show_customer_numbers"
                          checked={formData.show_customer_numbers}
                          onChange={(e) => setFormData(prev => ({ ...prev, show_customer_numbers: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Show Tax Breakdown</p>
                        <p className="text-sm text-gray-500">Display tax calculation details on invoices</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="show_tax_breakdown"
                          checked={formData.show_tax_breakdown}
                          onChange={(e) => setFormData(prev => ({ ...prev, show_tax_breakdown: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Show Payment Terms</p>
                        <p className="text-sm text-gray-500">Display payment terms on invoices</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="show_payment_terms"
                          checked={formData.show_payment_terms}
                          onChange={(e) => setFormData(prev => ({ ...prev, show_payment_terms: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Client Information Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information on Invoice</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose which client fields appear on your invoices
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Client Email</p>
                          <p className="text-sm text-gray-500">Display client email address on invoices</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_client_email_on_invoice"
                            checked={formData.show_client_email_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_client_email_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Client Phone</p>
                          <p className="text-sm text-gray-500">Display client phone number on invoices</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_client_phone_on_invoice"
                            checked={formData.show_client_phone_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_client_phone_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Billing Address</p>
                          <p className="text-sm text-gray-500">Display separate billing address if different from main address</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_client_billing_address_on_invoice"
                            checked={formData.show_client_billing_address_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_client_billing_address_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Shipping Address</p>
                          <p className="text-sm text-gray-500">Display shipping address on invoices</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_client_shipping_address_on_invoice"
                            checked={formData.show_client_shipping_address_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_client_shipping_address_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Client Tax ID</p>
                          <p className="text-sm text-gray-500">Display client tax identification number on invoices</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_client_tax_id_on_invoice"
                            checked={formData.show_client_tax_id_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_client_tax_id_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Item Information Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Item Information on Invoice</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose which item fields appear in your invoice line items
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Item SKU</p>
                          <p className="text-sm text-gray-500">Display SKU/product code in invoice line items</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_item_sku_on_invoice"
                            checked={formData.show_item_sku_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_item_sku_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Unit of Measure</p>
                          <p className="text-sm text-gray-500">Display unit type (Each, Hour, etc.) in invoice line items</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_item_unit_on_invoice"
                            checked={formData.show_item_unit_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_item_unit_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Tab */}
              {activeTab === 'navigation' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation Customization</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Customize which tabs appear in your sidebar and change their order. Drag tabs to reorder or use the arrow buttons.
                    </p>
                  </div>

                  {(() => {
                    // Parse tab configuration or use default
                    let tabs = [];
                    try {
                      tabs = formData.tab_configuration
                        ? JSON.parse(formData.tab_configuration)
                        : [
                            { id: 'dashboard', name: 'Dashboard', enabled: true, order: 0 },
                            { id: 'invoices', name: 'Invoices', enabled: true, order: 1 },
                            { id: 'credit-notes', name: 'Credit Notes', enabled: true, order: 2 },
                            { id: 'recurring', name: 'Recurring', enabled: true, order: 3 },
                            { id: 'clients', name: 'Clients', enabled: true, order: 4 },
                            { id: 'reminders', name: 'Reminders', enabled: true, order: 5 },
                            { id: 'reports', name: 'Reports', enabled: true, order: 6 },
                            { id: 'saved-items', name: 'Saved Items', enabled: true, order: 7 },
                            { id: 'archive', name: 'Archive', enabled: true, order: 8 },
                            { id: 'settings', name: 'Settings', enabled: true, order: 9 }
                          ];
                    } catch (e) {
                      console.error('Error parsing tab configuration:', e);
                    }

                    const handleToggleTab = async (tabId) => {
                      const updatedTabs = tabs.map(tab =>
                        tab.id === tabId ? { ...tab, enabled: !tab.enabled } : tab
                      );
                      setFormData(prev => ({ ...prev, tab_configuration: JSON.stringify(updatedTabs) }));
                    };

                    const handleMoveUp = async (index) => {
                      if (index === 0) return;
                      const updatedTabs = [...tabs];
                      const temp = updatedTabs[index];
                      updatedTabs[index] = updatedTabs[index - 1];
                      updatedTabs[index - 1] = temp;
                      // Update order values
                      updatedTabs.forEach((tab, idx) => tab.order = idx);
                      setFormData(prev => ({ ...prev, tab_configuration: JSON.stringify(updatedTabs) }));
                    };

                    const handleMoveDown = async (index) => {
                      if (index === tabs.length - 1) return;
                      const updatedTabs = [...tabs];
                      const temp = updatedTabs[index];
                      updatedTabs[index] = updatedTabs[index + 1];
                      updatedTabs[index + 1] = temp;
                      // Update order values
                      updatedTabs.forEach((tab, idx) => tab.order = idx);
                      setFormData(prev => ({ ...prev, tab_configuration: JSON.stringify(updatedTabs) }));
                    };

                    const handleResetToDefaults = async () => {
                      const defaultTabs = [
                        { id: 'dashboard', name: 'Dashboard', enabled: true, order: 0 },
                        { id: 'invoices', name: 'Invoices', enabled: true, order: 1 },
                        { id: 'credit-notes', name: 'Credit Notes', enabled: true, order: 2 },
                        { id: 'recurring', name: 'Recurring', enabled: true, order: 3 },
                        { id: 'clients', name: 'Clients', enabled: true, order: 4 },
                        { id: 'reminders', name: 'Reminders', enabled: true, order: 5 },
                        { id: 'reports', name: 'Reports', enabled: true, order: 6 },
                        { id: 'saved-items', name: 'Saved Items', enabled: true, order: 7 },
                        { id: 'archive', name: 'Archive', enabled: true, order: 8 },
                        { id: 'settings', name: 'Settings', enabled: true, order: 9 }
                      ];
                      setFormData(prev => ({ ...prev, tab_configuration: JSON.stringify(defaultTabs) }));
                    };

                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            {tabs.filter(t => t.enabled).length} of {tabs.length} tabs enabled
                          </p>
                          <button
                            type="button"
                            onClick={handleResetToDefaults}
                            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                            Reset to Defaults
                          </button>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                          {tabs.map((tab, index) => (
                            <div
                              key={tab.id}
                              className={`flex items-center justify-between p-4 ${
                                !tab.enabled ? 'bg-gray-50 opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="flex flex-col space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveUp(index)}
                                    disabled={index === 0}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move up"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveDown(index)}
                                    disabled={index === tabs.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move down"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>

                                <div className="flex items-center space-x-3 flex-1">
                                  <span className="text-sm font-medium text-gray-500 w-8">#{index + 1}</span>
                                  <span className="text-base font-medium text-gray-900">{tab.name}</span>
                                  {tab.id === 'settings' && (
                                    <span className="text-xs text-gray-500 italic">(always visible)</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={tab.enabled}
                                    onChange={() => handleToggleTab(tab.id)}
                                    disabled={tab.id === 'settings'}
                                    className="sr-only peer"
                                  />
                                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                                    tab.id === 'settings' ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}></div>
                                  <span className="ml-3 text-sm font-medium text-gray-700">
                                    {tab.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800">Important Notes</h3>
                              <div className="mt-2 text-sm text-blue-700">
                                <ul className="list-disc list-inside space-y-1">
                                  <li>The Settings tab is always visible and cannot be disabled</li>
                                  <li>Click "Save Settings" at the top to apply your changes</li>
                                  <li>Restart the app to see navigation changes take effect</li>
                                  <li>Disabled tabs won't appear in the sidebar</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Theme Tab */}
              {activeTab === 'theme' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Theme & Invoice Customization</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Customize the appearance of your invoices and application
                    </p>
                  </div>

                  {/* Appearance / Dark Mode */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Eye className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
                    </div>
                    <div className="flex space-x-3">
                      {[
                        { id: 'off', label: 'Light', icon: Sun },
                        { id: 'on', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={async () => {
                              setFormData(prev => ({ ...prev, dark_mode: option.id }));
                              // Apply immediately
                              if (option.id === 'on') {
                                document.documentElement.classList.add('dark');
                              } else if (option.id === 'system') {
                                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                document.documentElement.classList.toggle('dark', prefersDark);
                              } else {
                                document.documentElement.classList.remove('dark');
                              }
                              // Auto-save to database so it persists on restart
                              try {
                                await updateSettings({ dark_mode: option.id });
                                window.dispatchEvent(new CustomEvent('navigation-updated'));
                              } catch (e) {
                                console.error('Error saving dark mode:', e);
                              }
                            }}
                            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                              formData.dark_mode === option.id
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Customization */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Paintbrush className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Color Scheme</h3>
                    </div>

                    {/* Quick Theme Presets */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Quick Presets
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {themes.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => {
                              const colorMap = {
                                blue: { primary: '#3B82F6', secondary: '#8B5CF6', accent: '#10B981', invoice_accent: '#3B82F6' },
                                green: { primary: '#10B981', secondary: '#3B82F6', accent: '#8B5CF6', invoice_accent: '#10B981' },
                                purple: { primary: '#8B5CF6', secondary: '#3B82F6', accent: '#10B981', invoice_accent: '#8B5CF6' },
                                red: { primary: '#EF4444', secondary: '#F59E0B', accent: '#10B981', invoice_accent: '#EF4444' },
                              };
                              const colors = colorMap[theme.id];
                              setFormData(prev => ({
                                ...prev,
                                theme: theme.id,
                                primary_color: colors.primary,
                                secondary_color: colors.secondary,
                                accent_color: colors.accent,
                                invoice_accent_color: colors.invoice_accent
                              }));
                            }}
                            className={`relative p-4 rounded-lg border-2 transition-all ${
                              formData.theme === theme.id
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-full h-10 ${theme.color} rounded-md mb-2`}></div>
                            <p className="text-xs font-medium text-gray-900">{theme.name}</p>
                            {formData.theme === theme.id && (
                              <div className="absolute top-1 right-1 bg-blue-600 rounded-full p-0.5">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Primary Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            name="primary_color"
                            value={formData.primary_color}
                            onChange={handleInputChange}
                            className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.primary_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder="#3B82F6"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Used for buttons and highlights</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Secondary Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            name="secondary_color"
                            value={formData.secondary_color}
                            onChange={handleInputChange}
                            className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.secondary_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder="#8B5CF6"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Used for accents and badges</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Accent Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            name="accent_color"
                            value={formData.accent_color}
                            onChange={handleInputChange}
                            className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.accent_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder="#10B981"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Used for success states</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Invoice Header Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            name="invoice_header_color"
                            value={formData.invoice_header_color}
                            onChange={handleInputChange}
                            className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.invoice_header_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, invoice_header_color: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder="#1F2937"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Invoice header text color</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Invoice Accent Color
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            name="invoice_accent_color"
                            value={formData.invoice_accent_color}
                            onChange={handleInputChange}
                            className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.invoice_accent_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, invoice_accent_color: e.target.value }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder="#3B82F6"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Invoice borders and highlights</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Invoice Template Selection - Hidden for v1.0, add more templates in future */}
                  <div className="space-y-4">
                    {/* Layout Options */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Header Alignment
                        </label>
                        <select
                          name="invoice_header_style"
                          value={formData.invoice_header_style}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="left">Left Aligned</option>
                          <option value="center">Centered</option>
                          <option value="right">Right Aligned</option>
                          <option value="split">Split (Logo Left, Info Right)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Border Style
                        </label>
                        <select
                          name="invoice_border_style"
                          value={formData.invoice_border_style}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="none">No Borders</option>
                          <option value="subtle">Subtle</option>
                          <option value="bold">Bold</option>
                          <option value="colored">Colored</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Corner Style
                        </label>
                        <select
                          name="invoice_corner_style"
                          value={formData.invoice_corner_style}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="square">Square</option>
                          <option value="rounded">Rounded</option>
                          <option value="sharp">Sharp</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Spacing
                        </label>
                        <select
                          name="invoice_spacing"
                          value={formData.invoice_spacing}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="compact">Compact</option>
                          <option value="normal">Normal</option>
                          <option value="spacious">Spacious</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Table Style
                        </label>
                        <select
                          name="invoice_table_style"
                          value={formData.invoice_table_style}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="simple">Simple</option>
                          <option value="striped">Striped Rows</option>
                          <option value="bordered">Bordered</option>
                          <option value="minimal">Minimal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Typography */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Type className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Typography</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Heading Font
                        </label>
                        <select
                          name="heading_font"
                          value={formData.heading_font}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Inter">Inter</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Lato">Lato</option>
                          <option value="Montserrat">Montserrat</option>
                          <option value="Playfair Display">Playfair Display</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Body Font
                        </label>
                        <select
                          name="body_font"
                          value={formData.body_font}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Inter">Inter</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Lato">Lato</option>
                          <option value="Montserrat">Montserrat</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Heading Size
                        </label>
                        <select
                          name="heading_size"
                          value={formData.heading_size}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="small">Small</option>
                          <option value="normal">Normal</option>
                          <option value="large">Large</option>
                          <option value="extra-large">Extra Large</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Body Size
                        </label>
                        <select
                          name="body_size"
                          value={formData.body_size}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="small">Small (10pt)</option>
                          <option value="normal">Normal (12pt)</option>
                          <option value="large">Large (14pt)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Invoice Elements */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Eye className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Invoice Elements</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Logo on Invoice</p>
                          <p className="text-sm text-gray-500">Display company logo in invoice header</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_logo_on_invoice"
                            checked={formData.show_logo_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_logo_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Company Address on Invoice</p>
                          <p className="text-sm text-gray-500">Display full company address in header</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_company_address_on_invoice"
                            checked={formData.show_company_address_on_invoice}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_company_address_on_invoice: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Show Invoice Border</p>
                          <p className="text-sm text-gray-500">Add decorative border around invoice</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="show_invoice_border"
                            checked={formData.show_invoice_border}
                            onChange={(e) => setFormData(prev => ({ ...prev, show_invoice_border: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* PDF Options */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">PDF Options</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Page Size
                        </label>
                        <select
                          name="pdf_page_size"
                          value={formData.pdf_page_size}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="letter">Letter (8.5" × 11")</option>
                          <option value="a4">A4 (210mm × 297mm)</option>
                          <option value="legal">Legal (8.5" × 14")</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Page Margins
                        </label>
                        <select
                          name="pdf_margin_size"
                          value={formData.pdf_margin_size}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="narrow">Narrow (0.5")</option>
                          <option value="normal">Normal (1")</option>
                          <option value="wide">Wide (1.5")</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Header Height
                        </label>
                        <select
                          name="pdf_header_height"
                          value={formData.pdf_header_height}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="compact">Compact</option>
                          <option value="normal">Normal</option>
                          <option value="tall">Tall</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preview Notice */}
                  <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-3">
                      <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          Preview Your Customizations
                        </p>
                        <p className="text-sm text-blue-800">
                          Your theme settings will be applied when you view or generate invoice PDFs. Create or view an invoice to see your customizations in action!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Backup & Restore Tab */}
              {activeTab === 'backup' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Backup & Restore</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Protect your business data with regular backups. Create manual backups or restore from previous backup files.
                    </p>
                  </div>

                  {/* Manual Backup */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Download className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Create Backup</h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <p className="text-sm text-gray-600 mb-4">
                        Download a complete backup of all your data including invoices, clients, payments, and settings.
                        The backup will be saved as a ZIP file containing CSV exports of all your data.
                      </p>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setSaving(true);

                            // Select where to save the backup
                            const fileResult = await window.electron.ipcRenderer.invoke('backup:selectFile', 'save');

                            if (fileResult.canceled) {
                              setSaving(false);
                              return;
                            }

                            // Create the backup
                            const result = await window.electron.ipcRenderer.invoke('backup:create', fileResult.path);

                            if (result.success) {
                              console.log(`Backup created successfully!\n\nSaved to: ${result.path}`);
                            }
                          } catch (error) {
                            console.error('Error creating backup:', error);
                            console.error('Error creating backup: ' + error.message);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className={`flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                          saving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {saving ? 'Creating Backup...' : 'Download Backup Now'}
                      </button>

                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>Tip:</strong> Save your backup file to a secure location like cloud storage or an external drive.
                          Regular backups protect against data loss from hardware failures or accidental deletions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Restore from Backup */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <UploadCloud className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Restore from Backup</h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">
                          ⚠️ Warning: This will replace all current data
                        </p>
                        <p className="text-xs text-yellow-800">
                          Restoring from a backup will <strong>permanently delete all current data</strong> and replace it with the backup data.
                          Make sure to create a backup of your current data before proceeding if needed.
                        </p>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        Select a backup ZIP file to restore your data. The app will restart after the restore is complete.
                      </p>

                      <button
                        type="button"
                        onClick={async () => {
                          // Confirm before proceeding
                          const confirmed = await window.customConfirm(
                            'WARNING: This will permanently delete ALL current data and replace it with the backup data.\n\n' +
                            'Are you absolutely sure you want to continue?\n\n' +
                            'Click OK to proceed or Cancel to abort.'
                          );

                          if (!confirmed) {
                            return;
                          }

                          try {
                            setSaving(true);

                            // Select backup file to restore
                            const fileResult = await window.electron.ipcRenderer.invoke('backup:selectFile', 'open');

                            if (fileResult.canceled) {
                              setSaving(false);
                              return;
                            }

                            // Restore the backup
                            const result = await window.electron.ipcRenderer.invoke('backup:restore', fileResult.path);

                            if (result.success) {
                              console.error(
                                `Backup restored successfully!\n\n` +
                                `Tables restored: ${result.stats.tables_restored}\n` +
                                `Total rows: ${result.stats.total_rows}\n\n` +
                                `The app will reload to apply the changes.`
                              );

                              // Reload the app to reflect changes
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Error restoring backup:', error);
                            console.error('Error restoring backup: ' + error.message);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className={`flex items-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors ${
                          saving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <UploadCloud className="w-5 h-5 mr-2" />
                        {saving ? 'Restoring...' : 'Choose Backup File to Restore'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Restore from CSV Files */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Restore from CSV Files</h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <p className="text-sm text-gray-600 mb-4">
                        Import data from individual CSV files. Select one or more CSV files to restore specific tables.
                        File names should match table names (e.g., <code className="bg-gray-100 px-1 rounded">clients.csv</code>, <code className="bg-gray-100 px-1 rounded">invoices.csv</code>).
                      </p>

                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800 mb-2">
                          <strong>Supported tables:</strong>
                        </p>
                        <p className="text-xs text-blue-700 font-mono">
                          clients, invoices, invoice_items, saved_items, payments, recurring_invoices, recurring_invoice_items, estimates, estimate_items, credit_notes, credit_note_items, reminder_templates, invoice_reminders, settings
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setSaving(true);

                            // Select CSV files
                            const fileResult = await window.electron.ipcRenderer.invoke('backup:selectCSVFiles');

                            if (fileResult.canceled) {
                              setSaving(false);
                              return;
                            }

                            // Show confirmation with file list
                            const fileNames = fileResult.paths.map(p => p.split(/[\\/]/).pop()).join('\n- ');
                            const confirmed = await window.customConfirm(
                              `You are about to import the following CSV files:\n\n- ${fileNames}\n\n` +
                              'Existing records with matching IDs will be updated.\n\n' +
                              'Continue with import?'
                            );

                            if (!confirmed) {
                              setSaving(false);
                              return;
                            }

                            // Restore from CSV files
                            const result = await window.electron.ipcRenderer.invoke('backup:restoreFromCSV', fileResult.paths);

                            if (result.success) {
                              let message = `CSV Import Complete!\n\n`;
                              message += `Tables imported: ${result.stats.tables_restored}\n`;
                              message += `Total rows: ${result.stats.total_rows}\n\n`;

                              if (Object.keys(result.stats.tables).length > 0) {
                                message += `Details:\n`;
                                for (const [table, count] of Object.entries(result.stats.tables)) {
                                  message += `  • ${table}: ${count} rows\n`;
                                }
                              }

                              if (result.stats.errors && result.stats.errors.length > 0) {
                                message += `\nWarnings:\n`;
                                for (const error of result.stats.errors) {
                                  message += `  ⚠ ${error}\n`;
                                }
                              }

                              message += '\nThe app will reload to apply the changes.';
                              console.error(message);

                              // Reload the app to reflect changes
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Error importing CSV files:', error);
                            console.error('Error importing CSV files: ' + error.message);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className={`flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                          saving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        {saving ? 'Importing...' : 'Choose CSV Files to Import'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8"></div>

                  {/* Automatic Backups Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <HardDrive className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Scheduled Backups</h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      {/* Enable/Disable Toggle */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">Enable Automatic Backups</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Automatically create backups on a schedule
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="backup_enabled"
                            checked={formData.backup_enabled}
                            onChange={(e) => setFormData(prev => ({ ...prev, backup_enabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {formData.backup_enabled && (
                        <div className="pt-4 border-t border-gray-200 space-y-4">
                          {/* Schedule Frequency */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Backup Frequency
                            </label>
                            <select
                              name="backup_schedule"
                              value={formData.backup_schedule}
                              onChange={(e) => setFormData(prev => ({ ...prev, backup_schedule: e.target.value }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>

                          {/* Time of Day */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Backup Time
                            </label>
                            <input
                              type="time"
                              name="backup_time"
                              value={formData.backup_time}
                              onChange={(e) => setFormData(prev => ({ ...prev, backup_time: e.target.value }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Time when the backup will run (app must be open)</p>
                          </div>

                          {/* Day of Week (for weekly) */}
                          {formData.backup_schedule === 'weekly' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Day of Week
                              </label>
                              <select
                                name="backup_day_of_week"
                                value={formData.backup_day_of_week}
                                onChange={(e) => setFormData(prev => ({ ...prev, backup_day_of_week: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value={0}>Sunday</option>
                                <option value={1}>Monday</option>
                                <option value={2}>Tuesday</option>
                                <option value={3}>Wednesday</option>
                                <option value={4}>Thursday</option>
                                <option value={5}>Friday</option>
                                <option value={6}>Saturday</option>
                              </select>
                            </div>
                          )}

                          {/* Day of Month (for monthly) */}
                          {formData.backup_schedule === 'monthly' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Day of Month
                              </label>
                              <select
                                name="backup_day_of_month"
                                value={formData.backup_day_of_month}
                                onChange={(e) => setFormData(prev => ({ ...prev, backup_day_of_month: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {[...Array(28)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Days 29-31 are not available to ensure monthly backups work consistently</p>
                            </div>
                          )}

                          {/* Backup Location */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Backup Location
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                name="backup_location"
                                value={formData.backup_location}
                                onChange={(e) => setFormData(prev => ({ ...prev, backup_location: e.target.value }))}
                                placeholder="Click Browse to select folder..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                readOnly
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const result = await window.electron.ipcRenderer.invoke('backup:selectFolder');
                                    if (!result.canceled && result.path) {
                                      setFormData(prev => ({ ...prev, backup_location: result.path }));
                                    }
                                  } catch (error) {
                                    console.error('Error selecting folder:', error);
                                  }
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                              >
                                Browse
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Leave empty to use default app data folder</p>
                          </div>

                          {/* Retention */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Backups to Keep
                            </label>
                            <select
                              name="backup_retention"
                              value={formData.backup_retention}
                              onChange={(e) => setFormData(prev => ({ ...prev, backup_retention: parseInt(e.target.value) }))}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value={3}>Keep last 3 backups</option>
                              <option value={7}>Keep last 7 backups</option>
                              <option value={14}>Keep last 14 backups</option>
                              <option value={30}>Keep last 30 backups</option>
                              <option value={90}>Keep last 90 backups</option>
                              <option value={0}>Keep all backups</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Older backups will be automatically deleted</p>
                          </div>

                          {/* Last Backup Info */}
                          {formData.backup_last_run && (
                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-green-800">
                                <strong>Last backup:</strong> {new Date(formData.backup_last_run).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!formData.backup_enabled && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            Automatic backups are currently disabled. Enable them to protect your data automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* What's Included */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">What's included in backups?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Company Settings',
                        'Client Information',
                        'Invoices & Items',
                        'Saved Items Library',
                        'Payment Records',
                        'Recurring Invoices',
                        'Estimates & Quotes',
                        'Credit Notes',
                        'Reminder Templates',
                        'Invoice Reminders',
                      ].map((item) => (
                        <div key={item} className="flex items-center text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SQL Server Tab */}
              {activeTab === 'sqlserver' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">SQL Server Configuration</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Connect to a remote SQL server database for multi-user access. Multiple users can access the same data simultaneously.
                    </p>
                  </div>

                  {/* Enable SQL Server */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Use SQL Server Database</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Switch from local SQLite to a remote SQL server database
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="use_sql_server"
                          checked={formData.use_sql_server}
                          onChange={(e) => setFormData(prev => ({ ...prev, use_sql_server: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {formData.use_sql_server && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-800">
                            <strong>Note:</strong> Switching to SQL Server will require restarting the application. Make sure you have a working SQL server and the correct credentials before enabling this feature.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connection Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Server className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Connection Settings</h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                      {/* Server Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Database Type
                        </label>
                        <select
                          name="sql_server_type"
                          value={formData.sql_server_type}
                          onChange={(e) => {
                            const type = e.target.value;
                            let port = '3306';
                            if (type === 'postgres') port = '5432';
                            if (type === 'mssql') port = '1433';
                            setFormData(prev => ({ ...prev, sql_server_type: type, sql_server_port: port }));
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="mysql">MySQL / MariaDB</option>
                          <option value="postgres">PostgreSQL</option>
                          <option value="mssql">Microsoft SQL Server</option>
                        </select>
                      </div>

                      {/* Host and Port */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Host / IP Address
                          </label>
                          <input
                            type="text"
                            name="sql_server_host"
                            value={formData.sql_server_host}
                            onChange={handleInputChange}
                            placeholder="localhost or 192.168.1.100"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Port
                          </label>
                          <input
                            type="text"
                            name="sql_server_port"
                            value={formData.sql_server_port}
                            onChange={handleInputChange}
                            placeholder="3306"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Database Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Database Name
                        </label>
                        <input
                          type="text"
                          name="sql_server_database"
                          value={formData.sql_server_database}
                          onChange={handleInputChange}
                          placeholder="invoicepro"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Username and Password */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            name="sql_server_username"
                            value={formData.sql_server_username}
                            onChange={handleInputChange}
                            placeholder="root"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                          </label>
                          <input
                            type="password"
                            name="sql_server_password"
                            value={formData.sql_server_password}
                            onChange={handleInputChange}
                            placeholder="••••••••"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* SSL */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Enable SSL/TLS</p>
                          <p className="text-sm text-gray-500">Use encrypted connection to server</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="sql_server_ssl"
                            checked={formData.sql_server_ssl}
                            onChange={(e) => setFormData(prev => ({ ...prev, sql_server_ssl: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setSaving(true);
                              const result = await window.electron.ipcRenderer.invoke('sqlserver:testConnection', {
                                type: formData.sql_server_type,
                                host: formData.sql_server_host,
                                port: formData.sql_server_port,
                                database: formData.sql_server_database,
                                username: formData.sql_server_username,
                                password: formData.sql_server_password,
                                ssl: formData.sql_server_ssl
                              });

                              if (result.success) {
                                console.error('✓ Connection successful!\n\nThe server is reachable and credentials are valid.');
                              } else {
                                console.error('✗ Connection failed:\n\n' + result.message);
                              }
                            } catch (error) {
                              console.error('✗ Connection failed:\n\n' + error.message);
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Test Connection
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setSaving(true);

                              // Check if database exists
                              const checkResult = await window.electron.ipcRenderer.invoke('sqlserver:checkDatabase', {
                                type: formData.sql_server_type,
                                host: formData.sql_server_host,
                                port: formData.sql_server_port,
                                database: formData.sql_server_database,
                                username: formData.sql_server_username,
                                password: formData.sql_server_password,
                                ssl: formData.sql_server_ssl
                              });

                              let proceedWithSchema = true;

                              if (checkResult.exists) {
                                // Database exists - ask if they want to create tables anyway
                                proceedWithSchema = await window.customConfirm(
                                  `The database "${formData.sql_server_database}" already exists.\n\n` +
                                  'Do you want to create/update the tables in this database?\n\n' +
                                  '(This will not delete existing data, but will create any missing tables)'
                                );

                                if (!proceedWithSchema) {
                                  setSaving(false);
                                  return;
                                }
                              } else {
                                // Create database first
                                const createResult = await window.electron.ipcRenderer.invoke('sqlserver:createDatabase', {
                                  type: formData.sql_server_type,
                                  host: formData.sql_server_host,
                                  port: formData.sql_server_port,
                                  database: formData.sql_server_database,
                                  username: formData.sql_server_username,
                                  password: formData.sql_server_password,
                                  ssl: formData.sql_server_ssl
                                });

                                if (!createResult.success) {
                                  console.error('✗ Error creating database:\n\n' + createResult.message);
                                  setSaving(false);
                                  return;
                                }
                              }

                              // Create schema/tables
                              const schemaResult = await window.electron.ipcRenderer.invoke('sqlserver:createSchema', {
                                type: formData.sql_server_type,
                                host: formData.sql_server_host,
                                port: formData.sql_server_port,
                                database: formData.sql_server_database,
                                username: formData.sql_server_username,
                                password: formData.sql_server_password,
                                ssl: formData.sql_server_ssl
                              });

                              if (schemaResult.success) {
                                console.error('✓ Setup complete!\n\nDatabase and all tables have been created/updated.\n\nYou can now enable "Use SQL Server Database" and save settings.');
                              } else {
                                console.error('✗ Error creating tables:\n\n' + schemaResult.message);
                              }
                            } catch (error) {
                              console.error('✗ Error:\n\n' + error.message);
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Database className="w-4 h-4 mr-2" />
                          {saving ? 'Setting Up...' : 'Setup Database & Tables'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">Setup Instructions</h4>
                    <ol className="text-sm text-purple-800 space-y-2 list-decimal list-inside">
                      <li>Install MySQL, PostgreSQL, or MS SQL Server on a computer</li>
                      <li>Create a user with database creation permissions</li>
                      <li>Enter the connection details above</li>
                      <li>Click "Test Connection" to verify credentials</li>
                      <li>Click "Create Database & Tables" to set up the database</li>
                      <li>Enable "Use SQL Server Database" toggle</li>
                      <li>Save settings and restart the application</li>
                      <li>Other users can connect using the same database credentials</li>
                    </ol>
                  </div>

                  {/* Benefits */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Why use SQL Server?</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Multiple users access same data simultaneously',
                        'No file sharing or network drive needed',
                        'Better performance for large datasets',
                        'Professional database management',
                        'Automatic backups (server-side)',
                        'Centralized data storage',
                        'Enterprise-grade security',
                        'Compatible with MySQL, PostgreSQL, MS SQL',
                      ].map((item) => (
                        <div key={item} className="flex items-center text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                {successMessage && (
                  <div className="flex items-center text-green-600">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">{successMessage}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-auto ${
                    saving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Settings;
