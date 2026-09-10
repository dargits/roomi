import { describe, it, expect } from 'vitest';
import { parseCccdQr, formatCccdDate } from '../cccdParser';

describe('cccdParser Utility', () => {
  it('formats DDMMYYYY date string to DD/MM/YYYY correctly', () => {
    expect(formatCccdDate('01011998')).toBe('01/01/1998');
    expect(formatCccdDate('25122000')).toBe('25/12/2000');
    expect(formatCccdDate('invalid')).toBe('invalid');
    expect(formatCccdDate('')).toBe('');
  });

  it('parses full standard Vietnamese CCCD QR code', () => {
    const qrString = '001098012345|012345678|NGUYỄN VĂN A|01011998|Nam|Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh|01012023';
    const result = parseCccdQr(qrString);

    expect(result.isValid).toBe(true);
    expect(result.idNumber).toBe('001098012345');
    expect(result.oldIdNumber).toBe('012345678');
    expect(result.name).toBe('NGUYỄN VĂN A');
    expect(result.dob).toBe('01/01/1998');
    expect(result.gender).toBe('Nam');
    expect(result.address).toBe('Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
    expect(result.issueDate).toBe('01/01/2023');
  });

  it('parses CCCD QR code without old CMND', () => {
    const qrString = '001099005678||TRẦN THỊ B|15051995|Nữ|Hà Nội|10102022';
    const result = parseCccdQr(qrString);

    expect(result.isValid).toBe(true);
    expect(result.idNumber).toBe('001099005678');
    expect(result.oldIdNumber).toBe('');
    expect(result.name).toBe('TRẦN THỊ B');
    expect(result.gender).toBe('Nữ');
  });

  it('parses raw 12-digit CCCD string', () => {
    const rawNumber = '079199001234';
    const result = parseCccdQr(rawNumber);

    expect(result.isValid).toBe(true);
    expect(result.idNumber).toBe('079199001234');
    expect(result.name).toBe('');
  });

  it('handles empty or invalid inputs gracefully', () => {
    expect(parseCccdQr(null).isValid).toBe(false);
    expect(parseCccdQr('').isValid).toBe(false);
    expect(parseCccdQr('abcxyz').isValid).toBe(false);
  });
});
