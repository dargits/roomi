import { describe, it, expect } from 'vitest';
import { numberToWords } from '../numberToWords';

describe('numberToWords utility', () => {
  it('should return "không đồng" for 0 or nullish values', () => {
    expect(numberToWords(0)).toBe('không đồng');
    expect(numberToWords('0')).toBe('không đồng');
    expect(numberToWords(null)).toBe('không đồng');
    expect(numberToWords(undefined)).toBe('không đồng');
  });

  it('should format single digit numbers correctly', () => {
    expect(numberToWords(5)).toBe('Năm đồng');
    expect(numberToWords(9)).toBe('Chín đồng');
  });

  it('should format tens correctly with "lẻ" and "mốt"', () => {
    expect(numberToWords(10)).toBe('Mười đồng');
    expect(numberToWords(15)).toBe('Mười lăm đồng');
    expect(numberToWords(21)).toBe('Hai mươi mốt đồng');
    expect(numberToWords(25)).toBe('Hai mươi lăm đồng');
  });

  it('should format hundreds correctly with "lẻ"', () => {
    expect(numberToWords(105)).toBe('Một trăm lẻ năm đồng');
    expect(numberToWords(200)).toBe('Hai trăm đồng');
    expect(numberToWords(350)).toBe('Ba trăm năm mươi đồng');
  });

  it('should format thousands, millions, and billions correctly', () => {
    expect(numberToWords(50000)).toBe('Năm mươi nghìn đồng');
    expect(numberToWords(500000)).toBe('Năm trăm nghìn đồng');
    expect(numberToWords(1200000)).toBe('Một triệu hai trăm nghìn đồng');
    expect(numberToWords(1500000000)).toBe('Một tỷ năm trăm triệu đồng');
  });
});
