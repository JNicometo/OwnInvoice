import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import Papa from 'papaparse';
import { useDatabase } from '../hooks/useDatabase';

function CSVImport({ onClose, onImportComplete }) {
  const [csvData, setCsvData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const { processCSVInvoiceImport, selectCSVFile } = useDatabase();

  const handleFileSelect = async () => {
    const result = await selectCSVFile();
    if (result.success) {
      Papa.parse(result.content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
        },
        error: (error) => {
          alert('Error parsing CSV: ' + error.message);
        }
      });
    }
  };

  const handleImport = async () => {
    if (!csvData || csvData.length === 0) {
      alert('No data to import');
      return;
    }

    setImporting(true);
    try {
      const importResults = await processCSVInvoiceImport(csvData);
      setResults(importResults);
      if (importResults.success.length > 0 && onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `invoice_number,client_name,client_email,date,due_date,item_description,item_quantity,item_rate,notes
,Acme Corp,contact@acme.com,2026-02-01,2026-03-01,Consulting Services,10,150.00,Monthly retainer
,Beta LLC,info@beta.com,2026-02-01,2026-03-01,Web Development,1,5000.00,Website project`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Import Invoices from CSV</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
            &times;
          </button>
        </div>

        {!results ? (
          <>
            <div className="mb-4">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Download className="w-4 h-4" />
                Download Template CSV
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <button
                onClick={handleFileSelect}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Select CSV File
              </button>
            </div>

            {csvData && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <FileText className="w-5 h-5 inline mr-2 text-green-600" />
                  <strong>{csvData.length}</strong> rows found in CSV
                </div>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Preview (first 5 rows):</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          {Object.keys(csvData[0]).map(key => (
                            <th key={key} className="px-2 py-1 border text-left">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-2 py-1 border">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Invoices'}
                </button>
              </>
            )}
          </>
        ) : (
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="w-5 h-5" />
                <strong>{results.success.length} invoices imported successfully</strong>
              </div>
              {results.success.map((inv, i) => (
                <div key={i} className="text-sm text-gray-600 ml-7">
                  {inv.invoiceNumber} - {inv.client} (${inv.total.toFixed(2)})
                </div>
              ))}
            </div>

            {results.clientsCreated.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <strong className="text-blue-800">New clients created:</strong>
                <div className="text-sm">{results.clientsCreated.join(', ')}</div>
              </div>
            )}

            {results.errors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <strong>{results.errors.length} errors occurred</strong>
                </div>
                {results.errors.map((err, i) => (
                  <div key={i} className="text-sm text-red-600 ml-7">
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CSVImport;
