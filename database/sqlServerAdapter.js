const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');
const { Connection: MsSqlConnection, Request: MsSqlRequest } = require('tedious');
const fs = require('fs');
const path = require('path');

/**
 * SQL Server Adapter
 * Supports MySQL, PostgreSQL, and MS SQL Server
 */
class SQLServerAdapter {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.type = config.type; // 'mysql', 'postgres', 'mssql'
    this.mssqlBusy = false; // Track if MSSQL connection is busy
    this.mssqlQueue = []; // Queue for MSSQL requests
  }

  /**
   * Test connection to SQL server
   */
  async testConnection() {
    try {
      await this.connect();
      await this.disconnect();
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Connect to SQL server
   */
  async connect() {
    if (this.connection) {
      return this.connection;
    }

    try {
      if (this.type === 'mysql') {
        this.connection = await mysql.createConnection({
          host: this.config.host,
          port: parseInt(this.config.port) || 3306,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          ssl: this.config.ssl ? {} : false
        });
      } else if (this.type === 'postgres') {
        this.connection = new PgClient({
          host: this.config.host,
          port: parseInt(this.config.port) || 5432,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          ssl: this.config.ssl ? { rejectUnauthorized: false } : false
        });
        await this.connection.connect();
      } else if (this.type === 'mssql') {
        return new Promise((resolve, reject) => {
          // Use 'master' database if no database specified (needed for creating databases)
          const targetDatabase = this.config.database || 'master';

          const config = {
            server: this.config.host,
            authentication: {
              type: 'default',
              options: {
                userName: this.config.username,
                password: this.config.password
              }
            },
            options: {
              database: targetDatabase,
              port: parseInt(this.config.port) || 1433,
              encrypt: !!this.config.ssl,
              trustServerCertificate: true,
              cryptoCredentialsDetails: { minVersion: 'TLSv1' },
              connectTimeout: 30000,
              requestTimeout: 30000,
              rowCollectionOnDone: true,
              useColumnNames: true
            }
          };

          console.log(`MSSQL connecting to ${this.config.host}:${config.options.port}, database: ${targetDatabase}`);

          this.connection = new MsSqlConnection(config);

          this.connection.on('connect', (err) => {
            if (err) {
              console.error('MSSQL connection error:', err);
              reject(err);
            } else {
              console.log('MSSQL connected successfully');
              resolve(this.connection);
            }
          });

          this.connection.on('error', (err) => {
            console.error('MSSQL error event:', err);
          });

          this.connection.connect();
        });
      }

      return this.connection;
    } catch (error) {
      console.error('Error connecting to SQL server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from SQL server
   */
  async disconnect() {
    if (!this.connection) {
      return;
    }

    try {
      if (this.type === 'mysql') {
        await this.connection.end();
      } else if (this.type === 'postgres') {
        await this.connection.end();
      } else if (this.type === 'mssql') {
        this.connection.close();
      }
      this.connection = null;
    } catch (error) {
      console.error('Error disconnecting from SQL server:', error);
    }
  }

  /**
   * Check if database exists
   */
  async databaseExists() {
    try {
      const tempConfig = { ...this.config };

      // For MSSQL, connect to 'master' database to check if target database exists
      if (this.type === 'mssql') {
        tempConfig.database = 'master';
      } else {
        delete tempConfig.database;
      }

      // Explicitly ensure type is set
      tempConfig.type = this.type;

      console.log(`Checking if database "${this.config.database}" exists (type: ${this.type})...`);

      const tempAdapter = new SQLServerAdapter(tempConfig);
      await tempAdapter.connect();

      let exists = false;

      if (this.type === 'mysql') {
        const [rows] = await tempAdapter.connection.query(
          'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
          [this.config.database]
        );
        exists = rows.length > 0;
      } else if (this.type === 'postgres') {
        const result = await tempAdapter.connection.query(
          'SELECT 1 FROM pg_database WHERE datname = $1',
          [this.config.database]
        );
        exists = result.rows.length > 0;
      } else if (this.type === 'mssql') {
        exists = await new Promise((resolve, reject) => {
          const request = new MsSqlRequest(
            `SELECT name FROM sys.databases WHERE name = '${this.config.database}'`,
            (err, rowCount) => {
              if (err) {
                console.error('Error checking database:', err);
                reject(err);
              } else {
                console.log(`Database check result: ${rowCount} rows found`);
                resolve(rowCount > 0);
              }
            }
          );
          tempAdapter.connection.execSql(request);
        });
      }

      await tempAdapter.disconnect();
      console.log(`Database "${this.config.database}" exists: ${exists}`);
      return exists;
    } catch (error) {
      console.error('Error checking if database exists:', error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Create database
   */
  async createDatabase() {
    try {
      const tempConfig = { ...this.config };

      // For MSSQL, connect to 'master' database to create new databases
      if (this.type === 'mssql') {
        tempConfig.database = 'master';
      } else {
        delete tempConfig.database;
      }

      // Explicitly ensure type is set
      tempConfig.type = this.type;

      console.log(`Creating database "${this.config.database}" (type: ${this.type})...`);

      const tempAdapter = new SQLServerAdapter(tempConfig);
      await tempAdapter.connect();

      if (this.type === 'mysql') {
        await tempAdapter.connection.query(
          `CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
      } else if (this.type === 'postgres') {
        // PostgreSQL doesn't support IF NOT EXISTS before version 9.1
        try {
          await tempAdapter.connection.query(`CREATE DATABASE "${this.config.database}"`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      } else if (this.type === 'mssql') {
        await new Promise((resolve, reject) => {
          const sql = `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${this.config.database}') CREATE DATABASE [${this.config.database}]`;
          console.log('Executing SQL:', sql);

          const request = new MsSqlRequest(sql, (err) => {
            if (err) {
              console.error('Error creating database:', err);
              reject(err);
            } else {
              console.log('Database CREATE command completed');
              resolve();
            }
          });
          tempAdapter.connection.execSql(request);
        });

        // Wait for database to be ready (MSSQL needs time to initialize the database)
        console.log('Waiting for database to be ready...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await tempAdapter.disconnect();
      console.log(`Database "${this.config.database}" created successfully`);
      return { success: true, message: 'Database created successfully' };
    } catch (error) {
      console.error('Error creating database:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Execute SQL query
   */
  async query(sql, params = []) {
    await this.connect();

    try {
      if (this.type === 'mysql') {
        const [rows] = await this.connection.query(sql, params);
        return rows;
      } else if (this.type === 'postgres') {
        const result = await this.connection.query(sql, params);
        return result.rows;
      } else if (this.type === 'mssql') {
        // MSSQL/tedious can only handle one request at a time
        // Use a queue to serialize requests
        return this.executeMssqlQuery(sql);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Execute MSSQL query with queue to prevent concurrent requests
   */
  async executeMssqlQuery(sql) {
    return new Promise((resolve, reject) => {
      const executeQuery = () => {
        this.mssqlBusy = true;
        const rows = [];
        const request = new MsSqlRequest(sql, (err) => {
          this.mssqlBusy = false;
          // Process next item in queue
          if (this.mssqlQueue.length > 0) {
            const next = this.mssqlQueue.shift();
            next();
          }
          if (err) reject(err);
          else resolve(rows);
        });

        request.on('row', (columns) => {
          const row = {};
          // With useColumnNames: true, columns is an object, not an array
          if (Array.isArray(columns)) {
            columns.forEach(column => {
              row[column.metadata.colName] = column.value;
            });
          } else {
            // columns is an object with column names as keys
            for (const [colName, column] of Object.entries(columns)) {
              row[colName] = column.value;
            }
          }
          rows.push(row);
        });

        this.connection.execSql(request);
      };

      // If connection is busy, queue the request
      if (this.mssqlBusy) {
        this.mssqlQueue.push(executeQuery);
      } else {
        executeQuery();
      }
    });
  }

  /**
   * Add missing columns to existing tables
   */
  async addMissingColumns() {
    try {
      console.log('Checking for missing columns in SQL Server...');

      // Enhanced client snapshot columns for invoices
      const invoiceClientColumns = [
        { name: 'client_name', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_email', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_phone', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'tax_id', type: 'NVARCHAR(255)', default: "''" }
      ];

      for (const column of invoiceClientColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'invoices'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE invoices ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to invoices table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to invoices:`, error.message);
        }
      }

      // All client snapshot columns for quotes
      const quoteClientColumns = [
        { name: 'client_name', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_email', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_phone', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'client_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'tax_id', type: 'NVARCHAR(255)', default: "''" }
      ];

      for (const column of quoteClientColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'quotes'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE quotes ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to quotes table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to quotes:`, error.message);
        }
      }

      // Additional invoice columns
      const invoiceExtraColumns = [
        { name: 'type', type: 'NVARCHAR(255)', default: "'invoice'" },
        { name: 'created_from_quote_id', type: 'INT', default: 'NULL' },
        { name: 'show_shipping_address', type: 'INT', default: '1' },
        { name: 'archived', type: 'INT', default: '0' },
        { name: 'discount_type', type: 'NVARCHAR(255)', default: "'none'" },
        { name: 'discount_value', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'shipping', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'adjustment', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'adjustment_label', type: 'NVARCHAR(255)', default: "''" }
      ];

      for (const column of invoiceExtraColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'invoices'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE invoices ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to invoices table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to invoices:`, error.message);
        }
      }

      // Item detail columns for invoice_items
      const invoiceItemColumns = [
        { name: 'sku', type: 'NVARCHAR(255)', default: "''" },
        { name: 'unit_of_measure', type: 'NVARCHAR(255)', default: "'Each'" },
        { name: 'discount_type', type: 'NVARCHAR(255)', default: "'none'" },
        { name: 'discount_value', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', default: '0' }
      ];

      for (const column of invoiceItemColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'invoice_items'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE invoice_items ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to invoice_items table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to invoice_items:`, error.message);
        }
      }

      // Additional quote columns
      const quoteExtraColumns = [
        { name: 'archived', type: 'INT', default: '0' },
        { name: 'converted_to_invoice_id', type: 'INT', default: 'NULL' },
        { name: 'discount_type', type: 'NVARCHAR(255)', default: "'none'" },
        { name: 'discount_value', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'shipping', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'adjustment', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'adjustment_label', type: 'NVARCHAR(255)', default: "''" }
      ];

      for (const column of quoteExtraColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'quotes'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE quotes ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to quotes table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to quotes:`, error.message);
        }
      }

      // Item detail columns for quote_items
      const quoteItemColumns = [
        { name: 'sku', type: 'NVARCHAR(255)', default: "''" },
        { name: 'unit_of_measure', type: 'NVARCHAR(255)', default: "'Each'" },
        { name: 'discount_type', type: 'NVARCHAR(255)', default: "'none'" },
        { name: 'discount_value', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', default: '0' }
      ];

      for (const column of quoteItemColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'quote_items'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE quote_items ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to quote_items table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to quote_items:`, error.message);
        }
      }

      // Enhanced client fields
      const clientEnhancedColumns = [
        { name: 'credit_limit', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'current_credit', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'payment_terms', type: 'NVARCHAR(255)', default: "'NET 30'" },
        { name: 'tax_exempt', type: 'INT', default: '0' },
        { name: 'tax_id', type: 'NVARCHAR(255)', default: "''" },
        { name: 'website', type: 'NVARCHAR(255)', default: "''" },
        { name: 'industry', type: 'NVARCHAR(255)', default: "''" },
        { name: 'company_size', type: 'NVARCHAR(255)', default: "''" },
        { name: 'account_status', type: 'NVARCHAR(255)', default: "'Active'" },
        { name: 'billing_email', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'billing_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_address', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_city', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_state', type: 'NVARCHAR(255)', default: "''" },
        { name: 'shipping_zip', type: 'NVARCHAR(255)', default: "''" },
        { name: 'contact_person', type: 'NVARCHAR(255)', default: "''" },
        { name: 'contact_title', type: 'NVARCHAR(255)', default: "''" },
        { name: 'secondary_contact', type: 'NVARCHAR(255)', default: "''" },
        { name: 'secondary_email', type: 'NVARCHAR(255)', default: "''" },
        { name: 'secondary_phone', type: 'NVARCHAR(255)', default: "''" },
        { name: 'account_manager', type: 'NVARCHAR(255)', default: "''" },
        { name: 'preferred_payment_method', type: 'NVARCHAR(255)', default: "''" },
        { name: 'default_discount_rate', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'currency', type: 'NVARCHAR(255)', default: "'USD'" },
        { name: 'language', type: 'NVARCHAR(255)', default: "'en'" },
        { name: 'tags', type: 'NVARCHAR(255)', default: "''" }
      ];

      for (const column of clientEnhancedColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'clients'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE clients ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to clients table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to clients:`, error.message);
        }
      }

      // Enhanced saved_items fields (WITHOUT inventory management)
      const savedItemEnhancedColumns = [
        { name: 'sku', type: 'NVARCHAR(255)', default: "''" },
        { name: 'barcode', type: 'NVARCHAR(255)', default: "''" },
        { name: 'unit_of_measure', type: 'NVARCHAR(255)', default: "'Each'" },
        { name: 'cost_price', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'markup_percentage', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'taxable', type: 'INT', default: '1' },
        { name: 'is_active', type: 'INT', default: '1' },
        { name: 'notes', type: 'NVARCHAR(MAX)', default: "''" }
      ];

      for (const column of savedItemEnhancedColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'saved_items'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE saved_items ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to saved_items table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to saved_items:`, error.message);
        }
      }

      // Payment gateway columns for payments table
      const paymentExtraColumns = [
        { name: 'payment_gateway', type: 'NVARCHAR(255)', default: "'manual'" },
        { name: 'transaction_id', type: 'NVARCHAR(255)', default: "''" },
        { name: 'gateway_fee', type: 'DECIMAL(10,2)', default: '0' }
      ];

      for (const column of paymentExtraColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'payments'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE payments ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to payments table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to payments:`, error.message);
        }
      }

      // Recurring invoices discount/shipping/adjustment columns
      const recurringInvoiceExtraColumns = [
        { name: 'discount_type', type: 'NVARCHAR(255)', default: "'none'" },
        { name: 'discount_value', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'shipping', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'adjustment', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'adjustment_label', type: 'NVARCHAR(255)', default: "''" }
      ];

      for (const column of recurringInvoiceExtraColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'recurring_invoices'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE recurring_invoices ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to recurring_invoices table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to recurring_invoices:`, error.message);
        }
      }

      // Recurring invoice items discount/sku/unit columns
      const recurringItemExtraColumns = [
        { name: 'discount_type', type: 'NVARCHAR(255)', default: "'none'" },
        { name: 'discount_value', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'discount_amount', type: 'DECIMAL(10,2)', default: '0' },
        { name: 'sku', type: 'NVARCHAR(255)', default: "''" },
        { name: 'unit_of_measure', type: 'NVARCHAR(255)', default: "'Each'" }
      ];

      for (const column of recurringItemExtraColumns) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'recurring_invoice_items'
            AND COLUMN_NAME = '${column.name}'
          `;
          const result = await this.query(checkQuery);

          if (result[0].count === 0) {
            const alterQuery = `ALTER TABLE recurring_invoice_items ADD ${column.name} ${column.type} DEFAULT ${column.default}`;
            await this.query(alterQuery);
            console.log(`✓ Added ${column.name} column to recurring_invoice_items table`);
          }
        } catch (error) {
          console.error(`Error adding column ${column.name} to recurring_invoice_items:`, error.message);
        }
      }

      // Credit notes archived column
      try {
        const checkQuery = `
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'credit_notes'
          AND COLUMN_NAME = 'archived'
        `;
        const result = await this.query(checkQuery);
        if (result[0].count === 0) {
          await this.query(`ALTER TABLE credit_notes ADD archived INT DEFAULT 0`);
          console.log(`✓ Added archived column to credit_notes table`);
        }
      } catch (error) {
        console.error('Error adding archived to credit_notes:', error.message);
      }

      console.log('✓ Finished checking for missing columns');
    } catch (error) {
      console.error('Error in addMissingColumns:', error.message);
    }
  }

  /**
   * Create all tables from schema
   */
  async createSchema() {
    try {
      console.log(`Creating schema in database "${this.config.database}" (type: ${this.type})...`);

      await this.connect();
      console.log('Connected to database for schema creation');

      // Add missing columns to existing tables
      await this.addMissingColumns();

      // Read SQLite schema and convert to SQL server schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      let schema = fs.readFileSync(schemaPath, 'utf8');

      // Remove single-line comments BEFORE splitting (they cause issues when attached to statements)
      schema = schema.replace(/--.*$/gm, '');

      // Convert SQLite schema to target SQL server schema
      schema = this.convertSchema(schema);

      // Split into individual statements
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`Found ${statements.length} SQL statements to execute`);

      let successCount = 0;
      let errorCount = 0;

      // Execute each statement
      for (const statement of statements) {
        if (statement.length > 0) {
          try {
            await this.query(statement);
            successCount++;
            console.log('Executed:', statement.substring(0, 80) + '...');
          } catch (error) {
            errorCount++;
            console.error('Error executing statement:', statement.substring(0, 80));
            console.error('Error:', error.message);
            // Continue with next statement
          }
        }
      }

      console.log(`Schema creation complete: ${successCount} succeeded, ${errorCount} failed`);
      await this.disconnect();

      return { success: true, message: `Schema created: ${successCount} statements executed` };
    } catch (error) {
      console.error('Error creating schema:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Convert SQLite schema to target SQL server schema
   */
  convertSchema(sqliteSchema) {
    let schema = sqliteSchema;

    if (this.type === 'mysql') {
      // Convert SQLite to MySQL
      schema = schema.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'INT AUTO_INCREMENT PRIMARY KEY');
      schema = schema.replace(/TEXT/g, 'VARCHAR(255)');
      schema = schema.replace(/REAL/g, 'DECIMAL(10,2)');
      schema = schema.replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP()');
      schema = schema.replace(/IF NOT EXISTS/g, ''); // MySQL CREATE TABLE IF NOT EXISTS is supported
      schema = schema.replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ');
    } else if (this.type === 'postgres') {
      // Convert SQLite to PostgreSQL
      schema = schema.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
      schema = schema.replace(/AUTOINCREMENT/g, '');
      schema = schema.replace(/INTEGER/g, 'INT');
      schema = schema.replace(/REAL/g, 'DECIMAL(10,2)');
    } else if (this.type === 'mssql') {
      // Convert SQLite to MS SQL Server
      schema = schema.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'INT IDENTITY(1,1) PRIMARY KEY');
      schema = schema.replace(/AUTOINCREMENT/g, '');
      schema = schema.replace(/INTEGER/g, 'INT');
      schema = schema.replace(/REAL/g, 'DECIMAL(10,2)');

      // MSSQL: Use NVARCHAR(255) for most TEXT columns (can be indexed/unique)
      // Only use NVARCHAR(MAX) for large text fields like notes, body, details, address, etc.
      // First, convert all TEXT to NVARCHAR(255)
      schema = schema.replace(/TEXT/g, 'NVARCHAR(255)');

      // Then convert specific large text columns back to NVARCHAR(MAX)
      // These are columns that might contain large amounts of text
      // Note: email, customer_number, item_number must stay NVARCHAR(255) for indexing
      const largeTextColumns = [
        'notes', 'body', 'details', 'address', 'terms',
        'payment_terms', 'bank_details', 'logo_url', 'receipt_url',
        'user_agent', 'password_hash', 'tab_configuration',
        'email_subject_template', 'email_body_template', 'default_notes',
        'invoice_footer'
      ];
      for (const col of largeTextColumns) {
        // Match column definitions like: column_name NVARCHAR(255)
        const regex = new RegExp(`(${col}\\s+)NVARCHAR\\(255\\)`, 'gi');
        schema = schema.replace(regex, '$1NVARCHAR(MAX)');
      }

      // MSSQL doesn't support IF NOT EXISTS for CREATE TABLE - wrap in conditional
      // First remove any existing IF NOT EXISTS (from SQLite)
      schema = schema.replace(/IF NOT EXISTS\s*/gi, '');

      // Replace CREATE TABLE with IF NOT EXISTS wrapper using sysobjects
      schema = schema.replace(/CREATE TABLE\s+(\w+)\s*\(/gi, (match, tableName) => {
        return `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${tableName}' AND xtype='U') CREATE TABLE ${tableName} (`;
      });

      // Remove ALL INSERT statements FIRST (including INSERT OR IGNORE)
      // They cause IDENTITY_INSERT issues and duplicate key errors
      schema = schema.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+\w+[\s\S]*?;/gi, '');
      schema = schema.replace(/INSERT\s+INTO\s+\w+[\s\S]*?;/gi, '');

      // Remove indexes on expenses table (table was removed from schema)
      schema = schema.replace(/CREATE\s+(?:UNIQUE\s+)?INDEX.*?ON\s+expenses\s*\([^)]+\).*?;/gi, '');

      // Remove indexes on columns that may be NVARCHAR(MAX) in existing databases
      // These will fail if the table already exists with wrong column types
      const problematicIndexes = [
        'idx_clients_email',
        'idx_clients_customer_number',
        'idx_saved_items_item_number'
      ];
      for (const idx of problematicIndexes) {
        const regex = new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX.*?${idx}.*?;`, 'gi');
        schema = schema.replace(regex, '');
      }

      // MSSQL doesn't support UNIQUE INDEX with WHERE clause the same way
      // Convert partial unique indexes to regular indexes with IF NOT EXISTS
      schema = schema.replace(/CREATE UNIQUE INDEX\s+(\w+)\s+ON\s+(\w+)\((\w+)\)\s+WHERE\s+\w+\s+IS\s+NOT\s+NULL/gi,
        "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='$1') CREATE INDEX $1 ON $2($3)");

      // Wrap regular CREATE INDEX with IF NOT EXISTS
      schema = schema.replace(/CREATE INDEX\s+(\w+)\s+ON\s+(\w+)\((\w+)\)/gi, (match, indexName, tableName, columnName) => {
        return `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='${indexName}') CREATE INDEX ${indexName} ON ${tableName}(${columnName})`;
      });

      // MSSQL uses different default timestamp syntax
      schema = schema.replace(/DEFAULT CURRENT_TIMESTAMP/g, 'DEFAULT GETDATE()');
    }

    // Remove SQLite-specific pragmas
    schema = schema.replace(/PRAGMA.*/g, '');

    // Handle INSERT statements for non-MSSQL databases
    if (this.type === 'mysql') {
      schema = schema.replace(/INSERT OR IGNORE/g, 'INSERT IGNORE');
    } else if (this.type === 'postgres') {
      // For Postgres, just use INSERT (will fail on duplicates but that's ok)
      schema = schema.replace(/INSERT OR IGNORE/g, 'INSERT');
    }

    return schema;
  }

  // ==================== CRUD Operations ====================

  /**
   * Get all rows from a table
   */
  async getAll(table, orderBy = 'id') {
    await this.connect();
    return this.query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
  }

  /**
   * Get a single row by ID
   */
  async getById(table, id) {
    await this.connect();
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ${id}`);
    return rows[0] || null;
  }

  /**
   * Insert a row into a table
   */
  async insert(table, data) {
    await this.connect();
    const columns = Object.keys(data).filter(k => data[k] !== undefined);
    const values = columns.map(k => {
      const v = data[k];
      if (v === null) return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    });

    // Use OUTPUT INSERTED.id to get the ID in the same query
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) OUTPUT INSERTED.id VALUES (${values.join(', ')})`;
    const result = await this.query(sql);

    // Return the inserted ID in the same format as SQLite
    const insertedId = result[0]?.id;
    if (!insertedId) {
      console.error('Failed to get inserted ID for table:', table);
      throw new Error('Failed to get inserted ID after insert');
    }
    return { lastInsertRowid: insertedId };
  }

  /**
   * Update a row in a table
   */
  async update(table, id, data) {
    await this.connect();
    const updates = Object.keys(data)
      .filter(k => data[k] !== undefined && k !== 'id')
      .map(k => {
        const v = data[k];
        if (v === null) return `${k} = NULL`;
        if (typeof v === 'number') return `${k} = ${v}`;
        return `${k} = '${String(v).replace(/'/g, "''")}'`;
      });

    if (updates.length === 0) return { changes: 0 };

    const sql = `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ${id}`;
    await this.query(sql);
    return { changes: 1 };
  }

  /**
   * Delete a row from a table
   */
  async delete(table, id) {
    await this.connect();
    await this.query(`DELETE FROM ${table} WHERE id = ${id}`);
    return { changes: 1 };
  }

  /**
   * Execute a custom query with parameters
   */
  async queryWithParams(sql, params = []) {
    await this.connect();
    // Simple parameter replacement (not ideal for production, but works for this use case)
    let processedSql = sql;
    params.forEach((param, index) => {
      const placeholder = `@p${index}`;
      const value = param === null ? 'NULL' :
                    typeof param === 'number' ? param :
                    `'${String(param).replace(/'/g, "''")}'`;
      processedSql = processedSql.replace('?', value);
    });
    return this.query(processedSql);
  }

  // ==================== Client Operations ====================

  async getAllClients() {
    return this.getAll('clients', 'name');
  }

  async getClient(id) {
    return this.getById('clients', id);
  }

  async createClient(client) {
    return this.insert('clients', client);
  }

  async updateClient(id, client) {
    return this.update('clients', id, client);
  }

  async deleteClient(id) {
    return this.delete('clients', id);
  }

  // ==================== Invoice Operations ====================

  async getAllInvoices() {
    await this.connect();
    return this.query(`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.archived = 0
      ORDER BY i.created_at DESC
    `);
  }

  async getArchivedInvoices() {
    await this.connect();
    return this.query(`
      SELECT i.*, c.name as client_name, c.email as client_email
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.archived = 1
      ORDER BY i.created_at DESC
    `);
  }

  async getInvoice(id) {
    return this.getById('invoices', id);
  }

  async createInvoice(invoice) {
    try {
      // Check if client snapshot columns exist
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'invoices'
        AND COLUMN_NAME = 'client_name'
      `;
      const result = await this.query(checkQuery);
      const hasClientColumns = result[0].count > 0;

      if (hasClientColumns) {
        // Get client info to snapshot at time of invoice creation
        const client = await this.query(`SELECT * FROM clients WHERE id = ${invoice.client_id}`);
        const clientData = client[0];

        // Add client snapshot to invoice data
        const invoiceWithClient = {
          ...invoice,
          client_name: clientData?.name || '',
          client_email: clientData?.email || '',
          client_phone: clientData?.phone || '',
          client_address: clientData?.address || '',
          client_city: clientData?.city || '',
          client_state: clientData?.state || '',
          client_zip: clientData?.zip || ''
        };

        return this.insert('invoices', invoiceWithClient);
      } else {
        // Columns don't exist yet, insert without client snapshot
        console.warn('Client snapshot columns not found, inserting invoice without client info');
        return this.insert('invoices', invoice);
      }
    } catch (error) {
      console.error('Error in createInvoice:', error);
      // Fallback: try inserting without client snapshot
      return this.insert('invoices', invoice);
    }
  }

  async updateInvoice(id, invoice) {
    return this.update('invoices', id, invoice);
  }

  async deleteInvoice(id) {
    await this.connect();
    await this.query(`DELETE FROM invoice_items WHERE invoice_id = ${id}`);
    return this.delete('invoices', id);
  }

  async archiveInvoice(id) {
    return this.update('invoices', id, { archived: 1 });
  }

  async restoreInvoice(id) {
    return this.update('invoices', id, { archived: 0 });
  }

  // ==================== Invoice Items Operations ====================

  async getInvoiceItems(invoiceId) {
    await this.connect();
    return this.query(`SELECT * FROM invoice_items WHERE invoice_id = ${invoiceId}`);
  }

  async createInvoiceItem(item) {
    return this.insert('invoice_items', item);
  }

  async deleteInvoiceItems(invoiceId) {
    await this.connect();
    await this.query(`DELETE FROM invoice_items WHERE invoice_id = ${invoiceId}`);
    return { changes: 1 };
  }

  // ==================== Saved Items Operations ====================

  async getAllSavedItems() {
    return this.getAll('saved_items', 'description');
  }

  async getSavedItem(id) {
    return this.getById('saved_items', id);
  }

  async createSavedItem(item) {
    return this.insert('saved_items', item);
  }

  async updateSavedItem(id, item) {
    return this.update('saved_items', id, item);
  }

  async deleteSavedItem(id) {
    return this.delete('saved_items', id);
  }

  // ==================== Payment Operations ====================

  async getPaymentsByInvoice(invoiceId) {
    await this.connect();
    return this.query(`SELECT * FROM payments WHERE invoice_id = ${invoiceId} ORDER BY payment_date DESC`);
  }

  async createPayment(payment) {
    return this.insert('payments', payment);
  }

  async deletePayment(id) {
    return this.delete('payments', id);
  }

  // ==================== Quote Operations ====================

  async getAllQuotes() {
    await this.connect();
    return this.query(`
      SELECT q.*, c.name as client_name, c.email as client_email
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.archived = 0
      ORDER BY q.created_at DESC
    `);
  }

  async getQuote(id) {
    return this.getById('quotes', id);
  }

  async createQuote(quote) {
    return this.insert('quotes', quote);
  }

  async updateQuote(id, quote) {
    return this.update('quotes', id, quote);
  }

  async deleteQuote(id) {
    await this.connect();
    await this.query(`DELETE FROM quote_items WHERE quote_id = ${id}`);
    return this.delete('quotes', id);
  }

  async archiveQuote(id) {
    return this.update('quotes', id, { archived: 1 });
  }

  async restoreQuote(id) {
    return this.update('quotes', id, { archived: 0 });
  }

  async convertQuoteToInvoice(quoteId) {
    await this.connect();

    // Get the quote
    const quotes = await this.query(`SELECT * FROM quotes WHERE id = ${quoteId}`);
    const quote = quotes[0];
    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.converted_to_invoice_id) {
      throw new Error('Quote has already been converted to an invoice');
    }

    // Generate a unique invoice number
    let prefix = 'INV-';
    try {
      const settings = await this.query(`SELECT * FROM settings WHERE id = 1`);
      if (settings[0]?.invoice_prefix) {
        prefix = settings[0].invoice_prefix;
      }
    } catch (e) {
      // settings table may not exist in SQL Server, use default prefix
    }

    const lastInvoices = await this.query(
      `SELECT TOP 1 invoice_number FROM invoices WHERE invoice_number LIKE '${prefix.replace(/'/g, "''")}%' ORDER BY id DESC`
    );

    let newInvoiceNumber;
    if (!lastInvoices[0]) {
      newInvoiceNumber = `${prefix}101001`;
    } else {
      const lastNumber = parseInt(lastInvoices[0].invoice_number.replace(prefix, ''));
      const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
      newInvoiceNumber = `${prefix}${nextNumber}`;
    }

    // Check uniqueness
    const existing = await this.query(
      `SELECT id FROM invoices WHERE invoice_number = '${newInvoiceNumber.replace(/'/g, "''")}'`
    );
    if (existing.length > 0) {
      const timestamp = Date.now().toString().slice(-4);
      newInvoiceNumber = `${newInvoiceNumber}-${timestamp}`;
    }

    const today = new Date().toISOString().split('T')[0];
    const dueDate = quote.expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create the invoice
    const invoiceData = {
      invoice_number: newInvoiceNumber,
      client_id: quote.client_id,
      created_from_quote_id: quoteId,
      date: today,
      due_date: dueDate,
      status: 'draft',
      subtotal: quote.subtotal || 0,
      tax: quote.tax || 0,
      discount_type: quote.discount_type || 'none',
      discount_value: quote.discount_value || 0,
      discount_amount: quote.discount_amount || 0,
      shipping: quote.shipping || 0,
      adjustment: quote.adjustment || 0,
      adjustment_label: quote.adjustment_label || '',
      total: quote.total || 0,
      notes: quote.notes || '',
      payment_terms: quote.terms || '',
      client_name: quote.client_name || '',
      client_email: quote.client_email || '',
      client_phone: quote.client_phone || '',
      client_address: quote.client_address || '',
      client_city: quote.client_city || '',
      client_state: quote.client_state || '',
      client_zip: quote.client_zip || '',
      billing_address: quote.billing_address || '',
      billing_city: quote.billing_city || '',
      billing_state: quote.billing_state || '',
      billing_zip: quote.billing_zip || '',
      shipping_address: quote.shipping_address || '',
      shipping_city: quote.shipping_city || '',
      shipping_state: quote.shipping_state || '',
      shipping_zip: quote.shipping_zip || '',
      tax_id: quote.tax_id || ''
    };

    const result = await this.insert('invoices', invoiceData);
    const invoiceId = result.lastInsertRowid;

    // Copy quote items to invoice items
    const quoteItems = await this.query(`SELECT * FROM quote_items WHERE quote_id = ${quoteId}`);
    for (const item of quoteItems) {
      await this.insert('invoice_items', {
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount_type: item.discount_type || 'none',
        discount_value: item.discount_value || 0,
        discount_amount: item.discount_amount || 0,
        amount: item.amount,
        sku: item.sku || '',
        unit_of_measure: item.unit_of_measure || 'Each'
      });
    }

    // Mark the quote as converted
    await this.update('quotes', quoteId, {
      converted_to_invoice_id: invoiceId,
      status: 'accepted'
    });

    // Return the created invoice
    const invoices = await this.query(`SELECT * FROM invoices WHERE id = ${invoiceId}`);
    return { success: true, invoice: invoices[0], invoiceNumber: newInvoiceNumber };
  }

  // ==================== Credit Note Operations ====================

  async getAllCreditNotes() {
    await this.connect();
    return this.query(`
      SELECT cn.*, c.name as client_name, i.invoice_number
      FROM credit_notes cn
      LEFT JOIN clients c ON cn.client_id = c.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      WHERE cn.archived = 0
      ORDER BY cn.created_at DESC
    `);
  }

  async getCreditNote(id) {
    return this.getById('credit_notes', id);
  }

  async createCreditNote(creditNote) {
    return this.insert('credit_notes', creditNote);
  }

  async updateCreditNote(id, creditNote) {
    return this.update('credit_notes', id, creditNote);
  }

  async deleteCreditNote(id) {
    await this.connect();
    await this.query(`DELETE FROM credit_note_items WHERE credit_note_id = ${id}`);
    return this.delete('credit_notes', id);
  }

  // ==================== Backup/Restore Operations ====================

  /**
   * Clear all tables for restore (handles foreign key constraints)
   */
  async clearAllTables(tablesToClear) {
    await this.connect();

    // Disable foreign key constraints
    if (this.type === 'mssql') {
      // Disable all constraints
      for (const table of tablesToClear) {
        try {
          await this.query(`ALTER TABLE ${table} NOCHECK CONSTRAINT ALL`);
        } catch (e) {
          console.log(`Could not disable constraints for ${table}:`, e.message);
        }
      }
    } else if (this.type === 'mysql') {
      await this.query('SET FOREIGN_KEY_CHECKS = 0');
    } else if (this.type === 'postgres') {
      await this.query('SET session_replication_role = replica');
    }

    // Clear tables in reverse order
    for (const table of [...tablesToClear].reverse()) {
      if (table === 'settings') continue; // Don't clear settings
      try {
        await this.query(`DELETE FROM ${table}`);
        console.log(`Cleared table ${table}`);
      } catch (e) {
        console.log(`Could not clear ${table}:`, e.message);
      }
    }

    // Re-enable foreign key constraints
    if (this.type === 'mssql') {
      for (const table of tablesToClear) {
        try {
          await this.query(`ALTER TABLE ${table} CHECK CONSTRAINT ALL`);
        } catch (e) {
          console.log(`Could not enable constraints for ${table}:`, e.message);
        }
      }
    } else if (this.type === 'mysql') {
      await this.query('SET FOREIGN_KEY_CHECKS = 1');
    } else if (this.type === 'postgres') {
      await this.query('SET session_replication_role = DEFAULT');
    }
  }

  /**
   * Import data from parsed CSV rows into a table
   */
  async importTableData(tableName, rows) {
    if (!rows || rows.length === 0) {
      console.log(`No data to import for table ${tableName}`);
      return 0;
    }

    await this.connect();
    const columns = Object.keys(rows[0]);
    let importedCount = 0;

    // For MSSQL, check if we need IDENTITY_INSERT (when 'id' column is present)
    const needsIdentityInsert = this.type === 'mssql' && columns.includes('id');

    for (const row of rows) {
      try {
        const values = columns.map(col => {
          const value = row[col];
          if (value === '' || value === 'NULL' || value === null || value === undefined) {
            return null;
          }
          return value;
        });

        // Build INSERT statement
        const columnNames = columns.join(', ');
        const valuePlaceholders = values.map(v => {
          if (v === null) return 'NULL';
          if (typeof v === 'number') return v;
          // Escape single quotes
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');

        let sql;
        if (needsIdentityInsert) {
          // For MSSQL with identity columns, wrap INSERT with IDENTITY_INSERT ON/OFF
          // This must be in the same batch for the setting to take effect
          sql = `SET IDENTITY_INSERT ${tableName} ON; INSERT INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders}); SET IDENTITY_INSERT ${tableName} OFF;`;
        } else {
          sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${valuePlaceholders})`;
        }

        await this.query(sql);
        importedCount++;
      } catch (rowError) {
        console.error(`Error inserting row into ${tableName}:`, rowError.message);
      }
    }

    console.log(`Imported ${importedCount} rows into ${tableName}`);
    return importedCount;
  }

  /**
   * Get all data from a table (for backup)
   */
  async getTableData(tableName) {
    await this.connect();
    return this.query(`SELECT * FROM ${tableName}`);
  }
}

module.exports = SQLServerAdapter;
