const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.ELECTRON_IS_DEV === 'true';

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
const db = require('./database/db');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const Store = require('electron-store');
const os = require('os');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');

// ========================================
// SMTP Email Helper with Port Fallback
// ========================================
const SMTP_FALLBACK_PORTS = [2525];
const CONNECTION_ERROR_CODES = ['ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN'];

function createTransporter(settings, portOverride) {
  const port = portOverride || parseInt(settings.smtp_port) || 587;
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: port,
    secure: port === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_password,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000
  });
}

async function sendMailWithFallback(settings, mailOptions) {
  const primaryPort = parseInt(settings.smtp_port) || 587;
  const portsToTry = [primaryPort, ...SMTP_FALLBACK_PORTS.filter(p => p !== primaryPort)];
  let lastError = null;

  for (const port of portsToTry) {
    try {
      const transporter = createTransporter(settings, port);
      console.log(`SMTP: Trying ${settings.smtp_host}:${port}...`);
      await transporter.verify();
      const info = await transporter.sendMail(mailOptions);
      if (port !== primaryPort) {
        console.log(`SMTP: Succeeded on fallback port ${port} (primary port ${primaryPort} was blocked)`);
      }
      return info;
    } catch (error) {
      lastError = error;
      console.warn(`SMTP: Port ${port} failed -`, error.code || error.message);

      // Only try fallback ports for connection-level errors
      if (!CONNECTION_ERROR_CODES.includes(error.code)) {
        throw error; // Auth errors, etc. won't be fixed by changing ports
      }
    }
  }

  // All ports failed - throw a descriptive network error
  throw Object.assign(new Error(
    'Could not connect to the email server on any port. ' +
    'Your network (e.g. mobile hotspot or public Wi-Fi) may be blocking outgoing email connections. ' +
    'Try switching to a different network, or contact your email provider for alternative SMTP settings.'
  ), { code: 'ENETWORK_BLOCKED' });
}

// License activation store (persists in OS app data directory)
const licenseStore = new Store({
  name: 'license',
  encryptionKey: 'owninvoice-license-v1',
  defaults: {
    licenseKey: null,
    machineId: null,
    activated: false,
    activatedAt: null,
    email: null,
    licenseToken: null,
    lastServerCheck: null,
    trialStartDate: null,
  },
});

// Activation server URL
const ACTIVATION_SERVER = 'https://gritsoftware.dev';

// JWT public key for verifying license tokens from server
// TODO: Replace with your actual public key from the server
const LICENSE_PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY || 'owninvoice-jwt-secret-v1';

// Trial limits — enforced at the main process level
const TRIAL_LIMITS = {
  invoices: 5,
  quotes: 5,
  clients: 5,
  savedItems: 5,
  recurringInvoices: 5,
  creditNotes: 5,
};

// Trial duration in milliseconds (7 days)
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Cache expiry for license server checks (7 days in ms)
const LICENSE_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if the license is currently active.
 * Returns true if: valid JWT token exists AND cache hasn't expired.
 * Falls back to trial mode if cache is stale and can't reach server.
 */
function isLicenseActive() {
  const data = licenseStore.store;

  if (!data.activated || !data.licenseKey) {
    return false;
  }

  // Check if we have a JWT token and verify it
  if (data.licenseToken) {
    try {
      const decoded = jwt.verify(data.licenseToken, LICENSE_PUBLIC_KEY);
      if (decoded.status === 'revoked') {
        return false;
      }
    } catch (err) {
      // Token invalid or expired — check if cache is still within grace period
    }
  }

  // Check cache expiry — if last server check is too old, fall back to trial
  if (data.lastServerCheck) {
    const elapsed = Date.now() - new Date(data.lastServerCheck).getTime();
    if (elapsed > LICENSE_CACHE_EXPIRY_MS) {
      return false;
    }
  }

  return data.activated === true;
}

/**
 * Check if the 7-day trial period has expired.
 * Returns true if trial start date is more than 7 days ago.
 */
function isTrialExpired() {
  const trialStartDate = licenseStore.get('trialStartDate');
  if (!trialStartDate) return false; // Not yet initialized
  return Date.now() - trialStartDate > TRIAL_DURATION_MS;
}

/**
 * Get the number of trial days remaining (0 if expired).
 */
function getTrialDaysRemaining() {
  const trialStartDate = licenseStore.get('trialStartDate');
  if (!trialStartDate) return 7;
  const elapsed = Date.now() - trialStartDate;
  const remaining = Math.ceil((TRIAL_DURATION_MS - elapsed) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

/**
 * Enforce trial limits for a given resource type.
 * First checks trial expiry (7-day limit), then count limits.
 * Throws an error with code TRIAL_EXPIRED or TRIAL_LIMIT_REACHED.
 */
function enforceTrialLimit(resourceType) {
  if (isLicenseActive()) return; // Licensed — no limits

  // Check trial expiry first
  if (isTrialExpired()) {
    const error = new Error(
      'Your 7-day trial has expired. Activate a license to continue.'
    );
    error.code = 'TRIAL_EXPIRED';
    throw error;
  }

  const counts = db.getTrialCounts();
  const limit = TRIAL_LIMITS[resourceType];

  if (limit !== undefined && counts[resourceType] >= limit) {
    const error = new Error(
      `Trial limit reached: You can only create ${limit} ${resourceType} in trial mode. ` +
      `Activate a license to unlock unlimited ${resourceType}.`
    );
    error.code = 'TRIAL_LIMIT_REACHED';
    error.resourceType = resourceType;
    error.currentCount = counts[resourceType];
    error.limit = limit;
    throw error;
  }
}

/**
 * Phone home to validate license on startup.
 * Updates cache timestamp. If server says revoked, deactivates locally.
 */
async function validateLicenseOnStartup() {
  const data = licenseStore.store;
  if (!data.activated || !data.licenseKey) return;

  try {
    const machineId = generateMachineId();
    const response = await fetch(`${ACTIVATION_SERVER}/api/check-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: data.licenseKey, machineId }),
    });

    if (response.ok) {
      const result = await response.json();

      if (result.valid && result.token) {
        // Store fresh JWT token and update cache timestamp
        licenseStore.set('licenseToken', result.token);
        licenseStore.set('lastServerCheck', new Date().toISOString());
      } else if (result.revoked) {
        // License was revoked server-side
        licenseStore.set('activated', false);
        licenseStore.set('licenseToken', null);
        licenseStore.set('lastServerCheck', new Date().toISOString());
        console.log('License revoked by server');
      } else {
        // Server responded but license not valid — update timestamp anyway
        licenseStore.set('lastServerCheck', new Date().toISOString());
      }
    }
    // If network error, silently fail — use cached status
  } catch (err) {
    console.log('License validation network error (using cached status):', err.message);
  }
}

/**
 * Generate a deterministic machine ID from hardware identifiers.
 * Uses hostname + platform + arch + MAC address, hashed with SHA-256.
 */
function generateMachineId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();

  let macAddress = 'no-mac';
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
        macAddress = addr.mac;
        break;
      }
    }
    if (macAddress !== 'no-mac') break;
  }

  const raw = `${hostname}|${platform}|${arch}|${macAddress}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 40);
}

let mainWindow;

// Global error handler for better user-facing errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('app:error', error.message);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
});

// ==================== Database Routing Helper ====================
// Route database calls to either SQLite or SQL Server based on settings

/**
 * Get the appropriate database adapter based on settings
 * Settings always come from SQLite, data operations go to SQL Server when enabled
 */
const getDbAdapter = () => {
  const sqlServerAdapter = db.getSqlServerAdapter();
  return sqlServerAdapter || null;
};

/**
 * Check if we should use SQL Server for data operations
 */
const useSqlServer = () => {
  return db.isUsingSqlServer();
};

// Input validation helpers
const validateId = (id, name = 'ID') => {
  if (!id || typeof id !== 'number' || id < 1) {
    throw new Error(`Invalid ${name}: must be a positive number`);
  }
  return id;
};

const validateNonEmpty = (value, name = 'Value') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`${name} cannot be empty`);
  }
  return value;
};

const validateObject = (obj, name = 'Object') => {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`Invalid ${name}: must be an object`);
  }
  return obj;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'public', 'icon.png'),
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database when app is ready
app.whenReady().then(async () => {
  try {
    // Initialize database first
    await db.initDatabase();
    console.log('Database initialized successfully');

    // Initialize trial start date on first launch
    if (licenseStore.get('trialStartDate') === null) {
      licenseStore.set('trialStartDate', Date.now());
      console.log('Trial start date initialized');
    }


    // Create window after database is ready
    createWindow();

    // Start webhook server after database is initialized
    startWebhookServer();

    // Run initial checks after 5 seconds
    setTimeout(() => {
      console.log('Running initial reminder check...');
      checkAndSendReminders();
      console.log('Running initial recurring invoice check...');
      checkAndGenerateRecurringInvoices();
    }, 5000);

  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-kill dev server on quit
app.on('before-quit', () => {
  if (isDev) {
    try {
      if (process.platform === 'win32') {
        require('child_process').execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq react-scripts"', { stdio: 'ignore' });
      } else {
        require('child_process').execSync('lsof -ti:3000 | xargs kill -9', { stdio: 'ignore' });
      }
      console.log('Dev server killed on quit');
    } catch (e) {
      // Port wasn't running, that's fine
    }
  }
});

// IPC Handlers for Database Operations

// Settings
ipcMain.handle('db:getSettings', async () => {
  try {
    return db.getSettings();
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
});

ipcMain.handle('db:updateSettings', async (event, settings) => {
  try {
    const result = db.updateSettings(settings);
    // Reset SQL Server adapter when settings change (in case connection settings changed)
    db.resetSqlServerAdapter();
    return result;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
});

// Clients
ipcMain.handle('db:getAllClients', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getAllClients();
    }
    return db.getAllClients();
  } catch (error) {
    console.error('Error getting clients:', error);
    throw error;
  }
});

ipcMain.handle('db:getClient', async (event, id) => {
  try {
    validateId(id, 'Client ID');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getClient(id);
    }
    return db.getClient(id);
  } catch (error) {
    console.error('Error getting client:', error);
    throw error;
  }
});

ipcMain.handle('db:getClientByCustomerNumber', async (event, customerNumber) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.getClientByCustomerNumber(customerNumber);
  } catch (error) {
    console.error('Error getting client by customer number:', error);
    throw error;
  }
});

