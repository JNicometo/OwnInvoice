import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.electron;

function LicenseActivation({ onActivated }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState(null);
  const [isActivating, setIsActivating] = useState(false);
  const [machineId, setMachineId] = useState('');

  useEffect(() => {
    ipcRenderer.invoke('license:getMachineId').then(setMachineId);
  }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    setError(null);

    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setIsActivating(true);

    try {
      const result = await ipcRenderer.invoke('license:activate', licenseKey);

      if (result.success) {
        onActivated();
      } else {
        if (result.code === 'MACHINE_MISMATCH') {
          setError('This license key is already activated on a different computer. Each license is valid for one machine. Contact jnicometo@gritsoftware.dev for assistance.');
        } else if (result.code === 'KEY_NOT_FOUND') {
          setError('License key not found. Please check the key and try again.');
        } else if (result.code === 'NETWORK_ERROR') {
          setError('Could not connect to the activation server. Please check your internet connection and try again.');
        } else {
          setError(result.error || 'Activation failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  // Auto-format license key as user types
  const handleKeyInput = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const stripped = value.replace(/-/g, '');

    if (stripped.length <= 5) {
      value = stripped;
    } else {
      const parts = [];
      parts.push(stripped.substring(0, 5));
      for (let i = 5; i < stripped.length && parts.length < 5; i += 5) {
        parts.push(stripped.substring(i, i + 5));
      }
      value = parts.join('-');
    }

    if (value.length > 29) value = value.substring(0, 29);
    setLicenseKey(value);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">IP</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">OwnInvoice</h1>
          <p className="text-gray-500 mt-1">by Grit Software</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Activate Your License</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter the license key from your purchase confirmation.
          </p>

          <form onSubmit={handleActivate}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={handleKeyInput}
                placeholder="OWNIV-XXXXX-XXXXX-XXXXX-XXXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isActivating}
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isActivating || !licenseKey.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActivating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Activating...
                </span>
              ) : (
                'Activate'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have a license?{' '}
              <button
                onClick={() => {
                  const { shell } = window.require ? window.require('electron') : {};
                  if (shell) {
                    shell.openExternal('https://gritsoftware.dev');
                  }
                }}
                className="text-blue-600 hover:underline"
              >
                Purchase here
              </button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Machine ID: <code className="bg-gray-50 px-1 rounded">{machineId.substring(0, 12)}...</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LicenseActivation;
