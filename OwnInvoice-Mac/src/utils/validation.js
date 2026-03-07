export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

export const validateNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
};

export const validatePositiveNumber = (value) => {
  const num = parseFloat(value);
  return validateNumber(value) && num >= 0;
};

export const validateClient = (client) => {
  const errors = {};

  if (!validateRequired(client.name)) {
    errors.name = 'Client name is required';
  }

  if (!validateRequired(client.email)) {
    errors.email = 'Email is required';
  } else if (!validateEmail(client.email)) {
    errors.email = 'Invalid email format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateInvoice = (invoice, items) => {
  const errors = {};

  if (!validateRequired(invoice.client_id)) {
    errors.client_id = 'Please select a client';
  }

  if (!validateRequired(invoice.invoice_number)) {
    errors.invoice_number = 'Invoice number is required';
  }

  if (!validateRequired(invoice.date)) {
    errors.date = 'Invoice date is required';
  }

  if (!validateRequired(invoice.due_date)) {
    errors.due_date = 'Due date is required';
  }

  if (!items || items.length === 0) {
    errors.items = 'At least one line item is required';
  } else {
    const itemErrors = [];
    items.forEach((item, index) => {
      const itemError = {};
      if (!validateRequired(item.description)) {
        itemError.description = 'Description is required';
      }
      if (!validatePositiveNumber(item.quantity)) {
        itemError.quantity = 'Quantity must be a positive number';
      }
      if (!validatePositiveNumber(item.rate)) {
        itemError.rate = 'Rate must be a positive number';
      }
      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });
    if (itemErrors.length > 0) {
      errors.itemErrors = itemErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateSavedItem = (item) => {
  const errors = {};

  if (!validateRequired(item.description)) {
    errors.description = 'Description is required';
  }

  if (!validatePositiveNumber(item.rate)) {
    errors.rate = 'Rate must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateSettings = (settings) => {
  const errors = {};

  if (!validateRequired(settings.company_name)) {
    errors.company_name = 'Company name is required';
  }

  if (!validateRequired(settings.company_email)) {
    errors.company_email = 'Company email is required';
  } else if (!validateEmail(settings.company_email)) {
    errors.company_email = 'Invalid email format';
  }

  if (settings.tax_rate && !validateNumber(settings.tax_rate)) {
    errors.tax_rate = 'Tax rate must be a valid number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateCreditNote = (creditNote, items) => {
  const errors = {};

  if (!validateRequired(creditNote.credit_note_number)) {
    errors.credit_note_number = 'Credit note number is required';
  }

  if (!validateRequired(creditNote.invoice_id)) {
    errors.invoice_id = 'Please select an invoice';
  }

  if (!validateRequired(creditNote.client_id)) {
    errors.client_id = 'Please select a client';
  }

  if (!validateRequired(creditNote.date)) {
    errors.date = 'Date is required';
  }

  if (!items || items.length === 0) {
    errors.items = 'At least one line item is required';
  } else {
    const itemErrors = [];
    items.forEach((item, index) => {
      const itemError = {};
      if (!validateRequired(item.description)) {
        itemError.description = 'Description is required';
      }
      if (!validatePositiveNumber(item.quantity)) {
        itemError.quantity = 'Quantity must be a positive number';
      }
      if (!validatePositiveNumber(item.rate)) {
        itemError.rate = 'Rate must be a positive number';
      }
      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });
    if (itemErrors.length > 0) {
      errors.itemErrors = itemErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
