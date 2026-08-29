import React, { useState, useEffect, useRef } from 'react';
import { 
  IoCameraOutline, 
  IoCameraReverseOutline, 
  IoBarcodeOutline, 
  IoCloudUploadOutline, 
  IoVolumeHighOutline, 
  IoVolumeMuteOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoRefreshOutline
} from 'react-icons/io5';
import { parseCccdQr } from '../../utils/cccdParser';
import { playSuccessBeep } from '../../utils/sound';
import { 
  registerCameraStream, 
  stopAllCameraStreams, 
  decodeQrFromCanvasOrVideo, 
  decodeQrFromFile 
} from '../../utils/qrDecoder';

const CameraQrScanner = ({ 
  onScan, 
  placeholder = "Dán hoặc quét dữ liệu QR vào đây...", 
  autoStopOnScan = false,
  showTabs = true,
  defaultMode = 'camera', // 'camera' or 'manual'
  className = ""
}) => {
  const [mode, setMode] = useState(defaultMode); // 'camera' | 'manual'
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const manualInputRef = useRef(null);
  const lastScannedTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const isMountedRef = useRef(true);
  const isDecodingFrameRef = useRef(false);

  // Dừng camera cục bộ và toàn cục
  const stopCamera = () => {
    // 1. Huỷ vòng lặp quét frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 2. Dừng stream cục bộ
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.warn('Lỗi dừng local stream track:', e);
      }
      localStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 3. Dừng tất cả luồng camera toàn cục
    stopAllCameraStreams();

    if (isMountedRef.current) {
      setIsScanning(false);
      setIsCameraStarting(false);
    }
  };

  // Lấy danh sách camera
  useEffect(() => {
    isMountedRef.current = true;

    const loadDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (isMountedRef.current && videoDevices.length > 0) {
          setCameras(videoDevices);
          const backCamera = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('sau') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách camera:', err);
      }
    };

    loadDevices();

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Điều khiển vòng đời Camera khi thay đổi mode hoặc camera
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
      if (manualInputRef.current) {
        manualInputRef.current.focus();
      }
    }

    return () => {
      stopCamera();
    };
  }, [mode, selectedCameraId]);

  const lastDecodeTimestampRef = useRef(0);

  // Vòng lặp giải mã liên tục từng frame từ camera (Tối ưu GPU 60fps, throttle giải mã để không lag)
  const runScanLoop = () => {
    if (!isMountedRef.current || !videoRef.current) return;

    const scanFrame = async (timestamp) => {
      if (!isMountedRef.current || !videoRef.current) return;

      const video = videoRef.current;
      // Chỉ chạy decode QR tối đa mỗi 120ms để không chiếm dụng CPU, giữ animation mượt mà 60fps
      if (video.readyState >= 2 && !isDecodingFrameRef.current) {
        if (!lastDecodeTimestampRef.current || timestamp - lastDecodeTimestampRef.current > 120) {
          lastDecodeTimestampRef.current = timestamp;
          isDecodingFrameRef.current = true;
          try {
            const rawText = await decodeQrFromCanvasOrVideo(video);
            if (rawText && rawText.trim()) {
              const now = Date.now();
              if (now - lastScannedTimeRef.current > 2000) {
                lastScannedTimeRef.current = now;
                handleDetected(rawText.trim());
              }
            }
          } catch (e) {
            // Bỏ qua lỗi frame
          } finally {
            isDecodingFrameRef.current = false;
          }
        }
      }

      if (isMountedRef.current && localStreamRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async () => {
    if (!isMountedRef.current) return;
    setCameraError('');
    setIsCameraStarting(true);

    try {
      stopCamera();
      if (!isMountedRef.current) return;

      const constraints = {
        audio: false,
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
          : { facingMode: 'environment', width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (resErr) {
        // Thử lại với độ phân giải mặc định nếu camera không hỗ trợ HD
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'environment' }
        });
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      localStreamRef.current = stream;
      registerCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!isMountedRef.current) {
            stopCamera();
            return;
          }
          videoRef.current.play().then(() => {
            if (isMountedRef.current) {
              setIsScanning(true);
              setIsCameraStarting(false);
              runScanLoop();
            }
          }).catch(err => {
            console.warn('Lỗi video.play():', err);
          });
        };
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Lỗi khi mở camera:', err);
      setIsScanning(false);
      setIsCameraStarting(false);
      stopCamera();

      let errorMsg = 'Không thể mở Camera của laptop/thiết bị.';
      if (err.name === 'NotAllowedError' || String(err).includes('Permission denied')) {
        errorMsg = 'Quyền truy cập Camera đã bị từ chối. Vui lòng bấm vào biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép Camera.';
      } else if (err.name === 'NotFoundError' || String(err).includes('NotFound')) {
        errorMsg = 'Không tìm thấy Camera nào trên máy tính. Bạn có thể dùng chế độ Máy quét / Nhập tay.';
      } else if (err.name === 'NotReadableError' || String(err).includes('in use')) {
        errorMsg = 'Camera đang được ứng dụng khác sử dụng. Vui lòng tắt ứng dụng đó và thử lại.';
      }
      setCameraError(errorMsg);
    }
  };

  const handleDetected = (rawText) => {
    const parsed = parseCccdQr(rawText);
    
    if (soundEnabled) {
      playSuccessBeep();
    }

    setLastScannedResult(parsed);

    // Dừng camera ngay lập tức để tránh quét lặp lại
    stopCamera();

    if (onScan) {
      onScan(parsed, rawText);
    }
  };

  // Quét từ file ảnh tải lên bằng bộ giải mã đa tầng
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError('');

    try {
      const decodedText = await decodeQrFromFile(file);
      if (decodedText) {
        handleDetected(decodedText);
      } else {
        setCameraError('Không tìm thấy mã QR hợp lệ trong ảnh vừa tải lên. Vui lòng chọn ảnh chụp rõ nét hơn.');
      }
    } catch (err) {
      console.warn('Lỗi quét file ảnh:', err);
      setCameraError('Không nhận diện được mã QR từ file ảnh này.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (manualInput.trim()) {
        handleDetected(manualInput.trim());
        setManualInput('');
      }
    }
  };

  const handleManualChange = (e) => {
    const value = e.target.value;
    setManualInput(value);

    // Nếu súng bắn mã vạch quét chuỗi có dấu | hoặc 12 số
    if (value.includes('|') || (value.length === 12 && /^\d{12}$/.test(value))) {
      handleDetected(value);
      setManualInput('');
    }
  };

  return (
    <div className={`bg-surface-container-low border border-border-grey rounded-xl overflow-hidden shadow-xs ${className}`}>
      {/* Header & Tabs */}
      {showTabs && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-container-lowest border-b border-border-grey">
          <div className="flex items-center gap-1.5 p-0.5 bg-surface-container rounded-lg">
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'camera'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <IoCameraOutline size={15} /> CAMERA LAPTOP
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'manual'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <IoBarcodeOutline size={15} /> MÁY QUÉT / NHẬP TAY
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút bật/tắt âm thanh */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Tắt âm thanh thông báo' : 'Bật âm thanh thông báo'}
              className="p-1.5 text-on-surface-variant hover:text-primary rounded-md hover:bg-surface-container transition-colors"
            >
              {soundEnabled ? <IoVolumeHighOutline size={16} /> : <IoVolumeMuteOutline size={16} />}
            </button>

            {/* Chọn camera nếu có nhiều camera */}
            {mode === 'camera' && cameras.length > 1 && (
              <div className="flex items-center gap-1">
                <IoCameraReverseOutline size={14} className="text-on-surface-variant" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="text-xs bg-surface-container border border-border-grey rounded px-2 py-1 focus:outline-none focus:border-primary text-on-surface max-w-[140px] truncate"
                >
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body: Chế độ Camera Laptop */}
      {mode === 'camera' && (
        <div className="p-4 space-y-3">
          {cameraError ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <IoAlertCircleOutline size={18} className="shrink-0" />
                <span>{cameraError}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
                >
                  <IoRefreshOutline size={14} /> Thử lại
                </button>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white border border-red-300 text-red-800 rounded text-[11px] font-medium hover:bg-red-50"
                >
                  <IoBarcodeOutline size={14} /> Chuyển sang nhập tay
                </button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[260px] max-h-[340px] select-none">
              {/* Thẻ video trực tiếp: Chặn hoàn toàn thanh công cụ hover PiP/Translate của trình duyệt */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                disablePictureInPicture
                disableRemotePlayback
                controls={false}
                className="w-full h-full max-h-[320px] object-cover pointer-events-none select-none"
                style={{ pointerEvents: 'none' }}
              />

              {/* Lớp kính chặn tương tác chuột vào thẻ video */}
              <div className="absolute inset-0 z-[5] pointer-events-auto bg-transparent" />

              {/* Trạng thái đang tải camera */}
              {isCameraStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white z-10 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <span className="text-xs text-slate-300">Đang khởi động Camera laptop...</span>
                </div>
              )}

              {/* Khung ngắm và hướng dẫn khi camera đang chạy */}
              {isScanning && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4 z-10">
                  <div className="bg-black/60 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Hướng mã QR ở góc trên bên phải CCCD vào giữa khung
                  </div>

                  {/* Khung quét với 1 tia laser xanh lá thanh mảnh chạy 1 chiều từ trên xuống dưới */}
                  <div className="w-56 h-56 relative overflow-hidden flex items-center justify-center pointer-events-none">
                    {/* 1 tia laser xanh lá mảnh duy nhất chạy từ trên xuống dưới */}
                    <div className="absolute top-0 left-2 right-2 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-laser-scan-down shadow-[0_0_6px_#10b981] z-20 pointer-events-none" />

                    {/* 4 góc ngắm thanh lịch */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                  </div>

                  <div className="text-[10px] text-slate-300 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/10">
                    Giữ thẻ CCCD thẳng và cách camera khoảng 10 - 20 cm
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Công cụ phụ: Tải file ảnh & nút refresh */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="text-primary hover:text-primary-dark font-medium flex items-center gap-1 text-[11px] hover:underline uppercase"
              >
                <IoCloudUploadOutline size={14} /> 
                {isProcessingFile ? 'Đang nhận diện ảnh...' : 'Quét từ file ảnh chụp CCCD'}
              </button>
            </div>

            {isScanning && (
              <button
                type="button"
                onClick={startCamera}
                title="Khởi động lại Camera"
                className="text-on-surface-variant hover:text-primary flex items-center gap-1 text-[11px] uppercase"
              >
                <IoRefreshOutline size={13} /> Làm mới camera
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body: Chế độ Máy quét cầm tay / Nhập tay */}
      {mode === 'manual' && (
        <div className="p-4 space-y-3">
          <div className="text-xs text-on-surface-variant flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span>Đặt con trỏ vào ô bên dưới rồi bấm máy quét mã vạch hoặc dán chuỗi dữ liệu:</span>
          </div>

          <div className="relative">
            <input
              ref={manualInputRef}
              type="text"
              value={manualInput}
              onChange={handleManualChange}
              onKeyDown={handleManualKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 bg-surface border border-border-grey rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface"
            />
            {manualInput && (
              <button
                type="button"
                onClick={() => {
                  handleDetected(manualInput);
                  setManualInput('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-primary text-white rounded text-[11px] font-medium hover:bg-primary-dark"
              >
                Xác nhận
              </button>
            )}
          </div>

          <div className="text-[11px] text-on-surface-variant/80 italic">
            * Hỗ trợ chuỗi QR chuẩn CCCD gắn chip (phân cách bằng dấu |) hoặc nhập trực tiếp dãy 12 số CCCD.
          </div>
        </div>
      )}

      {/* Thông báo kết quả vừa quét thành công gần nhất */}
      {lastScannedResult && lastScannedResult.isValid && (
        <div className="mx-4 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2 animate-fade-in">
          <IoCheckmarkCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <div className="font-semibold text-emerald-800 flex items-center gap-2">
              <span>Đã nhận diện thành công:</span>
              <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] text-emerald-900 font-bold">
                {lastScannedResult.idNumber}
              </span>
            </div>
            {lastScannedResult.name && (
              <div className="text-emerald-700">
                Họ và tên: <strong>{lastScannedResult.name}</strong>
                {lastScannedResult.dob && ` • Ngày sinh: ${lastScannedResult.dob}`}
                {lastScannedResult.gender && ` • Giới tính: ${lastScannedResult.gender}`}
              </div>
            )}
            {lastScannedResult.address && (
              <div className="text-[11px] text-emerald-600 truncate max-w-md">
                Địa chỉ: {lastScannedResult.address}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraQrScanner;
