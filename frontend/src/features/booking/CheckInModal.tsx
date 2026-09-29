import React, { useState, useEffect } from 'react';
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
  IoEyeOutline,
  IoExpandOutline,
  IoRefreshOutline,
  IoOpenOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import CameraQrScanner from '../../components/common/CameraQrScanner';
import bookingApi from '../../services/bookingApi';
import guestApi from '../../services/guestApi';
import { fileApi } from '../../services/fileApi';
import { useToast } from '../../context/ToastContext';
import { BookingResponse } from '../../types';
import { validateCCCD, validatePhone } from '../../utils/securitySanitizer';

interface GuestFormItem {
  name: string;
  idNumber: string;
  phone?: string;
  frontImage: string;
  backImage: string;
  isUploadingFront: boolean;
  isUploadingBack: boolean;
}

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingResponse | any;
  onSuccess?: () => void;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, booking, onSuccess }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [guests, setGuests] = useState<GuestFormItem[]>([
    { name: '', idNumber: '', frontImage: '', backImage: '', isUploadingFront: false, isUploadingBack: false }
  ]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && booking) {
      setGuests([{ 
        name: booking.guestName || '', 
        idNumber: booking.guestIdNumber || '',
        phone: booking.guestPhone || '',
        frontImage: '',
        backImage: '',
        isUploadingFront: false,
        isUploadingBack: false
      }]);
      setErrorMsg('');
      setIsScanning(false);
      setPreviewImage(null);
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsScanning(false);
    onClose();
  };

  const handleAddGuest = () => {
    setGuests([...guests, { name: '', idNumber: '', frontImage: '', backImage: '', isUploadingFront: false, isUploadingBack: false }]);
  };

  const handleRemoveGuest = (index: number) => {
    const newGuests = [...guests];
    newGuests.splice(index, 1);
    setGuests(newGuests);
  };

  const handleGuestChange = (index: number, field: keyof GuestFormItem, value: any) => {
    const newGuests = [...guests];
    (newGuests[index] as any)[field] = value;
    setGuests(newGuests);
    
    if (field === 'idNumber' && typeof value === 'string' && value.length === 12 && /^\d{12}$/.test(value)) {
      fetchGuestInfo(value, index, newGuests);
    }
  };

  const handleFileUpload = async (index: number, side: 'front' | 'back', file?: File) => {
    if (!file) return;
    const isFront = side === 'front';
    const uploadKey: keyof GuestFormItem = isFront ? 'isUploadingFront' : 'isUploadingBack';
    const imageKey: keyof GuestFormItem = isFront ? 'frontImage' : 'backImage';

    const updated = [...guests];
    (updated[index] as any)[uploadKey] = true;
    setGuests(updated);

    try {
      const res = await fileApi.uploadFile(file);
      const afterUpload = [...guests];
      (afterUpload[index] as any)[uploadKey] = false;
      (afterUpload[index] as any)[imageKey] = res.url;
      setGuests(afterUpload);
      toastSuccess(`Đã tải lên ảnh CCCD ${isFront ? 'mặt trước' : 'mặt sau'} thành công!`);
    } catch (err) {
      console.error(err);
      const afterUpload = [...guests];
      (afterUpload[index] as any)[uploadKey] = false;
      setGuests(afterUpload);
      toastError(`Lỗi tải lên ảnh ${isFront ? 'mặt trước' : 'mặt sau'}. Vui lòng thử lại.`);
    }
  };

  const handleRemoveImage = (index: number, side: 'front' | 'back') => {
    const updated = [...guests];
    if (side === 'front') updated[index].frontImage = '';
    else updated[index].backImage = '';
    setGuests(updated);
  };

  const fetchGuestInfo = async (idNumber: string, index: number, currentGuests: GuestFormItem[]) => {
    try {
      const guest = await guestApi.getGuestByIdNumber(idNumber);
      if (guest && guest.name) {
        const updatedGuests = [...currentGuests];
        if (!updatedGuests[index].name) {
          updatedGuests[index].name = guest.name;
        }
        setGuests(updatedGuests);
        toastSuccess(`Đã tự động điền thông tin khách: ${guest.name}`);
      }
    } catch {
      // Ignore if guest not found
    }
  };

  const handleScanQr = (parsedData: any, rawText?: string) => {
    const { idNumber, name } = parsedData || {};
    const targetId = idNumber || rawText?.trim() || '';
    const targetName = name || '';

    if (!targetId && !targetName) return;

    let newGuests = [...guests];
    
    let targetIndex = newGuests.findIndex(g => g.idNumber && g.idNumber === targetId);

    if (targetIndex === -1 && targetName) {
      targetIndex = newGuests.findIndex(g => (!g.idNumber || !g.idNumber.trim()) && g.name && g.name.trim().toLowerCase() === targetName.trim().toLowerCase());
    }

    if (targetIndex === -1) {
      targetIndex = newGuests.findIndex(g => !g.idNumber || !g.idNumber.trim());
    }

    if (targetIndex !== -1) {
      newGuests[targetIndex] = { 
        ...newGuests[targetIndex], 
        idNumber: targetId,
        name: targetName || newGuests[targetIndex].name || ''
      };
    } else {
      targetIndex = newGuests.length;
      newGuests.push({ 
        name: targetName, 
        idNumber: targetId, 
        frontImage: '', 
        backImage: '', 
        isUploadingFront: false, 
        isUploadingBack: false 
      });
    }
    
    setGuests(newGuests);
    toastSuccess(`Đã nhận diện CCCD: ${targetName ? targetName + ' (' + targetId + ')' : targetId}`);

    setIsScanning(false);

    if (targetId && /^\d{9,12}$/.test(targetId)) {
      fetchGuestInfo(targetId, targetIndex, newGuests);
    }
  };

  const handleSubmit = async () => {
    const validGuests = guests.filter(g => g.name.trim() || g.idNumber.trim());
    if (validGuests.length === 0) {
      setErrorMsg("Vui lòng nhập thông tin ít nhất một khách lưu trú.");
      return;
    }

    if (booking.roomCapacity && validGuests.length > booking.roomCapacity) {
      setErrorMsg(`Số lượng khách (${validGuests.length} người) vượt quá sức chứa tối đa của phòng (${booking.roomCapacity} người). Vui lòng chuyển sang loại phòng lớn hơn theo quy định.`);
      return;
    }

    for (let i = 0; i < validGuests.length; i++) {
      const g = validGuests[i];
      if (!g.name.trim()) {
        setErrorMsg(`Vui lòng nhập Họ tên cho khách thứ ${i + 1}.`);
        return;
      }
      if (!g.idNumber || !g.idNumber.trim()) {
        setErrorMsg(`Vui lòng nhập số CCCD/CMND hoặc Hộ chiếu cho khách '${g.name}'.`);
        return;
      }
      const cccdCheck = validateCCCD(g.idNumber, true);
      if (!cccdCheck.valid) {
        setErrorMsg(`Khách '${g.name}': ${cccdCheck.message}`);
        return;
      }
      if (g.phone && g.phone.trim()) {
        const phoneCheck = validatePhone(g.phone, false);
        if (!phoneCheck.valid) {
          setErrorMsg(`Khách '${g.name}': ${phoneCheck.message}`);
          return;
        }
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
    } catch (error: any) {
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Nhận phòng & Cập nhật CCCD" maxWidth="max-w-3xl">
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
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  isScanning 
                    ? 'bg-primary text-white border-primary shadow-xs' 
                    : 'bg-surface-container border-border-grey text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <IoQrCodeOutline size={14} /> {isScanning ? 'Đang bật quét QR' : 'Quét QR CCCD'}
              </button>
              <button 
                type="button" 
                onClick={handleAddGuest}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium cursor-pointer"
              >
                <IoPersonAddOutline size={14} /> Thêm khách
              </button>
            </div>
          </div>

          {isScanning && (
            <div className="mb-4 animate-fade-in">
              <CameraQrScanner 
                onScan={handleScanQr}
                placeholder="Dán hoặc dùng máy quét bắn mã QR CCCD vào đây..."
                autoStopOnScan={false}
              />
            </div>
          )}

          <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1.5">
            {guests.map((guest, index) => (
              <div key={index} className="bg-surface-container-lowest p-4 rounded-xl border border-border-grey space-y-3.5 relative group shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary-50 border border-primary/20">
                    Khách #{index + 1}
                  </span>
                  {guests.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveGuest(index)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <IoTrashOutline size={14} /> Xóa khách
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Họ và tên <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={guest.name}
                      onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Số CCCD / CMND <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={guest.idNumber}
                      onChange={(e) => handleGuestChange(index, 'idNumber', e.target.value)}
                      placeholder="012345678912"
                      className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-on-surface-variant mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={guest.phone || ''}
                      onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                      placeholder="0912345678"
                      className="w-full px-3 py-2 bg-surface-container border border-border-grey rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>
                </div>

                {/* Upload ảnh 2 mặt CCCD */}
                <div className="pt-3 border-t border-border-grey/70">
                  <div className="text-xs font-semibold text-on-surface mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <IoImageOutline size={15} className="text-primary" /> 
                      Ảnh giấy tờ CCCD 2 mặt:
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Bấm vào ảnh để xem kích thước lớn
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Mặt trước */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between transition-all hover:shadow-2xs hover:border-primary/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-800">
                          Mặt trước CCCD
                        </span>
                        {guest.frontImage && (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                            <IoCheckmarkCircleOutline size={13} /> Đã có ảnh
                          </span>
                        )}
                      </div>

                      {guest.frontImage ? (
                        <div className="space-y-2">
                          <div 
                            onClick={() => setPreviewImage(guest.frontImage)}
                            className="relative group/img cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5 aspect-[85.6/54] w-full flex items-center justify-center shadow-2xs"
                            title="Bấm để xem phóng to"
                          >
                            <img 
                              src={guest.frontImage} 
                              alt="CCCD Mặt trước" 
                              className="w-full h-full object-contain p-1 transition-transform duration-200 group-hover/img:scale-105" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-medium text-xs rounded-lg backdrop-blur-2xs">
                              <IoExpandOutline size={18} />
                              <span>Xem lớn</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <button 
                              type="button" 
                              onClick={() => setPreviewImage(guest.frontImage)}
                              className="text-primary hover:text-primary-dark font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-primary-50 transition-colors"
                            >
                              <IoEyeOutline size={14} /> Xem lớn
                            </button>
                            <div className="flex items-center gap-1.5">
                              <label className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-slate-200/60 transition-colors" title="Chọn ảnh khác để thay thế">
                                <IoRefreshOutline size={13} /> Thay ảnh
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  disabled={guest.isUploadingFront}
                                  onChange={(e) => handleFileUpload(index, 'front', e.target.files?.[0])}
                                />
                              </label>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveImage(index, 'front')}
                                className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-rose-50 transition-colors"
                                title="Xóa ảnh này"
                              >
                                <IoTrashOutline size={13} /> Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-primary rounded-lg aspect-[85.6/54] w-full flex flex-col items-center justify-center p-3 text-center transition-all bg-white hover:bg-primary-50/20 group/drop">
                          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover/drop:bg-primary-50 flex items-center justify-center text-slate-500 group-hover/drop:text-primary mb-1.5 transition-colors">
                            <IoCloudUploadOutline size={22} />
                          </div>
                          <span className="text-xs text-primary font-semibold block">
                            {guest.isUploadingFront ? 'Đang tải lên...' : 'Tải lên Mặt trước'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Chụp thẳng hoặc tải file ảnh
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
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between transition-all hover:shadow-2xs hover:border-primary/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800">
                          Mặt sau CCCD
                        </span>
                        {guest.backImage && (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                            <IoCheckmarkCircleOutline size={13} /> Đã có ảnh
                          </span>
                        )}
                      </div>

                      {guest.backImage ? (
                        <div className="space-y-2">
                          <div 
                            onClick={() => setPreviewImage(guest.backImage)}
                            className="relative group/img cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-900/5 aspect-[85.6/54] w-full flex items-center justify-center shadow-2xs"
                            title="Bấm để xem phóng to"
                          >
                            <img 
                              src={guest.backImage} 
                              alt="CCCD Mặt sau" 
                              className="w-full h-full object-contain p-1 transition-transform duration-200 group-hover/img:scale-105" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-medium text-xs rounded-lg backdrop-blur-2xs">
                              <IoExpandOutline size={18} />
                              <span>Xem lớn</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs">
                            <button 
                              type="button" 
                              onClick={() => setPreviewImage(guest.backImage)}
                              className="text-primary hover:text-primary-dark font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-primary-50 transition-colors"
                            >
                              <IoEyeOutline size={14} /> Xem lớn
                            </button>
                            <div className="flex items-center gap-1.5">
                              <label className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-slate-200/60 transition-colors" title="Chọn ảnh khác để thay thế">
                                <IoRefreshOutline size={13} /> Thay ảnh
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  disabled={guest.isUploadingBack}
                                  onChange={(e) => handleFileUpload(index, 'back', e.target.files?.[0])}
                                />
                              </label>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveImage(index, 'back')}
                                className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-md hover:bg-rose-50 transition-colors"
                                title="Xóa ảnh này"
                              >
                                <IoTrashOutline size={13} /> Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-primary rounded-lg aspect-[85.6/54] w-full flex flex-col items-center justify-center p-3 text-center transition-all bg-white hover:bg-primary-50/20 group/drop">
                          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover/drop:bg-primary-50 flex items-center justify-center text-slate-500 group-hover/drop:text-primary mb-1.5 transition-colors">
                            <IoCloudUploadOutline size={22} />
                          </div>
                          <span className="text-xs text-primary font-semibold block">
                            {guest.isUploadingBack ? 'Đang tải lên...' : 'Tải lên Mặt sau'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Chụp thẳng hoặc tải file ảnh
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div 
              className="relative max-w-3xl w-full bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-zinc-800 flex flex-col items-center" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-zinc-800 text-white">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <IoImageOutline size={18} className="text-primary-400" />
                  Xem ảnh CCCD / Giấy tờ tùy thân
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImage}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1"
                    title="Mở trong tab mới"
                  >
                    <IoOpenOutline size={14} /> Mở tab mới
                  </a>
                  <button 
                    type="button" 
                    onClick={() => setPreviewImage(null)}
                    className="bg-zinc-800 text-zinc-300 hover:text-white rounded-lg p-1.5 hover:bg-zinc-700 transition-colors cursor-pointer"
                    title="Đóng"
                  >
                    <IoCloseOutline size={18} />
                  </button>
                </div>
              </div>
              <div className="w-full max-h-[75vh] flex items-center justify-center overflow-auto rounded-lg bg-black/50 p-2">
                <img 
                  src={previewImage} 
                  alt="Ảnh CCCD" 
                  className="max-w-full max-h-[72vh] rounded-md object-contain shadow-md" 
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
          <Button variant="secondary" onClick={handleClose} disabled={processing} icon={IoCloseOutline}>
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