ipcMain.handle('db:createClient', async (event, client) => {
  try {
    enforceTrialLimit('clients');
    validateObject(client, 'Client data');
    validateNonEmpty(client.name, 'Client name');
    validateNonEmpty(client.email, 'Client email');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.createClient(client);
    }
    return db.createClient(client);
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
});

ipcMain.handle('db:updateClient', async (event, id, client) => {
  try {
    validateId(id, 'Client ID');
    validateObject(client, 'Client data');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.updateClient(id, client);
    }
    return db.updateClient(id, client);
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteClient', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.deleteClient(id);
    }
    return db.deleteClient(id);
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
});

ipcMain.handle('db:getClientStats', async (event, clientId) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.getClientStats(clientId);
  } catch (error) {
    console.error('Error getting client stats:', error);
    throw error;
  }
});

// Customer Addresses
ipcMain.handle('db:getClientAddresses', async (event, clientId) => {
  try {
    validateId(clientId, 'Client ID');
    return db.getClientAddresses(clientId);
  } catch (error) {
    console.error('Error getting client addresses:', error);
    throw error;
  }
});

ipcMain.handle('db:createClientAddress', async (event, address) => {
  try {
    validateObject(address, 'Address');
    return db.createClientAddress(address);
  } catch (error) {
    console.error('Error creating client address:', error);
    throw error;
  }
});

ipcMain.handle('db:updateClientAddress', async (event, id, address) => {
  try {
    validateId(id, 'Address ID');
    validateObject(address, 'Address');
    return db.updateClientAddress(id, address);
  } catch (error) {
    console.error('Error updating client address:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteClientAddress', async (event, id) => {
  try {
    validateId(id, 'Address ID');
    return db.deleteClientAddress(id);
  } catch (error) {
    console.error('Error deleting client address:', error);
    throw error;
  }
});

// CSV Invoice Import
ipcMain.handle('db:processCSVInvoiceImport', async (event, csvData) => {
  try {
    return db.processCSVInvoiceImport(csvData);
  } catch (error) {
    console.error('Error processing CSV import:', error);
    throw error;
  }
});

ipcMain.handle('dialog:selectCSVFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return { success: true, content, path: result.filePaths[0] };
  }
  return { success: false };
});

// Invoices
ipcMain.handle('db:getAllInvoices', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getAllInvoices();
    }
    return db.getAllInvoices();
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
});

ipcMain.handle('db:getPaginatedInvoices', async (event, options) => {
  return db.getPaginatedInvoices(options);
});

ipcMain.handle('db:getPaginatedQuotes', async (event, page, limit, filters) => {
  return db.getPaginatedQuotes(page, limit, filters);
});

ipcMain.handle('db:getPaginatedClients', async (event, page, limit, filters) => {
  return db.getPaginatedClients(page, limit, filters);
});

ipcMain.handle('db:getPaginatedSavedItems', async (event, page, limit, filters) => {
  return db.getPaginatedSavedItems(page, limit, filters);
});

ipcMain.handle('db:getPaginatedRecurringInvoices', async (event, page, limit, filters) => {
  return db.getPaginatedRecurringInvoices(page, limit, filters);
});

ipcMain.handle('db:getOptimizedDashboardStats', async () => {
  return db.getOptimizedDashboardStats();
});

ipcMain.handle('db:searchInvoices', async (event, searchTerm, limit) => {
  return db.searchInvoices(searchTerm, limit);
});

ipcMain.handle('db:getArchivedInvoices', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getArchivedInvoices();
    }
    return db.getArchivedInvoices();
  } catch (error) {
    console.error('Error getting archived invoices:', error);
    throw error;
  }
});

ipcMain.handle('db:getInvoice', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      const invoice = await adapter.getInvoice(id);
      if (invoice) {
        invoice.items = await adapter.getInvoiceItems(id);
      }
      return invoice;
    }
    return db.getInvoice(id);
  } catch (error) {
    console.error('Error getting invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:createInvoice', async (event, invoice, items) => {
  try {
    enforceTrialLimit('invoices');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      const result = await adapter.createInvoice(invoice);
      const invoiceId = result.lastInsertRowid;
      // Insert items
      for (const item of items) {
        await adapter.createInvoiceItem({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          discount_type: item.discount_type || 'none',
          discount_value: item.discount_value || 0,
          discount_amount: item.discount_amount || 0,
          amount: item.amount
        });
      }
      return invoiceId;
    }
    return db.createInvoice(invoice, items);
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:updateInvoice', async (event, id, invoice, items) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      await adapter.updateInvoice(id, invoice);
      await adapter.deleteInvoiceItems(id);
      // Insert new items
      for (const item of items) {
        await adapter.createInvoiceItem({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          discount_type: item.discount_type || 'none',
          discount_value: item.discount_value || 0,
          discount_amount: item.discount_amount || 0,
          amount: item.amount
        });
      }
      return;
    }
    return db.updateInvoice(id, invoice, items);
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteInvoice', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.deleteInvoice(id);
    }
    return db.deleteInvoice(id);
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:archiveInvoice', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.archiveInvoice(id);
    }
    return db.archiveInvoice(id);
  } catch (error) {
    console.error('Error archiving invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:restoreInvoice', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.restoreInvoice(id);
    }
    return db.restoreInvoice(id);
  } catch (error) {
    console.error('Error restoring invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:generateInvoiceNumber', async () => {
  try {
    // Always use SQLite for invoice number generation (settings-based)
    return db.generateInvoiceNumber();
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw error;
  }
});

ipcMain.handle('db:peekNextInvoiceNumber', async (event, type = 'invoice') => {
  try {
    // Peek at next invoice number without incrementing counter
    return db.peekNextInvoiceNumber(type);
  } catch (error) {
    console.error('Error peeking next invoice number:', error);
    throw error;
  }
});

// Saved Items
ipcMain.handle('db:getAllSavedItems', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getAllSavedItems();
    }
    return db.getAllSavedItems();
  } catch (error) {
    console.error('Error getting saved items:', error);
    throw error;
  }
});

ipcMain.handle('db:getSavedItem', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getSavedItem(id);
    }
    return db.getSavedItem(id);
  } catch (error) {
    console.error('Error getting saved item:', error);
    throw error;
  }
});

ipcMain.handle('db:getSavedItemBySku', async (event, sku) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.getSavedItemBySku(sku);
  } catch (error) {
    console.error('Error getting saved item by SKU:', error);
    throw error;
  }
});

ipcMain.handle('db:createSavedItem', async (event, item) => {
  try {
    enforceTrialLimit('savedItems');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.createSavedItem(item);
    }
    return db.createSavedItem(item);
  } catch (error) {
    console.error('Error creating saved item:', error);
    throw error;
  }
});

ipcMain.handle('db:updateSavedItem', async (event, id, item) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.updateSavedItem(id, item);
    }
    return db.updateSavedItem(id, item);
  } catch (error) {
    console.error('Error updating saved item:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteSavedItem', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.deleteSavedItem(id);
    }
    return db.deleteSavedItem(id);
  } catch (error) {
    console.error('Error deleting saved item:', error);
    throw error;
  }
});

// Dashboard
ipcMain.handle('db:getDashboardStats', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      await adapter.connect();
      const stats = await adapter.query(`
        SELECT
          COUNT(*) as total_invoices,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue_amount
        FROM invoices
        WHERE archived = 0
      `);
      return stats[0] || { total_invoices: 0, total_revenue: 0, paid_amount: 0, pending_amount: 0, overdue_amount: 0 };
    }
    return db.getDashboardStats();
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
});

// PDF Generation
ipcMain.handle('pdf:saveInvoice', async (event, invoiceHtml, invoiceNumber) => {
  let pdfWindow = null;
  try {
    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice PDF',
      defaultPath: `Invoice-${invoiceNumber}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    // Create a hidden window to render the invoice
    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the invoice HTML
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate PDF
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      margins: {
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3
      }
    });

    // Save the PDF
    fs.writeFileSync(filePath, pdfData);

    return { success: true, filePath };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    // Always close the PDF window, even on error
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
});

// Email Sending
ipcMain.handle('email:sendInvoice', async (event, emailData) => {
  let pdfWindow = null;
  try {
    const { settings, recipient, subject, body, invoiceHtml, invoiceNumber, cc, bcc } = emailData;

    // Validate SMTP settings
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      throw new Error('SMTP settings are not configured. Please configure email settings first.');
    }

    // Generate PDF in memory for attachment
    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      margins: {
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3
      }
    });

    // Normalize literal \n sequences to real newlines (in case template was saved with escaped newlines)
    const normalizedBody = body.replace(/\\n/g, '\n');

    // Prepare email options
    const mailOptions = {
      from: settings.smtp_from_email
        ? `"${settings.smtp_from_name || settings.company_name}" <${settings.smtp_from_email}>`
        : settings.smtp_user,
      to: recipient,
      subject: subject,
      text: normalizedBody,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${normalizedBody}</pre>`,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfData,
          contentType: 'application/pdf'
        }
      ]
    };

    if (cc && cc.trim()) mailOptions.cc = cc;
    if (bcc && bcc.trim()) mailOptions.bcc = bcc;

    // Send with automatic port fallback
    const info = await sendMailWithFallback(settings, mailOptions);

    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      message: 'Invoice sent successfully!'
    };

  } catch (error) {
    console.error('Error sending email:', error);

    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your SMTP username and password.';
    } else if (error.code === 'ENETWORK_BLOCKED') {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  } finally {
    // Always close the PDF window, even on error
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
});

