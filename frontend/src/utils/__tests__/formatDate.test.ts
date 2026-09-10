import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatStayDateTime, calculateNights } from '../formatDate';

describe('Date and Stay Duration Utilities', () => {
  it('should format date string to DD/MM/YYYY', () => {
    expect(formatDate('2026-08-16')).toBe('16/08/2026');
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('should format date-time string to HH:mm • DD/MM/YYYY', () => {
    expect(formatDateTime('2026-08-16T14:30:00')).toContain('16/08/2026');
    expect(formatDateTime(null)).toBe('');
  });

  it('should format standard check-in and check-out stay date times', () => {
    const checkInResult = formatStayDateTime('2026-08-15', 'checkin');
    expect(checkInResult).toBe('14:00 • 15/08/2026');

    const checkOutResult = formatStayDateTime('2026-08-17', 'checkout');
    expect(checkOutResult).toBe('12:00 • 17/08/2026');

    expect(formatStayDateTime(null)).toBe('');
  });

  it('should correctly calculate number of nights between check-in and check-out', () => {
    expect(calculateNights('2026-08-15', '2026-08-16')).toBe(1);
    expect(calculateNights('2026-08-15', '2026-08-18')).toBe(3);
    expect(calculateNights('2026-08-15', '2026-08-15')).toBe(1); // minimum 1 night
    expect(calculateNights(null, '2026-08-16')).toBe(1);
  });
});
