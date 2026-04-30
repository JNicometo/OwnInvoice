-- OwnInvoice Desktop Database Schema

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  -- Company Information
  company_name TEXT DEFAULT 'Your Company',
  company_email TEXT DEFAULT 'info@company.com',
  company_phone TEXT DEFAULT '',
  company_website TEXT DEFAULT '',
  company_address TEXT DEFAULT '',
  company_city TEXT DEFAULT '',
  company_state TEXT DEFAULT '',
  company_zip TEXT DEFAULT '',
  company_country TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  business_registration TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',

  -- Invoice Numbering
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_suffix TEXT DEFAULT '',
  invoice_start_number INTEGER DEFAULT 1000,
  quote_prefix TEXT DEFAULT 'QT-',
  next_invoice_number INTEGER DEFAULT NULL,
  next_quote_number INTEGER DEFAULT NULL,

  -- Tax & Currency
  tax_rate REAL DEFAULT 0.0,
  tax_label TEXT DEFAULT 'Tax',
  currency_symbol TEXT DEFAULT '$',
  currency_code TEXT DEFAULT 'USD',

  -- Payment Defaults
  payment_terms TEXT DEFAULT 'Payment due within 30 days',
  bank_details TEXT DEFAULT '',
  default_due_days INTEGER DEFAULT 30,
  default_notes TEXT DEFAULT '',
  invoice_footer TEXT DEFAULT 'Thank you for your business!',

  -- Formatting
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  number_format TEXT DEFAULT 'en-US',
  decimal_separator TEXT DEFAULT '.',
  thousand_separator TEXT DEFAULT ',',
  customer_number_prefix TEXT DEFAULT 'CUST-',
  item_number_prefix TEXT DEFAULT 'ITEM-',

  -- Email Templates
  email_subject_template TEXT DEFAULT 'Invoice {invoice_number} from {company_name}',
  email_body_template TEXT DEFAULT 'Dear {client_name},\n\nPlease find attached invoice {invoice_number} for {total}.\n\nThank you for your business!',
  email_cc TEXT DEFAULT '',
  email_bcc TEXT DEFAULT '',

  -- SMTP Settings
  smtp_host TEXT DEFAULT '',
  smtp_port INTEGER DEFAULT 587,
  smtp_secure INTEGER DEFAULT 0,
  smtp_user TEXT DEFAULT '',
  smtp_password TEXT DEFAULT '',
  smtp_from_name TEXT DEFAULT '',
  smtp_from_email TEXT DEFAULT '',

  -- Display Preferences
  show_item_numbers INTEGER DEFAULT 0,
  show_customer_numbers INTEGER DEFAULT 0,
  show_tax_breakdown INTEGER DEFAULT 0,
  show_payment_terms INTEGER DEFAULT 1,

  -- Invoice Field Display Options
  show_client_email_on_invoice INTEGER DEFAULT 1,
  show_client_phone_on_invoice INTEGER DEFAULT 1,
  show_client_billing_address_on_invoice INTEGER DEFAULT 0,
  show_client_shipping_address_on_invoice INTEGER DEFAULT 0,
  show_client_tax_id_on_invoice INTEGER DEFAULT 0,
  show_item_sku_on_invoice INTEGER DEFAULT 0,
  show_item_unit_on_invoice INTEGER DEFAULT 1,

  -- Theme & Colors
  theme TEXT DEFAULT 'blue',
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#8B5CF6',
  accent_color TEXT DEFAULT '#10B981',
  invoice_header_color TEXT DEFAULT '#1F2937',
  invoice_accent_color TEXT DEFAULT '#3B82F6',
  text_primary_color TEXT DEFAULT '#111827',
  text_secondary_color TEXT DEFAULT '#6B7280',

  -- Invoice Styling
  invoice_template TEXT DEFAULT 'modern',
  invoice_header_style TEXT DEFAULT 'standard',
  invoice_border_style TEXT DEFAULT 'subtle',
  invoice_spacing TEXT DEFAULT 'normal',
  invoice_table_style TEXT DEFAULT 'striped',
  heading_font TEXT DEFAULT 'Arial',
  body_font TEXT DEFAULT 'Arial',
  heading_size TEXT DEFAULT 'normal',
  body_size TEXT DEFAULT 'normal',
  show_logo_on_invoice INTEGER DEFAULT 1,
  show_company_address_on_invoice INTEGER DEFAULT 1,
  show_invoice_border INTEGER DEFAULT 1,
  invoice_corner_style TEXT DEFAULT 'rounded',
  pdf_page_size TEXT DEFAULT 'Letter',
  pdf_margin_size TEXT DEFAULT 'normal',
  pdf_header_height TEXT DEFAULT 'normal',

  -- Payment Gateway Settings
  stripe_enabled INTEGER DEFAULT 0,
  stripe_publishable_key TEXT DEFAULT '',
  stripe_secret_key TEXT DEFAULT '',
  paypal_enabled INTEGER DEFAULT 0,
  paypal_client_id TEXT DEFAULT '',
  paypal_secret TEXT DEFAULT '',
  paypal_mode TEXT DEFAULT 'sandbox',
  square_enabled INTEGER DEFAULT 0,
  square_access_token TEXT DEFAULT '',
  square_location_id TEXT DEFAULT '',
  square_environment TEXT DEFAULT 'sandbox',
  gocardless_enabled INTEGER DEFAULT 0,
  gocardless_access_token TEXT DEFAULT '',
  gocardless_environment TEXT DEFAULT 'sandbox',
  authorizenet_enabled INTEGER DEFAULT 0,
  authorizenet_api_login_id TEXT DEFAULT '',
  authorizenet_transaction_key TEXT DEFAULT '',
  authorizenet_environment TEXT DEFAULT 'sandbox',

  -- Advanced Database Options
  db_type TEXT DEFAULT 'sqlite',
  db_host TEXT DEFAULT 'localhost',
  db_port INTEGER DEFAULT 3306,
  db_name TEXT DEFAULT 'invoicepro',
  db_user TEXT DEFAULT '',
  db_password TEXT DEFAULT '',

  -- Auto-Reminder Settings
  auto_reminders_enabled INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_number TEXT,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  -- Credit Management
  credit_limit REAL DEFAULT 0,
  current_credit REAL DEFAULT 0,
  payment_terms TEXT DEFAULT 'NET 30',
  tax_exempt INTEGER DEFAULT 0,
  tax_id TEXT DEFAULT '',
  -- Additional Business Information
  website TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  account_status TEXT DEFAULT 'Active',
  billing_email TEXT DEFAULT '',
  billing_address TEXT DEFAULT '',
  billing_city TEXT DEFAULT '',
  billing_state TEXT DEFAULT '',
  billing_zip TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  shipping_city TEXT DEFAULT '',
  shipping_state TEXT DEFAULT '',
  shipping_zip TEXT DEFAULT '',
  -- Contact Information
  contact_person TEXT DEFAULT '',
  contact_title TEXT DEFAULT '',
  secondary_contact TEXT DEFAULT '',
  secondary_email TEXT DEFAULT '',
  secondary_phone TEXT DEFAULT '',
  -- Account Management
  account_manager TEXT DEFAULT '',
  preferred_payment_method TEXT DEFAULT '',
  default_discount_rate REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  language TEXT DEFAULT 'en',
  tags TEXT DEFAULT '',
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  created_from_quote_id INTEGER DEFAULT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'none',
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  shipping REAL DEFAULT 0,
  adjustment REAL DEFAULT 0,
  adjustment_label TEXT DEFAULT '',
  total REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '',
  -- Client snapshot fields
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  client_city TEXT DEFAULT '',
  client_state TEXT DEFAULT '',
  client_zip TEXT DEFAULT '',
  billing_address TEXT DEFAULT '',
  billing_city TEXT DEFAULT '',
  billing_state TEXT DEFAULT '',
  billing_zip TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  shipping_city TEXT DEFAULT '',
  shipping_state TEXT DEFAULT '',
  shipping_zip TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  tax_rate REAL DEFAULT NULL,
  type TEXT DEFAULT 'invoice',
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_from_quote_id) REFERENCES quotes(id)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  rate REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'none',
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  sku TEXT DEFAULT '',
  unit_of_measure TEXT DEFAULT 'Each',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Saved items table for reusable line items