// Send Quote via Email
ipcMain.handle('email:sendQuote', async (event, emailData) => {
  let pdfWindow = null;
  try {
    const { settings, recipient, subject, body, quoteHtml, quoteNumber, cc, bcc } = emailData;

    // Validate SMTP settings
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      throw new Error('SMTP settings are not configured. Please configure email settings first.');
    }

    // Generate PDF in memory for attachment
    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(quoteHtml)}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      margins: {
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3
      }
    });

    // Normalize literal \n sequences to real newlines
    const normalizedBody = body.replace(/\\n/g, '\n');

    // Prepare email options
    const mailOptions = {
      from: settings.smtp_from_email
        ? `"${settings.smtp_from_name || settings.company_name}" <${settings.smtp_from_email}>`
        : settings.smtp_user,
      to: recipient,
      subject: subject,
      text: normalizedBody,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${normalizedBody}</pre>`,
      attachments: [
        {
          filename: `Quote-${quoteNumber}.pdf`,
          content: pdfData,
          contentType: 'application/pdf'
        }
      ]
    };

    if (cc && cc.trim()) mailOptions.cc = cc;
    if (bcc && bcc.trim()) mailOptions.bcc = bcc;

    // Send with automatic port fallback
    const info = await sendMailWithFallback(settings, mailOptions);

    console.log('Quote email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      message: 'Quote sent successfully!'
    };

  } catch (error) {
    console.error('Error sending quote email:', error);

    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your SMTP username and password.';
    } else if (error.code === 'ENETWORK_BLOCKED') {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  } finally {
    // Always close the PDF window, even on error
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
});

// Payments
ipcMain.handle('db:createPayment', async (event, payment) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.createPayment(payment);
    }
    return db.createPayment(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
});

ipcMain.handle('db:getPaymentsByInvoice', async (event, invoiceId) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getPaymentsByInvoice(invoiceId);
    }
    return db.getPaymentsByInvoice(invoiceId);
  } catch (error) {
    console.error('Error getting payments:', error);
    throw error;
  }
});

ipcMain.handle('db:deletePayment', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.deletePayment(id);
    }
    return db.deletePayment(id);
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
});

// Recurring Invoices
ipcMain.handle('db:createRecurringInvoice', async (event, recurringInvoice, items) => {
  try {
    enforceTrialLimit('recurringInvoices');
    return db.createRecurringInvoice(recurringInvoice, items);
  } catch (error) {
    console.error('Error creating recurring invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:getAllRecurringInvoices', async () => {
  try {
    return db.getAllRecurringInvoices();
  } catch (error) {
    console.error('Error getting recurring invoices:', error);
    throw error;
  }
});

ipcMain.handle('db:getRecurringInvoice', async (event, id) => {
  try {
    return db.getRecurringInvoice(id);
  } catch (error) {
    console.error('Error getting recurring invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:updateRecurringInvoice', async (event, id, recurringInvoice, items) => {
  try {
    return db.updateRecurringInvoice(id, recurringInvoice, items);
  } catch (error) {
    console.error('Error updating recurring invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteRecurringInvoice', async (event, id) => {
  try {
    return db.deleteRecurringInvoice(id);
  } catch (error) {
    console.error('Error deleting recurring invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:generateInvoiceFromRecurring', async (event, recurringInvoiceId) => {
  try {
    enforceTrialLimit('invoices');
    return db.generateInvoiceFromRecurring(recurringInvoiceId);
  } catch (error) {
    console.error('Error generating invoice from recurring:', error);
    throw error;
  }
});

// Quotes
ipcMain.handle('db:generateQuoteNumber', async () => {
  try {
    // Always use SQLite for number generation (settings-based)
    return db.generateQuoteNumber();
  } catch (error) {
    console.error('Error generating quote number:', error);
    throw error;
  }
});

ipcMain.handle('db:peekNextQuoteNumber', async () => {
  try {
    // Peek at next quote number without incrementing counter
    return db.peekNextQuoteNumber();
  } catch (error) {
    console.error('Error peeking next quote number:', error);
    throw error;
  }
});

ipcMain.handle('db:createQuote', async (event, quote, items) => {
  try {
    enforceTrialLimit('quotes');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      const result = await adapter.createQuote(quote);
      // Note: quote items would need to be inserted separately
      // For now, use SQLite for full functionality
      return result;
    }
    return db.createQuote(quote, items);
  } catch (error) {
    console.error('Error creating quote:', error);
    throw error;
  }
});

ipcMain.handle('db:getAllQuotes', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getAllQuotes();
    }
    return db.getAllQuotes();
  } catch (error) {
    console.error('Error getting quotes:', error);
    throw error;
  }
});

ipcMain.handle('db:getArchivedQuotes', async () => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.getArchivedQuotes();
  } catch (error) {
    console.error('Error getting archived quotes:', error);
    throw error;
  }
});

ipcMain.handle('db:getQuote', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getQuote(id);
    }
    return db.getQuote(id);
  } catch (error) {
    console.error('Error getting quote:', error);
    throw error;
  }
});

ipcMain.handle('db:updateQuote', async (event, id, quote, items) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.updateQuote(id, quote);
    }
    return db.updateQuote(id, quote, items);
  } catch (error) {
    console.error('Error updating quote:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteQuote', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.deleteQuote(id);
    }
    return db.deleteQuote(id);
  } catch (error) {
    console.error('Error deleting quote:', error);
    throw error;
  }
});

ipcMain.handle('db:archiveQuote', async (event, id) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.archiveQuote(id);
  } catch (error) {
    console.error('Error archiving quote:', error);
    throw error;
  }
});

ipcMain.handle('db:restoreQuote', async (event, id) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.restoreQuote(id);
  } catch (error) {
    console.error('Error restoring quote:', error);
    throw error;
  }
});

ipcMain.handle('db:convertQuoteToInvoice', async (event, quoteId) => {
  try {
    // Complex operation - use SQLite for now
    return db.convertQuoteToInvoice(quoteId);
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    throw error;
  }
});

// Credit Notes
ipcMain.handle('db:generateCreditNoteNumber', async () => {
  try {
    // Always use SQLite for number generation (settings-based)
    return db.generateCreditNoteNumber();
  } catch (error) {
    console.error('Error generating credit note number:', error);
    throw error;
  }
});

ipcMain.handle('db:createCreditNote', async (event, creditNote, items) => {
  try {
    enforceTrialLimit('creditNotes');
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.createCreditNote(creditNote);
    }
    return db.createCreditNote(creditNote, items);
  } catch (error) {
    console.error('Error creating credit note:', error);
    throw error;
  }
});

ipcMain.handle('db:getAllCreditNotes', async () => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getAllCreditNotes();
    }
    return db.getAllCreditNotes();
  } catch (error) {
    console.error('Error getting credit notes:', error);
    throw error;
  }
});

ipcMain.handle('db:getCreditNote', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.getCreditNote(id);
    }
    return db.getCreditNote(id);
  } catch (error) {
    console.error('Error getting credit note:', error);
    throw error;
  }
});

ipcMain.handle('db:getCreditNotesByInvoice', async (event, invoiceId) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.getCreditNotesByInvoice(invoiceId);
  } catch (error) {
    console.error('Error getting credit notes by invoice:', error);
    throw error;
  }
});

ipcMain.handle('db:updateCreditNote', async (event, id, creditNote, items) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.updateCreditNote(id, creditNote);
    }
    return db.updateCreditNote(id, creditNote, items);
  } catch (error) {
    console.error('Error updating credit note:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteCreditNote', async (event, id) => {
  try {
    if (useSqlServer()) {
      const adapter = getDbAdapter();
      return await adapter.deleteCreditNote(id);
    }
    return db.deleteCreditNote(id);
  } catch (error) {
    console.error('Error deleting credit note:', error);
    throw error;
  }
});

ipcMain.handle('db:archiveCreditNote', async (event, id) => {
  try {
    // SQL Server adapter doesn't have this yet, fallback to SQLite
    return db.archiveCreditNote(id);
  } catch (error) {
    console.error('Error archiving credit note:', error);
    throw error;
  }
});

// Expenses
ipcMain.handle('db:generateExpenseNumber', async () => {
  try {
    return db.generateExpenseNumber();
  } catch (error) {
    console.error('Error generating expense number:', error);
    throw error;
  }
});

ipcMain.handle('db:createExpense', async (event, expense) => {
  try {
    return db.createExpense(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
});

ipcMain.handle('db:getAllExpenses', async () => {
  try {
    return db.getAllExpenses();
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
});

ipcMain.handle('db:getExpense', async (event, id) => {
  try {
    return db.getExpense(id);
  } catch (error) {
    console.error('Error getting expense:', error);
    throw error;
  }
});

ipcMain.handle('db:updateExpense', async (event, id, expense) => {
  try {
    return db.updateExpense(id, expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteExpense', async (event, id) => {
  try {
    return db.deleteExpense(id);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
});

ipcMain.handle('db:getExpensesByClient', async (event, clientId) => {
  try {
    return db.getExpensesByClient(clientId);
  } catch (error) {
    console.error('Error getting expenses by client:', error);
    throw error;
  }
});

ipcMain.handle('db:getBillableExpenses', async () => {
  try {
    return db.getBillableExpenses();
  } catch (error) {
    console.error('Error getting billable expenses:', error);
    throw error;
  }
});

// Expense Categories
ipcMain.handle('db:getAllExpenseCategories', async () => {
  try {
    return db.getAllExpenseCategories();
  } catch (error) {
    console.error('Error getting expense categories:', error);
    throw error;
  }
});

ipcMain.handle('db:createExpenseCategory', async (event, category) => {
  try {
    return db.createExpenseCategory(category);
  } catch (error) {
    console.error('Error creating expense category:', error);
    throw error;
  }
});

ipcMain.handle('db:updateExpenseCategory', async (event, id, category) => {
  try {
    return db.updateExpenseCategory(id, category);
  } catch (error) {
    console.error('Error updating expense category:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteExpenseCategory', async (event, id) => {
  try {
    return db.deleteExpenseCategory(id);
  } catch (error) {
    console.error('Error deleting expense category:', error);
    throw error;
  }
});

// Reminder Templates
ipcMain.handle('db:getAllReminderTemplates', async () => {
  try {
    return db.getAllReminderTemplates();
  } catch (error) {
    console.error('Error getting reminder templates:', error);
    throw error;
  }
});

ipcMain.handle('db:getReminderTemplate', async (event, id) => {
  try {
    return db.getReminderTemplate(id);
  } catch (error) {
    console.error('Error getting reminder template:', error);
    throw error;
  }
});

ipcMain.handle('db:createReminderTemplate', async (event, template) => {
  try {
    return db.createReminderTemplate(template);
  } catch (error) {
    console.error('Error creating reminder template:', error);
    throw error;
  }
});

ipcMain.handle('db:updateReminderTemplate', async (event, id, template) => {
  try {
    return db.updateReminderTemplate(id, template);
  } catch (error) {
    console.error('Error updating reminder template:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteReminderTemplate', async (event, id) => {
  try {
    return db.deleteReminderTemplate(id);
  } catch (error) {
    console.error('Error deleting reminder template:', error);
    throw error;
  }
});

// Invoice Reminders
ipcMain.handle('db:createInvoiceReminder', async (event, reminder) => {
  try {
    return db.createInvoiceReminder(reminder);
  } catch (error) {
    console.error('Error creating invoice reminder:', error);
    throw error;
  }
});

ipcMain.handle('db:getInvoiceReminders', async (event, invoiceId) => {
  try {
    return db.getInvoiceReminders(invoiceId);
  } catch (error) {
    console.error('Error getting invoice reminders:', error);
    throw error;
  }
});

ipcMain.handle('db:getAllInvoiceReminders', async () => {
  try {
    return db.getAllInvoiceReminders();
  } catch (error) {
    console.error('Error getting all invoice reminders:', error);
    throw error;
  }
});

ipcMain.handle('db:deleteInvoiceReminder', async (event, id) => {
  try {
    return db.deleteInvoiceReminder(id);
  } catch (error) {
    console.error('Error deleting invoice reminder:', error);
    throw error;
  }
});

ipcMain.handle('db:getInvoicesNeedingReminders', async () => {
  try {
    return db.getInvoicesNeedingReminders();
  } catch (error) {
    console.error('Error getting invoices needing reminders:', error);
    throw error;
  }
});

// Batch Operations
ipcMain.handle('db:batchUpdateInvoiceStatus', async (event, invoiceIds, status) => {
  try {
    return db.batchUpdateInvoiceStatus(invoiceIds, status);
  } catch (error) {
    console.error('Error batch updating invoice status:', error);
    throw error;
  }
});

ipcMain.handle('db:batchArchiveInvoices', async (event, invoiceIds) => {
  try {
    return db.batchArchiveInvoices(invoiceIds);
  } catch (error) {
    console.error('Error batch archiving invoices:', error);
    throw error;
  }
});

ipcMain.handle('db:batchDeleteInvoices', async (event, invoiceIds) => {
  try {
    return db.batchDeleteInvoices(invoiceIds);
  } catch (error) {
    console.error('Error batch deleting invoices:', error);
    throw error;
  }
});

// Backup and Restore
const backup = require('./database/backup');

ipcMain.handle('backup:create', async (event, customPath) => {
  try {
    const backupDir = backup.getDefaultBackupDir();
    const filename = backup.generateBackupFilename();
    const backupPath = customPath || path.join(backupDir, filename);

    await backup.createBackup(backupPath);

    return {
      success: true,
      path: backupPath,
      filename: path.basename(backupPath)
    };
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
});

ipcMain.handle('backup:restore', async (event, backupPath) => {
  try {
    const stats = await backup.restoreBackup(backupPath);

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
});

ipcMain.handle('backup:list', async () => {
  try {
    return backup.listBackups();
  } catch (error) {
    console.error('Error listing backups:', error);
    throw error;
  }
});

ipcMain.handle('backup:selectFile', async (event, mode) => {
  try {
    const options = mode === 'save' ? {
      title: 'Save Backup',
      defaultPath: path.join(app.getPath('documents'), backup.generateBackupFilename()),
      filters: [
        { name: 'Backup Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    } : {
      title: 'Select Backup File',
      filters: [
        { name: 'Backup Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    };

    const result = mode === 'save'
      ? await dialog.showSaveDialog(mainWindow, options)
      : await dialog.showOpenDialog(mainWindow, options);

    if (result.canceled) {
      return { canceled: true };
    }

    return {
      canceled: false,
      path: mode === 'save' ? result.filePath : result.filePaths[0]
    };
  } catch (error) {
    console.error('Error selecting file:', error);
    throw error;
  }
});

// Select folder for scheduled backups
ipcMain.handle('backup:selectFolder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return {
      canceled: false,
      path: result.filePaths[0]
    };
  } catch (error) {
    console.error('Error selecting folder:', error);
    throw error;
  }
});

// CSV Restore - Select multiple CSV files
ipcMain.handle('backup:selectCSVFiles', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select CSV Files to Restore',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return {
      canceled: false,
      paths: result.filePaths
    };
  } catch (error) {
    console.error('Error selecting CSV files:', error);
    throw error;
  }
});

// Restore from CSV files
ipcMain.handle('backup:restoreFromCSV', async (event, csvFilePaths) => {
  try {
    const stats = await backup.restoreFromCSV(csvFilePaths);

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error restoring from CSV:', error);
    throw error;
  }
});

// Get supported tables for CSV import
ipcMain.handle('backup:getSupportedTables', async () => {
  try {
    return backup.getSupportedTables();
  } catch (error) {
    console.error('Error getting supported tables:', error);
    throw error;
  }
});

// SQL Server Connection (lazy-loaded to avoid crashes if packages not installed)
ipcMain.handle('sqlserver:testConnection', async (event, config) => {
  try {
    const SQLServerAdapter = require('./database/sqlServerAdapter');
    const adapter = new SQLServerAdapter({
      type: config.type,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    });

    const result = await adapter.testConnection();
    return result;
  } catch (error) {
    console.error('Error testing SQL server connection:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('sqlserver:checkDatabase', async (event, config) => {
  try {
    const SQLServerAdapter = require('./database/sqlServerAdapter');
    const adapter = new SQLServerAdapter({
      type: config.type,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    });

    const exists = await adapter.databaseExists();
    return { success: true, exists };
  } catch (error) {
    console.error('Error checking database:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('sqlserver:createDatabase', async (event, config) => {
  try {
    const SQLServerAdapter = require('./database/sqlServerAdapter');
    const adapter = new SQLServerAdapter({
      type: config.type,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    });

    const result = await adapter.createDatabase();
    return result;
  } catch (error) {
    console.error('Error creating database:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('sqlserver:createSchema', async (event, config) => {
  try {
    const SQLServerAdapter = require('./database/sqlServerAdapter');
    const adapter = new SQLServerAdapter({
      type: config.type,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    });

    const result = await adapter.createSchema();
    return result;
  } catch (error) {
    console.error('Error creating schema:', error);
    return { success: false, message: error.message };
  }
});

// Payment Gateway - PayPal
ipcMain.handle('payment:createPayPalPaymentLink', async (event, paymentData) => {
  try {
    const { settings, invoice } = paymentData;

    // Validate PayPal settings
    if (!settings.paypal_enabled) {
      throw new Error('PayPal is not configured. Please enable PayPal in Settings.');
    }

    // Get PayPal email/username from settings
    const paypalIdentifier = settings.paypal_client_id || settings.company_email;

    if (!paypalIdentifier) {
      throw new Error('PayPal email or PayPal.me username not configured.');
    }

    // Generate PayPal.me link
    const amount = invoice.total.toFixed(2);
    let paymentLink;

    // If it looks like a PayPal.me username (no @ symbol), use PayPal.me
    if (!paypalIdentifier.includes('@')) {
      paymentLink = `https://paypal.me/${paypalIdentifier}/${amount}USD`;
    } else {
      // Use standard PayPal payment link with email
      const invoiceNumber = encodeURIComponent(invoice.invoice_number);
      const note = encodeURIComponent(`Payment for Invoice ${invoice.invoice_number}`);
      paymentLink = `https://www.paypal.com/paypalme/${paypalIdentifier.replace('@', '')}/${amount}?note=${note}`;
    }

    console.log('PayPal payment link created:', paymentLink);
    return {
      success: true,
      paymentLink: paymentLink,
      message: 'PayPal payment link created successfully!'
    };

  } catch (error) {
    console.error('Error creating PayPal payment link:', error);
    throw new Error(error.message);
  }
});

