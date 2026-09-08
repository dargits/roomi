import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import { decodeQrFromPixels } from '../qrDecoder';
import { parseCccdQr } from '../cccdParser';

describe('qrDecoder Multi-Pass Decoding', () => {
  it('successfully decodes real CCCD QR code from user uploaded image', () => {
    const imgPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\2de4cd66-eb28-4e5a-96ca-1d4b81d8a501\\.user_uploaded\\media_1787987679136.jpg';
    if (!fs.existsSync(imgPath)) {
      console.warn('Image not found in brain folder, skipping real image test');
      return;
    }

    const jpegData = fs.readFileSync(imgPath);
    const raw = jpeg.decode(jpegData, { useTArray: true });

    const qrResult = decodeQrFromPixels(raw.data, raw.width, raw.height);
    expect(qrResult).toBeTruthy();
    expect(qrResult).toContain('004205003401');
    expect(qrResult).toContain('Phạm Văn Mạnh');

    const parsed = parseCccdQr(qrResult);
    expect(parsed.isValid).toBe(true);
    expect(parsed.idNumber).toBe('004205003401');
    expect(parsed.name).toBe('Phạm Văn Mạnh');
  }, 15000);

  it('handles empty or invalid pixel buffer gracefully', () => {
    expect(decodeQrFromPixels(null, 0, 0)).toBe(null);
    expect(decodeQrFromPixels(new Uint8ClampedArray(100), 5, 5)).toBe(null);
  });
});
