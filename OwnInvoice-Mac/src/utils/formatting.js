import { format, parseISO } from 'date-fns';

export const formatCurrency = (amount, currencySymbol = '$') => {
  if (amount === null || amount === undefined) return `${currencySymbol}0.00`;
  const number = parseFloat(amount);
  return `${currencySymbol}${number.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export const formatDateInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date input:', error);
    return dateString;
  }
};

export const getCurrentDate = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return format(date, 'yyyy-MM-dd');
};

export const calculateDueDate = (startDate, daysUntilDue = 30) => {
  return addDays(startDate, daysUntilDue);
};

export const isOverdue = (dueDate, status) => {
  if (status === 'paid') return false;
  const today = new Date();
  const due = new Date(dueDate);
  return due < today;
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.draft;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