// Payment Gateway - Stripe
ipcMain.handle('payment:createStripePaymentLink', async (event, paymentData) => {
  try {
    const { settings, invoice, client } = paymentData;

    // Validate Stripe settings
    if (!settings.stripe_enabled || !settings.stripe_secret_key) {
      throw new Error('Stripe is not configured. Please configure Stripe settings first.');
    }

    // Initialize Stripe with the secret key
    const stripe = Stripe(settings.stripe_secret_key);

    // Create a payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: (settings.currency_code || 'USD').toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for ${settings.company_name || 'Invoice'}`,
            },
            unit_amount: Math.round(invoice.total * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id.toString(),
        invoice_number: invoice.invoice_number,
        client_id: client.id.toString(),
        client_name: client.name,
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you! Payment for Invoice ${invoice.invoice_number} has been received. You will receive a confirmation email shortly.`,
        },
      },
    });

    console.log('Stripe payment link created:', paymentLink.id);
    return {
      success: true,
      paymentLink: paymentLink.url,
      paymentLinkId: paymentLink.id,
      message: 'Payment link created successfully!'
    };

  } catch (error) {
    console.error('Error creating Stripe payment link:', error);

    let errorMessage = error.message;
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed. Please check your API key.';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid request to Stripe. Please check your settings.';
    }

    throw new Error(errorMessage);
  }
});

// Create a Payment Intent for direct card payment
ipcMain.handle('payment:createPaymentIntent', async (event, paymentData) => {
  try {
    const { settings, invoice, client, amount } = paymentData;

    // Validate Stripe settings
    if (!settings.stripe_enabled || !settings.stripe_secret_key) {
      throw new Error('Stripe is not configured. Please configure Stripe settings first.');
    }

    // Initialize Stripe with the secret key
    const stripe = Stripe(settings.stripe_secret_key);

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((amount || invoice.total) * 100), // Stripe uses cents
      currency: (settings.currency_code || 'USD').toLowerCase(),
      metadata: {
        invoice_id: invoice.id.toString(),
        invoice_number: invoice.invoice_number,
        client_id: client.id.toString(),
        client_name: client.name,
      },
      description: `Payment for Invoice ${invoice.invoice_number}`,
    });

    console.log('Stripe payment intent created:', paymentIntent.id);
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };

  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
    let errorMessage = error.message;
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed. Please check your API key.';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid request to Stripe. Please check your settings.';
    }
    throw new Error(errorMessage);
  }
});

// Process a card payment
ipcMain.handle('payment:processCardPayment', async (event, paymentData) => {
  try {
    const { settings, cardDetails, clientSecret } = paymentData;

    // Validate Stripe settings
    if (!settings.stripe_enabled || !settings.stripe_secret_key) {
      throw new Error('Stripe is not configured. Please configure Stripe settings first.');
    }

    // Initialize Stripe with the secret key
    const stripe = Stripe(settings.stripe_secret_key);

    // Create a payment method from card details
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardDetails.number.replace(/\s/g, ''),
        exp_month: parseInt(cardDetails.expMonth),
        exp_year: parseInt(cardDetails.expYear),
        cvc: cardDetails.cvc,
      },
      billing_details: {
        name: cardDetails.name,
      },
    });

    // Confirm the payment intent with the payment method
    const paymentIntent = await stripe.paymentIntents.confirm(
      clientSecret.split('_secret_')[0], // Extract payment intent ID from client secret
      {
        payment_method: paymentMethod.id,
      }
    );

    console.log('Payment processed:', paymentIntent.id, paymentIntent.status);

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        message: 'Payment successful!',
      };
    } else if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: 'Additional authentication required.',
      };
    } else {
      return {
        success: false,
        message: `Payment ${paymentIntent.status}. Please try again.`,
      };
    }

  } catch (error) {
    console.error('Error processing card payment:', error);
    let errorMessage = error.message;

    if (error.type === 'StripeCardError') {
      errorMessage = error.message; // User-friendly message from Stripe
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed. Please check your API key.';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment information. Please check your card details.';
    }

    throw new Error(errorMessage);
  }
});

// Square Payment Link
ipcMain.handle('payment:createSquarePaymentLink', async (event, paymentData) => {
  try {
    const { settings, invoice, client } = paymentData;

    // Validate Square settings
    if (!settings.square_enabled || !settings.square_access_token) {
      throw new Error('Square is not configured. Please configure Square settings first.');
    }

    // Initialize Square client
    const { Client, Environment } = require('square');
    const squareClient = new Client({
      accessToken: settings.square_access_token,
      environment: settings.square_environment === 'production' ? Environment.Production : Environment.Sandbox,
    });

    // Create a payment link using Square Checkout API
    const { result } = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: `invoice-${invoice.id}-${Date.now()}`,
      quickPay: {
        name: `Invoice ${invoice.invoice_number}`,
        priceMoney: {
          amount: BigInt(Math.round(invoice.total * 100)), // Square uses cents
          currency: (settings.currency_code || 'USD').toUpperCase(),
        },
      },
      checkoutOptions: {
        allowTipping: false,
        redirectUrl: settings.company_website || undefined,
      },
    });

    console.log('Square payment link created:', result.paymentLink.id);
    return {
      success: true,
      paymentLink: result.paymentLink.url,
      paymentLinkId: result.paymentLink.id,
      message: 'Square payment link created successfully!',
    };

  } catch (error) {
    console.error('Error creating Square payment link:', error);
    let errorMessage = error.message;

    if (error.errors && error.errors.length > 0) {
      errorMessage = error.errors[0].detail || error.errors[0].code;
    }

    throw new Error(errorMessage);
  }
});

// GoCardless Payment Link (ACH/SEPA)
ipcMain.handle('payment:createGoCardlessPaymentLink', async (event, paymentData) => {
  try {
    const { settings, invoice, client } = paymentData;

    // Validate GoCardless settings
    if (!settings.gocardless_enabled || !settings.gocardless_access_token) {
      throw new Error('GoCardless is not configured. Please configure GoCardless settings first.');
    }

    // Initialize GoCardless client
    const gocardless = require('gocardless-nodejs');
    const gcClient = gocardless(
      settings.gocardless_access_token,
      settings.gocardless_environment === 'live' ? gocardless.constants.Environments.Live : gocardless.constants.Environments.Sandbox
    );

    // Create a billing request with payment request
    const billingRequest = await gcClient.billingRequests.create({
      payment_request: {
        description: `Invoice ${invoice.invoice_number}`,
        amount: Math.round(invoice.total * 100), // GoCardless uses cents/pence
        currency: (settings.currency_code || 'USD').toUpperCase(),
        // Set metadata for reference
        metadata: {
          invoice_id: invoice.id.toString(),
          invoice_number: invoice.invoice_number,
          client_id: client.id.toString(),
        }
      }
    });

    // Create a billing request flow (payment page)
    const billingRequestFlow = await gcClient.billingRequestFlows.create({
      redirect_uri: settings.company_website || 'https://example.com',
      exit_uri: settings.company_website || 'https://example.com',
      links: {
        billing_request: billingRequest.id
      }
    });

    console.log('GoCardless payment link created:', billingRequestFlow.id);
    return {
      success: true,
      paymentLink: billingRequestFlow.authorisation_url,
      paymentLinkId: billingRequestFlow.id,
      billingRequestId: billingRequest.id,
      message: 'GoCardless payment link created successfully!',
    };

  } catch (error) {
    console.error('Error creating GoCardless payment link:', error);
    let errorMessage = error.message;

    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    }

    throw new Error(errorMessage);
  }
});

/**
 * Creates an Authorize.Net hosted payment page link for invoice payment
 *
 * This handler generates a secure payment URL using Authorize.Net's hosted payment page
 * approach with MD5 HMAC fingerprint authentication. The hosted payment page handles
 * all PCI compliance requirements as the payment form is hosted by Authorize.Net.
 *
 * @async
 * @param {Object} event - The IPC event object
 * @param {Object} paymentData - Payment data object
 * @param {Object} paymentData.settings - Application settings containing Authorize.Net credentials
 * @param {string} paymentData.settings.authorizenet_api_login_id - API Login ID from Authorize.Net
 * @param {string} paymentData.settings.authorizenet_transaction_key - Transaction Key for HMAC signing
 * @param {boolean} paymentData.settings.authorizenet_enabled - Whether Authorize.Net is enabled
 * @param {string} paymentData.settings.authorizenet_environment - 'sandbox' or 'production'
 * @param {Object} paymentData.invoice - Invoice object
 * @param {number} paymentData.invoice.id - Invoice database ID
 * @param {string} paymentData.invoice.invoice_number - Invoice number for reference
 * @param {number} paymentData.invoice.total - Total amount due
 * @param {string} paymentData.invoice.client_email - Client email for pre-fill
 * @param {Object} paymentData.client - Client object
 * @param {string} paymentData.client.name - Client full name
 *
 * @returns {Promise<Object>} Payment link result
 * @returns {boolean} returns.success - Whether the operation succeeded
 * @returns {string} returns.paymentLink - The hosted payment page URL
 * @returns {string} returns.paymentLinkId - Unique identifier for this payment link
 * @returns {string} returns.message - Success message
 *
 * @throws {Error} When Authorize.Net is not configured or enabled
 *
 * @example
 * const result = await window.electron.ipcRenderer.invoke('payment:createAuthorizeNetPaymentLink', {
 *   settings: { authorizenet_api_login_id: '...', authorizenet_transaction_key: '...' },
 *   invoice: { id: 1, invoice_number: 'INV-0001', total: 1500.00 },
 *   client: { name: 'John Doe' }
 * });
 * // Returns: { success: true, paymentLink: 'https://test.authorize.net/payment/payment?...', ... }
 *
 * @see {@link https://developer.authorize.net/api/reference/features/accept_hosted.html|Authorize.Net Accept Hosted Documentation}
 */
ipcMain.handle('payment:createAuthorizeNetPaymentLink', async (event, paymentData) => {
  try {
    const { settings, invoice, client } = paymentData;

    // Validate Authorize.Net settings
    if (!settings.authorizenet_enabled || !settings.authorizenet_api_login_id || !settings.authorizenet_transaction_key) {
      throw new Error('Authorize.Net is not configured. Please configure Authorize.Net settings first.');
    }

    const crypto = require('crypto');

    // Determine endpoint based on environment (sandbox for testing, production for live transactions)
    const endpoint = settings.authorizenet_environment === 'production'
      ? 'https://accept.authorize.net/payment/payment'
      : 'https://test.authorize.net/payment/payment';

    // Generate timestamp and sequence for fingerprint uniqueness
    // Timestamp: Unix timestamp in seconds (required by Authorize.Net)
    // Sequence: Random number to prevent duplicate fingerprints
    const timestamp = Math.floor(Date.now() / 1000);
    const sequence = Math.floor(Math.random() * 1000);

    // Generate fingerprint for hosted payment page authentication
    // The fingerprint proves this request came from an authorized merchant
    const amount = invoice.total.toFixed(2);
    const fpSequence = sequence.toString();
    const fpTimestamp = timestamp.toString();

    // Create HMAC-MD5 fingerprint hash using Authorize.Net's specification
    // Format: API_LOGIN_ID^SEQUENCE^TIMESTAMP^AMOUNT^
    // The caret (^) delimiters are required by Authorize.Net
    const fingerprintData = `${settings.authorizenet_api_login_id}^${fpSequence}^${fpTimestamp}^${amount}^`;
    const fingerprint = crypto
      .createHmac('md5', settings.authorizenet_transaction_key)
      .update(fingerprintData)
      .digest('hex');

    // Build hosted payment page URL with required and optional parameters
    // All parameters are prefixed with 'x_' as per Authorize.Net specification
    const params = new URLSearchParams({
      // Authentication parameters (required)
      'x_login': settings.authorizenet_api_login_id,          // Merchant API Login ID
      'x_amount': amount,                                      // Transaction amount (2 decimal places)
      'x_fp_sequence': fpSequence,                             // Fingerprint sequence number
      'x_fp_timestamp': fpTimestamp,                           // Fingerprint timestamp
      'x_fp_hash': fingerprint,                                // HMAC-MD5 fingerprint for security

      // Display parameters
      'x_show_form': 'PAYMENT_FORM',                          // Show payment form immediately

      // Transaction information (pre-filled for user convenience)
      'x_invoice_num': invoice.invoice_number,                // Invoice reference number
      'x_description': `Invoice ${invoice.invoice_number}`,   // Transaction description

      // Customer information (pre-filled to improve UX)
      'x_first_name': client.name.split(' ')[0] || '',        // Client first name
      'x_last_name': client.name.split(' ').slice(1).join(' ') || '',  // Client last name
      'x_email': invoice.client_email || '',                  // Client email

      // Response handling
      'x_relay_response': 'FALSE',                            // Don't use relay response (simpler flow)
    });

    const paymentUrl = `${endpoint}?${params.toString()}`;

    console.log('Authorize.Net payment link created for invoice:', invoice.invoice_number);
    return {
      success: true,
      paymentLink: paymentUrl,
      paymentLinkId: `authnet-${invoice.id}-${timestamp}`,
      message: 'Authorize.Net payment link created successfully!',
    };

  } catch (error) {
    console.error('Error creating Authorize.Net payment link:', error);
    throw new Error(error.message);
  }
});

// Send email with payment link
ipcMain.handle('email:sendInvoiceWithPayment', async (event, emailData) => {
  try {
    const { settings, recipient, subject, body, invoiceHtml, invoiceNumber, paymentLink, cc, bcc } = emailData;

    // Validate SMTP settings
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      throw new Error('SMTP settings are not configured. Please configure email settings first.');
    }

    // Generate PDF in memory for attachment
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      margins: {
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3
      }
    });

    pdfWindow.close();

    const bodyWithPayment = `${body}\n\n--\n\nPay Online: ${paymentLink}\n\nClick the link above to securely pay this invoice with your credit or debit card.`;

    const mailOptions = {
      from: settings.smtp_from_email
        ? `"${settings.smtp_from_name || settings.company_name}" <${settings.smtp_from_email}>`
        : settings.smtp_user,
      to: recipient,
      subject: subject,
      text: bodyWithPayment,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <pre style="white-space: pre-wrap;">${body}</pre>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
          <div style="text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Pay this invoice securely online:</p>
            <a href="${paymentLink}"
               style="display: inline-block; padding: 12px 30px; background-color: #635BFF; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Pay Now
            </a>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfData,
          contentType: 'application/pdf'
        }
      ]
    };

    if (cc && cc.trim()) mailOptions.cc = cc;
    if (bcc && bcc.trim()) mailOptions.bcc = bcc;

    // Send with automatic port fallback
    const info = await sendMailWithFallback(settings, mailOptions);

    console.log('Email with payment link sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      message: 'Invoice with payment link sent successfully!'
    };

  } catch (error) {
    console.error('Error sending email with payment:', error);

    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your SMTP username and password.';
    } else if (error.code === 'ENETWORK_BLOCKED') {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
});

// ========================================
// License Activation IPC Handlers
// ========================================

// Check local license status + phone home on startup if online
ipcMain.handle('license:check', async () => {
  // Phone home to validate (runs async, updates cache)
  await validateLicenseOnStartup();

  const data = licenseStore.store;
  const active = isLicenseActive();

  return {
    licenseKey: data.licenseKey,
    activated: active,
    activatedAt: data.activatedAt,
    email: data.email,
    lastServerCheck: data.lastServerCheck,
  };
});

// Get machine ID hash
ipcMain.handle('license:getMachineId', async () => {
  return generateMachineId();
});

// Activate license key against the server
ipcMain.handle('license:activate', async (event, licenseKey) => {
  const machineId = generateMachineId();

  try {
    const response = await fetch(`${ACTIVATION_SERVER}/api/activate-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: licenseKey.trim().toUpperCase(), machineId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      licenseStore.set('licenseKey', licenseKey.trim().toUpperCase());
      licenseStore.set('machineId', machineId);
      licenseStore.set('activated', true);
      licenseStore.set('activatedAt', new Date().toISOString());
      licenseStore.set('email', data.email || null);
      licenseStore.set('licenseToken', data.token || null);
      licenseStore.set('lastServerCheck', new Date().toISOString());

      return { success: true, message: data.message };
    }

    return {
      success: false,
      error: data.error || 'Activation failed',
      code: data.code || 'UNKNOWN',
      hint: data.hint || null,
    };
  } catch (err) {
    console.error('License activation network error:', err);
    return {
      success: false,
      error: 'Could not connect to the activation server. Please check your internet connection.',
      code: 'NETWORK_ERROR',
    };
  }
});

