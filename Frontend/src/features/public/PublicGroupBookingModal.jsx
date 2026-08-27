import React, { useEffect, useState } from 'react';
import {
  IoAddOutline,
  IoBedOutline,
  IoCalendarOutline,
  IoCallOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoMailOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoRemoveOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import publicGroupBookingRequestApi from '../../services/publicGroupBookingRequestApi';
import { useAppConfig } from '../../context/AppConfigContext';

const emptyRoomLine = () => ({ roomTypeId: '', quantity: 1 });

const PublicGroupBookingModal = ({ isOpen, onClose, roomTypes, initialRoom, checkInDate, checkOutDate }) => {
  const { hotelSetting } = useAppConfig();
  const [formData, setFormData] = useState({
    representativeName: '', phone: '', email: '', checkInDate: '', checkOutDate: '', note: '', rooms: [emptyRoomLine()],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      representativeName: '',
      phone: '',
      email: '',
      checkInDate: checkInDate ? checkInDate.toISOString().slice(0, 10) : '',
      checkOutDate: checkOutDate ? checkOutDate.toISOString().slice(0, 10) : '',
      note: '',
      rooms: [initialRoom ? { roomTypeId: String(initialRoom.id), quantity: 1 } : emptyRoomLine()],
    });
    setError('');
    setSuccess(false);
  }, [isOpen, initialRoom, checkInDate, checkOutDate]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const updateRoom = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      rooms: previous.rooms.map((room, roomIndex) => roomIndex === index ? { ...room, [field]: value } : room),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (formData.checkInDate >= formData.checkOutDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    if (formData.rooms.some((room) => !room.roomTypeId || Number(room.quantity) < 1)) {
      setError('Vui lòng chọn loại phòng và số lượng hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      await publicGroupBookingRequestApi.create({
        ...formData,
        rooms: formData.rooms.map((room) => ({ roomTypeId: Number(room.roomTypeId), quantity: Number(room.quantity) })),
      });
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi yêu cầu đặt phòng đoàn.');
    } finally {
      setLoading(false);
    }
  };

  const totalRooms = formData.rooms.reduce((total, room) => total + (Number(room.quantity) || 0), 0);

  if (success) {
    const formatSelectedDate = (dateString) => {
      if (!dateString) return '';
      const parts = dateString.split('-');
      if (parts.length !== 3) return dateString;
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // dd/mm/yyyy
    };
    
    // Tính số đêm
    const nights = formData.checkInDate && formData.checkOutDate 
      ? Math.max(1, Math.round((new Date(formData.checkOutDate) - new Date(formData.checkInDate)) / (1000 * 60 * 60 * 24)))
      : 1;

    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={null} maxWidth="max-w-lg">
        <div className="relative text-center p-2 sm:p-4">
          {/* Nút đóng góc phải */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-0 right-0 p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <IoCloseOutline size={20} />
          </button>

          {/* Animated Brand Logo with colored squares */}
          <div className="flex flex-col items-center justify-center mx-auto mb-4 mt-2 select-none">
            <span className="font-logo font-bold text-[34px] tracking-wide text-primary leading-none uppercase">
              {hotelSetting?.propertyName || 'STAY AWAY'}
            </span>
            <div className="flex gap-2 mt-2">
              <div className="w-2.5 h-2.5 bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-2.5 h-2.5 bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2.5 h-2.5 bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-2.5 h-2.5 bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-2.5 h-2.5 bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>

          {/* Title & Celebration */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 mb-2">
            <IoSparklesOutline size={13} className="text-emerald-600" />
            GỬI YÊU CẦU THÀNH CÔNG
          </div>
          <h3 className="font-headline-md text-on-surface text-2xl font-bold tracking-tight">
            Cảm ơn bạn, {formData.representativeName}!
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-sm mx-auto leading-relaxed">
            Yêu cầu đặt phòng đoàn của bạn đã được chuyển tới bộ phận lễ tân.
          </p>

          {/* Booking Summary Ticket - Vuông góc */}
          <div className="mt-5 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/50 border border-border-grey p-4 text-left shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            
            <div className="flex justify-between items-start border-b border-border-grey/70 pb-3 mb-3">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tổng số phòng đoàn</span>
                <div className="font-title-md text-on-surface font-bold text-base mt-0.5 flex items-center gap-1.5">
                  <IoPeopleOutline size={17} className="text-primary" />
                  {totalRooms} phòng ({formData.rooms.length} loại phòng)
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Chờ xác nhận
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-on-surface-variant flex items-center gap-1">
                  <IoCalendarOutline size={12} /> Thời gian lưu trú
                </span>
                <p className="font-semibold text-on-surface mt-0.5">
                  {nights} đêm ({formatSelectedDate(formData.checkInDate)} → {formatSelectedDate(formData.checkOutDate)})
                </p>
              </div>
              <div>
                <span className="text-on-surface-variant flex items-center gap-1">
                  <IoCallOutline size={12} /> Số điện thoại liên hệ
                </span>
                <p className="font-bold text-primary mt-0.5 font-mono text-sm">
                  {formData.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Commitment Box - Vuông góc */}
          <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-200 text-left flex items-start gap-3">
            <IoTimeOutline size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 leading-relaxed">
              Quản lý đặt đoàn của <strong>StayGO</strong> sẽ gọi điện trực tiếp tới số <strong>{formData.phone}</strong> trong vòng <strong>15 - 30 phút</strong> để gửi báo giá ưu đãi và phương án sắp xếp phòng tối ưu nhất.
            </div>
          </div>

          {/* Hotline */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <IoCallOutline size={14} className="text-primary" />
            <span>Hotline hỗ trợ đoàn 24/7: <strong className="text-on-surface">098.222.2222</strong></span>
          </div>

          {/* Action Button - Vuông góc */}
          <div className="mt-6">
            <Button
              onClick={handleClose}
              className="w-full justify-center py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all rounded-none"
            >
              HOÀN TẤT & VỀ TRANG CHỦ
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yêu Cầu Đặt Phòng Theo Đoàn" maxWidth="max-w-2xl">
      {error && <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-error rounded-xl text-xs font-medium flex items-center gap-2 animate-shake">{error}</div>}
      <form id="publicGroupBookingForm" onSubmit={submit} className="space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Họ và tên đại diện *" 
            name="representativeName" 
            icon={IoPersonOutline}
            value={formData.representativeName} 
            onChange={updateField} 
            required 
            placeholder="Ví dụ: Nguyễn Văn A"
          />
          <Input 
            label="Số điện thoại nhận xác nhận *" 
            name="phone" 
            icon={IoCallOutline} 
            value={formData.phone} 
            onChange={updateField} 
            required 
            placeholder="Ví dụ: 0987654321"
          />
        </div>
        <div>
          <Input 
            label="Địa chỉ Email (để nhận hóa đơn & xác nhận điện tử)" 
            name="email" 
            type="email" 
            icon={IoMailOutline} 
            value={formData.email} 
            onChange={updateField} 
            placeholder="email@example.com"
          />
        </div>


        <section className="overflow-hidden rounded-xl border border-border-grey bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-border-grey bg-surface-container-lowest p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-on-surface"><IoBedOutline className="text-primary" size={18} /> Nhu cầu phòng</div>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{totalRooms} phòng</span>
          </div>
          <div className="space-y-3 p-4">
            {formData.rooms.map((room, index) => {
              const selectedOtherIds = new Set(
                formData.rooms
                  .filter((_, lineIndex) => lineIndex !== index && _.roomTypeId)
                  .map((r) => Number(r.roomTypeId))
              );
              const availableRoomTypes = roomTypes.filter(
                (rt) => !selectedOtherIds.has(Number(rt.id)) || Number(rt.id) === Number(room.roomTypeId)
              );

              return (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_100px_42px] items-end gap-3">
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Loại phòng *
                    <select
                      value={room.roomTypeId}
                      onChange={(event) => updateRoom(index, 'roomTypeId', event.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-border-grey bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                      required
                    >
                      <option value="">Chọn loại phòng</option>
                      {availableRoomTypes.map((roomType) => (
                        <option key={roomType.id} value={roomType.id}>
                          {roomType.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Số lượng *"
                    type="number"
                    min="1"
                    value={room.quantity}
                    onChange={(event) => updateRoom(index, 'quantity', event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    title="Xóa loại phòng"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        rooms: previous.rooms.filter((_, roomIndex) => roomIndex !== index),
                      }))
                    }
                    disabled={formData.rooms.length === 1}
                    className="h-[42px] w-[42px] rounded-xl border border-red-200 text-error hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
                  >
                    <IoRemoveOutline size={20} />
                  </button>
                </div>
              );
            })}
            {formData.rooms.length < roomTypes.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={IoAddOutline}
                onClick={() => setFormData((previous) => ({ ...previous, rooms: [...previous.rooms, emptyRoomLine()] }))}
                className="mt-2 rounded-xl"
              >
                Thêm loại phòng
              </Button>
            )}
          </div>
        </section>

        <div>
          <label className="block font-label-md text-on-surface mb-1.5 text-xs font-semibold">
            Ghi chú hoặc yêu cầu đặc biệt
          </label>
          <div className="relative">
            <textarea
              name="note"
              value={formData.note}
              onChange={updateField}
              rows={2}
              placeholder="Ví dụ: Số lượng khách, giờ đến dự kiến, hỗ trợ đón xe..."
              className="w-full px-3.5 py-2.5 border border-border-grey rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-body-md text-xs sm:text-sm bg-white"
            />
          </div>
        </div>

        <div className="p-3 bg-surface-container-low rounded-xl border border-border-grey/70 flex items-center gap-2 text-xs text-on-surface-variant">
          <IoShieldCheckmarkOutline size={16} className="text-green-600 flex-shrink-0" />
          <span>Không cần thanh toán trước. Lễ tân sẽ gọi điện xác nhận và hỗ trợ sắp xếp phòng cho đoàn.</span>
        </div>
      </form>
      <div className="mt-6 flex justify-end gap-3 border-t border-border-grey pt-5">
        <Button variant="ghost" onClick={handleClose} disabled={loading}>Hủy bỏ</Button>
        <Button type="submit" form="publicGroupBookingForm" isLoading={loading} className="px-6 py-2.5 font-bold shadow-md">GỬI YÊU CẦU ĐẶT ĐOÀN</Button>
      </div>
    </Modal>
  );
};

export default PublicGroupBookingModal;