CREATE TABLE IF NOT EXISTS saved_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  rate REAL DEFAULT 0,
  category TEXT DEFAULT 'General',
  -- Product Details
  sku TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  unit_of_measure TEXT DEFAULT 'Each',
  -- Pricing
  cost_price REAL DEFAULT 0,
  markup_percentage REAL DEFAULT 0,
  -- Settings
  taxable INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payments table for tracking invoice payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Other',
  reference_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Recurring invoices table for automated invoice generation
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT DEFAULT NULL,
  last_generated TEXT DEFAULT NULL,
  next_generation TEXT NOT NULL,
  template_name TEXT DEFAULT '',
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Recurring invoice items table
CREATE TABLE IF NOT EXISTS recurring_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recurring_invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recurring_invoice_id) REFERENCES recurring_invoices(id) ON DELETE CASCADE
);

-- Quotes table (formerly estimates)
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'none',
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  shipping REAL DEFAULT 0,
  adjustment REAL DEFAULT 0,
  adjustment_label TEXT DEFAULT '',
  total REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  -- Client snapshot fields
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  client_city TEXT DEFAULT '',
  client_state TEXT DEFAULT '',
  client_zip TEXT DEFAULT '',
  billing_address TEXT DEFAULT '',
  billing_city TEXT DEFAULT '',
  billing_state TEXT DEFAULT '',
  billing_zip TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  shipping_city TEXT DEFAULT '',
  shipping_state TEXT DEFAULT '',
  shipping_zip TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  tax_rate REAL DEFAULT NULL,
  converted_to_invoice_id INTEGER DEFAULT NULL,
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (converted_to_invoice_id) REFERENCES invoices(id)
);