// Deactivate license (for support/debugging)
ipcMain.handle('license:deactivate', async () => {
  // Preserve trialStartDate so trial doesn't reset on deactivation
  const trialStartDate = licenseStore.get('trialStartDate');
  licenseStore.clear();
  if (trialStartDate) {
    licenseStore.set('trialStartDate', trialStartDate);
  }
  return { success: true };
});

// Get trial status with counts and limits
ipcMain.handle('license:getTrialStatus', async () => {
  const counts = db.getTrialCounts();
  const active = isLicenseActive();

  return {
    isLicensed: active,
    limits: TRIAL_LIMITS,
    counts,
    remaining: {
      invoices: Math.max(0, TRIAL_LIMITS.invoices - counts.invoices),
      quotes: Math.max(0, TRIAL_LIMITS.quotes - counts.quotes),
      clients: Math.max(0, TRIAL_LIMITS.clients - counts.clients),
      savedItems: Math.max(0, TRIAL_LIMITS.savedItems - counts.savedItems),
      recurringInvoices: Math.max(0, TRIAL_LIMITS.recurringInvoices - counts.recurringInvoices),
      creditNotes: Math.max(0, TRIAL_LIMITS.creditNotes - counts.creditNotes),
    },
    trialStartDate: licenseStore.get('trialStartDate'),
    trialDaysRemaining: getTrialDaysRemaining(),
    trialExpired: isTrialExpired(),
  };
});

