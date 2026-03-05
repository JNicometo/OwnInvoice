const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const db = require('./db');
const Papa = require('papaparse');

/**
 * Check if SQL Server is being used
 */
function isUsingSqlServer() {
  return db.isUsingSqlServer();
}

/**
 * Get SQL Server adapter if enabled
 */
function getSqlServerAdapter() {
  return db.getSqlServerAdapter();
}

// Tables to backup - includes all current tables
const TABLES_TO_BACKUP = [
  'settings',
  'clients',
  'invoices',
  'invoice_items',
  'saved_items',
  'payments',
  'recurring_invoices',
  'recurring_invoice_items',
  'quotes',
  'quote_items',
  'credit_notes',
  'credit_note_items',
  'reminder_templates',
  'invoice_reminders',
  'users',
  'sessions',
  'audit_log'
];

/**
 * Convert database rows to CSV format
 */
function rowsToCSV(rows) {
  if (!rows || rows.length === 0) {
    return '';
  }
  return Papa.unparse(rows);
}

/**
 * Export a single table to CSV
 */
async function exportTableToCSV(tableName) {
  try {
    // Check if using SQL Server
    if (isUsingSqlServer()) {
      const adapter = getSqlServerAdapter();
      if (adapter) {
        const rows = await adapter.getTableData(tableName);
        return rowsToCSV(rows);
      }
    }

    // Default to SQLite
    const database = db.getDatabase();
    const rows = database.prepare(`SELECT * FROM ${tableName}`).all();
    return rowsToCSV(rows);
  } catch (error) {
    console.error(`Error exporting table ${tableName}:`, error);
    return '';
  }
}

/**
 * Create a backup zip file containing all data as CSV files
 * @param {string} backupPath - Path where the backup zip should be created
 * @returns {Promise<string>} - Path to the created backup file
 */
