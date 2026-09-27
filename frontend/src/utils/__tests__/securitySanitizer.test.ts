import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  hasPotentialXss,
  validatePhone,
  validateEmail,
  validateCCCD,
  validateDateRange,
  validatePositiveNumber,
} from '../securitySanitizer';

describe('securitySanitizer utility tests', () => {
  describe('sanitizeInput', () => {
    it('removes script tags and dangerous event handlers', () => {
      const malicious = '<script>alert("hacked")</script>Hello World';
      expect(sanitizeInput(malicious)).toBe('Hello World');

      const imgPayload = '<img src=x onerror=alert(1)>Test Note';
      expect(sanitizeInput(imgPayload)).toBe('Test Note');
    });

    it('trims whitespace and handles null/undefined', () => {
      expect(sanitizeInput('   Valid Text   ')).toBe('Valid Text');
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
  });

  describe('hasPotentialXss', () => {
    it('detects xss payloads correctly', () => {
      expect(hasPotentialXss('<script>alert(1)</script>')).toBe(true);
      expect(hasPotentialXss('<iframe src="javascript:alert(1)">')).toBe(true);
      expect(hasPotentialXss('Hello <b onerror=alert(1)>bold</b>')).toBe(true);
      expect(hasPotentialXss('Lê Hoàng Nam - Khách VIP')).toBe(false);
      expect(hasPotentialXss('Phòng 201 - 500,000 đ')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('validates Vietnamese phone numbers accurately', () => {
      expect(validatePhone('0912345678').valid).toBe(true);
      expect(validatePhone('0389998888').valid).toBe(true);
      expect(validatePhone('+84912345678').valid).toBe(true);
      expect(validatePhone('02431234567').valid).toBe(true); // cố định Hà Nội
      expect(validatePhone('12345').valid).toBe(false);
      expect(validatePhone('0123456789').valid).toBe(false); // đầu 01 cũ
      expect(validatePhone('0365224245s').valid).toBe(false); // SĐT có chữ cái đuôi
      expect(validatePhone('').valid).toBe(false); // required by default
      expect(validatePhone('', false).valid).toBe(true); // optional
    });
  });

  describe('validateEmail', () => {
    it('validates email addresses', () => {
      expect(validateEmail('test@gmail.com').valid).toBe(true);
      expect(validateEmail('user.name+tag@sub.domain.vn').valid).toBe(true);
      expect(validateEmail('invalid-email').valid).toBe(false);
      expect(validateEmail('test@gmail').valid).toBe(false);
      expect(validateEmail('').valid).toBe(true); // optional
      expect(validateEmail('', true).valid).toBe(false); // required
    });
  });

  describe('validateCCCD', () => {
    it('validates 9 or 12 digit citizen identification numbers and passports', () => {
      expect(validateCCCD('001200003333').valid).toBe(true); // 12 số
      expect(validateCCCD('123456789').valid).toBe(true); // 9 số
      expect(validateCCCD('B1234567').valid).toBe(true); // Hộ chiếu
      expect(validateCCCD('12345').valid).toBe(false);
      expect(validateCCCD('abc123456789').valid).toBe(false);
      expect(validateCCCD('gggrgrggr').valid).toBe(false); // Chuỗi chữ cái rác
      expect(validateCCCD('', false).valid).toBe(true); // optional
      expect(validateCCCD('', true).valid).toBe(false); // required
    });
  });

  describe('validateDateRange', () => {
    it('ensures check-out is after check-in', () => {
      expect(validateDateRange('2026-10-01', '2026-10-03').valid).toBe(true);
      expect(validateDateRange('2026-10-05', '2026-10-02').valid).toBe(false);
      expect(validateDateRange('2026-10-02', '2026-10-02').valid).toBe(false);
    });
  });

  describe('validatePositiveNumber', () => {
    it('checks positive amounts and limits', () => {
      expect(validatePositiveNumber(500000).valid).toBe(true);
      expect(validatePositiveNumber(-100).valid).toBe(false);
      expect(validatePositiveNumber(150, 'Phần trăm', 100).valid).toBe(false);
    });
  });
});
