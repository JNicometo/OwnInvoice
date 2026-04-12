import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Home, FileText, Users, Archive as ArchiveIcon, Settings as SettingsIcon, Save, X, Keyboard, Search, Repeat, TrendingUp, FileX, Bell, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import ClientManagement from './components/ClientManagement';
import SavedItems from './components/SavedItems';
import ArchiveComponent from './components/Archive';
import Settings from './components/Settings';
import RecurringInvoices from './components/RecurringInvoices';
import Reports from './components/Reports';
import CreditNotes from './components/CreditNotes';
import Reminders from './components/Reminders';
import { useDatabase } from './hooks/useDatabase';
import ErrorBoundary from './components/ErrorBoundary';
import LicenseActivation from './components/LicenseActivation';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ invoices: [], clients: [], items: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [navigation, setNavigation] = useState([]);
  const [isLicensed, setIsLicensed] = useState(null); // null=checking, false=show activation, true=show app
  const [trialStatus, setTrialStatus] = useState(null);
  const [appError, setAppError] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, message: '', resolve: null });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const searchInputRef = useRef(null);

  const { getAllInvoices, getAllClients, getAllSavedItems, getSettings } = useDatabase();

  // Global search functionality
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults({ invoices: [], clients: [], items: [] });
      return;
    }

    setIsSearching(true);
    try {
      const [invoices, clients, items] = await Promise.all([
        getAllInvoices(),
        getAllClients(),
        getAllSavedItems()
      ]);

      const lowerQuery = query.toLowerCase();

      const filteredInvoices = invoices.filter(inv =>
        inv.invoice_number.toLowerCase().includes(lowerQuery) ||
        inv.client_name?.toLowerCase().includes(lowerQuery)
      ).slice(0, 5);

      const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(lowerQuery) ||
        client.email.toLowerCase().includes(lowerQuery) ||
        client.customer_number?.toLowerCase().includes(lowerQuery)
      ).slice(0, 5);

      const filteredItems = items.filter(item =>
        item.description.toLowerCase().includes(lowerQuery) ||
        item.sku?.toLowerCase().includes(lowerQuery)
      ).slice(0, 5);

      setSearchResults({
        invoices: filteredInvoices,
        clients: filteredClients,
        items: filteredItems
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [getAllInvoices, getAllClients, getAllSavedItems]);

  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults({ invoices: [], clients: [], items: [] });
    }
  }, [searchQuery, performSearch]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // License check on startup
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const { ipcRenderer } = window.electron;
        const status = await ipcRenderer.invoke('license:check');
        setIsLicensed(status.activated === true);
        // Load trial status (counts/limits) for UI display
        const trial = await ipcRenderer.invoke('license:getTrialStatus');
        setTrialStatus(trial);
      } catch (err) {
        console.error('License check error:', err);
        setIsLicensed(false);
      }
    };
    checkLicense();
  }, []);

  // Listen for uncaught errors from the main process
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return;
    const handler = (message) => setAppError(message);
    window.electron.ipcRenderer.on('app:error', handler);
    return () => window.electron.ipcRenderer.removeAllListeners('app:error');
  }, []);

  // Global non-blocking confirm dialog
  useEffect(() => {
    window.customConfirm = (message) => new Promise(resolve => {
      setConfirmState({ open: true, message, resolve });
    });
    return () => { delete window.customConfirm; };
  }, []);

  // Dark mode support
  useEffect(() => {
    const applyDarkMode = async () => {
      try {
        const settings = await getSettings();
        const mode = settings?.dark_mode || 'off';

        if (mode === 'on') {
          document.documentElement.classList.add('dark');
        } else if (mode === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Error loading dark mode setting:', error);
      }
    };

    applyDarkMode();

    // Listen for system preference changes when in "system" mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = async () => {
      try {
        const settings = await getSettings();
        if (settings?.dark_mode === 'system') {
          document.documentElement.classList.toggle('dark', mediaQuery.matches);
        }
      } catch (error) {
        console.error('Error checking dark mode on system change:', error);
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // Listen for settings updates (fired when user saves settings)
    const handleNavUpdate = () => applyDarkMode();
    window.addEventListener('navigation-updated', handleNavUpdate);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('navigation-updated', handleNavUpdate);
    };
  }, [getSettings]);

  // Load tab configuration from settings
  const loadNavigation = useCallback(async () => {
    // Default navigation with icons
    const defaultNavigation = [
      { id: 'dashboard', name: 'Dashboard', icon: Home, enabled: true },
      { id: 'invoices', name: 'Invoices', icon: FileText, enabled: true },
      { id: 'credit-notes', name: 'Credit Notes', icon: FileX, enabled: false },
      { id: 'recurring', name: 'Recurring', icon: Repeat, enabled: true },
      { id: 'clients', name: 'Clients', icon: Users, enabled: true },
      { id: 'reminders', name: 'Reminders', icon: Bell, enabled: true },
      { id: 'reports', name: 'Reports', icon: TrendingUp, enabled: true },
      { id: 'saved-items', name: 'Saved Items', icon: Save, enabled: true },
      { id: 'archive', name: 'Archive', icon: ArchiveIcon, enabled: true },
      { id: 'settings', name: 'Settings', icon: SettingsIcon, enabled: true },
    ];

    try {
      const settings = await getSettings();

      if (settings && settings.tab_configuration) {
        try {
          const tabConfig = JSON.parse(settings.tab_configuration);

          // Merge with default navigation to get icons
          const configuredTabs = tabConfig
            .filter(tab => tab.enabled)
            .sort((a, b) => a.order - b.order)
            .map(tab => {
              const defaultTab = defaultNavigation.find(d => d.id === tab.id);
              return {
                ...tab,
                icon: defaultTab?.icon || Home
              };
            });

          setNavigation(configuredTabs);
        } catch (e) {
          console.error('Error parsing tab configuration:', e);
          setNavigation(defaultNavigation.filter(tab => tab.enabled !== false));
        }
      } else {
        setNavigation(defaultNavigation.filter(tab => tab.enabled !== false));
      }
    } catch (error) {
      console.error('Error loading navigation:', error);
      // Fallback to default navigation
      setNavigation(defaultNavigation.filter(tab => tab.enabled !== false));
    }
  }, [getSettings]);

  useEffect(() => {
    if (isLicensed !== null) {
      loadNavigation();
    }

    // Listen for navigation updates from Settings
    const handleNavigationUpdate = () => {
      console.log('Navigation configuration updated, reloading...');
      loadNavigation();
    };

    window.addEventListener('navigation-updated', handleNavigationUpdate);

    return () => {
      window.removeEventListener('navigation-updated', handleNavigationUpdate);
    };
  }, [loadNavigation, isLicensed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);

      // Ctrl/Cmd + ? - Show keyboard shortcuts help
      if (modifierKey && event.key === '/') {
        event.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Escape - Close modals
      if (event.key === 'Escape') {
        if (showKeyboardHelp) {
          event.preventDefault();
          setShowKeyboardHelp(false);
          return;
        }
        if (showSearch) {
          event.preventDefault();
          setShowSearch(false);
          setSearchQuery('');
          return;
        }
      }

      // Ctrl/Cmd + F - Global search
      if (modifierKey && event.key === 'f') {
        event.preventDefault();
        setShowSearch(true);
        return;
      }

      // Only process other shortcuts when not in input
      if (isInInput) return;

      // Ctrl/Cmd + N - New Invoice
      if (modifierKey && event.key === 'n') {
        event.preventDefault();
        setCurrentView('invoices');
        return;
      }

      // Ctrl/Cmd + D - Dashboard
      if (modifierKey && event.key === 'd') {
        event.preventDefault();
        setCurrentView('dashboard');
        return;
      }

      // Ctrl/Cmd + I - Invoices
      if (modifierKey && event.key === 'i') {
        event.preventDefault();
        setCurrentView('invoices');
        return;
      }

      // Ctrl/Cmd + U - Clients (Users)
      if (modifierKey && event.key === 'u') {
        event.preventDefault();
        setCurrentView('clients');
        return;
      }

      // Ctrl/Cmd + , - Settings
      if (modifierKey && event.key === ',') {
        event.preventDefault();
        setCurrentView('settings');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKeyboardHelp, showSearch]);

  const handleNavigateToInvoices = (filterOrClientId = null) => {
    // Check if it's a status filter (string like 'paid', 'pending', 'overdue') or a clientId (number)
    if (typeof filterOrClientId === 'string' && ['paid', 'pending', 'overdue', 'draft'].includes(filterOrClientId)) {
      setSelectedStatusFilter(filterOrClientId);
      setSelectedClientId(null);
    } else if (typeof filterOrClientId === 'number') {
      setSelectedClientId(filterOrClientId);
      setSelectedStatusFilter(null);
    } else {
      // null or undefined - clear all filters
      setSelectedClientId(null);
      setSelectedStatusFilter(null);
    }
    setCurrentView('invoices');
  };

  const handleClearClientFilter = () => {
    setSelectedClientId(null);
    setSelectedStatusFilter(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigateToInvoices={handleNavigateToInvoices} />;
      case 'invoices':
        return <InvoiceList selectedClientId={selectedClientId} selectedStatusFilter={selectedStatusFilter} onClearFilter={handleClearClientFilter} />;
      case 'credit-notes':
        return <CreditNotes />;
      case 'recurring':
        return <RecurringInvoices />;
      case 'clients':
        return <ClientManagement onNavigateToInvoices={handleNavigateToInvoices} />;
      case 'reminders':
        return <Reminders />;
      case 'reports':
        return <Reports />;
      case 'saved-items':
        return <SavedItems />;
      case 'archive':
        return <ArchiveComponent />;
      case 'settings':
        return <Settings isLicensed={isLicensed} onLicenseChange={(licensed) => setIsLicensed(licensed)} />;
      default:
        return <Dashboard onNavigateToInvoices={handleNavigateToInvoices} />;
    }
  };

  // Show loading while checking license
  if (isLicensed === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show activation screen if not licensed
  if (!isLicensed) {
    return <LicenseActivation onActivated={() => setIsLicensed(true)} />;
  }

  const handleConfirmResponse = (result) => {
    confirmState.resolve(result);
    setConfirmState({ open: false, message: '', resolve: null });
  };


  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-gray-100">
      {confirmState.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <p style={{ marginBottom: 20, fontSize: 15, color: '#111' }}>{confirmState.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => handleConfirmResponse(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleConfirmResponse(true)} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {appError && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#c00', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>App error: {appError}</span>
          <button onClick={() => setAppError('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'app-sidebar-collapsed' : 'app-sidebar'} bg-white shadow-lg flex-shrink-0 flex flex-col h-full overflow-hidden transition-all duration-200`}>
        <div className={`${sidebarCollapsed ? 'p-3' : 'p-4 xl:p-6'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2 xl:gap-3'}`}>
            <img src={require('./assets/logo.png')} alt="OwnInvoice" className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg flex-shrink-0" />
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl xl:text-2xl font-bold text-blue-600">OwnInvoice</h1>
                <p className="text-xs xl:text-sm text-gray-500">by Grit Software</p>
              </div>
            )}
          </div>
        </div>

        <nav className={`${sidebarCollapsed ? 'px-2' : 'px-3 xl:px-4'} space-y-0.5 xl:space-y-1 flex-1 overflow-y-auto`}>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={sidebarCollapsed ? item.name : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 xl:px-4 py-2 xl:py-3'} text-sm font-medium rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-2 xl:mr-3'}`} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        <div className={`${sidebarCollapsed ? 'p-2' : 'p-3 xl:p-4'} border-t flex-shrink-0`}>
          {!sidebarCollapsed && (
            <>
              <button
                onClick={() => setShowSearch(true)}
                className="w-full flex items-center justify-center px-2 py-1.5 xl:py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors mb-1 xl:mb-2"
              >
                <Search className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Global Search (Ctrl+F)</span>
              </button>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="w-full flex items-center justify-center px-2 py-1.5 xl:py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors mb-1 xl:mb-2"
              >
                <Keyboard className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Keyboard Shortcuts</span>
              </button>
              <p className="text-xs text-gray-500 text-center truncate mb-2">
                OwnInvoice Desktop v1.0.0
              </p>
            </>
          )}
          {sidebarCollapsed && (
            <>
              <button
                onClick={() => setShowSearch(true)}
                title="Global Search (Ctrl+F)"
                className="w-full flex items-center justify-center py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors mb-1"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                title="Keyboard Shortcuts"
                className="w-full flex items-center justify-center py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors mb-1"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center justify-center py-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${sidebarCollapsed ? '' : 'gap-2'}`}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /><span className="text-xs">Collapse</span></>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-auto flex flex-col">
        {/* Trial Banner */}
        {!isLicensed && trialStatus && (
          <div className={`${trialStatus.trialExpired ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white px-3 xl:px-4 py-2 xl:py-2.5 flex items-center justify-between flex-shrink-0 gap-2`}>
            <div className="flex items-center gap-2 xl:gap-4 text-xs xl:text-sm flex-wrap min-w-0">
              <span className="font-semibold whitespace-nowrap">
                {trialStatus.trialExpired
                  ? 'Trial Expired'
                  : `Trial Mode \u2014 ${trialStatus.trialDaysRemaining ?? 7} day${(trialStatus.trialDaysRemaining ?? 7) === 1 ? '' : 's'} left`}
              </span>
              {!trialStatus.trialExpired && (
                <>
                  <span className="opacity-90 whitespace-nowrap">
                    Invoices: {trialStatus.counts?.invoices ?? 0}/{trialStatus.limits?.invoices ?? 5}
                  </span>
                  <span className="opacity-90 whitespace-nowrap">
                    Quotes: {trialStatus.counts?.quotes ?? 0}/{trialStatus.limits?.quotes ?? 5}
                  </span>
                  <span className="opacity-90 whitespace-nowrap">
                    Clients: {trialStatus.counts?.clients ?? 0}/{trialStatus.limits?.clients ?? 5}
                  </span>
                  <span className="opacity-90 whitespace-nowrap">
                    Items: {trialStatus.counts?.savedItems ?? 0}/{trialStatus.limits?.savedItems ?? 5}
                  </span>
                </>
              )}
              {trialStatus.trialExpired && (
                <span className="opacity-90">Activate a license to continue using OwnInvoice.</span>
              )}
            </div>
            <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
              <a
                href="https://gritsoftware.dev"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 xl:px-4 py-1 xl:py-1.5 bg-white ${trialStatus.trialExpired ? 'text-red-700' : 'text-blue-700'} rounded-lg text-xs xl:text-sm font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap`}
              >
                {trialStatus.trialExpired ? 'Get a License' : 'Upgrade'}
              </a>
              <button
                onClick={() => setCurrentView('settings')}
                className={`text-xs xl:text-sm ${trialStatus.trialExpired ? 'text-red-200' : 'text-blue-200'} hover:text-white transition-colors whitespace-nowrap`}
              >
                Activate License
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {renderView()}
        </div>
      </div>

      {/* Global Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search invoices, clients, or items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isSearching ? (
                <div className="text-center py-8 text-gray-500">Searching...</div>
              ) : !searchQuery ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Start typing to search across invoices, clients, and items</p>
                  <p className="text-sm mt-2">Press <kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to close</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Invoices Results */}
                  {searchResults.invoices.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Invoices ({searchResults.invoices.length})
                      </h3>
                      <div className="space-y-2">
                        {searchResults.invoices.map((invoice) => (
                          <button
                            key={invoice.id}
                            onClick={() => {
                              setCurrentView('invoices');
                              setShowSearch(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                                <div className="text-sm text-gray-500">{invoice.client_name}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">${invoice.total?.toFixed(2)}</div>
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {invoice.status}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clients Results */}
                  {searchResults.clients.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Clients ({searchResults.clients.length})
                      </h3>
                      <div className="space-y-2">
                        {searchResults.clients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => {
                              setCurrentView('clients');
                              setShowSearch(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                            {client.customer_number && (
                              <div className="text-xs text-gray-400 font-mono mt-1">#{client.customer_number}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Saved Items Results */}
                  {searchResults.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Save className="w-4 h-4 mr-2" />
                        Saved Items ({searchResults.items.length})
                      </h3>
                      <div className="space-y-2">
                        {searchResults.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setCurrentView('saved-items');
                              setShowSearch(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{item.description}</div>
                                {item.sku && (
                                  <div className="text-xs text-gray-400 font-mono mt-1">#{item.sku}</div>
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-900">${item.rate?.toFixed(2)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {searchResults.invoices.length === 0 &&
                   searchResults.clients.length === 0 &&
                   searchResults.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No results found for "{searchQuery}"</p>
                      <p className="text-sm mt-2">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <Keyboard className="w-6 h-6 mr-3 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Navigation</h3>
                  <div className="space-y-2">
                    <ShortcutRow shortcut="Ctrl/Cmd + D" description="Go to Dashboard" />
                    <ShortcutRow shortcut="Ctrl/Cmd + I" description="Go to Invoices" />
                    <ShortcutRow shortcut="Ctrl/Cmd + U" description="Go to Clients" />
                    <ShortcutRow shortcut="Ctrl/Cmd + ," description="Go to Settings" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Actions</h3>
                  <div className="space-y-2">
                    <ShortcutRow shortcut="Ctrl/Cmd + N" description="New Invoice (opens Invoice page)" />
                    <ShortcutRow shortcut="Ctrl/Cmd + F" description="Global Search" />
                    <ShortcutRow shortcut="Escape" description="Close modals/forms" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Help</h3>
                  <div className="space-y-2">
                    <ShortcutRow shortcut="Ctrl/Cmd + /" description="Show this help" />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Most shortcuts work globally except when typing in input fields.
                    Press <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono">Escape</kbd> to close any modal or form.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

// Helper component for shortcut rows
function ShortcutRow({ shortcut, description }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{description}</span>
      <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800">
        {shortcut}
      </kbd>
    </div>
  );
}

export default App;
