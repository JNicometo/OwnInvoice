import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Mail, DollarSign, CreditCard, Trash2 } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate } from '../utils/formatting';

function InvoicePreview({ invoice, onClose }) {
  const [fullInvoice, setFullInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    recipient: '',
    subject: '',
    body: '',
    cc: '',
    bcc: ''
  });
  const [sending, setSending] = useState(false);
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_number: '',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expMonth: '',
    expYear: '',
    cvc: '',
  });
  const [processingCardPayment, setProcessingCardPayment] = useState(false);
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [paypalPaymentLink, setPaypalPaymentLink] = useState('');
  const [squarePaymentLink, setSquarePaymentLink] = useState('');
  const [goCardlessPaymentLink, setGoCardlessPaymentLink] = useState('');
  const [authorizeNetPaymentLink, setAuthorizeNetPaymentLink] = useState('');
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const { getInvoice, getSettings, saveInvoiceAsPDF, sendInvoiceEmail, createPayment, getPaymentsByInvoice, deletePayment, createStripePaymentLink, createPayPalPaymentLink, createSquarePaymentLink, createGoCardlessPaymentLink, createAuthorizeNetPaymentLink } = useDatabase();

  useEffect(() => {
    loadInvoiceData();
  }, [invoice]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const [invoiceData, settingsData] = await Promise.all([
        getInvoice(invoice.id),
        getSettings()
      ]);
      setFullInvoice(invoiceData);
      setSettings(settingsData);

      // Load payments
      await loadPayments(invoice.id);
    } catch (error) {
      console.error('Error loading invoice:', error);
      console.error('Error loading invoice: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (invoiceId) => {
    try {
      const paymentsData = await getPaymentsByInvoice(invoiceId || invoice.id);
      setPayments(paymentsData || []);
      const total = (paymentsData || []).reduce((sum, p) => sum + p.amount, 0);
      setTotalPaid(total);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handlePrint = async () => {
    // Add print class to body and trigger print
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
    }, 100);
  };

  const generateInvoiceHTML = async () => {
    // Apply theme settings
    const bodyFont = settings?.body_font || 'Segoe UI';
    const headingFont = settings?.heading_font || bodyFont;
    const invoiceAccentColor = settings?.invoice_accent_color || '#2563eb';
    const headerColor = settings?.invoice_header_color || '#0f172a';
    const textPrimary = settings?.text_primary_color || '#1e293b';
    const textSecondary = settings?.text_secondary_color || '#64748b';
    const textMuted = '#94a3b8';
    const showLogo = (settings?.show_logo_on_invoice ?? 1) ? true : false;
    const showAddress = (settings?.show_company_address_on_invoice ?? 1) ? true : false;
    const showBorder = (settings?.show_invoice_border ?? 1) ? true : false;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${fullInvoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: '${bodyFont}', system-ui, -apple-system, sans-serif;
            color: ${textPrimary};
            font-size: 12px;
            line-height: 1.5;
          }
          .accent-line {
            height: 4px;
            background: linear-gradient(90deg, ${invoiceAccentColor} 0%, #7c3aed 100%);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 32px 40px 24px;
          }
          .invoice-label {
            font-family: '${headingFont}', system-ui, sans-serif;
            font-size: 32px;
            font-weight: 800;
            color: ${headerColor};
            letter-spacing: -0.5px;
            line-height: 1;
          }
          .invoice-num {
            margin-top: 6px;
            font-size: 13px;
            font-weight: 700;
            color: ${invoiceAccentColor};
            margin-bottom: 12px;
          }
          .company-name {
            font-family: '${headingFont}', system-ui, sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: ${headerColor};
            margin-bottom: 4px;
          }
          .company-detail {
            font-size: 11px;
            color: ${textSecondary};
            line-height: 1.55;
          }
          .company-logo {
            max-height: 140px;
            max-width: 140px;
            border-radius: 16px;
            display: block;
          }
          .divider {
            border: none;
            height: 1px;
            background: #e2e8f0;
            margin: 0 40px;
          }
          .client-row {
            display: flex;
            padding: 22px 40px;
            gap: 24px;
          }
          .client-col {
            flex: 1;
            min-width: 0;
          }
          .col-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: ${invoiceAccentColor};
            margin-bottom: 6px;
          }
          .col-name {
            font-size: 13px;
            font-weight: 600;
            color: ${headerColor};
            margin-bottom: 2px;
          }
          .col-line {
            font-size: 11px;
            color: ${textSecondary};
            line-height: 1.5;
          }
          .col-line.muted {
            font-size: 10px;
            color: ${textMuted};
            font-style: italic;
          }
          .details-col {
            width: 200px;
            flex-shrink: 0;
          }
          .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 11px;
          }
          .detail-item .dt {
            color: ${textMuted};
            font-weight: 500;
          }
          .detail-item .dd {
            color: ${textPrimary};
            font-weight: 600;
            text-align: right;
          }
          .items-wrap {
            padding: 6px 40px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.7px;
            color: ${textSecondary};
            padding: 10px 12px;
            border-bottom: 2px solid ${invoiceAccentColor};
            background: transparent;
            text-align: left;
          }
          th.r, td.r { text-align: right; }
          th.c, td.c { text-align: center; }
          tbody td {
            padding: 10px 12px;
            font-size: 11.5px;
            color: ${textPrimary};
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }
          tbody tr:last-child td {
            border-bottom: 2px solid #e2e8f0;
          }
          .desc-main {
            font-weight: 500;
            color: ${headerColor};
          }
          .sku-cell {
            font-family: 'SF Mono', 'Consolas', monospace;
            font-size: 10px;
            color: ${textSecondary};
            white-space: nowrap;
          }
          td.amount {
            font-weight: 700;
            color: ${headerColor};
            font-variant-numeric: tabular-nums;
          }
          td.r {
            font-variant-numeric: tabular-nums;
          }
          .totals-area {
            display: flex;
            justify-content: flex-end;
            padding: 12px 40px 0;
          }
          .totals-stack {
            width: 260px;
          }
          .t-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 11.5px;
          }
          .t-row .t-label { color: ${textSecondary}; }
          .t-row .t-val {
            font-weight: 500;
            color: ${textPrimary};
            font-variant-numeric: tabular-nums;
          }
          .t-line {
            border: none;
            height: 1px;
            background: #e2e8f0;
            margin: 4px 0;
          }
          .t-total {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            padding: 10px 0 0;
          }
          .t-total .t-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${headerColor};
          }
          .t-total .t-val {
            font-size: 20px;
            font-weight: 800;
            color: ${invoiceAccentColor};
            font-variant-numeric: tabular-nums;
            letter-spacing: -0.3px;
          }
          .bottom-row {
            display: flex;
            gap: 16px;
            padding: 20px 40px 0;
          }
          .bottom-item {
            flex: 1;
            min-width: 0;
            padding-top: 12px;
            border-top: 2px solid #f1f5f9;
          }
          .bottom-item h4 {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: ${invoiceAccentColor};
            margin-bottom: 5px;
          }
          .bottom-item p {
            font-size: 11px;
            color: ${textSecondary};
            line-height: 1.55;
            white-space: pre-wrap;
          }
          .footer {
            margin: 22px 40px 0;
            padding: 16px 0 28px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
          }
          .footer-thank {
            font-size: 12px;
            font-weight: 600;
            color: ${invoiceAccentColor};
            margin-bottom: 2px;
          }
          .footer-info {
            font-size: 10px;
            color: ${textMuted};
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="accent-line"></div>

        <div class="header">
          <div>
            <div class="invoice-label">INVOICE</div>
            <div class="invoice-num">${fullInvoice.invoice_number}</div>
            <div class="company-name">${settings?.company_name || 'Your Company'}</div>
            <div class="company-detail">
              ${showAddress ? `
                ${settings?.company_address ? `${settings.company_address}<br>` : ''}
                ${settings?.company_city ? `${settings.company_city}${settings?.company_state ? ', ' + settings.company_state : ''} ${settings?.company_zip || ''}<br>` : ''}
              ` : ''}
              ${settings?.company_email ? `${settings.company_email}` : ''}${settings?.company_phone ? ` &middot; ${settings.company_phone}` : ''}
              ${settings?.company_website ? `<br>${settings.company_website}` : ''}
            </div>
          </div>
          ${showLogo && settings?.logo_url ? `
            <div style="flex-shrink:0;">
              <img src="${settings.logo_url}" alt="Logo" class="company-logo" />
            </div>
          ` : ''}
        </div>

        <hr class="divider">

        <div class="client-row">
          <div class="client-col">
            <div class="col-label">Bill To</div>
            <div class="col-name">${fullInvoice?.client_name || 'Client Name'}</div>
            ${settings?.show_client_email_on_invoice && fullInvoice?.client_email ? `<div class="col-line">${fullInvoice.client_email}</div>` : ''}
            ${settings?.show_client_phone_on_invoice && fullInvoice?.client_phone ? `<div class="col-line">${fullInvoice.client_phone}</div>` : ''}
            ${(settings?.show_client_billing_address_on_invoice ?? 1) ? (() => {
              const billAddr = fullInvoice?.billing_address || fullInvoice?.client_address;
              const billCity = fullInvoice?.billing_city || fullInvoice?.client_city;
              const billState = fullInvoice?.billing_state || fullInvoice?.client_state;
              const billZip = fullInvoice?.billing_zip || fullInvoice?.client_zip;
              return billAddr ? `
                <div class="col-line">${billAddr}</div>
                ${billCity ? `<div class="col-line">${billCity}${billState ? ', ' + billState : ''} ${billZip || ''}</div>` : ''}
              ` : '';
            })() : ''}
            ${settings?.show_client_tax_id_on_invoice && fullInvoice?.tax_id ? `<div class="col-line muted">Tax ID: ${fullInvoice.tax_id}</div>` : ''}
          </div>
          ${((settings?.show_client_shipping_address_on_invoice ?? 1) && fullInvoice?.show_shipping_address !== 0) ? `
          <div class="client-col">
            <div class="col-label">Ship To</div>
            ${(() => {
              const shipAddr = fullInvoice?.shipping_address;
              const shipCity = fullInvoice?.shipping_city;
              const shipState = fullInvoice?.shipping_state;
              const shipZip = fullInvoice?.shipping_zip;
              if (shipAddr) {
                return `
                  <div class="col-line">${shipAddr}</div>
                  ${shipCity ? `<div class="col-line">${shipCity}${shipState ? ', ' + shipState : ''} ${shipZip || ''}</div>` : ''}
                `;
              }
              const fallbackAddr = fullInvoice?.billing_address || fullInvoice?.client_address;
              const fallbackCity = fullInvoice?.billing_city || fullInvoice?.client_city;
              const fallbackState = fullInvoice?.billing_state || fullInvoice?.client_state;
              const fallbackZip = fullInvoice?.billing_zip || fullInvoice?.client_zip;
              return `
                ${fallbackAddr ? `<div class="col-line">${fallbackAddr}</div>` : '<div class="col-line">No address</div>'}
                ${fallbackCity ? `<div class="col-line">${fallbackCity}${fallbackState ? ', ' + fallbackState : ''} ${fallbackZip || ''}</div>` : ''}
                <div class="col-line muted">(Same as billing)</div>
              `;
            })()}
          </div>
          ` : ''}
          <div class="details-col">
            <div class="col-label">Details</div>
            <div class="detail-item">
              <span class="dt">Invoice Date</span>
              <span class="dd">${formatDate(fullInvoice?.date || '')}</span>
            </div>
            <div class="detail-item">
              <span class="dt">Due Date</span>
              <span class="dd">${formatDate(fullInvoice?.due_date || '')}</span>
            </div>
            ${fullInvoice?.payment_terms ? `
            <div class="detail-item">
              <span class="dt">Terms</span>
              <span class="dd">${fullInvoice.payment_terms}</span>
            </div>
            ` : ''}
            ${settings?.show_customer_numbers && fullInvoice?.customer_number ? `
            <div class="detail-item">
              <span class="dt">Customer #</span>
              <span class="dd">${fullInvoice.customer_number}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <hr class="divider">

        <div class="items-wrap">
          <table>
            <thead>
              <tr>
                ${settings?.show_item_sku_on_invoice ? '<th style="width:72px">SKU</th>' : ''}
                <th>Description</th>
                <th class="c" style="width:48px">Qty</th>
                ${settings?.show_item_unit_on_invoice ? '<th class="c" style="width:56px">Unit</th>' : ''}
                <th class="r" style="width:88px">Rate</th>
                <th class="r" style="width:96px">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(fullInvoice.items || []).map(item => `
                <tr>
                  ${settings?.show_item_sku_on_invoice ? `<td class="sku-cell">${item.sku || '-'}</td>` : ''}
                  <td><div class="desc-main">${item.description}</div></td>
                  <td class="c">${item.quantity}</td>
                  ${settings?.show_item_unit_on_invoice ? `<td class="c">${item.unit_of_measure || 'Each'}</td>` : ''}
                  <td class="r">${formatCurrency(item.rate)}</td>
                  <td class="r amount">${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="totals-area">
          <div class="totals-stack">
            <div class="t-row">
              <span class="t-label">Subtotal</span>
              <span class="t-val">${formatCurrency(fullInvoice?.subtotal || 0)}</span>
            </div>
            ${fullInvoice?.discount ? `
            <div class="t-row">
              <span class="t-label">Discount</span>
              <span class="t-val">-${formatCurrency(fullInvoice.discount)}</span>
            </div>
            ` : ''}
            <div class="t-row">
              <span class="t-label">Tax (${settings?.tax_rate || 0}%)</span>
              <span class="t-val">${formatCurrency(fullInvoice?.tax || 0)}</span>
            </div>
            <hr class="t-line">
            <div class="t-total">
              <span class="t-label">Total Due</span>
              <span class="t-val">${formatCurrency(fullInvoice?.total || 0)}</span>
            </div>
          </div>
        </div>

        <div class="bottom-row">
          ${fullInvoice?.notes ? `
          <div class="bottom-item">
            <h4>Notes</h4>
            <p>${fullInvoice.notes}</p>
          </div>
          ` : ''}
          ${((settings?.show_payment_terms ?? 1) && settings?.payment_terms) ? `
          <div class="bottom-item">
            <h4>Payment Terms</h4>
            <p>${settings.payment_terms}</p>
          </div>
          ` : ''}
          ${settings?.bank_details ? `
          <div class="bottom-item">
            <h4>Bank Details</h4>
            <p>${settings.bank_details}</p>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div class="footer-thank">${settings?.invoice_footer || 'Thank you for your business!'}</div>
          <div class="footer-info">${settings?.company_name || 'Your Company'}${settings?.company_email ? ` &middot; ${settings.company_email}` : ''}${settings?.company_website ? ` &middot; ${settings.company_website}` : ''}</div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = async () => {
    try {
      const invoiceHtml = generateInvoiceHTML();
      const result = await saveInvoiceAsPDF(invoiceHtml, fullInvoice.invoice_number);

      if (result.success) {
        console.log(`Invoice PDF saved successfully at: ${result.filePath}`);
      } else if (result.canceled) {
        // User canceled the save dialog
        console.log('PDF save canceled by user');
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
      console.error('Error saving PDF: ' + error.message);
    }
  };

  const handleOpenEmailModal = async () => {
    // Populate email template variables
    const subject = (settings?.email_subject_template || 'Invoice {invoice_number} from {company_name}')
      .replace('{invoice_number}', fullInvoice?.invoice_number || '')
      .replace('{company_name}', settings?.company_name || '')
      .replace('{total}', formatCurrency(fullInvoice?.total || 0));

    const body = (settings?.email_body_template || 'Dear {client_name},\n\nPlease find attached invoice {invoice_number} for {total}.\n\nThank you for your business!\n\nBest regards,\n{company_name}')
      .replace('{client_name}', fullInvoice?.client_name || 'Valued Customer')
      .replace('{invoice_number}', fullInvoice?.invoice_number || '')
      .replace('{total}', formatCurrency(fullInvoice?.total || 0))
      .replace('{due_date}', formatDate(fullInvoice?.due_date || ''))
      .replace('{company_name}', settings?.company_name || '');

    setEmailData({
      recipient: fullInvoice.client_email || '',
      subject: subject,
      body: body,
      cc: settings?.email_cc || '',
      bcc: settings?.email_bcc || ''
    });

    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    // Validate
    if (!emailData.recipient || !emailData.recipient.trim()) {
      console.error('Please enter a recipient email address');
      return;
    }

    if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
      console.error('Email settings are not configured. Please configure SMTP settings in Settings > Email Templates.');
      return;
    }

    if (!fullInvoice || !fullInvoice.items || fullInvoice.items.length === 0) {
      console.error('Invoice data is not fully loaded. Please wait a moment and try again.');
      return;
    }

    try {
      setSending(true);
      const invoiceHtml = generateInvoiceHTML();

      const result = await sendInvoiceEmail({
        settings,
        recipient: emailData.recipient,
        subject: emailData.subject,
        body: emailData.body,
        cc: emailData.cc,
        bcc: emailData.bcc,
        invoiceHtml,
        invoiceNumber: fullInvoice.invoice_number
      });

      if (result.success) {
        console.error(result.message || 'Invoice email sent successfully!');
        setShowEmailModal(false);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Error sending email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateStripeLink = async () => {
    try {
      setGeneratingPaymentLink(true);
      const result = await createStripePaymentLink({
        settings,
        invoice: fullInvoice,
        client: { id: fullInvoice.client_id, name: fullInvoice.client_name }
      });

      if (result.success) {
        setStripePaymentLink(result.paymentLink);
        console.log('Stripe payment link generated! You can now copy and send it to your client.');
      }
    } catch (error) {
      console.error('Error generating Stripe link:', error);
      console.error(error.message || 'Error generating Stripe payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleGeneratePayPalLink = async () => {
    try {
      setGeneratingPaymentLink(true);
      const result = await createPayPalPaymentLink({
        settings,
        invoice: fullInvoice
      });

      if (result.success) {
        setPaypalPaymentLink(result.paymentLink);
        console.log('PayPal payment link generated! You can now copy and send it to your client.');
      }
    } catch (error) {
      console.error('Error generating PayPal link:', error);
      console.error(error.message || 'Error generating PayPal payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleGenerateSquareLink = async () => {
    try {
      setGeneratingPaymentLink(true);
      const result = await createSquarePaymentLink({
        settings,
        invoice: fullInvoice,
        client: { id: fullInvoice.client_id, name: fullInvoice.client_name }
      });

      if (result.success) {
        setSquarePaymentLink(result.paymentLink);
        console.log('Square payment link generated! You can now copy and send it to your client.');
      }
    } catch (error) {
      console.error('Error generating Square link:', error);
      console.error(error.message || 'Error generating Square payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleGenerateGoCardlessLink = async () => {
    try {
      setGeneratingPaymentLink(true);
      const result = await createGoCardlessPaymentLink({
        settings,
        invoice: fullInvoice,
        client: { id: fullInvoice.client_id, name: fullInvoice.client_name }
      });

      if (result.success) {
        setGoCardlessPaymentLink(result.paymentLink);
        console.log('GoCardless payment link generated! You can now copy and send it to your client.');
      }
    } catch (error) {
      console.error('Error generating GoCardless link:', error);
      console.error(error.message || 'Error generating GoCardless payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  /**
   * Generates an Authorize.Net hosted payment page link for this invoice
   * Creates a secure HMAC-MD5 fingerprint authenticated URL that clients can use to pay
   * The link is valid and directs to Authorize.Net's PCI-compliant payment form
   */
  const handleGenerateAuthorizeNetLink = async () => {
    try {
      setGeneratingPaymentLink(true);
      const result = await createAuthorizeNetPaymentLink({
        settings,
        invoice: fullInvoice,
        client: { id: fullInvoice.client_id, name: fullInvoice.client_name }
      });

      if (result.success) {
        setAuthorizeNetPaymentLink(result.paymentLink);
        console.log('Authorize.Net payment link generated! You can now copy and send it to your client.');
      }
    } catch (error) {
      console.error('Error generating Authorize.Net link:', error);
      console.error(error.message || 'Error generating Authorize.Net payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleCopyLink = async (link, gateway) => {
    navigator.clipboard.writeText(link);
    console.log(`${gateway} payment link copied to clipboard!`);
  };

  const handleOpenPaymentModal = async () => {
    // Reset payment form with remaining balance as suggested amount
    const balanceDue = fullInvoice.total - totalPaid;
    setPaymentData({
      amount: balanceDue > 0 ? balanceDue.toFixed(2) : '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      reference_number: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    // Validate
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      console.error('Please enter a valid payment amount');
      return;
    }

    try {
      setSavingPayment(true);
      await createPayment({
        invoice_id: fullInvoice.id,
        amount: parseFloat(paymentData.amount),
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes
      });

      // Reload payments and invoice to get updated status
      await Promise.all([
        loadPayments(fullInvoice.id),
        loadInvoiceData()
      ]);

      console.log('Payment recorded successfully!');
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error recording payment:', error);
      console.error('Error recording payment: ' + error.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!await window.customConfirm('Are you sure you want to delete this payment? This will update the invoice status.')) {
      return;
    }

    try {
      await deletePayment(paymentId);

      // Reload payments and invoice
      await Promise.all([
        loadPayments(fullInvoice.id),
        loadInvoiceData()
      ]);

      console.log('Payment deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      console.error('Error deleting payment: ' + error.message);
    }
  };

  const handleProcessCardPayment = async () => {
    // Validate card details
    if (!cardDetails.number || !cardDetails.name || !cardDetails.expMonth || !cardDetails.expYear || !cardDetails.cvc) {
      console.error('Please fill in all card details');
      return;
    }

    // Basic card number validation
    const cardNumber = cardDetails.number.replace(/\s/g, '');
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      console.error('Please enter a valid card number');
      return;
    }

    // Validate expiry
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(cardDetails.expYear);
    const expMonth = parseInt(cardDetails.expMonth);

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      console.error('Card has expired');
      return;
    }

    // Validate CVC
    if (cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
      console.error('Please enter a valid CVC');
      return;
    }

    try {
      setProcessingCardPayment(true);

      // Calculate balance due
      const balanceDue = Math.max(0, fullInvoice.total - totalPaid);

      // Step 1: Create payment intent
      const intentResult = await window.electron.ipcRenderer.invoke('payment:createPaymentIntent', {
        settings,
        invoice: fullInvoice,
        client: { id: fullInvoice.client_id, name: fullInvoice.client_name },
        amount: balanceDue,
      });

      if (!intentResult.success) {
        throw new Error('Failed to create payment intent');
      }

      // Step 2: Process card payment
      const paymentResult = await window.electron.ipcRenderer.invoke('payment:processCardPayment', {
        settings,
        cardDetails,
        clientSecret: intentResult.clientSecret,
      });

      if (paymentResult.success) {
        // Record the payment in the database
        await createPayment({
          invoice_id: fullInvoice.id,
          amount: balanceDue,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'Credit Card (Stripe)',
          reference_number: paymentResult.paymentIntentId,
          notes: 'Online payment via Stripe'
        });

        // Reload payments and invoice to get updated status
        await Promise.all([
          loadPayments(fullInvoice.id),
          loadInvoiceData()
        ]);

        console.error('Payment successful! Thank you for your payment.');
        setShowCardPaymentModal(false);

        // Reset card details
        setCardDetails({
          number: '',
          name: '',
          expMonth: '',
          expYear: '',
          cvc: '',
        });
      } else {
        console.error(paymentResult.message || 'Payment failed. Please try again.');
      }

    } catch (error) {
      console.error('Error processing card payment:', error);
      console.error('Payment failed: ' + error.message);
    } finally {
      setProcessingCardPayment(false);
    }
  };

  const formatCardNumber = async (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add space every 4 digits
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    return formatted;
  };

  const handleCardNumberChange = async (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 19) {
      setCardDetails(prev => ({ ...prev, number: formatted }));
    }
  };

  if (loading || !fullInvoice) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-3xl font-bold text-gray-900">Invoice Preview</h1>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={handleOpenEmailModal}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Payment Tracking Section
            This section displays payment status, generates payment links, and tracks payment history.
            Features:
            - Generate payment links for multiple gateways (Stripe, PayPal, Square, GoCardless, Authorize.Net)
            - Record manual payments (cash, check, wire transfer, etc.)
            - View payment history with delete capability
            - Visual progress bar showing payment completion
            - Balance due calculation
        */}
        {fullInvoice && (
          <div className="bg-white shadow-lg rounded-lg p-6 mb-6 print:hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <DollarSign className="w-6 h-6 mr-2 text-green-600" />
                Payment Tracking
              </h2>
              {/* Payment Gateway Buttons - Each button generates a payment link for that gateway */}
              <div className="flex space-x-2">
                {settings?.stripe_enabled && (fullInvoice.total - totalPaid) > 0 && (
                  <>
                    <button
                      onClick={handleGenerateStripeLink}
                      disabled={generatingPaymentLink}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {generatingPaymentLink ? 'Generating...' : 'Stripe Payment Link'}
                    </button>
                  </>
                )}
                {settings?.paypal_enabled && (fullInvoice.total - totalPaid) > 0 && (
                  <button
                    onClick={handleGeneratePayPalLink}
                    disabled={generatingPaymentLink}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    {generatingPaymentLink ? 'Generating...' : 'PayPal Payment Link'}
                  </button>
                )}
                {settings?.square_enabled && (fullInvoice.total - totalPaid) > 0 && (
                  <button
                    onClick={handleGenerateSquareLink}
                    disabled={generatingPaymentLink}
                    className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {generatingPaymentLink ? 'Generating...' : 'Square Payment Link'}
                  </button>
                )}
                {settings?.gocardless_enabled && (fullInvoice.total - totalPaid) > 0 && (
                  <button
                    onClick={handleGenerateGoCardlessLink}
                    disabled={generatingPaymentLink}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    {generatingPaymentLink ? 'Generating...' : 'GoCardless ACH/Bank'}
                  </button>
                )}
                {settings?.authorizenet_enabled && (fullInvoice.total - totalPaid) > 0 && (
                  <button
                    onClick={handleGenerateAuthorizeNetLink}
                    disabled={generatingPaymentLink}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {generatingPaymentLink ? 'Generating...' : 'Authorize.Net Enterprise'}
                  </button>
                )}
                <button
                  onClick={handleOpenPaymentModal}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </button>
              </div>
            </div>

            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">Total Amount</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(fullInvoice.total)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
              </div>
              <div className={`p-4 rounded-lg border ${
                fullInvoice.total - totalPaid > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-sm font-medium ${
                  fullInvoice.total - totalPaid > 0 ? 'text-orange-600' : 'text-gray-600'
                }`}>Balance Due</p>
                <p className={`text-2xl font-bold ${
                  fullInvoice.total - totalPaid > 0 ? 'text-orange-900' : 'text-gray-900'
                }`}>{formatCurrency(Math.max(0, fullInvoice.total - totalPaid))}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Payment Progress</span>
                <span>{fullInvoice.total > 0 ? Math.min(100, Math.round((totalPaid / fullInvoice.total) * 100)) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    totalPaid >= fullInvoice.total ? 'bg-green-600' :
                    totalPaid > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                  style={{ width: `${fullInvoice.total > 0 ? Math.min(100, (totalPaid / fullInvoice.total) * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Payment Links Display Section
                Shows all generated payment links with copy-to-clipboard functionality.
                Links are displayed after clicking the respective gateway button above.
                Each link can be copied and sent to the client via email or messaging.
                Supported gateways: Stripe, PayPal, Square, GoCardless, Authorize.Net
            */}
            {(stripePaymentLink || paypalPaymentLink || squarePaymentLink || goCardlessPaymentLink || authorizeNetPaymentLink) && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-900 mb-3">Generated Payment Links</h3>
                {stripePaymentLink && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Payment Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={stripePaymentLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      />
                      <button
                        onClick={() => handleCopyLink(stripePaymentLink, 'Stripe')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {paypalPaymentLink && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Payment Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paypalPaymentLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      />
                      <button
                        onClick={() => handleCopyLink(paypalPaymentLink, 'PayPal')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {squarePaymentLink && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Square Payment Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={squarePaymentLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      />
                      <button
                        onClick={() => handleCopyLink(squarePaymentLink, 'Square')}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {goCardlessPaymentLink && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">GoCardless Payment Link (ACH/Bank Transfer)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={goCardlessPaymentLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      />
                      <button
                        onClick={() => handleCopyLink(goCardlessPaymentLink, 'GoCardless')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {authorizeNetPaymentLink && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authorize.Net Payment Link (Enterprise)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={authorizeNetPaymentLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      />
                      <button
                        onClick={() => handleCopyLink(authorizeNetPaymentLink, 'Authorize.Net')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-3">
                  💡 Copy these links and send them to your client via email or message. They can click to pay securely.
                </p>
              </div>
            )}

            {/* Payment History */}
            {payments.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reference</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                          <td className="py-3 px-4 text-sm text-gray-700">{payment.payment_method}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{payment.reference_number || '-'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{payment.notes || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No payments recorded yet</p>
                <p className="text-sm mt-1">Click "Record Payment" to add a payment</p>
              </div>
            )}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Balance due: {formatCurrency(Math.max(0, fullInvoice.total - totalPaid))}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="ACH">ACH</option>
                      <option value="Wire Transfer">Wire Transfer</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Venmo">Venmo</option>
                      <option value="Zelle">Zelle</option>
                      <option value="Stripe">Stripe</option>
                      <option value="Square">Square</option>
                      <option value="Apple Pay">Apple Pay</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="Cryptocurrency">Cryptocurrency</option>
                      <option value="Money Order">Money Order</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={paymentData.reference_number}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Check #, Transaction ID, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Additional notes about this payment..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={savingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={savingPayment}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {savingPayment ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Send Invoice by Email</h2>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={emailData.recipient}
                      onChange={(e) => setEmailData(prev => ({ ...prev, recipient: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="client@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Invoice subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={emailData.body}
                      onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                      rows="8"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                      placeholder="Email message..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CC
                      </label>
                      <input
                        type="text"
                        value={emailData.cc}
                        onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="accounting@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        BCC
                      </label>
                      <input
                        type="text"
                        value={emailData.bcc}
                        onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="records@example.com"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Attachment:</strong> Invoice-{fullInvoice.invoice_number}.pdf
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sending}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card Payment Modal */}
        {showCardPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Pay with Credit Card</h2>
                  <button
                    onClick={() => setShowCardPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={processingCardPayment}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Amount Due:</strong> {formatCurrency(Math.max(0, fullInvoice.total - totalPaid))}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Invoice #{fullInvoice.invoice_number}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardDetails.number}
                      onChange={handleCardNumberChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      disabled={processingCardPayment}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Doe"
                      disabled={processingCardPayment}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Month <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardDetails.expMonth}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 2 && (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12))) {
                            setCardDetails(prev => ({ ...prev, expMonth: value }));
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="MM"
                        maxLength="2"
                        disabled={processingCardPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardDetails.expYear}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 2) {
                            setCardDetails(prev => ({ ...prev, expYear: value }));
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="YY"
                        maxLength="2"
                        disabled={processingCardPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardDetails.cvc}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 4) {
                            setCardDetails(prev => ({ ...prev, cvc: value }));
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123"
                        maxLength="4"
                        disabled={processingCardPayment}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Your payment is secured with SSL encryption
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCardPaymentModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    disabled={processingCardPayment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessCardPayment}
                    disabled={processingCardPayment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {processingCardPayment ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay {formatCurrency(Math.max(0, fullInvoice.total - totalPaid))}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Document - On-screen preview matching PDF design */}
        <div className="invoice-doc bg-white shadow-lg overflow-hidden rounded-lg" style={{ fontFamily: settings?.body_font || 'Segoe UI, system-ui, sans-serif' }}>
          {/* Accent line */}
          <div style={{ height: '4px', background: `linear-gradient(90deg, ${settings?.invoice_accent_color || '#2563eb'} 0%, #7c3aed 100%)` }} />

          {/* Header */}
          <div className="flex justify-between items-start" style={{ padding: '32px 40px 24px' }}>
            <div>
              <div style={{ fontFamily: settings?.heading_font || settings?.body_font || 'Segoe UI, system-ui, sans-serif', fontSize: '32px', fontWeight: 800, color: settings?.invoice_header_color || '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>INVOICE</div>
              <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: settings?.invoice_accent_color || '#2563eb', marginBottom: '12px' }}>{fullInvoice.invoice_number}</div>
              <div style={{ fontFamily: settings?.heading_font || settings?.body_font || 'Segoe UI, system-ui, sans-serif', fontSize: '18px', fontWeight: 700, color: settings?.invoice_header_color || '#0f172a', marginBottom: '4px' }}>{settings?.company_name || 'Your Company'}</div>
              <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b', lineHeight: 1.55 }}>
                {(settings?.show_company_address_on_invoice ?? 1) && (
                  <>
                    {settings?.company_address && <>{settings.company_address}<br /></>}
                    {settings?.company_city && <>{settings.company_city}{settings?.company_state && `, ${settings.company_state}`} {settings?.company_zip || ''}<br /></>}
                  </>
                )}
                {settings?.company_email}{settings?.company_phone && ` · ${settings.company_phone}`}
                {settings?.company_website && <><br />{settings.company_website}</>}
              </div>
            </div>
            {(settings?.show_logo_on_invoice ?? 1) && settings?.logo_url && (
              <div style={{ flexShrink: 0 }}>
                <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '140px', maxWidth: '140px', borderRadius: '16px', display: 'block' }} />
              </div>
            )}
          </div>

          <hr style={{ border: 'none', height: '1px', background: '#e2e8f0', margin: '0 40px' }} />

          {/* Client row */}
          <div className="flex" style={{ padding: '22px 40px', gap: '24px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '6px' }}>Bill To</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: settings?.invoice_header_color || '#0f172a', marginBottom: '2px' }}>{fullInvoice.client_name}</div>
              {settings?.show_client_email_on_invoice && fullInvoice.client_email && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullInvoice.client_email}</div>}
              {settings?.show_client_phone_on_invoice && fullInvoice.client_phone && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullInvoice.client_phone}</div>}
              {(settings?.show_client_billing_address_on_invoice ?? 1) && (() => {
                const addr = fullInvoice.billing_address || fullInvoice.client_address;
                const city = fullInvoice.billing_city || fullInvoice.client_city;
                const state = fullInvoice.billing_state || fullInvoice.client_state;
                const zip = fullInvoice.billing_zip || fullInvoice.client_zip;
                return addr ? (
                  <>
                    <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{addr}</div>
                    {city && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{city}{state && `, ${state}`} {zip || ''}</div>}
                  </>
                ) : null;
              })()}
              {settings?.show_client_tax_id_on_invoice && fullInvoice.tax_id && <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Tax ID: {fullInvoice.tax_id}</div>}
            </div>

            {(settings?.show_client_shipping_address_on_invoice ?? 1) && fullInvoice.show_shipping_address !== 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '6px' }}>Ship To</div>
                {fullInvoice.shipping_address ? (
                  <>
                    <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullInvoice.shipping_address}</div>
                    {fullInvoice.shipping_city && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullInvoice.shipping_city}{fullInvoice.shipping_state && `, ${fullInvoice.shipping_state}`} {fullInvoice.shipping_zip || ''}</div>}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullInvoice.billing_address || fullInvoice.client_address || 'No address'}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>(Same as billing)</div>
                  </>
                )}
              </div>
            )}

            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '6px' }}>Details</div>
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Invoice Date</span>
                <span style={{ color: settings?.text_primary_color || '#1e293b', fontWeight: 600 }}>{formatDate(fullInvoice.date)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Due Date</span>
                <span style={{ color: settings?.text_primary_color || '#1e293b', fontWeight: 600 }}>{formatDate(fullInvoice.due_date)}</span>
              </div>
              {fullInvoice.payment_terms && (
                <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>Terms</span>
                  <span style={{ color: settings?.text_primary_color || '#1e293b', fontWeight: 600 }}>{fullInvoice.payment_terms}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Status</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  fullInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  fullInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  fullInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{fullInvoice.status?.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', height: '1px', background: '#e2e8f0', margin: '0 40px' }} />

          {/* Line Items */}
          <div style={{ padding: '6px 40px 0' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {settings?.show_item_sku_on_invoice && <th style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: settings?.text_secondary_color || '#64748b', padding: '10px 12px', borderBottom: `2px solid ${settings?.invoice_accent_color || '#2563eb'}`, textAlign: 'left', width: '72px' }}>SKU</th>}
                  <th style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: settings?.text_secondary_color || '#64748b', padding: '10px 12px', borderBottom: `2px solid ${settings?.invoice_accent_color || '#2563eb'}`, textAlign: 'left' }}>Description</th>
                  <th style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: settings?.text_secondary_color || '#64748b', padding: '10px 12px', borderBottom: `2px solid ${settings?.invoice_accent_color || '#2563eb'}`, textAlign: 'center', width: '48px' }}>Qty</th>
                  {settings?.show_item_unit_on_invoice && <th style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: settings?.text_secondary_color || '#64748b', padding: '10px 12px', borderBottom: `2px solid ${settings?.invoice_accent_color || '#2563eb'}`, textAlign: 'center', width: '56px' }}>Unit</th>}
                  <th style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: settings?.text_secondary_color || '#64748b', padding: '10px 12px', borderBottom: `2px solid ${settings?.invoice_accent_color || '#2563eb'}`, textAlign: 'right', width: '88px' }}>Rate</th>
                  <th style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: settings?.text_secondary_color || '#64748b', padding: '10px 12px', borderBottom: `2px solid ${settings?.invoice_accent_color || '#2563eb'}`, textAlign: 'right', width: '96px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {fullInvoice.items && fullInvoice.items.map((item, index) => (
                  <tr key={index}>
                    {settings?.show_item_sku_on_invoice && <td style={{ padding: '10px 12px', fontSize: '10px', color: settings?.text_secondary_color || '#64748b', borderBottom: '1px solid #f1f5f9', fontFamily: 'SF Mono, Consolas, monospace', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{item.sku || '-'}</td>}
                    <td style={{ padding: '10px 12px', fontSize: '11.5px', color: settings?.invoice_header_color || '#0f172a', borderBottom: '1px solid #f1f5f9', fontWeight: 500, verticalAlign: 'top' }}>{item.description}</td>
                    <td style={{ padding: '10px 12px', fontSize: '11.5px', color: settings?.text_primary_color || '#1e293b', borderBottom: '1px solid #f1f5f9', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
                    {settings?.show_item_unit_on_invoice && <td style={{ padding: '10px 12px', fontSize: '11.5px', color: settings?.text_primary_color || '#1e293b', borderBottom: '1px solid #f1f5f9', textAlign: 'center', verticalAlign: 'top' }}>{item.unit_of_measure || 'Each'}</td>}
                    <td style={{ padding: '10px 12px', fontSize: '11.5px', color: settings?.text_primary_color || '#1e293b', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' }}>{formatCurrency(item.rate)}</td>
                    <td style={{ padding: '10px 12px', fontSize: '11.5px', color: settings?.invoice_header_color || '#0f172a', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', verticalAlign: 'top' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end" style={{ padding: '12px 40px 0' }}>
            <div style={{ width: '260px' }}>
              <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                <span style={{ color: settings?.text_secondary_color || '#64748b' }}>Subtotal</span>
                <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fullInvoice.subtotal)}</span>
              </div>
              {fullInvoice.discount > 0 && (
                <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                  <span style={{ color: settings?.text_secondary_color || '#64748b' }}>Discount</span>
                  <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>-{formatCurrency(fullInvoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                <span style={{ color: settings?.text_secondary_color || '#64748b' }}>Tax ({settings?.tax_rate || 0}%)</span>
                <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fullInvoice.tax)}</span>
              </div>
              <hr style={{ border: 'none', height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
              <div className="flex justify-between items-baseline" style={{ paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: settings?.invoice_header_color || '#0f172a' }}>Total Due</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: settings?.invoice_accent_color || '#2563eb', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>{formatCurrency(fullInvoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex" style={{ gap: '16px', padding: '20px 40px 0' }}>
            {fullInvoice.notes && (
              <div style={{ flex: 1, minWidth: 0, paddingTop: '12px', borderTop: '2px solid #f1f5f9' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '5px' }}>Notes</h4>
                <p style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{fullInvoice.notes}</p>
              </div>
            )}
            {((settings?.show_payment_terms ?? 1) && settings?.payment_terms) && (
              <div style={{ flex: 1, minWidth: 0, paddingTop: '12px', borderTop: '2px solid #f1f5f9' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '5px' }}>Payment Terms</h4>
                <p style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{settings.payment_terms}</p>
              </div>
            )}
            {settings?.bank_details && (
              <div style={{ flex: 1, minWidth: 0, paddingTop: '12px', borderTop: '2px solid #f1f5f9' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '5px' }}>Bank Details</h4>
                <p style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{settings.bank_details}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ margin: '22px 40px 0', padding: '16px 0 28px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: settings?.invoice_accent_color || '#2563eb', marginBottom: '2px' }}>{settings?.invoice_footer || 'Thank you for your business!'}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{settings?.company_name || 'Your Company'}{settings?.company_email && ` · ${settings.company_email}`}{settings?.company_website && ` · ${settings.company_website}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicePreview;
