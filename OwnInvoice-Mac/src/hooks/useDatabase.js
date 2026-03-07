import { useState, useEffect, useCallback } from 'react';

const { ipcRenderer } = window.electron;

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to handle IPC calls
  const ipcCall = useCallback(async (channel, ...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipcRenderer.invoke(channel, ...args);
      setLoading(false);
      return result;
    } catch (err) {
      console.error(`Error calling ${channel}:`, err);
      setError(err.message || 'An error occurred');
      setLoading(false);
      throw err;
    }
  }, []);

  // Settings
  const getSettings = useCallback(async () => {
    return await ipcCall('db:getSettings');
  }, [ipcCall]);

  const updateSettings = useCallback(async (settings) => {
    return await ipcCall('db:updateSettings', settings);
  }, [ipcCall]);

  // Clients
  const getAllClients = useCallback(async () => {
    return await ipcCall('db:getAllClients');
  }, [ipcCall]);

  const getClient = useCallback(async (id) => {
    return await ipcCall('db:getClient', id);
  }, [ipcCall]);

  const getClientByCustomerNumber = useCallback(async (customerNumber) => {
    return await ipcCall('db:getClientByCustomerNumber', customerNumber);
  }, [ipcCall]);

  const createClient = useCallback(async (client) => {
    return await ipcCall('db:createClient', client);
  }, [ipcCall]);

  const updateClient = useCallback(async (id, client) => {
    return await ipcCall('db:updateClient', id, client);
  }, [ipcCall]);

  const deleteClient = useCallback(async (id) => {
    return await ipcCall('db:deleteClient', id);
  }, [ipcCall]);

  const getClientStats = useCallback(async (clientId) => {
    return await ipcCall('db:getClientStats', clientId);
  }, [ipcCall]);

  // Customer Addresses
  const getClientAddresses = useCallback(async (clientId) => {
    return await ipcCall('db:getClientAddresses', clientId);
  }, [ipcCall]);

  const createClientAddress = useCallback(async (address) => {
    return await ipcCall('db:createClientAddress', address);
  }, [ipcCall]);

  const updateClientAddress = useCallback(async (id, address) => {
    return await ipcCall('db:updateClientAddress', id, address);
  }, [ipcCall]);

  const deleteClientAddress = useCallback(async (id) => {
    return await ipcCall('db:deleteClientAddress', id);
  }, [ipcCall]);

  // Invoices
  const getAllInvoices = useCallback(async () => {
    return await ipcCall('db:getAllInvoices');
  }, [ipcCall]);

  // NEW: Optimized paginated invoices
  const getPaginatedInvoices = useCallback(async (options) => {
    return await ipcCall('db:getPaginatedInvoices', options);
  }, [ipcCall]);

  const getPaginatedQuotes = useCallback(async (page, limit, filters) => {
    return await ipcCall('db:getPaginatedQuotes', page, limit, filters);
  }, [ipcCall]);

  const getPaginatedClients = useCallback(async (page, limit, filters) => {
    return await ipcCall('db:getPaginatedClients', page, limit, filters);
  }, [ipcCall]);

  const getPaginatedSavedItems = useCallback(async (page, limit, filters) => {
    return await ipcCall('db:getPaginatedSavedItems', page, limit, filters);
  }, [ipcCall]);

  const getPaginatedRecurringInvoices = useCallback(async (page, limit, filters) => {
    return await ipcCall('db:getPaginatedRecurringInvoices', page, limit, filters);
  }, [ipcCall]);

  // NEW: Optimized dashboard stats
  const getOptimizedDashboardStats = useCallback(async () => {
    return await ipcCall('db:getOptimizedDashboardStats');
  }, [ipcCall]);

  // NEW: Fast search for autocomplete
  const searchInvoices = useCallback(async (searchTerm, limit) => {
    return await ipcCall('db:searchInvoices', searchTerm, limit);
  }, [ipcCall]);

  const getArchivedInvoices = useCallback(async () => {
    return await ipcCall('db:getArchivedInvoices');
  }, [ipcCall]);

  const getInvoice = useCallback(async (id) => {
    return await ipcCall('db:getInvoice', id);
  }, [ipcCall]);

  const createInvoice = useCallback(async (invoice, items) => {
    return await ipcCall('db:createInvoice', invoice, items);
  }, [ipcCall]);

  const updateInvoice = useCallback(async (id, invoice, items) => {
    return await ipcCall('db:updateInvoice', id, invoice, items);
  }, [ipcCall]);

  const deleteInvoice = useCallback(async (id) => {
    return await ipcCall('db:deleteInvoice', id);
  }, [ipcCall]);

  const archiveInvoice = useCallback(async (id) => {
    return await ipcCall('db:archiveInvoice', id);
  }, [ipcCall]);

  const restoreInvoice = useCallback(async (id) => {
    return await ipcCall('db:restoreInvoice', id);
  }, [ipcCall]);

  const generateInvoiceNumber = useCallback(async () => {
    return await ipcCall('db:generateInvoiceNumber');
  }, [ipcCall]);

  const peekNextInvoiceNumber = useCallback(async (type = 'invoice') => {
    return await ipcCall('db:peekNextInvoiceNumber', type);
  }, [ipcCall]);

  // Saved Items
  const getAllSavedItems = useCallback(async () => {
    return await ipcCall('db:getAllSavedItems');
  }, [ipcCall]);

  const getSavedItem = useCallback(async (id) => {
    return await ipcCall('db:getSavedItem', id);
  }, [ipcCall]);

  const getSavedItemBySku = useCallback(async (sku) => {
    return await ipcCall('db:getSavedItemBySku', sku);
  }, [ipcCall]);

  const createSavedItem = useCallback(async (item) => {
    return await ipcCall('db:createSavedItem', item);
  }, [ipcCall]);

  const updateSavedItem = useCallback(async (id, item) => {
    return await ipcCall('db:updateSavedItem', id, item);
  }, [ipcCall]);

  const deleteSavedItem = useCallback(async (id) => {
    return await ipcCall('db:deleteSavedItem', id);
  }, [ipcCall]);

  // Dashboard
  const getDashboardStats = useCallback(async () => {
    return await ipcCall('db:getDashboardStats');
  }, [ipcCall]);

  // PDF Generation
  const saveInvoiceAsPDF = useCallback(async (invoiceHtml, invoiceNumber) => {
    return await ipcCall('pdf:saveInvoice', invoiceHtml, invoiceNumber);
  }, [ipcCall]);

  // Email Sending
  const sendInvoiceEmail = useCallback(async (emailData) => {
    return await ipcCall('email:sendInvoice', emailData);
  }, [ipcCall]);

  const sendQuoteEmail = useCallback(async (emailData) => {
    return await ipcCall('email:sendQuote', emailData);
  }, [ipcCall]);

  const sendReminderEmail = useCallback(async (data) => {
    return await ipcCall('email:sendReminder', data);
  }, [ipcCall]);

  // Payments
  const createPayment = useCallback(async (payment) => {
    return await ipcCall('db:createPayment', payment);
  }, [ipcCall]);

  const getPaymentsByInvoice = useCallback(async (invoiceId) => {
    return await ipcCall('db:getPaymentsByInvoice', invoiceId);
  }, [ipcCall]);

  const deletePayment = useCallback(async (id) => {
    return await ipcCall('db:deletePayment', id);
  }, [ipcCall]);

  // Recurring Invoices
  const createRecurringInvoice = useCallback(async (recurringInvoice, items) => {
    return await ipcCall('db:createRecurringInvoice', recurringInvoice, items);
  }, [ipcCall]);

  const getAllRecurringInvoices = useCallback(async () => {
    return await ipcCall('db:getAllRecurringInvoices');
  }, [ipcCall]);

  const getRecurringInvoice = useCallback(async (id) => {
    return await ipcCall('db:getRecurringInvoice', id);
  }, [ipcCall]);

  const updateRecurringInvoice = useCallback(async (id, recurringInvoice, items) => {
    return await ipcCall('db:updateRecurringInvoice', id, recurringInvoice, items);
  }, [ipcCall]);

  const deleteRecurringInvoice = useCallback(async (id) => {
    return await ipcCall('db:deleteRecurringInvoice', id);
  }, [ipcCall]);

  const generateInvoiceFromRecurring = useCallback(async (recurringInvoiceId) => {
    return await ipcCall('db:generateInvoiceFromRecurring', recurringInvoiceId);
  }, [ipcCall]);

  // Quotes
  const generateQuoteNumber = useCallback(async () => {
    return await ipcCall('db:generateQuoteNumber');
  }, [ipcCall]);

  const peekNextQuoteNumber = useCallback(async () => {
    return await ipcCall('db:peekNextQuoteNumber');
  }, [ipcCall]);

  const createQuote = useCallback(async (quote, items) => {
    return await ipcCall('db:createQuote', quote, items);
  }, [ipcCall]);

  const getAllQuotes = useCallback(async () => {
    return await ipcCall('db:getAllQuotes');
  }, [ipcCall]);

  const getArchivedQuotes = useCallback(async () => {
    return await ipcCall('db:getArchivedQuotes');
  }, [ipcCall]);

  const getQuote = useCallback(async (id) => {
    return await ipcCall('db:getQuote', id);
  }, [ipcCall]);

  const updateQuote = useCallback(async (id, quote, items) => {
    return await ipcCall('db:updateQuote', id, quote, items);
  }, [ipcCall]);

  const deleteQuote = useCallback(async (id) => {
    return await ipcCall('db:deleteQuote', id);
  }, [ipcCall]);

  const archiveQuote = useCallback(async (id) => {
    return await ipcCall('db:archiveQuote', id);
  }, [ipcCall]);

  const restoreQuote = useCallback(async (id) => {
    return await ipcCall('db:restoreQuote', id);
  }, [ipcCall]);

  const convertQuoteToInvoice = useCallback(async (quoteId) => {
    return await ipcCall('db:convertQuoteToInvoice', quoteId);
  }, [ipcCall]);

  // Credit Notes
  const generateCreditNoteNumber = useCallback(async () => {
    return await ipcCall('db:generateCreditNoteNumber');
  }, [ipcCall]);

  const createCreditNote = useCallback(async (creditNote, items) => {
    return await ipcCall('db:createCreditNote', creditNote, items);
  }, [ipcCall]);

  const getAllCreditNotes = useCallback(async () => {
    return await ipcCall('db:getAllCreditNotes');
  }, [ipcCall]);

  const getCreditNote = useCallback(async (id) => {
    return await ipcCall('db:getCreditNote', id);
  }, [ipcCall]);

  const getCreditNotesByInvoice = useCallback(async (invoiceId) => {
    return await ipcCall('db:getCreditNotesByInvoice', invoiceId);
  }, [ipcCall]);

  const updateCreditNote = useCallback(async (id, creditNote, items) => {
    return await ipcCall('db:updateCreditNote', id, creditNote, items);
  }, [ipcCall]);

  const deleteCreditNote = useCallback(async (id) => {
    return await ipcCall('db:deleteCreditNote', id);
  }, [ipcCall]);

  const archiveCreditNote = useCallback(async (id) => {
    return await ipcCall('db:archiveCreditNote', id);
  }, [ipcCall]);

  // Expenses
  const generateExpenseNumber = useCallback(async () => {
    return await ipcCall('db:generateExpenseNumber');
  }, [ipcCall]);

  const createExpense = useCallback(async (expense) => {
    return await ipcCall('db:createExpense', expense);
  }, [ipcCall]);

  const getAllExpenses = useCallback(async () => {
    return await ipcCall('db:getAllExpenses');
  }, [ipcCall]);

  const getExpense = useCallback(async (id) => {
    return await ipcCall('db:getExpense', id);
  }, [ipcCall]);

  const updateExpense = useCallback(async (id, expense) => {
    return await ipcCall('db:updateExpense', id, expense);
  }, [ipcCall]);

  const deleteExpense = useCallback(async (id) => {
    return await ipcCall('db:deleteExpense', id);
  }, [ipcCall]);

  const getExpensesByClient = useCallback(async (clientId) => {
    return await ipcCall('db:getExpensesByClient', clientId);
  }, [ipcCall]);

  const getBillableExpenses = useCallback(async () => {
    return await ipcCall('db:getBillableExpenses');
  }, [ipcCall]);

  // Expense Categories
  const getAllExpenseCategories = useCallback(async () => {
    return await ipcCall('db:getAllExpenseCategories');
  }, [ipcCall]);

  const createExpenseCategory = useCallback(async (category) => {
    return await ipcCall('db:createExpenseCategory', category);
  }, [ipcCall]);

  const updateExpenseCategory = useCallback(async (id, category) => {
    return await ipcCall('db:updateExpenseCategory', id, category);
  }, [ipcCall]);

  const deleteExpenseCategory = useCallback(async (id) => {
    return await ipcCall('db:deleteExpenseCategory', id);
  }, [ipcCall]);

  // Reminder Templates
  const getAllReminderTemplates = useCallback(async () => {
    return await ipcCall('db:getAllReminderTemplates');
  }, [ipcCall]);

  const getReminderTemplate = useCallback(async (id) => {
    return await ipcCall('db:getReminderTemplate', id);
  }, [ipcCall]);

  const createReminderTemplate = useCallback(async (template) => {
    return await ipcCall('db:createReminderTemplate', template);
  }, [ipcCall]);

  const updateReminderTemplate = useCallback(async (id, template) => {
    return await ipcCall('db:updateReminderTemplate', id, template);
  }, [ipcCall]);

  const deleteReminderTemplate = useCallback(async (id) => {
    return await ipcCall('db:deleteReminderTemplate', id);
  }, [ipcCall]);

  // Invoice Reminders
  const createInvoiceReminder = useCallback(async (reminder) => {
    return await ipcCall('db:createInvoiceReminder', reminder);
  }, [ipcCall]);

  const getInvoiceReminders = useCallback(async (invoiceId) => {
    return await ipcCall('db:getInvoiceReminders', invoiceId);
  }, [ipcCall]);

  const getAllInvoiceReminders = useCallback(async () => {
    return await ipcCall('db:getAllInvoiceReminders');
  }, [ipcCall]);

  const deleteInvoiceReminder = useCallback(async (id) => {
    return await ipcCall('db:deleteInvoiceReminder', id);
  }, [ipcCall]);

  const getInvoicesNeedingReminders = useCallback(async () => {
    return await ipcCall('db:getInvoicesNeedingReminders');
  }, [ipcCall]);

  // Batch Operations
  const batchUpdateInvoiceStatus = useCallback(async (invoiceIds, status) => {
    return await ipcCall('db:batchUpdateInvoiceStatus', invoiceIds, status);
  }, [ipcCall]);

  const batchArchiveInvoices = useCallback(async (invoiceIds) => {
    return await ipcCall('db:batchArchiveInvoices', invoiceIds);
  }, [ipcCall]);

  const batchDeleteInvoices = useCallback(async (invoiceIds) => {
    return await ipcCall('db:batchDeleteInvoices', invoiceIds);
  }, [ipcCall]);

  // Payment Gateway
  /**
   * Creates a Stripe payment link for an invoice
   * @param {Object} paymentData - Payment data containing settings, invoice, and client info
   * @returns {Promise<Object>} Result with success status and payment link
   */
  const createStripePaymentLink = useCallback(async (paymentData) => {
    return await ipcCall('payment:createStripePaymentLink', paymentData);
  }, [ipcCall]);

  /**
   * Creates a PayPal.me payment link for an invoice
   * @param {Object} paymentData - Payment data containing settings and invoice info
   * @returns {Promise<Object>} Result with success status and PayPal payment link
   */
  const createPayPalPaymentLink = useCallback(async (paymentData) => {
    return await ipcCall('payment:createPayPalPaymentLink', paymentData);
  }, [ipcCall]);

  /**
   * Creates a Square payment link for an invoice
   * @param {Object} paymentData - Payment data containing settings, invoice, and client info
   * @returns {Promise<Object>} Result with success status and Square payment link
   */
  const createSquarePaymentLink = useCallback(async (paymentData) => {
    return await ipcCall('payment:createSquarePaymentLink', paymentData);
  }, [ipcCall]);

  /**
   * Creates a GoCardless payment link for ACH/SEPA bank transfers
   * @param {Object} paymentData - Payment data containing settings, invoice, and client info
   * @returns {Promise<Object>} Result with success status and GoCardless billing request URL
   */
  const createGoCardlessPaymentLink = useCallback(async (paymentData) => {
    return await ipcCall('payment:createGoCardlessPaymentLink', paymentData);
  }, [ipcCall]);

  /**
   * Creates an Authorize.Net hosted payment page link for enterprise payment processing
   * Generates a secure HMAC-MD5 fingerprint authenticated payment URL for PCI-compliant transactions
   * @param {Object} paymentData - Payment data object
   * @param {Object} paymentData.settings - Settings with Authorize.Net credentials and configuration
   * @param {Object} paymentData.invoice - Invoice object with ID, number, and total amount
   * @param {Object} paymentData.client - Client object with name and contact information
   * @returns {Promise<Object>} Result object with success status, payment link URL, and link ID
   */
  const createAuthorizeNetPaymentLink = useCallback(async (paymentData) => {
    return await ipcCall('payment:createAuthorizeNetPaymentLink', paymentData);
  }, [ipcCall]);

  const sendInvoiceWithPayment = useCallback(async (emailData) => {
    return await ipcCall('email:sendInvoiceWithPayment', emailData);
  }, [ipcCall]);

  // CSV Import
  const processCSVInvoiceImport = useCallback(async (csvData) => {
    return await ipcCall('db:processCSVInvoiceImport', csvData);
  }, [ipcCall]);

  const selectCSVFile = useCallback(async () => {
    return await ipcRenderer.invoke('dialog:selectCSVFile');
  }, []);

  return {
    loading,
    error,
    // Settings
    getSettings,
    updateSettings,
    // Clients
    getAllClients,
    getClient,
    getClientByCustomerNumber,
    createClient,
    updateClient,
    deleteClient,
    getClientStats,
    // Customer Addresses
    getClientAddresses,
    createClientAddress,
    updateClientAddress,
    deleteClientAddress,
    // Invoices
    getAllInvoices,
    getPaginatedInvoices,
    getPaginatedQuotes,
    getPaginatedClients,
    getPaginatedSavedItems,
    getPaginatedRecurringInvoices,
    getOptimizedDashboardStats,
    searchInvoices,
    getArchivedInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    archiveInvoice,
    restoreInvoice,
    generateInvoiceNumber,
    peekNextInvoiceNumber,
    // Saved Items
    getAllSavedItems,
    getSavedItem,
    getSavedItemBySku,
    createSavedItem,
    updateSavedItem,
    deleteSavedItem,
    // Dashboard
    getDashboardStats,
    // PDF
    saveInvoiceAsPDF,
    // Email
    sendInvoiceEmail,
    sendQuoteEmail,
    sendReminderEmail,
    // Payments
    createPayment,
    getPaymentsByInvoice,
    deletePayment,
    // Recurring Invoices
    createRecurringInvoice,
    getAllRecurringInvoices,
    getRecurringInvoice,
    updateRecurringInvoice,
    deleteRecurringInvoice,
    generateInvoiceFromRecurring,
    // Quotes
    generateQuoteNumber,
    peekNextQuoteNumber,
    createQuote,
    getAllQuotes,
    getArchivedQuotes,
    getQuote,
    updateQuote,
    deleteQuote,
    archiveQuote,
    restoreQuote,
    convertQuoteToInvoice,
    // Credit Notes
    generateCreditNoteNumber,
    createCreditNote,
    getAllCreditNotes,
    getCreditNote,
    getCreditNotesByInvoice,
    updateCreditNote,
    deleteCreditNote,
    archiveCreditNote,
    // Expenses
    generateExpenseNumber,
    createExpense,
    getAllExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpensesByClient,
    getBillableExpenses,
    // Expense Categories
    getAllExpenseCategories,
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    // Reminder Templates
    getAllReminderTemplates,
    getReminderTemplate,
    createReminderTemplate,
    updateReminderTemplate,
    deleteReminderTemplate,
    // Invoice Reminders
    createInvoiceReminder,
    getInvoiceReminders,
    getAllInvoiceReminders,
    deleteInvoiceReminder,
    getInvoicesNeedingReminders,
    // Batch Operations
    batchUpdateInvoiceStatus,
    batchArchiveInvoices,
    batchDeleteInvoices,
    // Payment Gateway
    createStripePaymentLink,
    createPayPalPaymentLink,
    createSquarePaymentLink,
    createGoCardlessPaymentLink,
    createAuthorizeNetPaymentLink,
    sendInvoiceWithPayment,
    // CSV Import
    processCSVInvoiceImport,
    selectCSVFile,
  };
};
