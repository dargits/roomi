/**
 * Utility functions for formatting Dates and Times throughout the application
 */

export const formatDate = (dateStr?: string | null): string => {
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
    return dateStr || '';
  }
};

export const formatDateTime = (dateTimeStr?: string | null): string => {
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
    return dateTimeStr || '';
  }
};

/**
 * Format Check-in / Check-out with standard hotel hours (Check-in 14:00, Check-out 12:00)
 */
export const formatStayDateTime = (dateStr?: string | null, type = 'checkin', customTime: string | null = null): string => {
  if (!dateStr) return '';
  const time = customTime || (type === 'checkin' ? '14:00' : '12:00');
  const formattedDate = formatDate(dateStr);
  return `${time} • ${formattedDate}`;
};

/**
 * Calculate total nights between two date strings (YYYY-MM-DD)
 */
export const calculateNights = (checkInDate?: string | null, checkOutDate?: string | null): number => {
  if (!checkInDate || !checkOutDate) return 1;
  try {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  } catch {
    return 1;
  }
};

export const toLocalDateString = (date?: Date | string | null): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default {
  formatDate,
  formatDateTime,
  formatStayDateTime,
  calculateNights,
  toLocalDateString
};

