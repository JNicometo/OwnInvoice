import { useEffect } from 'react';

/**
 * Custom hook for handling keyboard shortcuts throughout the app
 * @param {Object} shortcuts - Object mapping keys to callback functions
 * @param {Array} dependencies - Dependencies array for useEffect
 */
export const useKeyboardShortcuts = (shortcuts, dependencies = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Check if we're in an input/textarea/select
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);

      // Define shortcut mappings
      const keyMap = {
        // Ctrl/Cmd + N - New Invoice (only when not in input)
        'ctrl+n': () => {
          if (!isInInput && shortcuts.onNewInvoice) {
            event.preventDefault();
            shortcuts.onNewInvoice();
          }
        },
        // Escape - Close modals/forms
        'escape': () => {
          if (shortcuts.onEscape) {
            event.preventDefault();
            shortcuts.onEscape();
          }
        },
        // Ctrl/Cmd + P - Print (in preview mode)
        'ctrl+p': () => {
          if (!isInInput && shortcuts.onPrint) {
            event.preventDefault();
            shortcuts.onPrint();
          }
        },
        // Ctrl/Cmd + S - Save (in forms)
        'ctrl+s': () => {
          if (shortcuts.onSave) {
            event.preventDefault();
            shortcuts.onSave();
          }
        },
        // Ctrl/Cmd + F - Focus search
        'ctrl+f': () => {
          if (!isInInput && shortcuts.onSearch) {
            event.preventDefault();
            shortcuts.onSearch();
          }
        },
      };

      // Build the key combination string
      let keyCombo = '';
      if (modifierKey && event.key !== 'Meta' && event.key !== 'Control') {
        keyCombo = 'ctrl+' + event.key.toLowerCase();
      } else if (event.key === 'Escape') {
        keyCombo = 'escape';
      }

      // Execute the shortcut if it exists
      if (keyCombo && keyMap[keyCombo]) {
        keyMap[keyCombo]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
};

export default useKeyboardShortcuts;