// Force a server validation check
ipcMain.handle('license:serverCheck', async () => {
  await validateLicenseOnStartup();
  return {
    activated: isLicenseActive(),
    lastServerCheck: licenseStore.get('lastServerCheck'),
  };
});

// ========================================
// Stripe Webhook Server
// ========================================

let webhookServer = null;

function startWebhookServer() {
  try {
    const settings = db.getSettings();
    // Make webhook port configurable via settings (default: 3001)
    const WEBHOOK_PORT = parseInt(settings.webhook_port) || 3001;

    const webhookApp = express();

    // Webhook endpoint needs raw body for signature verification
    webhookApp.post('/webhook/stripe',
      bodyParser.raw({ type: 'application/json' }),
      async (req, res) => {
        const sig = req.headers['stripe-signature'];

        try {
          const settings = db.getSettings();

          if (!settings.stripe_enabled || !settings.stripe_secret_key) {
            console.warn('Stripe not configured, ignoring webhook');
            return res.status(400).send('Stripe not configured');
          }

          const stripe = Stripe(settings.stripe_secret_key);

          // Verify webhook signature
          let event;
          try {
            // Use webhook secret if configured for proper signature verification
            if (settings.stripe_webhook_secret) {
              event = stripe.webhooks.constructEvent(req.body, sig, settings.stripe_webhook_secret);
              console.log('Webhook signature verified successfully');
            } else {
              // Fallback: parse without verification (only for development/testing)
              console.warn('Stripe webhook secret not configured - signature verification skipped (INSECURE)');
              event = JSON.parse(req.body.toString());
            }
          } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
          }

          console.log('Received Stripe webhook event:', event.type);

          // Handle payment success events
          if (event.type === 'checkout.session.completed' ||
              event.type === 'payment_intent.succeeded') {

            const session = event.data.object;
            const metadata = session.metadata;

            if (metadata && metadata.invoice_id) {
              const invoiceId = parseInt(metadata.invoice_id);
              const invoice = db.getInvoice(invoiceId);

              if (invoice) {
                // Create payment record
                const payment = {
                  invoice_id: invoiceId,
                  amount: session.amount_total / 100, // Convert from cents
                  payment_date: new Date().toISOString().split('T')[0],
                  payment_method: 'Stripe',
                  reference_number: session.id,
                  notes: 'Automatic payment via Stripe webhook'
                };

                db.createPayment(payment);

                // Update invoice status (will auto-set to 'paid' if fully paid)
                db.updateInvoiceStatusAfterPayment(invoiceId);

                console.log(`Invoice #${invoice.invoice_number} marked as paid via Stripe webhook`);

                // Notify the renderer process if window exists
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('invoice-payment-received', {
                    invoiceId,
                    invoiceNumber: invoice.invoice_number,
                    amount: payment.amount
                  });
                }
              } else {
                console.warn(`Invoice with ID ${invoiceId} not found`);
              }
            }
          }

          res.json({ received: true });
        } catch (err) {
          console.error('Error processing webhook:', err);
          res.status(500).send('Webhook processing failed');
        }
      }
    );

    webhookServer = webhookApp.listen(WEBHOOK_PORT, () => {
      console.log(`Stripe webhook server listening on port ${WEBHOOK_PORT}`);
      console.log(`Webhook endpoint: http://localhost:${WEBHOOK_PORT}/webhook/stripe`);
      console.log('Configure this URL in your Stripe Dashboard webhook settings');
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${WEBHOOK_PORT} is already in use. Webhook server will not start.`);
        console.warn('Another instance of the application may be running, or another process is using this port.');
        console.warn('Change the webhook_port in settings to use a different port.');
        webhookServer = null;
      } else {
        console.error('Webhook server error:', err);
      }
    });

  } catch (error) {
    console.error('Failed to start webhook server:', error);
  }
}

// Stop webhook server when app quits
app.on('before-quit', () => {
  if (webhookServer) {
    webhookServer.close();
    console.log('Webhook server stopped');
  }
});

// ========================================
// Automated Reminder Scheduler
// ========================================

function generateReminderInvoiceHTML(invoice, settings) {
  const fmtCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0.00';
    const n = parseFloat(amount);
    return '$' + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const bodyFont = settings?.body_font || 'Segoe UI';
  const headingFont = settings?.heading_font || bodyFont;
  const accent = settings?.invoice_accent_color || '#2563eb';
  const headerColor = settings?.invoice_header_color || '#0f172a';
  const textPrimary = settings?.text_primary_color || '#1e293b';
  const textSecondary = settings?.text_secondary_color || '#64748b';
  const textMuted = '#94a3b8';
  const showLogo = (settings?.show_logo_on_invoice ?? 1) ? true : false;
  const showAddress = (settings?.show_company_address_on_invoice ?? 1) ? true : false;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'${bodyFont}',system-ui,sans-serif;color:${textPrimary};font-size:12px;line-height:1.5}
.accent-line{height:4px;background:linear-gradient(90deg,${accent} 0%,#7c3aed 100%)}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 40px 24px}
.invoice-label{font-family:'${headingFont}',system-ui,sans-serif;font-size:32px;font-weight:800;color:${headerColor};letter-spacing:-0.5px;line-height:1}
.invoice-num{margin-top:6px;font-size:13px;font-weight:700;color:${accent};margin-bottom:12px}
.company-name{font-family:'${headingFont}',system-ui,sans-serif;font-size:18px;font-weight:700;color:${headerColor};margin-bottom:4px}
.company-detail{font-size:11px;color:${textSecondary};line-height:1.55}
.company-logo{max-height:140px;max-width:140px;border-radius:16px;display:block}
.divider{border:none;height:1px;background:#e2e8f0;margin:0 40px}
.client-row{display:flex;padding:22px 40px;gap:24px}
.client-col{flex:1;min-width:0}
.col-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${accent};margin-bottom:6px}
.col-name{font-size:13px;font-weight:600;color:${headerColor};margin-bottom:2px}
.col-line{font-size:11px;color:${textSecondary};line-height:1.5}
.details-col{width:200px;flex-shrink:0}
.detail-item{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}
.detail-item .dt{color:${textMuted};font-weight:500}
.detail-item .dd{color:${textPrimary};font-weight:600;text-align:right}
.items-wrap{padding:6px 40px 0}
table{width:100%;border-collapse:collapse}
thead th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:${textSecondary};padding:10px 12px;border-bottom:2px solid ${accent};text-align:left}
th.r,td.r{text-align:right}th.c,td.c{text-align:center}
tbody td{padding:10px 12px;font-size:11.5px;color:${textPrimary};border-bottom:1px solid #f1f5f9;vertical-align:top}
tbody tr:last-child td{border-bottom:2px solid #e2e8f0}
.desc-main{font-weight:500;color:${headerColor}}
td.amount{font-weight:700;color:${headerColor};font-variant-numeric:tabular-nums}
td.r{font-variant-numeric:tabular-nums}
.totals-area{display:flex;justify-content:flex-end;padding:12px 40px 0}
.totals-stack{width:260px}
.t-row{display:flex;justify-content:space-between;padding:6px 0;font-size:11.5px}
.t-row .t-label{color:${textSecondary}}.t-row .t-val{font-weight:500;color:${textPrimary};font-variant-numeric:tabular-nums}
.t-line{border:none;height:1px;background:#e2e8f0;margin:4px 0}
.t-total{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0 0}
.t-total .t-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${headerColor}}
.t-total .t-val{font-size:20px;font-weight:800;color:${accent};font-variant-numeric:tabular-nums;letter-spacing:-0.3px}
.bottom-row{display:flex;gap:16px;padding:20px 40px 0}
.bottom-item{flex:1;min-width:0;padding-top:12px;border-top:2px solid #f1f5f9}
.bottom-item h4{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${accent};margin-bottom:5px}
.bottom-item p{font-size:11px;color:${textSecondary};line-height:1.55;white-space:pre-wrap}
.footer{margin:22px 40px 0;padding:16px 0 28px;border-top:1px solid #e2e8f0;text-align:center}
.footer-thank{font-size:12px;font-weight:600;color:${accent};margin-bottom:2px}
.footer-info{font-size:10px;color:${textMuted}}
@media print{body{margin:0}}
</style></head><body>
<div class="accent-line"></div>
<div class="header">
  <div>
    <div class="invoice-label">INVOICE</div>
    <div class="invoice-num">${invoice.invoice_number}</div>
    <div class="company-name">${settings?.company_name || 'Your Company'}</div>
    <div class="company-detail">
      ${showAddress ? `${settings?.company_address ? settings.company_address + '<br>' : ''}${settings?.company_city ? settings.company_city + (settings?.company_state ? ', ' + settings.company_state : '') + ' ' + (settings?.company_zip || '') + '<br>' : ''}` : ''}
      ${settings?.company_email || ''}${settings?.company_phone ? ' &middot; ' + settings.company_phone : ''}
      ${settings?.company_website ? '<br>' + settings.company_website : ''}
    </div>
  </div>
  ${showLogo && settings?.logo_url ? `<div style="flex-shrink:0"><img src="${settings.logo_url}" alt="Logo" class="company-logo"/></div>` : ''}
</div>
<hr class="divider">
<div class="client-row">
  <div class="client-col">
    <div class="col-label">Bill To</div>
    <div class="col-name">${invoice.client_name || 'Client Name'}</div>
    ${invoice.client_email ? `<div class="col-line">${invoice.client_email}</div>` : ''}
    ${invoice.client_address ? `<div class="col-line">${invoice.client_address}</div>` : ''}
    ${invoice.client_city ? `<div class="col-line">${invoice.client_city}${invoice.client_state ? ', ' + invoice.client_state : ''} ${invoice.client_zip || ''}</div>` : ''}
  </div>
  <div class="details-col">
    <div class="col-label">Details</div>
    <div class="detail-item"><span class="dt">Invoice Date</span><span class="dd">${fmtDate(invoice.date)}</span></div>
    <div class="detail-item"><span class="dt">Due Date</span><span class="dd">${fmtDate(invoice.due_date)}</span></div>
    ${invoice.payment_terms ? `<div class="detail-item"><span class="dt">Terms</span><span class="dd">${invoice.payment_terms}</span></div>` : ''}
  </div>
</div>
<hr class="divider">
<div class="items-wrap">
  <table>
    <thead><tr><th>Description</th><th class="c" style="width:48px">Qty</th><th class="r" style="width:88px">Rate</th><th class="r" style="width:96px">Amount</th></tr></thead>
    <tbody>
      ${(invoice.items || []).map(item => `<tr><td><div class="desc-main">${item.description}</div></td><td class="c">${item.quantity}</td><td class="r">${fmtCurrency(item.rate)}</td><td class="r amount">${fmtCurrency(item.amount)}</td></tr>`).join('')}
    </tbody>
  </table>
</div>
<div class="totals-area">
  <div class="totals-stack">
    <div class="t-row"><span class="t-label">Subtotal</span><span class="t-val">${fmtCurrency(invoice.subtotal)}</span></div>
    ${invoice.discount_amount ? `<div class="t-row"><span class="t-label">Discount</span><span class="t-val">-${fmtCurrency(invoice.discount_amount)}</span></div>` : ''}
    <div class="t-row"><span class="t-label">Tax</span><span class="t-val">${fmtCurrency(invoice.tax)}</span></div>
    <hr class="t-line">
    <div class="t-total"><span class="t-label">Total Due</span><span class="t-val">${fmtCurrency(invoice.total)}</span></div>
  </div>
</div>
${invoice.notes ? `<div class="bottom-row"><div class="bottom-item"><h4>Notes</h4><p>${invoice.notes}</p></div></div>` : ''}
<div class="footer">
  <div class="footer-thank">${settings?.invoice_footer || 'Thank you for your business!'}</div>
  <div class="footer-info">${settings?.company_name || 'Your Company'}${settings?.company_email ? ' &middot; ' + settings.company_email : ''}${settings?.company_website ? ' &middot; ' + settings.company_website : ''}</div>
</div>
</body></html>`;
}

async function generateInvoicePDF(invoice, settings) {
  let pdfWindow = null;
  try {
    const html = generateReminderInvoiceHTML(invoice, settings);
    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 }
    });
    return pdfData;
  } finally {
    if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.close();
  }
}

