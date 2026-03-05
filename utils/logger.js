/**
 * Logging Utility for InvoicePro
 *
 * Provides structured logging with different levels that can be controlled
 * based on the environment (development vs production).
 */

let isDev;
try { isDev = !require('electron').app.isPackaged; } catch { isDev = true; }

/**
 * Log levels:
 * - debug: Detailed information for debugging (dev only)
 * - info: General informational messages
 * - warn: Warning messages
 * - error: Error messages
 */
const log = {
  /**
   * Debug-level logging - only shows in development
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (isDev) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Info-level logging - shows in all environments
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    console.log('[INFO]', new Date().toISOString(), ...args);
  },

  /**
   * Warning-level logging - shows in all environments
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },

  /**
   * Error-level logging - shows in all environments
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },

  /**
   * Success-level logging - shows in all environments
   * @param {...any} args - Arguments to log
   */
  success: (...args) => {
    console.log('[SUCCESS]', new Date().toISOString(), ...args);
  },
};

module.exports = log;
