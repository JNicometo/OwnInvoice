import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Send, Mail, Clock, FileText, User, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';

function Reminders() {
  const {
    getAllReminderTemplates, createReminderTemplate, updateReminderTemplate, deleteReminderTemplate,
    getAllInvoiceReminders, createInvoiceReminder, deleteInvoiceReminder,
    getInvoicesNeedingReminders, getAllInvoices, getAllClients, getSettings, sendReminderEmail
  } = useDatabase();

  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'send', 'history'
  const [templates, setTemplates] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [invoicesNeedingReminders, setInvoicesNeedingReminders] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState(null);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMessage, setPreviewMessage] = useState('');

  const [reminderPage, setReminderPage] = useState(1);
  const REMINDERS_PER_PAGE = 50;

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    subject: '',
    message: '',
    days_before_due: 0,
    is_active: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, remindersData, needingRemindersData, invoicesData, clientsData, settingsData] = await Promise.all([
        getAllReminderTemplates(),
        getAllInvoiceReminders(),
        getInvoicesNeedingReminders(),
        getAllInvoices(),
        getAllClients(),
        getSettings()
      ]);

      setTemplates(templatesData || []);
      setReminders(remindersData || []);
      setInvoicesNeedingReminders(needingRemindersData || []);
      setAllInvoices(invoicesData || []);
      setClients(clientsData || []);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading reminders data:', error);
      alert('Error loading data: ' + error.message);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      subject: '',
      message: '',
      days_before_due: 0,
      is_active: 1
    });
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateFormData({
      name: template.name,
      subject: template.subject,
      message: template.message,
      days_before_due: template.days_before_due,
      is_active: template.is_active
    });
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateReminderTemplate(editingTemplate.id, templateFormData);
      } else {
        await createReminderTemplate(templateFormData);
      }
      setShowTemplateForm(false);
      await loadData();
    } catch (error) {
      alert('Error saving template: ' + error.message);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Delete this reminder template?')) {
      try {
        await deleteReminderTemplate(id);
        await loadData();
      } catch (error) {
        alert('Error deleting template: ' + error.message);
      }
    }
  };

  const handleSendReminder = (invoice, template) => {
    setSelectedInvoice(invoice);
    setSelectedTemplate(template);

    // Generate preview
    const client = clients.find(c => c.id === invoice.client_id);
    const preview = replaceVariables(template.message, invoice, client);
    setPreviewMessage(preview);
    setShowSendModal(true);
  };

  const replaceVariables = (text, invoice, client) => {
    if (!text) return '';

    return text
      .replace(/\{invoice_number\}/g, invoice?.invoice_number || '')
      .replace(/\{client_name\}/g, client?.name || '')
      .replace(/\{total\}/g, invoice?.total ? `$${invoice.total.toFixed(2)}` : '$0.00')
      .replace(/\{due_date\}/g, invoice?.due_date ? new Date(invoice.due_date).toLocaleDateString() : '')
      .replace(/\{company_name\}/g, settings?.company_name || 'Your Company');
  };

  const handleConfirmSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const daysOverdue = Math.floor((Date.now() - new Date(selectedInvoice.due_date)) / (1000 * 60 * 60 * 24));

      // Actually send the email via SMTP
      await sendReminderEmail({
        invoiceId: selectedInvoice.id,
        templateId: selectedTemplate.id,
      });

      // Record the reminder after successful send
      await createInvoiceReminder({
        invoice_id: selectedInvoice.id,
        template_id: selectedTemplate.id,
        sent_date: new Date().toISOString(),
        reminder_type: 'manual',
        days_overdue: daysOverdue,
        status: 'sent',
        notes: `Manually sent using template: ${selectedTemplate.name}`
      });

      alert('Reminder email sent successfully!');
      setShowSendModal(false);
      await loadData();
    } catch (error) {
      alert('Error sending reminder: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (window.confirm('Delete this reminder record?')) {
      try {
        await deleteInvoiceReminder(id);
        await loadData();
      } catch (error) {
        alert('Error deleting reminder: ' + error.message);
      }
    }
  };

  const renderTemplates = () => (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reminder Templates</h2>
          <p className="text-sm text-gray-600 mt-1">Create and manage email templates for invoice reminders</p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </button>
      </div>

      {/* Available Variables Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Available Variables:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-blue-800">
          <code className="bg-white px-2 py-1 rounded">{'{invoice_number}'}</code>
          <code className="bg-white px-2 py-1 rounded">{'{client_name}'}</code>
          <code className="bg-white px-2 py-1 rounded">{'{total}'}</code>
          <code className="bg-white px-2 py-1 rounded">{'{due_date}'}</code>
          <code className="bg-white px-2 py-1 rounded">{'{company_name}'}</code>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No reminder templates yet</p>
          <button
            onClick={handleCreateTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Send {template.days_before_due === 0 ? 'on due date' :
                         template.days_before_due > 0 ? `${template.days_before_due} days before due` :
                         `${Math.abs(template.days_before_due)} days after due`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
                <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSendReminders = () => {
    const totalReminders = invoicesNeedingReminders.length;
    const totalPages = Math.ceil(totalReminders / REMINDERS_PER_PAGE);
    const startIndex = (reminderPage - 1) * REMINDERS_PER_PAGE;
    const endIndex = startIndex + REMINDERS_PER_PAGE;
    const paginatedReminders = invoicesNeedingReminders.slice(startIndex, endIndex);

    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Send Reminders</h2>
            <p className="text-sm text-gray-600 mt-1">
              Send payment reminders for outstanding invoices (Showing {startIndex + 1}-{Math.min(endIndex, totalReminders)} of {totalReminders})
            </p>
          </div>
        </div>

        {paginatedReminders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600">No invoices need reminders at this time</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReminders.map((invoice) => {
                  const daysOverdue = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{invoice.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{invoice.client_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.total?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          daysOverdue > 30 ? 'bg-red-100 text-red-800' :
                          daysOverdue > 7 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {daysOverdue} days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {templates.filter(t => t.is_active).map(template => (
                            <button
                              key={template.id}
                              onClick={() => handleSendReminder(invoice, template)}
                              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {template.name}
                            </button>
                          ))}
                          {templates.filter(t => t.is_active).length === 0 && (
                            <span className="text-gray-400 text-xs">No active templates</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalReminders)} of {totalReminders} invoices
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReminderPage(prev => Math.max(1, prev - 1))}
                    disabled={reminderPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Page {reminderPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setReminderPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={reminderPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    // Group reminders by invoice
    const groupedReminders = reminders.reduce((acc, reminder) => {
      const invoiceId = reminder.invoice_id;
      if (!acc[invoiceId]) {
        acc[invoiceId] = [];
      }
      acc[invoiceId].push(reminder);
      return acc;
    }, {});

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reminder History</h2>
          <p className="text-sm text-gray-600 mt-1">View all sent reminders</p>
        </div>

        {reminders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No reminders sent yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedReminders).map(([invoiceId, invoiceReminders]) => {
              const invoice = allInvoices.find(inv => inv.id === parseInt(invoiceId));
              if (!invoice) return null;

              return (
                <div key={invoiceId} className="bg-white rounded-lg shadow border border-gray-200">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h3>
                        <p className="text-sm text-gray-600">{invoice.client_name} - ${invoice.total?.toFixed(2)}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {invoiceReminders.length} reminder{invoiceReminders.length !== 1 ? 's' : ''} sent
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {invoiceReminders.map((reminder) => (
                      <div key={reminder.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(reminder.sent_date).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {reminder.template_name || reminder.reminder_type || 'Reminder'}
                        </p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{reminder.notes || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('send')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'send'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Send Reminders
            {invoicesNeedingReminders.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                {invoicesNeedingReminders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'send' && renderSendReminders()}
      {activeTab === 'history' && renderHistory()}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button onClick={() => setShowTemplateForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={templateFormData.subject}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Payment Reminder for Invoice {invoice_number}"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={templateFormData.message}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="8"
                    placeholder="Dear {client_name},&#10;&#10;This is a reminder that invoice {invoice_number} for {total} is due on {due_date}.&#10;&#10;Best regards,&#10;{company_name}"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send Timing</label>
                  <select
                    value={templateFormData.days_before_due}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, days_before_due: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="7">7 days before due date</option>
                    <option value="3">3 days before due date</option>
                    <option value="1">1 day before due date</option>
                    <option value="0">On due date</option>
                    <option value="-1">1 day after due date</option>
                    <option value="-3">3 days after due date</option>
                    <option value="-7">7 days after due date</option>
                    <option value="-14">14 days after due date</option>
                    <option value="-30">30 days after due date</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={templateFormData.is_active === 1}
                    onChange={(e) => setTemplateFormData(prev => ({ ...prev, is_active: e.target.checked ? 1 : 0 }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Reminder Modal */}
      {showSendModal && selectedInvoice && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Send Reminder</h2>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Invoice Details:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm"><strong>Invoice:</strong> {selectedInvoice.invoice_number}</p>
                  <p className="text-sm"><strong>Client:</strong> {selectedInvoice.client_name}</p>
                  <p className="text-sm"><strong>Amount:</strong> ${selectedInvoice.total?.toFixed(2)}</p>
                  <p className="text-sm"><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Template:</h3>
                <p className="text-sm text-gray-600">{selectedTemplate.name}</p>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Subject: {replaceVariables(selectedTemplate.subject, selectedInvoice, clients.find(c => c.id === selectedInvoice.client_id))}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewMessage}</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    This will send an email with the invoice PDF attached to the client.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSendModal(false)}
                  disabled={sending}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSend}
                  disabled={sending}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reminder
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reminders;
