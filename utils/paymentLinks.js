/**
 * Payment Link Utilities
 * Generates payment links for Stripe and PayPal
 */

const Stripe = require('stripe');

/**
 * Generate a Stripe payment link for an invoice
 * @param {Object} invoice - Invoice object with amount, number, etc.
 * @param {string} stripeSecretKey - Stripe secret key
 * @returns {Promise<string>} Payment link URL
 */
async function generateStripePaymentLink(invoice, stripeSecretKey) {
  if (!stripeSecretKey || stripeSecretKey.trim() === '') {
    throw new Error('Stripe secret key is not configured. Please add your Stripe API key in Settings.');
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    // Create a payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: invoice.notes || `Payment for invoice ${invoice.invoice_number}`,
            },
            unit_amount: Math.round(invoice.total * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for your payment! Your invoice has been paid.',
        },
      },
      metadata: {
        invoice_id: invoice.id.toString(),
        invoice_number: invoice.invoice_number,
      },
    });

    return paymentLink.url;
  } catch (error) {
    console.error('Stripe payment link error:', error);
    throw new Error(`Failed to create Stripe payment link: ${error.message}`);
  }
}

/**
 * Generate a PayPal payment link for an invoice
 * @param {Object} invoice - Invoice object
 * @param {string} paypalEmail - PayPal business email or PayPal.me username
 * @returns {string} Payment link URL
 */
function generatePayPalPaymentLink(invoice, paypalEmail) {
  if (!paypalEmail || paypalEmail.trim() === '') {
    throw new Error('PayPal email is not configured. Please add your PayPal email in Settings.');
  }

  // If it's a PayPal.me username (no @ symbol), use PayPal.me
  if (!paypalEmail.includes('@')) {
    const amount = invoice.total.toFixed(2);
    return `https://paypal.me/${paypalEmail}/${amount}`;
  }

  // Otherwise, create a standard PayPal payment link
  const amount = invoice.total.toFixed(2);
  const invoiceNumber = encodeURIComponent(invoice.invoice_number);
  const description = encodeURIComponent(invoice.notes || `Payment for invoice ${invoice.invoice_number}`);

  return `https://www.paypal.com/paypalme/${paypalEmail}/${amount}?description=${description}&invoice_id=${invoiceNumber}`;
}

/**
 * Generate a simple "mailto" payment request
 * @param {Object} invoice - Invoice object
 * @param {string} recipientEmail - Email to send payment request to
 * @param {string} companyName - Company name
 * @returns {string} Mailto link
 */
function generateEmailPaymentRequest(invoice, recipientEmail, companyName) {
  const subject = encodeURIComponent(`Payment Request: Invoice ${invoice.invoice_number}`);
  const body = encodeURIComponent(
    `Dear Customer,\n\n` +
    `Please remit payment for Invoice ${invoice.invoice_number} in the amount of $${invoice.total.toFixed(2)}.\n\n` +
    `${invoice.notes ? 'Notes: ' + invoice.notes + '\n\n' : ''}` +
    `Thank you,\n${companyName}`
  );

  return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
}

module.exports = {
  generateStripePaymentLink,
  generatePayPalPaymentLink,
  generateEmailPaymentRequest,
};
