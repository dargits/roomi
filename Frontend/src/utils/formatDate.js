/**
 * Utility functions for formatting Dates and Times throughout the application
 */

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} • ${day}/${month}/${year}`;
  } catch {
    return dateTimeStr;
  }
};

/**
 * Format Check-in / Check-out with standard hotel hours (Check-in 14:00, Check-out 12:00)
 */
export const formatStayDateTime = (dateStr, type = 'checkin', customTime = null) => {
  if (!dateStr) return '';
  const time = customTime || (type === 'checkin' ? '14:00' : '12:00');
  const formattedDate = formatDate(dateStr);
  return `${time} • ${formattedDate}`;
};

/**
 * Calculate total nights between two date strings (YYYY-MM-DD)
 */
export const calculateNights = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) return 1;
  try {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  } catch {
    return 1;
  }
};

export default {
  formatDate,
  formatDateTime,
  formatStayDateTime,
  calculateNights
};