async function sendReminderEmail(invoice, template, client) {
  try {
    const settings = db.getSettings();

    // Check if SMTP is configured
    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      console.error('SMTP not configured, cannot send reminder');
      return false;
    }

    // Replace template variables
    const subject = template.subject
      .replace('{invoice_number}', invoice.invoice_number)
      .replace('{company_name}', settings.company_name || 'OwnInvoice')
      .replace('{client_name}', client.name);

    const body = template.message
      .replace('{invoice_number}', invoice.invoice_number)
      .replace('{client_name}', client.name)
      .replace('{total}', invoice.total.toFixed(2))
      .replace('{due_date}', invoice.due_date)
      .replace('{company_name}', settings.company_name || 'OwnInvoice');

    // Get the full invoice with items for PDF generation
    const fullInvoice = db.getInvoice(invoice.id);

    // Generate invoice PDF
    const pdfData = await generateInvoicePDF(fullInvoice, settings);

    const mailOptions = {
      from: `"${settings.smtp_from_name || settings.company_name || 'OwnInvoice'}" <${settings.smtp_from_email || settings.smtp_user}>`,
      to: client.email,
      subject: subject,
      html: body.replace(/\n/g, '<br>'),
      attachments: [
        {
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfData,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send with automatic port fallback
    await sendMailWithFallback(settings, mailOptions);
    console.log(`Reminder sent for invoice #${invoice.invoice_number} to ${client.email}`);

    return true;
  } catch (error) {
    console.error(`Error sending reminder for invoice #${invoice.invoice_number}:`, error);
    return false;
  }
}

async function checkAndSendReminders() {
  try {
    console.log('Checking for invoices needing reminders...');

    // Update overdue statuses first so the query picks them up
    db.getAllInvoices(); // triggers updateOverdueInvoices internally

    const invoicesNeedingReminders = db.getInvoicesNeedingReminders();
    const templates = db.getAllReminderTemplates().filter(t => t.is_active === 1);

    if (invoicesNeedingReminders.length === 0) {
      console.log('No invoices need reminders at this time');
      return;
    }

    console.log(`Found ${invoicesNeedingReminders.length} invoice(s) needing reminders`);

    for (const invoice of invoicesNeedingReminders) {
      const client = db.getClient(invoice.client_id);

      if (!client || !client.email) {
        console.warn(`Client missing or no email for invoice #${invoice.invoice_number}, skipping reminder`);
        continue;
      }

      // daysOverdue > 0 means past due, < 0 means not yet due
      const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));

      // Find the best matching template:
      // - days_before_due > 0 means "send X days before due" (for upcoming invoices)
      // - days_before_due < 0 means "send X days after due" (for overdue invoices)
      let bestTemplate = null;

      if (daysOverdue < 0) {
        // Invoice is not yet due — match "before due" templates (positive days_before_due)
        // Pick the template whose days_before_due is closest to (but <= ) days until due
        const daysUntilDue = Math.abs(daysOverdue);
        bestTemplate = templates
          .filter(t => t.days_before_due > 0 && daysUntilDue <= t.days_before_due)
          .sort((a, b) => a.days_before_due - b.days_before_due)[0];
      } else {
        // Invoice is overdue — match "after due" templates (negative days_before_due)
        // Pick the template with the largest abs(days_before_due) that the overdue days qualifies for
        bestTemplate = templates
          .filter(t => t.days_before_due < 0 && daysOverdue >= Math.abs(t.days_before_due))
          .sort((a, b) => a.days_before_due - b.days_before_due)[0]; // most negative first = longest overdue
      }

      if (!bestTemplate) continue;

      // Check if this specific template was already sent for this invoice
      const recentReminders = db.getInvoiceReminders(invoice.id);
      const alreadySentThisTemplate = recentReminders.some(r => r.template_id === bestTemplate.id);
      if (alreadySentThisTemplate) continue;

      // Also prevent spam — no reminder if one was sent in the last 24 hours
      if (recentReminders.length > 0) {
        const lastReminder = recentReminders[0];
        const hoursSinceLastReminder = (Date.now() - new Date(lastReminder.sent_date)) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < 24) continue;
      }

      // Send the reminder
      const sent = await sendReminderEmail(invoice, bestTemplate, client);

      if (sent) {
        db.createInvoiceReminder({
          invoice_id: invoice.id,
          template_id: bestTemplate.id,
          sent_date: new Date().toISOString(),
          reminder_type: 'automatic',
          days_overdue: daysOverdue,
          status: 'sent',
          notes: `Auto-sent using template: ${bestTemplate.name}`
        });

        console.log(`Reminder recorded for invoice #${invoice.invoice_number}`);
      }
    }
  } catch (error) {
    console.error('Error in reminder scheduler:', error);
  }
}

