import jsQR from 'jsqr';
import { 
  MultiFormatReader, 
  RGBLuminanceSource, 
  BinaryBitmap, 
  HybridBinarizer, 
  DecodeHintType, 
  QRCodeReader 
} from '@zxing/library';

// ============================================================================
// 1. QUẢN LÝ LUỒNG CAMERA TOÀN CỤC (Đảm bảo 100% tắt camera khi đóng popup)
// ============================================================================

const activeCameraStreams = new Set();

/**
 * Đăng ký một luồng MediaStream camera đang hoạt động
 */
export const registerCameraStream = (stream) => {
  if (stream && typeof stream.getTracks === 'function') {
    activeCameraStreams.add(stream);
    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        activeCameraStreams.delete(stream);
      });
    });
  }
};

/**
 * Dừng triệt để tất cả luồng camera trong toàn bộ ứng dụng
 */
export const stopAllCameraStreams = () => {
  // 1. Dừng các stream đã đăng ký trong Set
  activeCameraStreams.forEach((stream) => {
    try {
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      }
    } catch (e) {
      console.warn('Lỗi khi dừng stream đã đăng ký:', e);
    }
  });
  activeCameraStreams.clear();

  // 2. Quét tất cả thẻ <video> trong DOM để dừng tracks dự phòng
  try {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video) => {
      if (video && video.srcObject && typeof video.srcObject.getTracks === 'function') {
        video.srcObject.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        video.srcObject = null;
      }
    });
  } catch (e) {
    console.warn('Lỗi khi quét dừng video DOM:', e);
  }
};

// ============================================================================
// 2. BỘ GIẢI MÃ QR ĐA TẦNG (Tối ưu hóa đặc biệt cho thẻ CCCD Việt Nam)
// ============================================================================

const zxingHints = new Map();
zxingHints.set(DecodeHintType.TRY_HARDER, true);
const zxingReader = new QRCodeReader();

/**
 * Giải mã QR từ ImageData bằng thuật toán đa tầng (Multi-pass decoding)
 * Hỗ trợ bóc tách QR CCCD in trên nền hoa văn bảo mật mờ
 * @param {Uint8ClampedArray|Array} data - RGBA pixel array
 * @param {number} width 
 * @param {number} height 
 * @returns {string|null} - Chuỗi văn bản QR hoặc null nếu không tìm thấy
 */
export const decodeQrFromPixels = (data, width, height) => {
  if (!data || width <= 0 || height <= 0) return null;

  // Tầng 1: Thử giải mã trực tiếp bằng jsQR chuẩn
  try {
    const directCode = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
    if (directCode && directCode.data && directCode.data.trim()) {
      return directCode.data.trim();
    }
  } catch (e) {}

  // Tầng 2: Multi-threshold Binarization (Tăng cường độ tương phản bóc tách nền thẻ CCCD)
  // Thẻ CCCD in trên nền hoa văn xanh lá/xanh ngọc, việc binarize ở các ngưỡng 100, 85, 120 sẽ lọc sạch nền
  const thresholds = [100, 85, 115, 70, 135];
  const totalPixels = width * height;
  const binaryBuffer = new Uint8ClampedArray(totalPixels * 4);

  for (const threshold of thresholds) {
    for (let i = 0; i < totalPixels; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      // Độ xám chuẩn mắt người
      const gray = (r * 299 + g * 587 + b * 114) / 1000;
      const val = gray < threshold ? 0 : 255;
      const idx = i * 4;
      binaryBuffer[idx] = val;
      binaryBuffer[idx + 1] = val;
      binaryBuffer[idx + 2] = val;
      binaryBuffer[idx + 3] = 255;
    }

    try {
      const enhancedCode = jsQR(binaryBuffer, width, height, { inversionAttempts: 'attemptBoth' });
      if (enhancedCode && enhancedCode.data && enhancedCode.data.trim()) {
        return enhancedCode.data.trim();
      }
    } catch (e) {}
  }

  // Tầng 3: Giải mã bằng ZXing QR Code Reader với chế độ TRY_HARDER
  try {
    const luminanceSource = new RGBLuminanceSource(data, width, height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    const zxingResult = zxingReader.decode(binaryBitmap, zxingHints);
    if (zxingResult && zxingResult.getText && zxingResult.getText().trim()) {
      return zxingResult.getText().trim();
    }
  } catch (e) {}

  return null;
};

/**
 * Giải mã QR từ Canvas hoặc Video Element
 */
export const decodeQrFromCanvasOrVideo = async (sourceElement) => {
  if (!sourceElement) return null;

  // 1. Kiểm tra nếu trình duyệt hỗ trợ Native BarcodeDetector (Chrome, Edge, Android Chrome)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(sourceElement);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (e) {
      // Fallback xuống canvas software decoding
    }
  }

  // 2. Chuyển đổi sang Canvas và trích xuất ImageData
  try {
    const width = sourceElement.videoWidth || sourceElement.width;
    const height = sourceElement.videoHeight || sourceElement.height;
    if (!width || !height) return null;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceElement, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    return decodeQrFromPixels(imgData.data, width, height);
  } catch (e) {
    console.warn('Lỗi xử lý frame canvas:', e);
    return null;
  }
};

/**
 * Giải mã QR từ file ảnh người dùng tải lên
 */
export const decodeQrFromFile = async (file) => {
  if (!file) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Thử Native BarcodeDetector trước
          if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
              const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await barcodeDetector.detect(img);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                resolve(barcodes[0].rawValue.trim());
                return;
              }
            } catch (err) {}
          }

          // Fallback sang Canvas Multi-pass
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = decodeQrFromPixels(imgData.data, canvas.width, canvas.height);
          resolve(result);
        } catch (e) {
          console.warn('Lỗi đọc ảnh QR file:', e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};
