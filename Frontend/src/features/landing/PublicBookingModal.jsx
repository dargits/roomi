import React, { useState } from 'react';
import { IoBedOutline, IoCalendarOutline, IoCallOutline, IoCheckmarkCircle, IoCloseOutline, IoDocumentOutline, IoMailOutline, IoPersonOutline, IoShieldCheckmarkOutline, IoSparklesOutline, IoTimeOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { bookingRequestApi } from '../../services/bookingRequestApi';
import { useAppConfig } from '../../context/AppConfigContext';

const PublicBookingModal = ({ isOpen, onClose, roomType, checkInDate, checkOutDate }) => {
  const { hotelSetting } = useAppConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    guestName: '',
    phone: '',
    email: '',
    note: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    setSuccess(false);
    setError('');
    setFormData({ guestName: '', phone: '', email: '', note: '' });
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const requestData = {
        ...formData,
        roomTypeId: roomType?.id,
        checkInDate: checkInDate?.toISOString().split('T')[0],
        checkOutDate: checkOutDate?.toISOString().split('T')[0]
      };
      
      await bookingRequestApi.createBookingRequest(requestData);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Lỗi gửi yêu cầu đặt phòng");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Tính số đêm
  const nights = checkInDate && checkOutDate 
    ? Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)))
    : 1;

  // ==============================================================
  // 1. GIAO DIỆN THÀNH CÔNG (LUXURY SUCCESS CARD)
  // ==============================================================
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={null} maxWidth="max-w-lg">
        <div className="relative text-center p-2 sm:p-4">
          {/* Nút đóng góc phải */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-0 right-0 p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <IoCloseOutline size={20} />
          </button>

          {/* Animated Brand Logo with bouncing colored dots */}
          <div className="flex flex-col items-center justify-center mx-auto mb-4 mt-2 select-none">
            <span className="font-logo font-bold text-[34px] tracking-wide text-primary leading-none uppercase">
              {hotelSetting?.propertyName || 'STAY AWAY'}
            </span>
            <div className="flex gap-2 mt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>

          {/* Title & Celebration */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <IoSparklesOutline size={13} className="text-emerald-600" />
            GỬI YÊU CẦU THÀNH CÔNG
          </div>
          <h3 className="font-headline-md text-on-surface text-2xl font-bold tracking-tight">
            Cảm ơn bạn, {formData.guestName}!
          </h3>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-sm mx-auto leading-relaxed">
            Yêu cầu giữ phòng của bạn đã được chuyển tới bộ phận lễ tân.
          </p>

          {/* Booking Summary Ticket */}
          <div className="mt-5 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/50 border border-border-grey rounded-2xl p-4 text-left shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            
            <div className="flex justify-between items-start border-b border-border-grey/70 pb-3 mb-3">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Hạng phòng đã chọn</span>
                <div className="font-title-md text-on-surface font-bold text-base mt-0.5 flex items-center gap-1.5">
                  <IoBedOutline size={17} className="text-primary" />
                  {roomType?.name}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                Chờ xác nhận
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-on-surface-variant flex items-center gap-1">
                  <IoCalendarOutline size={12} /> Thời gian lưu trú
                </span>
                <p className="font-semibold text-on-surface mt-0.5">
                  {nights} đêm ({checkInDate ? checkInDate.toLocaleDateString('vi-VN') : ''} → {checkOutDate ? checkOutDate.toLocaleDateString('vi-VN') : ''})
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

          {/* Contact Commitment Box */}
          <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-left flex items-start gap-3">
            <IoTimeOutline size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 leading-relaxed">
              Lễ tân của <strong>StayGO</strong> sẽ gọi điện trực tiếp tới số <strong>{formData.phone}</strong> trong vòng <strong>15 - 30 phút</strong> để xác nhận chi tiết nhận phòng và chính sách ưu đãi.
            </div>
          </div>

          {/* Hotline */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <IoCallOutline size={14} className="text-primary" />
            <span>Hotline hỗ trợ 24/7: <strong className="text-on-surface">098.222.2222</strong></span>
          </div>

          {/* Action Button */}
          <div className="mt-6">
            <Button
              onClick={handleClose}
              className="w-full justify-center py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all rounded-xl"
            >
              Hoàn Tất & Về Trang Chủ
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ==============================================================
  // 2. GIAO DIỆN FORM ĐIỀN THÔNG TIN (PREMIUM BOOKING FORM)
  // ==============================================================
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yêu Cầu Đặt Phòng Trực Tuyến" maxWidth="max-w-2xl">
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-error rounded-xl text-xs font-medium flex items-center gap-2 animate-shake">
          {error}
        </div>
      )}
      
      {/* Room Summary Header */}
      <div className="mb-6 p-4 bg-gradient-to-r from-surface-container-low to-surface-blue-light/30 rounded-2xl border border-border-grey flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Thông tin lựa chọn</span>
          <div className="font-title-lg text-on-surface font-bold text-lg mt-0.5 flex items-center gap-2">
            <IoBedOutline size={20} className="text-primary" />
            {roomType?.name}
          </div>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1.5">
            <IoCalendarOutline size={13} className="text-primary" />
            <span>
              {formatDate(checkInDate)} → {formatDate(checkOutDate)} ({nights} đêm)
            </span>
          </div>
        </div>
        <div className="text-left md:text-right border-t md:border-t-0 border-border-grey pt-2 md:pt-0">
          <div className="text-xs text-on-surface-variant">Đơn giá tham khảo</div>
          <div className="font-headline-sm text-primary font-bold text-xl mt-0.5">
            {roomType?.price || (roomType?.basePrice ? roomType.basePrice.toLocaleString('vi-VN') + ' ₫' : '—')}
            <span className="text-xs text-on-surface-variant font-normal"> /đêm</span>
          </div>
        </div>
      </div>

      <form id="publicBookingForm" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Họ và tên người đặt *" 
            name="guestName" 
            icon={IoPersonOutline} 
            value={formData.guestName} 
            onChange={handleInputChange} 
            required 
            placeholder="Ví dụ: Nguyễn Văn A"
          />
          <Input 
            label="Số điện thoại nhận xác nhận *" 
            name="phone" 
            icon={IoCallOutline} 
            value={formData.phone} 
            onChange={handleInputChange} 
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
            onChange={handleInputChange} 
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block font-label-md text-on-surface mb-1.5 text-xs font-semibold">
            Ghi chú hoặc yêu cầu đặc biệt
          </label>
          <div className="relative">
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              rows={2}
              placeholder="Ví dụ: Check-in muộn, phòng tầng cao, hỗ trợ đón sân bay..."
              className="w-full px-3.5 py-2.5 border border-border-grey rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-body-md text-xs sm:text-sm bg-white"
            />
          </div>
        </div>

        <div className="p-3 bg-surface-container-low rounded-xl border border-border-grey/70 flex items-center gap-2 text-xs text-on-surface-variant">
          <IoShieldCheckmarkOutline size={16} className="text-green-600 flex-shrink-0" />
          <span>Không cần thanh toán trước. Lễ tân sẽ gọi điện xác nhận và giữ phòng cho quý khách.</span>
        </div>
      </form>
      
      <div className="flex justify-end gap-3 pt-5 border-t border-border-grey mt-6">
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          Hủy bỏ
        </Button>
        <Button type="submit" form="publicBookingForm" isLoading={loading} className="px-6 py-2.5 font-bold shadow-md">
          Gửi Yêu Cầu Đặt Phòng
        </Button>
      </div>
    </Modal>
  );
};

export default PublicBookingModal;
