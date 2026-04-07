import React, { useState, useEffect, useCallback } from 'react';
import { X, Printer, Download, Mail, Edit } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { formatCurrency, formatDate } from '../utils/formatting';

function QuotePreview({ quote, onClose, onEdit }) {
  const [fullQuote, setFullQuote] = useState(null);
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
  const { getQuote, getSettings, saveInvoiceAsPDF, sendQuoteEmail } = useDatabase();

  const loadQuoteData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('QuotePreview: Loading quote with ID:', quote.id);
      console.log('QuotePreview: Quote prop:', quote);
      const [quoteData, settingsData] = await Promise.all([
        getQuote(quote.id),
        getSettings()
      ]);
      console.log('QuotePreview: Loaded quote data:', quoteData);
      setFullQuote(quoteData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading quote:', error);
      console.error('Error loading quote: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [quote.id, getQuote, getSettings]);

  useEffect(() => {
    loadQuoteData();
  }, [loadQuoteData]);

  const handlePrint = () => {
    // Add print class to body and trigger print
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
    }, 100);
  };

  const generateQuoteHTML = () => {
    const bodyFont = settings?.body_font || 'Segoe UI';
    const headingFont = settings?.heading_font || bodyFont;
    const quoteAccentColor = settings?.invoice_accent_color || '#2563eb';
    const headerColor = settings?.invoice_header_color || '#0f172a';
    const textPrimary = settings?.text_primary_color || '#1e293b';
    const textSecondary = settings?.text_secondary_color || '#64748b';
    const textMuted = '#94a3b8';
    const showLogo = (settings?.show_logo_on_invoice ?? 1) ? true : false;
    const showAddress = (settings?.show_company_address_on_invoice ?? 1) ? true : false;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quote ${fullQuote.quote_number}</title>
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
            background: linear-gradient(90deg, ${quoteAccentColor} 0%, #7c3aed 100%);
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
            color: ${quoteAccentColor};
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
            color: ${quoteAccentColor};
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
            border-bottom: 2px solid ${quoteAccentColor};
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
            color: ${quoteAccentColor};
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
            color: ${quoteAccentColor};
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
            color: ${quoteAccentColor};
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
            <div class="invoice-label">QUOTE</div>
            <div class="invoice-num">${fullQuote.quote_number}</div>
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
            <div class="col-label">Prepared For</div>
            <div class="col-name">${fullQuote?.client_name || 'Client Name'}</div>
            ${fullQuote?.client_email ? `<div class="col-line">${fullQuote.client_email}</div>` : ''}
            ${fullQuote?.client_phone ? `<div class="col-line">${fullQuote.client_phone}</div>` : ''}
            ${(() => {
              const addr = fullQuote?.billing_address || fullQuote?.client_address;
              const city = fullQuote?.billing_city || fullQuote?.client_city;
              const state = fullQuote?.billing_state || fullQuote?.client_state;
              const zip = fullQuote?.billing_zip || fullQuote?.client_zip;
              return addr ? `
                <div class="col-line">${addr}</div>
                ${city ? `<div class="col-line">${city}${state ? ', ' + state : ''} ${zip || ''}</div>` : ''}
              ` : '';
            })()}
            ${fullQuote?.tax_id ? `<div class="col-line muted">Tax ID: ${fullQuote.tax_id}</div>` : ''}
          </div>
          ${fullQuote?.shipping_address ? `
          <div class="client-col">
            <div class="col-label">Ship To</div>
            <div class="col-line">${fullQuote.shipping_address}</div>
            ${fullQuote?.shipping_city ? `<div class="col-line">${fullQuote.shipping_city}${fullQuote?.shipping_state ? ', ' + fullQuote.shipping_state : ''} ${fullQuote?.shipping_zip || ''}</div>` : ''}
          </div>
          ` : ''}
          <div class="details-col">
            <div class="col-label">Details</div>
            <div class="detail-item">
              <span class="dt">Quote Date</span>
              <span class="dd">${formatDate(fullQuote?.date || '')}</span>
            </div>
            <div class="detail-item">
              <span class="dt">Valid Until</span>
              <span class="dd">${formatDate(fullQuote?.expiry_date || '')}</span>
            </div>
            ${settings?.show_customer_numbers && fullQuote?.customer_number ? `
            <div class="detail-item">
              <span class="dt">Customer #</span>
              <span class="dd">${fullQuote.customer_number}</span>
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
              ${(fullQuote.items || []).map(item => `
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
              <span class="t-val">${formatCurrency(fullQuote?.subtotal || 0)}</span>
            </div>
            ${fullQuote?.discount_amount ? `
            <div class="t-row">
              <span class="t-label">Discount${fullQuote.discount_type === 'percentage' ? ` (${fullQuote.discount_value}%)` : ''}</span>
              <span class="t-val">-${formatCurrency(fullQuote.discount_amount)}</span>
            </div>
            ` : ''}
            ${fullQuote?.shipping ? `
            <div class="t-row">
              <span class="t-label">Shipping</span>
              <span class="t-val">${formatCurrency(fullQuote.shipping)}</span>
            </div>
            ` : ''}
            <div class="t-row">
              <span class="t-label">Tax (${settings?.tax_rate || 0}%)</span>
              <span class="t-val">${formatCurrency(fullQuote?.tax || 0)}</span>
            </div>
            ${fullQuote?.adjustment ? `
            <div class="t-row">
              <span class="t-label">${fullQuote.adjustment_label || 'Adjustment'}</span>
              <span class="t-val">${fullQuote.adjustment > 0 ? '' : '-'}${formatCurrency(Math.abs(fullQuote.adjustment))}</span>
            </div>
            ` : ''}
            <hr class="t-line">
            <div class="t-total">
              <span class="t-label">Total</span>
              <span class="t-val">${formatCurrency(fullQuote?.total || 0)}</span>
            </div>
          </div>
        </div>

        <div class="bottom-row">
          ${fullQuote?.notes ? `
          <div class="bottom-item">
            <h4>Notes</h4>
            <p>${fullQuote.notes}</p>
          </div>
          ` : ''}
          ${fullQuote?.terms ? `
          <div class="bottom-item">
            <h4>Terms</h4>
            <p>${fullQuote.terms}</p>
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
          <div class="footer-thank">Thank you for considering this quote!</div>
          <div class="footer-info">${settings?.company_name || 'Your Company'}${settings?.company_email ? ` &middot; ${settings.company_email}` : ''}${settings?.company_website ? ` &middot; ${settings.company_website}` : ''}</div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = async () => {
    try {
      const quoteHtml = generateQuoteHTML();
      const result = await saveInvoiceAsPDF(quoteHtml, fullQuote.quote_number);

      if (result.success) {
        console.log(`Quote PDF saved successfully at: ${result.filePath}`);
      } else if (result.canceled) {
        // User canceled the save dialog
        console.log('PDF save canceled by user');
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
      console.error('Error saving PDF: ' + error.message);
    }
  };

  const handleOpenEmailModal = () => {
    // Populate email template variables
    const subject = (settings?.email_subject_template || 'Quote {quote_number} from {company_name}')
      .replace('{quote_number}', fullQuote?.quote_number || '')
      .replace('{company_name}', settings?.company_name || '')
      .replace('{total}', formatCurrency(fullQuote?.total || 0));

    const body = (settings?.email_body_template || 'Dear {client_name},\n\nPlease find attached quote {quote_number} for {total}.\n\nThank you for your business!\n\nBest regards,\n{company_name}')
      .replace('{client_name}', fullQuote?.client_name || 'Valued Customer')
      .replace('{quote_number}', fullQuote?.quote_number || '')
      .replace('{total}', formatCurrency(fullQuote?.total || 0))
      .replace('{expiry_date}', formatDate(fullQuote?.expiry_date || ''))
      .replace('{company_name}', settings?.company_name || '');

    setEmailData({
      recipient: fullQuote.client_email || '',
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

    if (!fullQuote || !fullQuote.items || fullQuote.items.length === 0) {
      console.error('Quote data is not fully loaded. Please wait a moment and try again.');
      return;
    }

    try {
      setSending(true);
      const quoteHtml = generateQuoteHTML();

      const result = await sendQuoteEmail({
        settings,
        recipient: emailData.recipient,
        subject: emailData.subject,
        body: emailData.body,
        cc: emailData.cc,
        bcc: emailData.bcc,
        quoteHtml,
        quoteNumber: fullQuote.quote_number
      });

      if (result.success) {
        console.error(result.message || 'Quote email sent successfully!');
        setShowEmailModal(false);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Error sending email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  if (loading || !fullQuote) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading quote...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-3xl font-bold text-gray-900">Quote Preview</h1>
          <div className="flex space-x-3">
            {onEdit && (
              <button
                onClick={() => onEdit(quote)}
                className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
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


        {/* Quote Document - On-screen preview matching PDF design */}
        <div className="invoice-doc bg-white shadow-lg overflow-hidden rounded-lg" style={{ fontFamily: settings?.body_font || 'Segoe UI, system-ui, sans-serif' }}>
          {/* Accent line */}
          <div style={{ height: '4px', background: `linear-gradient(90deg, ${settings?.invoice_accent_color || '#2563eb'} 0%, #7c3aed 100%)` }} />

          {/* Header */}
          <div className="flex justify-between items-start" style={{ padding: '32px 40px 24px' }}>
            <div>
              <div style={{ fontFamily: settings?.heading_font || settings?.body_font || 'Segoe UI, system-ui, sans-serif', fontSize: '32px', fontWeight: 800, color: settings?.invoice_header_color || '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>QUOTE</div>
              <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: settings?.invoice_accent_color || '#2563eb', marginBottom: '12px' }}>{fullQuote.quote_number}</div>
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
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '6px' }}>Prepared For</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: settings?.invoice_header_color || '#0f172a', marginBottom: '2px' }}>{fullQuote.client_name}</div>
              {fullQuote.client_email && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullQuote.client_email}</div>}
              {fullQuote.client_phone && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullQuote.client_phone}</div>}
              {(() => {
                const addr = fullQuote.billing_address || fullQuote.client_address;
                const city = fullQuote.billing_city || fullQuote.client_city;
                const state = fullQuote.billing_state || fullQuote.client_state;
                const zip = fullQuote.billing_zip || fullQuote.client_zip;
                return addr ? (
                  <>
                    <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{addr}</div>
                    {city && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{city}{state && `, ${state}`} {zip || ''}</div>}
                  </>
                ) : null;
              })()}
              {fullQuote.tax_id && <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Tax ID: {fullQuote.tax_id}</div>}
            </div>

            {fullQuote.shipping_address && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '6px' }}>Ship To</div>
                <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullQuote.shipping_address}</div>
                {fullQuote.shipping_city && <div style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b' }}>{fullQuote.shipping_city}{fullQuote.shipping_state && `, ${fullQuote.shipping_state}`} {fullQuote.shipping_zip || ''}</div>}
              </div>
            )}

            <div style={{ width: '200px', flexShrink: 0 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '6px' }}>Details</div>
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Quote Date</span>
                <span style={{ color: settings?.text_primary_color || '#1e293b', fontWeight: 600 }}>{formatDate(fullQuote.date)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Valid Until</span>
                <span style={{ color: settings?.text_primary_color || '#1e293b', fontWeight: 600 }}>{formatDate(fullQuote.expiry_date)}</span>
              </div>
              {settings?.show_customer_numbers && fullQuote.customer_number && (
                <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>Customer #</span>
                  <span style={{ color: settings?.text_primary_color || '#1e293b', fontWeight: 600 }}>{fullQuote.customer_number}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Status</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  fullQuote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  fullQuote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  fullQuote.status === 'expired' ? 'bg-red-100 text-red-800' :
                  fullQuote.status === 'declined' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{fullQuote.status?.toUpperCase()}</span>
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
                {fullQuote.items && fullQuote.items.map((item, index) => (
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
                <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fullQuote.subtotal)}</span>
              </div>
              {fullQuote.discount_amount > 0 && (
                <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                  <span style={{ color: settings?.text_secondary_color || '#64748b' }}>Discount{fullQuote.discount_type === 'percentage' ? ` (${fullQuote.discount_value}%)` : ''}</span>
                  <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>-{formatCurrency(fullQuote.discount_amount)}</span>
                </div>
              )}
              {fullQuote.shipping > 0 && (
                <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                  <span style={{ color: settings?.text_secondary_color || '#64748b' }}>Shipping</span>
                  <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fullQuote.shipping)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                <span style={{ color: settings?.text_secondary_color || '#64748b' }}>Tax ({settings?.tax_rate || 0}%)</span>
                <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(fullQuote.tax)}</span>
              </div>
              {fullQuote.adjustment !== 0 && fullQuote.adjustment != null && (
                <div className="flex justify-between" style={{ padding: '6px 0', fontSize: '11.5px' }}>
                  <span style={{ color: settings?.text_secondary_color || '#64748b' }}>{fullQuote.adjustment_label || 'Adjustment'}</span>
                  <span style={{ fontWeight: 500, color: settings?.text_primary_color || '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{fullQuote.adjustment > 0 ? '' : '-'}{formatCurrency(Math.abs(fullQuote.adjustment))}</span>
                </div>
              )}
              <hr style={{ border: 'none', height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
              <div className="flex justify-between items-baseline" style={{ paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: settings?.invoice_header_color || '#0f172a' }}>Total</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: settings?.invoice_accent_color || '#2563eb', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>{formatCurrency(fullQuote.total)}</span>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex" style={{ gap: '16px', padding: '20px 40px 0' }}>
            {fullQuote.notes && (
              <div style={{ flex: 1, minWidth: 0, paddingTop: '12px', borderTop: '2px solid #f1f5f9' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '5px' }}>Notes</h4>
                <p style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{fullQuote.notes}</p>
              </div>
            )}
            {fullQuote.terms && (
              <div style={{ flex: 1, minWidth: 0, paddingTop: '12px', borderTop: '2px solid #f1f5f9' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: settings?.invoice_accent_color || '#2563eb', marginBottom: '5px' }}>Terms</h4>
                <p style={{ fontSize: '11px', color: settings?.text_secondary_color || '#64748b', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{fullQuote.terms}</p>
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
            <div style={{ fontSize: '12px', fontWeight: 600, color: settings?.invoice_accent_color || '#2563eb', marginBottom: '2px' }}>Thank you for considering this quote!</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{settings?.company_name || 'Your Company'}{settings?.company_email && ` · ${settings.company_email}`}{settings?.company_website && ` · ${settings.company_website}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotePreview;
