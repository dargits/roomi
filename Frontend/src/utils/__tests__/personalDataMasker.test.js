import {
  canViewFullPersonalData,
  maskName,
  maskPhone,
  maskEmail,
  maskIdentifier,
  maskCCCD,
  formatName,
  formatPhone,
  formatEmail,
  formatCCCD
} from '../personalDataMasker';

describe('personalDataMasker utility', () => {
  describe('canViewFullPersonalData', () => {
    it('allows OWNER and RECEPTIONIST', () => {
      expect(canViewFullPersonalData('OWNER')).toBe(true);
      expect(canViewFullPersonalData('RECEPTIONIST')).toBe(true);
      expect(canViewFullPersonalData({ role: 'OWNER' })).toBe(true);
      expect(canViewFullPersonalData({ role: 'RECEPTIONIST' })).toBe(true);
    });

    it('denies other roles or unauthenticated', () => {
      expect(canViewFullPersonalData('ADMIN')).toBe(false);
      expect(canViewFullPersonalData('ACCOUNTANT')).toBe(false);
      expect(canViewFullPersonalData('HOUSEKEEPER')).toBe(false);
      expect(canViewFullPersonalData(null)).toBe(false);
      expect(canViewFullPersonalData(undefined)).toBe(false);
    });
  });

  describe('maskName', () => {
    it('does not mask name and returns as is', () => {
      expect(maskName('Nguyễn Văn Nam')).toBe('Nguyễn Văn Nam');
      expect(maskName('Trần Văn A')).toBe('Trần Văn A');
      expect(maskName(null)).toBeNull();
      expect(maskName('')).toBe('');
    });
  });

  describe('maskPhone', () => {
    it('masks middle digits and preserves only 3 first and 3 last digits', () => {
      expect(maskPhone('0912345678')).toBe('091****678');
      expect(maskPhone('0834554953')).toBe('083****953');
      expect(maskPhone('02633888999')).toBe('026*****999');
      expect(maskPhone('024123456')).toBe('024***456');
    });

    it('is idempotent for already masked phone', () => {
      expect(maskPhone('091****678')).toBe('091****678');
    });

    it('handles short phones safely', () => {
      expect(maskPhone('123')).toBe('****');
      expect(maskPhone('1234')).toBe('****');
      expect(maskPhone('123456')).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('preserves first character of username and entire domain', () => {
      expect(maskEmail('nguyenvana@gmail.com')).toBe('n***@gmail.com');
      expect(maskEmail('admin@roomi.vn')).toBe('a***@roomi.vn');
      expect(maskEmail('x@yahoo.com')).toBe('x***@yahoo.com');
    });

    it('is idempotent for already masked email', () => {
      expect(maskEmail('n***@gmail.com')).toBe('n***@gmail.com');
    });
  });

  describe('maskIdentifier / maskCCCD', () => {
    it('masks first digits and preserves last 4', () => {
      expect(maskIdentifier('001234567890')).toBe('****7890');
      expect(maskCCCD('12345678')).toBe('****5678');
      expect(maskIdentifier('1234')).toBe('****');
    });
  });

  describe('format helpers with role checking', () => {
    it('formats values depending on role permissions', () => {
      expect(formatName('Nguyễn Văn Nam', 'OWNER')).toBe('Nguyễn Văn Nam');
      expect(formatName('Nguyễn Văn Nam', 'ADMIN')).toBe('Nguyễn Văn Nam');

      expect(formatPhone('0912345678', 'RECEPTIONIST')).toBe('0912345678');
      expect(formatPhone('0912345678', 'ACCOUNTANT')).toBe('091****678');

      expect(formatEmail('nguyenvana@gmail.com', 'OWNER')).toBe('nguyenvana@gmail.com');
      expect(formatEmail('nguyenvana@gmail.com', 'HOUSEKEEPER')).toBe('n***@gmail.com');

      expect(formatCCCD('001234567890', 'OWNER')).toBe('001234567890');
      expect(formatCCCD('001234567890', 'ACCOUNTANT')).toBe('****7890');
      expect(formatCCCD('', 'OWNER')).toBe('Chưa cập nhật');
    });
  });
});
