import React, { useState } from 'react';
import { User, Phone, Mail, FileText, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { bookingRequestApi } from '../../services/bookingRequestApi';

const PublicBookingModal = ({ isOpen, onClose, roomType, checkInDate, checkOutDate }) => {
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

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Thành công" maxWidth="max-w-md">
        <div className="text-center p-6 space-y-4">
          <div className="flex justify-center text-green-500 mb-4">
            <CheckCircle size={64} />
          </div>
          <h3 className="text-xl font-bold text-on-surface">Đã gửi yêu cầu đặt phòng!</h3>
          <p className="text-on-surface-variant">
            Yêu cầu của bạn đã được gửi thành công. Lễ tân của chúng tôi sẽ liên hệ với bạn qua số điện thoại <strong>{formData.phone}</strong> trong thời gian sớm nhất để xác nhận.
          </p>
          <div className="pt-4">
            <Button onClick={onClose} className="w-full">Đóng</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yêu cầu Đặt phòng" maxWidth="max-w-2xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-6 p-4 bg-surface-container-low rounded-lg border border-border-grey flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="font-title-md text-on-surface">Phòng: {roomType?.name}</div>
          <div className="text-sm text-on-surface-variant mt-1">
            Từ: <strong>{checkInDate ? checkInDate.toLocaleDateString('vi-VN') : '—'}</strong> đến <strong>{checkOutDate ? checkOutDate.toLocaleDateString('vi-VN') : '—'}</strong>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-on-surface-variant">Giá mỗi đêm</div>
          <div className="font-headline-sm text-primary">{roomType?.price || roomType?.basePrice?.toLocaleString('vi-VN') + ' ₫'}</div>
        </div>
      </div>

      <form id="publicBookingForm" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Họ và tên" 
            name="guestName" 
            icon={User} 
            value={formData.guestName} 
            onChange={handleInputChange} 
            required 
            placeholder="Ví dụ: Nguyễn Văn A"
          />
          <Input 
            label="Số điện thoại" 
            name="phone" 
            icon={Phone} 
            value={formData.phone} 
            onChange={handleInputChange} 
            required 
            placeholder="Ví dụ: 0987654321"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <Input 
            label="Email (Không bắt buộc)" 
            name="email" 
            type="email"
            icon={Mail} 
            value={formData.email} 
            onChange={handleInputChange} 
          />
        </div>

        <Input 
          label="Ghi chú yêu cầu đặc biệt" 
          name="note" 
          icon={FileText} 
          value={formData.note} 
          onChange={handleInputChange} 
          placeholder="Phòng view biển, hỗ trợ xe lăn..." 
        />
      </form>
      
      <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Hủy</Button>
        <Button type="submit" form="publicBookingForm" isLoading={loading}>Gửi Yêu Cầu</Button>
      </div>
    </Modal>
  );
};

export default PublicBookingModal;