// ========================================
// Recurring Invoice Auto-Generation
// ========================================

async function checkAndGenerateRecurringInvoices() {
  try {
    console.log('Checking for due recurring invoices...');

    const dueRecurring = db.getDueRecurringInvoices();

    if (dueRecurring.length === 0) {
      console.log('No recurring invoices due at this time');
      return;
    }

    console.log(`Found ${dueRecurring.length} recurring invoice(s) due for generation`);

    // Skip auto-generation if trial expired or invoice limit reached
    if (!isLicenseActive() && isTrialExpired()) {
      console.log('Trial expired — skipping automatic recurring invoice generation');
      return;
    }

    for (const recurring of dueRecurring) {
      try {
        // Check invoice count limit before each generation
        if (!isLicenseActive()) {
          const counts = db.getTrialCounts();
          if (counts.invoices >= TRIAL_LIMITS.invoices) {
            console.log('Trial invoice limit reached — skipping remaining recurring invoice generation');
            break;
          }
        }
        const result = db.generateInvoiceFromRecurring(recurring.id);
        if (result) {
          console.log(`Generated invoice from recurring template "${recurring.template_name || recurring.id}" for ${recurring.client_name}`);
        }
      } catch (err) {
        console.error(`Error generating recurring invoice ${recurring.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in recurring invoice scheduler:', error);
  }
}

// Reminder check timing protection
let lastReminderCheck = null;
const MIN_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Enhanced check function with duplicate prevention
const checkAndSendRemindersWithProtection = async () => {
  const now = Date.now();
  if (lastReminderCheck && (now - lastReminderCheck) < MIN_CHECK_INTERVAL) {
    console.log('Skipping reminder check - too soon since last check');
    return;
  }
  lastReminderCheck = now;
  await checkAndSendReminders();
};

// Schedule reminder checks - runs every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('Running scheduled reminder check (every 6 hours)...');
  checkAndSendRemindersWithProtection();
});

// Schedule recurring invoice checks - runs every hour
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled recurring invoice check (hourly)...');
  checkAndGenerateRecurringInvoices();
});

// Initial check is handled in app.whenReady()

// Scheduled backup checker - runs every minute to check if backup should run
let lastBackupCheck = null;

const shouldRunBackup = (settings) => {
  if (!settings || !settings.backup_enabled) return false;

  const now = new Date();
  const [scheduleHour, scheduleMinute] = (settings.backup_time || '02:00').split(':').map(Number);

  // Check if current time matches schedule time (within the same minute)
  if (now.getHours() !== scheduleHour || now.getMinutes() !== scheduleMinute) {
    return false;
  }

  // Check if we already ran a backup in this minute
  if (lastBackupCheck) {
    const timeSinceLastCheck = now - lastBackupCheck;
    if (timeSinceLastCheck < 60000) { // Less than 1 minute
      return false;
    }
  }

  // Check schedule type
  const schedule = settings.backup_schedule || 'daily';
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const dayOfMonth = now.getDate();

  if (schedule === 'weekly') {
    const scheduledDay = settings.backup_day_of_week || 0;
    if (dayOfWeek !== scheduledDay) return false;
  } else if (schedule === 'monthly') {
    const scheduledDayOfMonth = settings.backup_day_of_month || 1;
    if (dayOfMonth !== scheduledDayOfMonth) return false;
  }
  // daily runs every day at the scheduled time

  // Check if we already ran a backup today (for daily) or this period
  if (settings.backup_last_run) {
    const lastRun = new Date(settings.backup_last_run);
    const hoursSinceLastBackup = (now - lastRun) / (1000 * 60 * 60);

    if (schedule === 'daily' && hoursSinceLastBackup < 20) return false; // At least 20 hours between daily backups
    if (schedule === 'weekly' && hoursSinceLastBackup < 144) return false; // At least 6 days between weekly backups
    if (schedule === 'monthly' && hoursSinceLastBackup < 600) return false; // At least 25 days between monthly backups
  }

  return true;
};

const runScheduledBackup = async () => {
  try {
    const settings = db.getSettings();

    if (!shouldRunBackup(settings)) {
      return;
    }

    console.log('Running scheduled automatic backup...');
    lastBackupCheck = new Date();

    // Determine backup location
    const backupLocation = settings.backup_location || backup.getDefaultBackupDir();
    const filename = backup.generateBackupFilename();
    const backupPath = path.join(backupLocation, filename);

    // Ensure backup directory exists
    if (!fs.existsSync(backupLocation)) {
      fs.mkdirSync(backupLocation, { recursive: true });
    }

    // Create the backup
    await backup.createBackup(backupPath);
    console.log(`Scheduled backup created successfully: ${backupPath}`);

    // Update last run time in settings
    db.updateSettings({ backup_last_run: new Date().toISOString() });

    // Clean up old backups based on retention setting
    const retention = settings.backup_retention || 7;
    if (retention > 0) {
      cleanupOldBackups(backupLocation, retention);
    }

  } catch (error) {
    console.error('Error creating scheduled backup:', error);
  }
};

const cleanupOldBackups = (backupDir, retention) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('invoicepro-backup-') && f.endsWith('.zip'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort newest first

    // Delete files beyond retention limit
    if (files.length > retention) {
      const toDelete = files.slice(retention);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`Deleted old backup: ${file.name}`);
        } catch (err) {
          console.error(`Error deleting old backup ${file.name}:`, err);
        }
      });
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
};

// Check for scheduled backup every minute
cron.schedule('* * * * *', runScheduledBackup);

// IPC handler to manually trigger reminder check
ipcMain.handle('reminders:checkAndSend', async () => {
  try {
    if (!isLicenseActive() && isTrialExpired()) {
      const error = new Error('Your 7-day trial has expired. Activate a license to continue.');
      error.code = 'TRIAL_EXPIRED';
      throw error;
    }
    await checkAndSendReminders();
    return { success: true, message: 'Reminder check completed' };
  } catch (error) {
    console.error('Error triggering manual reminder check:', error);
    throw error;
  }
});

// IPC handler to send a single reminder email from the UI
ipcMain.handle('email:sendReminder', async (event, { invoiceId, templateId }) => {
  try {
    const invoice = db.getInvoice(invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const template = db.getReminderTemplate(templateId);
    if (!template) throw new Error('Reminder template not found');

    const client = db.getClient(invoice.client_id);
    if (!client || !client.email) throw new Error('Client has no email address');

    const sent = await sendReminderEmail(invoice, template, client);
    if (!sent) throw new Error('Failed to send email. Check your SMTP settings.');

    return { success: true };
  } catch (error) {
    console.error('Error sending manual reminder:', error);
    throw error;
  }
});
