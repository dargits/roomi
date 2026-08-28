import React, { useState, useEffect, useRef } from 'react';
import { 
  IoCloseOutline, 
  IoCheckmarkCircleOutline, 
  IoPersonAddOutline, 
  IoTrashOutline,
  IoQrCodeOutline,
  IoAlertCircleOutline,
  IoPersonOutline,
  IoImageOutline,
  IoCloudUploadOutline,
  IoEyeOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import bookingApi from '../../services/bookingApi';
import guestApi from '../../services/guestApi';
import { fileApi } from '../../services/fileApi';
import { useToast } from '../../context/ToastContext';

const CheckInModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [guests, setGuests] = useState([{ name: '', idNumber: '', frontImage: '', backImage: '', isUploadingFront: false, isUploadingBack: false }]);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  
  // QR Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const qrInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && booking) {
      // Initialize with booker's ID if present, else empty
      setGuests([{ 
        name: booking.guestName || '', 
        idNumber: booking.guestIdNumber || '',
        frontImage: '',
        backImage: '',
        isUploadingFront: false,
        isUploadingBack: false
      }]);
      setErrorMsg('');
      setIsScanning(false);
      setQrInput('');
      setPreviewImage(null);
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (isScanning && qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, [isScanning]);

  const handleAddGuest = () => {
    setGuests([...guests, { name: '', idNumber: '', frontImage: '', backImage: '', isUploadingFront: false, isUploadingBack: false }]);
  };

  const handleRemoveGuest = (index) => {
    const newGuests = [...guests];
    newGuests.splice(index, 1);
    setGuests(newGuests);
  };

  const handleGuestChange = (index, field, value) => {
    const newGuests = [...guests];
    newGuests[index][field] = value;
    setGuests(newGuests);
    
    // Auto-fill on exactly 12 digits
    if (field === 'idNumber' && value.length === 12 && /^\d{12}$/.test(value)) {
      fetchGuestInfo(value, index, newGuests);
    }
  };

  const handleFileUpload = async (index, side, file) => {
    if (!file) return;
    const isFront = side === 'front';
    const uploadKey = isFront ? 'isUploadingFront' : 'isUploadingBack';
    const imageKey = isFront ? 'frontImage' : 'backImage';

    const updated = [...guests];
    updated[index][uploadKey] = true;
    setGuests(updated);

    try {
      const res = await fileApi.uploadFile(file);
      const afterUpload = [...guests];
      afterUpload[index][uploadKey] = false;
      afterUpload[index][imageKey] = res.url;
      setGuests(afterUpload);
      toastSuccess(`Đã tải lên ảnh CCCD ${isFront ? 'mặt trước' : 'mặt sau'} thành công!`);
    } catch (err) {
      console.error(err);
      const afterUpload = [...guests];
      afterUpload[index][uploadKey] = false;
      setGuests(afterUpload);
      toastError(`Lỗi tải lên ảnh ${isFront ? 'mặt trước' : 'mặt sau'}. Vui lòng thử lại.`);
    }
  };

  const handleRemoveImage = (index, side) => {
    const updated = [...guests];
    if (side === 'front') updated[index].frontImage = '';
    else updated[index].backImage = '';
    setGuests(updated);
  };

  const fetchGuestInfo = async (idNumber, index, currentGuests) => {
    try {
      const guest = await guestApi.getGuestByIdNumber(idNumber);
      if (guest && guest.name) {
        const updatedGuests = [...currentGuests];
        updatedGuests[index].name = guest.name;
        setGuests(updatedGuests);
        toastSuccess(`Đã tự động điền thông tin khách: ${guest.name}`);
      }
    } catch (err) {
      // Ignore if guest not found
    }
  };

  const handleQrInput = (e) => {
    const value = e.target.value;
    setQrInput(value);
    
    // Parse VN CCCD QR format: UID|CMND_old|Name|DOB|Gender|Address|Date
    // Example: 001090123456|123456789|NGUYEN VAN A|01011990|Nam|Ha Noi|01012021
    if (value.includes('|')) {
      const parts = value.split('|');
      if (parts.length >= 3) {
        const idNumber = parts[0];
        const name = parts[2];
        
        // Check if we have an empty slot, otherwise add new
        const emptyIndex = guests.findIndex(g => !g.name && !g.idNumber);
        const newGuests = [...guests];
        
        if (emptyIndex !== -1) {
          newGuests[emptyIndex] = { ...newGuests[emptyIndex], name, idNumber };
        } else {
          newGuests.push({ name, idNumber, frontImage: '', backImage: '', isUploadingFront: false, isUploadingBack: false });
        }
        
        setGuests(newGuests);
        toastSuccess(`Đã quét mã QR cho khách: ${name}`);
        setQrInput(''); // Reset for next scan
      }
    }
  };

  const handleSubmit = async () => {
    // Validate
    const validGuests = guests.filter(g => g.name.trim() || g.idNumber.trim());
    if (validGuests.length === 0) {
      setErrorMsg("Vui lòng nhập thông tin ít nhất một khách lưu trú.");
      return;
    }

    for (let i = 0; i < validGuests.length; i++) {
      const g = validGuests[i];
      if (!g.name.trim()) {
        setErrorMsg(`Vui lòng nhập Họ tên cho khách thứ ${i + 1}.`);
        return;
      }
      if (!g.idNumber || !g.idNumber.trim()) {
        setErrorMsg(`Vui lòng nhập số CCCD/CMND cho khách '${g.name}'.`);
        return;
      }
      const cleanId = g.idNumber.trim();
      if (cleanId.length < 6 || cleanId.length > 20) {
        setErrorMsg(`Số CCCD/CMND/Hộ chiếu của khách '${g.name}' không hợp lệ (từ 6-20 ký tự).`);
        return;
      }
    }

    setProcessing(true);
    setErrorMsg('');
    try {
      await bookingApi.checkIn(booking.id, {
        guests: validGuests.map(g => ({
          name: g.name.trim(),
          idNumber: g.idNumber.trim(),
          phone: g.phone?.trim() || null,
          frontImage: g.frontImage || null,
          backImage: g.backImage || null
        }))
      });
      toastSuccess(`Đã nhận phòng thành công cho ${validGuests.length} khách!`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Check-in error:", error);
      const resData = error.response?.data;
      let msg = resData?.message;
      if (!msg && resData && typeof resData === 'object') {
        const firstVal = Object.values(resData)[0];
        if (typeof firstVal === 'string') msg = firstVal;
      }
      setErrorMsg(msg || "Lỗi khi nhận phòng. Vui lòng thử lại.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhận phòng & Cập nhật CCCD" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <IoAlertCircleOutline size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-surface-container-low p-4 rounded-lg space-y-2 text-sm border border-border-grey flex justify-between">
          <div>
            <div className="text-on-surface-variant mb-1">Người đặt phòng / Trưởng đoàn:</div>
            <div className="font-semibold text-on-surface text-base">{booking.guestName}</div>
            <div className="text-xs text-on-surface-variant mt-1">SĐT: {booking.guestPhone}</div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="text-on-surface-variant mb-1">Phòng:</div>
            <div className="font-bold text-primary text-base">Phòng {booking.roomNumber}</div>
            <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
              {booking.roomTypeName} 
              {booking.roomCapacity && (
                <span className="flex items-center gap-0.5 ml-1 bg-surface-container-high px-1.5 py-0.5 rounded text-[10px]">
                  <IoPersonOutline size={10} /> {booking.roomCapacity} người
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-on-surface flex items-center gap-2">
              Danh sách khách lưu trú & Ảnh CCCD 2 mặt
            </h4>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsScanning(!isScanning)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${isScanning ? 'bg-primary text-white border-primary' : 'bg-surface-container border-border-grey text-on-surface hover:bg-surface-container-high'}`}
              >
                <IoQrCodeOutline size={14} /> {isScanning ? 'Đang quét QR...' : 'Quét QR CCCD'}
              </button>
              <button 
                type="button" 
                onClick={handleAddGuest}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <IoPersonAddOutline size={14} /> Thêm khách
              </button>
            </div>
          </div>

          {isScanning && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg relative overflow-hidden">
              <div className="text-xs text-blue-800 mb-2 font-medium flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Vui lòng đặt con trỏ vào ô bên dưới và sử dụng máy quét mã QR
              </div>
              <input
                ref={qrInputRef}
                type="text"
                value={qrInput}
                onChange={handleQrInput}
                placeholder="Dữ liệu mã QR sẽ xuất hiện ở đây..."
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {guests.map((guest, index) => (
              <div key={index} className="bg-surface-container-lowest p-3.5 rounded-lg border border-border-grey space-y-3 relative group shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">Khách #{index + 1}</span>
                  {guests.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveGuest(index)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <IoTrashOutline size={14} /> Xóa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">Họ và tên <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={guest.name}
                      onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">Số CCCD / CMND <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={guest.idNumber}
                      onChange={(e) => handleGuestChange(index, 'idNumber', e.target.value)}
                      placeholder="012345678912"
                      className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>

                {/* Upload ảnh 2 mặt CCCD */}
                <div className="pt-2 border-t border-border-grey/50">
                  <div className="text-[11px] font-medium text-on-surface-variant mb-2 flex items-center gap-1">
                    <IoImageOutline size={13} className="text-primary" /> Ảnh 2 mặt CCCD (tùy chọn lưu trữ nhanh):
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Mặt trước */}
                    <div className="border border-dashed border-border-grey rounded-lg p-2.5 bg-surface-container/30 text-center relative hover:border-primary transition-colors">
                      {guest.frontImage ? (
                        <div className="space-y-1.5">
                          <img src={guest.frontImage} alt="CCCD Mặt trước" className="h-16 w-full object-cover rounded border border-border-grey" />
                          <div className="flex justify-between items-center text-[10px]">
                            <button 
                              type="button" 
                              onClick={() => setPreviewImage(guest.frontImage)}
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              <IoEyeOutline size={12} /> Xem
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveImage(index, 'front')}
                              className="text-red-500 hover:underline"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-1">
                          <IoCloudUploadOutline size={20} className="mx-auto text-on-surface-variant mb-1" />
                          <span className="text-[11px] text-primary font-medium block">
                            {guest.isUploadingFront ? 'Đang tải...' : 'Mặt trước'}
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            disabled={guest.isUploadingFront}
                            onChange={(e) => handleFileUpload(index, 'front', e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>

                    {/* Mặt sau */}
                    <div className="border border-dashed border-border-grey rounded-lg p-2.5 bg-surface-container/30 text-center relative hover:border-primary transition-colors">
                      {guest.backImage ? (
                        <div className="space-y-1.5">
                          <img src={guest.backImage} alt="CCCD Mặt sau" className="h-16 w-full object-cover rounded border border-border-grey" />
                          <div className="flex justify-between items-center text-[10px]">
                            <button 
                              type="button" 
                              onClick={() => setPreviewImage(guest.backImage)}
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              <IoEyeOutline size={12} /> Xem
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveImage(index, 'back')}
                              className="text-red-500 hover:underline"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-1">
                          <IoCloudUploadOutline size={20} className="mx-auto text-on-surface-variant mb-1" />
                          <span className="text-[11px] text-primary font-medium block">
                            {guest.isUploadingBack ? 'Đang tải...' : 'Mặt sau'}
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            disabled={guest.isUploadingBack}
                            onChange={(e) => handleFileUpload(index, 'back', e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal preview ảnh phóng to */}
        {previewImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-lg w-full bg-white rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
              <img src={previewImage} alt="Ảnh phóng to" className="w-full h-auto rounded max-h-[80vh] object-contain" />
              <button 
                type="button" 
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black transition-colors"
              >
                <IoCloseOutline size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose} disabled={processing} icon={IoCloseOutline}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={processing} icon={IoCheckmarkCircleOutline}>
            {processing ? 'Đang xử lý...' : 'Xác nhận Nhận phòng'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CheckInModal;