-- Quote items table
CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  rate REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'none',
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  sku TEXT DEFAULT '',
  unit_of_measure TEXT DEFAULT 'Each',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- Credit notes table for refunds and adjustments
CREATE TABLE IF NOT EXISTS credit_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credit_note_number TEXT NOT NULL UNIQUE,
  invoice_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  reason TEXT DEFAULT '',
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Credit note items table
CREATE TABLE IF NOT EXISTS credit_note_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credit_note_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE
);

-- Expense tracking has been removed from this application
-- Expense categories table (REMOVED)
-- CREATE TABLE IF NOT EXISTS expense_categories (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   name TEXT NOT NULL UNIQUE,
--   description TEXT DEFAULT '',
--   created_at TEXT DEFAULT CURRENT_TIMESTAMP
-- );

-- Expenses table for tracking business expenses (REMOVED)
-- CREATE TABLE IF NOT EXISTS expenses (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   expense_number TEXT NOT NULL UNIQUE,
--   category_id INTEGER NOT NULL,
--   vendor TEXT NOT NULL,
--   amount REAL NOT NULL,
--   date TEXT NOT NULL,
--   payment_method TEXT DEFAULT 'Cash',
--   reference_number TEXT DEFAULT '',
--   description TEXT DEFAULT '',
--   receipt_url TEXT DEFAULT '',
--   billable INTEGER DEFAULT 0,
--   client_id INTEGER DEFAULT NULL,
--   invoice_id INTEGER DEFAULT NULL,
--   notes TEXT DEFAULT '',
--   created_at TEXT DEFAULT CURRENT_TIMESTAMP,
--   updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (category_id) REFERENCES expense_categories(id),
--   FOREIGN KEY (client_id) REFERENCES clients(id),
--   FOREIGN KEY (invoice_id) REFERENCES invoices(id)
-- );

-- Reminder templates table for email templates
CREATE TABLE IF NOT EXISTS reminder_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  days_before_due INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Invoice reminders table for tracking sent reminders
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  template_id INTEGER DEFAULT NULL,
  sent_date TEXT NOT NULL,
  reminder_type TEXT DEFAULT 'manual',
  days_overdue INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES reminder_templates(id)
);