async function createBackup(backupPath) {
  // Create backup directory if it doesn't exist
  const backupDir = path.dirname(backupPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create write stream for the zip file
  const output = fs.createWriteStream(backupPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  // Set up promise to wait for archive to close
  const closePromise = new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Backup created: ${backupPath} (${archive.pointer()} bytes)`);
      resolve(backupPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Add metadata file
  const metadata = {
    backup_date: new Date().toISOString(),
    app_name: 'OwnInvoice Desktop',
    app_version: '1.0.0',
    tables: TABLES_TO_BACKUP
  };
  archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

  // Export each table to CSV and add to archive
  for (const tableName of TABLES_TO_BACKUP) {
    try {
      const csvData = await exportTableToCSV(tableName);
      if (csvData) {
        archive.append(csvData, { name: `${tableName}.csv` });
        console.log(`Added ${tableName} to backup`);
      }
    } catch (error) {
      console.error(`Error backing up table ${tableName}:`, error);
    }
  }

  // Finalize the archive and wait for it to close
  archive.finalize();
  return closePromise;
}

/**
 * Parse CSV content to rows
 */
function parseCSV(csvContent) {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false // Keep everything as strings, we'll convert manually
  });
  return result.data;
}

/**
 * Import data from CSV into a table
 */
async function importTableFromCSV(tableName, csvContent, useSqlServer = false) {
  if (!csvContent || csvContent.trim() === '') {
    console.log(`No data to import for table ${tableName}`);
    return 0;
  }

  try {
    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      console.log(`No rows to import for table ${tableName}`);
      return 0;
    }

    // Use SQL Server adapter if enabled
    if (useSqlServer) {
      const adapter = getSqlServerAdapter();
      if (adapter) {
        return await adapter.importTableData(tableName, rows);
      }
    }

    // Default to SQLite
    const database = db.getDatabase();
    const columns = Object.keys(rows[0]);

    // Build insert statement
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.join(', ');
    const stmt = database.prepare(
      `INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`
    );

    // Insert all rows in a transaction
    const insertMany = database.transaction((rows) => {
      for (const row of rows) {
        const values = columns.map(col => {
          const value = row[col];
          // Convert empty strings to null for proper handling
          if (value === '' || value === 'NULL') return null;
          return value;
        });
        stmt.run(values);
      }
    });

    insertMany(rows);
    console.log(`Imported ${rows.length} rows into ${tableName}`);
    return rows.length;

  } catch (error) {
    console.error(`Error importing table ${tableName}:`, error);
    throw error;
  }
}

/**
 * Restore database from a backup zip file
 * @param {string} backupPath - Path to the backup zip file
 * @returns {Promise<object>} - Restore statistics
 */
async function restoreBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(backupPath);
    const zipEntries = zip.getEntries();

    const stats = {
      tables_restored: 0,
      total_rows: 0,
      tables: {},
      database: isUsingSqlServer() ? 'SQL Server' : 'SQLite'
    };

    const usingSqlServer = isUsingSqlServer();

    // Build a map of table name -> CSV content from the zip
    const csvDataMap = {};
    for (const entry of zipEntries) {
      const fileName = entry.entryName;
      if (fileName.endsWith('.csv')) {
        const tableName = fileName.replace('.csv', '');
        if (TABLES_TO_BACKUP.includes(tableName)) {
          csvDataMap[tableName] = entry.getData().toString('utf8');
        }
      }
    }

    // Clear all tables first, then import
    if (usingSqlServer) {
      // Use SQL Server adapter to clear tables
      const adapter = getSqlServerAdapter();
      if (adapter) {
        await adapter.clearAllTables(TABLES_TO_BACKUP);
      }

      // Import in parent-first order
      for (const tableName of TABLES_TO_BACKUP) {
        if (csvDataMap[tableName]) {
          const rowCount = await importTableFromCSV(tableName, csvDataMap[tableName], true);
          stats.tables_restored++;
          stats.total_rows += rowCount;
          stats.tables[tableName] = rowCount;
        }
      }
    } else {
      // Use SQLite - PRAGMA must be set OUTSIDE transactions
      const database = db.getDatabase();
      database.pragma('foreign_keys = OFF');

      try {
        // Clear tables in reverse order (children first)
        const clearTables = database.transaction(() => {
          for (const tableName of [...TABLES_TO_BACKUP].reverse()) {
            try {
              if (tableName === 'settings') {
                // Don't delete settings, we'll update it
                continue;
              }
              database.prepare(`DELETE FROM ${tableName}`).run();
              console.log(`Cleared table ${tableName}`);
            } catch (error) {
              console.error(`Error clearing table ${tableName}:`, error);
            }
          }
        });

        clearTables();

        // Import CSVs in parent-first order (TABLES_TO_BACKUP is already parent-first)
        for (const tableName of TABLES_TO_BACKUP) {
          if (csvDataMap[tableName]) {
            const rowCount = await importTableFromCSV(tableName, csvDataMap[tableName], false);
            stats.tables_restored++;
            stats.total_rows += rowCount;
            stats.tables[tableName] = rowCount;
          }
        }
      } finally {
        // Re-enable foreign key constraints
        database.pragma('foreign_keys = ON');
      }
    }

    console.log('Backup restored successfully:', stats);
    return stats;

  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}

/**
 * Get default backup directory
 */
function getDefaultBackupDir() {
  const { app } = require('electron');
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'backups');
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `invoicepro-backup-${timestamp}.zip`;
}

/**
 * Create automatic backup
 */
async function createAutoBackup() {
  const backupDir = getDefaultBackupDir();
  const filename = generateBackupFilename();
  const backupPath = path.join(backupDir, filename);

  try {
    await createBackup(backupPath);

    // Clean up old backups (keep last 30)
    cleanupOldBackups(backupDir, 30);

    return backupPath;
  } catch (error) {
    console.error('Error creating auto backup:', error);
    throw error;
  }
}

/**
 * Clean up old backup files
 */
function cleanupOldBackups(backupDir, keepCount = 30) {
  try {
    if (!fs.existsSync(backupDir)) {
      return;
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('invoicepro-backup-') && f.endsWith('.zip'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    // Delete old backups beyond keepCount
    if (files.length > keepCount) {
      for (let i = keepCount; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
        console.log(`Deleted old backup: ${files[i].name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

/**
 * List all available backups
 */
function listBackups() {
  const backupDir = getDefaultBackupDir();

  try {
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('invoicepro-backup-') && f.endsWith('.zip'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          filename: f,
          path: path.join(backupDir, f),
          size: stats.size,
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return files;
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

/**
 * Restore database from CSV files
 * @param {string[]} csvFilePaths - Array of paths to CSV files
 * @returns {Promise<object>} - Restore statistics
 */
async function restoreFromCSV(csvFilePaths) {
  const usingSqlServer = isUsingSqlServer();
  const stats = {
    tables_restored: 0,
    total_rows: 0,
    tables: {},
    errors: [],
    database: usingSqlServer ? 'SQL Server' : 'SQLite'
  };

  // Disable foreign key constraints (must be outside transaction)
  if (!usingSqlServer) {
    const database = db.getDatabase();
    database.pragma('foreign_keys = OFF');
  }

  try {
    for (const filePath of csvFilePaths) {
      const fileName = path.basename(filePath);
      const tableName = fileName.replace('.csv', '').toLowerCase();

      // Check if this is a valid table
      if (!TABLES_TO_BACKUP.includes(tableName)) {
        // Try to match by partial name (e.g., "clients_export.csv" -> "clients")
        const matchedTable = TABLES_TO_BACKUP.find(t => fileName.toLowerCase().includes(t));
        if (!matchedTable) {
          stats.errors.push(`Unknown table for file: ${fileName}`);
          continue;
        }
      }

      const targetTable = TABLES_TO_BACKUP.find(t =>
        tableName === t || fileName.toLowerCase().includes(t)
      );

      if (!targetTable) {
        stats.errors.push(`Could not determine table for file: ${fileName}`);
        continue;
      }

      try {
        const csvContent = fs.readFileSync(filePath, 'utf8');

        if (!csvContent || csvContent.trim() === '') {
          stats.errors.push(`Empty file: ${fileName}`);
          continue;
        }

        const rowCount = await importTableFromCSV(targetTable, csvContent, usingSqlServer);

        stats.tables_restored++;
        stats.total_rows += rowCount;
        stats.tables[targetTable] = rowCount;

        console.log(`Imported ${rowCount} rows from ${fileName} into ${targetTable}`);
      } catch (error) {
        stats.errors.push(`Error importing ${fileName}: ${error.message}`);
        console.error(`Error importing ${fileName}:`, error);
      }
    }
  } finally {
    // Re-enable foreign key constraints
    if (!usingSqlServer) {
      const database = db.getDatabase();
      database.pragma('foreign_keys = ON');
    }
  }

  console.log('CSV restore completed:', stats);
  return stats;
}

/**
 * Get supported table names for CSV import
 */
function getSupportedTables() {
  return [...TABLES_TO_BACKUP];
}

module.exports = {
  createBackup,
  restoreBackup,
  restoreFromCSV,
  createAutoBackup,
  getDefaultBackupDir,
  generateBackupFilename,
  listBackups,
  cleanupOldBackups,
  getSupportedTables
};