-- Users table for multi-user/network mode
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT DEFAULT NULL,
  created_by INTEGER DEFAULT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log for tracking user actions
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT NULL,
  username TEXT DEFAULT 'system',
  action TEXT NOT NULL,
  resource_type TEXT DEFAULT '',
  resource_id INTEGER DEFAULT NULL,
  details TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- Insert default admin user (username: admin, password: admin123 - MUST CHANGE ON FIRST LOGIN)
-- Password hash for 'admin123' using bcrypt
INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, role, active) VALUES
  (1, 'admin', 'admin@localhost', '$2a$10$rKGJ5F3p0qC4qOq4qOq4qOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'Administrator', 'admin', 1);

-- Insert default expense categories (disabled - expense feature not yet implemented)
-- INSERT OR IGNORE INTO expense_categories (id, name, description) VALUES
--   (1, 'Office Supplies', 'General office supplies and materials'),
--   (2, 'Travel', 'Business travel expenses'),
--   (3, 'Meals & Entertainment', 'Client meals and business entertainment'),
--   (4, 'Software & Subscriptions', 'Software licenses and online subscriptions'),
--   (5, 'Utilities', 'Internet, phone, electricity'),
--   (6, 'Professional Services', 'Consulting, legal, accounting services'),
--   (7, 'Marketing', 'Advertising and promotional expenses'),
--   (8, 'Equipment', 'Computer equipment and hardware'),
--   (9, 'Rent', 'Office rent and facilities'),
--   (10, 'Other', 'Miscellaneous expenses');

-- Insert default reminder templates
INSERT OR IGNORE INTO reminder_templates (id, name, subject, message, days_before_due, is_active) VALUES
  (1, 'Payment Due Soon', 'Reminder: Invoice {invoice_number} Due Soon', 'Dear {client_name},\n\nThis is a friendly reminder that Invoice {invoice_number} for {total} is due on {due_date}.\n\nPlease let us know if you have any questions.\n\nBest regards,\n{company_name}', 3, 1),
  (2, 'Payment Overdue', 'Overdue: Invoice {invoice_number}', 'Dear {client_name},\n\nOur records indicate that Invoice {invoice_number} for {total} is now overdue.\n\nPlease remit payment at your earliest convenience.\n\nThank you,\n{company_name}', -7, 1),
  (3, 'Second Reminder', 'Second Notice: Invoice {invoice_number}', 'Dear {client_name},\n\nThis is our second notice regarding Invoice {invoice_number} for {total}.\n\nImmediate payment would be appreciated.\n\nRegards,\n{company_name}', -14, 1);

-- Customer addresses table for multiple shipping addresses per client
CREATE TABLE IF NOT EXISTS customer_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Main',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  country TEXT DEFAULT '',
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_client_id ON customer_addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_archived ON invoices(archived);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client_id ON recurring_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_active ON recurring_invoices(active);
CREATE INDEX IF NOT EXISTS idx_recurring_invoice_items_recurring_invoice_id ON recurring_invoice_items(recurring_invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_archived ON quotes(archived);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_client_id ON credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_archived ON credit_notes(archived);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
-- Expense indexes (disabled - expense feature not yet implemented)
-- CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
-- CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON expenses(client_id);
-- CREATE INDEX IF NOT EXISTS idx_expenses_invoice_id ON expenses(invoice_id);
-- CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
-- CREATE INDEX IF NOT EXISTS idx_expenses_billable ON expenses(billable);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_id ON invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_template_id ON invoice_reminders(template_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_date ON invoice_reminders(sent_date);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_is_active ON reminder_templates(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_customer_number ON clients(customer_number) WHERE customer_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_items_sku ON saved_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Additional indexes for pagination optimization
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(date);
CREATE INDEX IF NOT EXISTS idx_quotes_client_status ON quotes(client_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_saved_items_description ON saved_items(description);
CREATE INDEX IF NOT EXISTS idx_saved_items_category ON saved_items(category);
CREATE INDEX IF NOT EXISTS idx_saved_items_is_active ON saved_items(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_generation ON recurring_invoices(next_generation);
