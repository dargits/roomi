import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { debtApprovalApi } from '../../services/debtApprovalApi';
import { useToast } from '../../context/ToastContext';
import { IoAlertCircleOutline, IoCheckmarkCircleOutline, IoTimeOutline } from 'react-icons/io5';

const RequestDebtCheckoutModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [debtAmount, setDebtAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      // Mặc định dueDate là 7 ngày sau
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setDueDate(nextWeek.toISOString().split('T')[0]);
      setReason('');
      setDebtAmount(booking.remainingAmount || '');
    }
  }, [booking]);

  if (!booking) return null;

  const guestPhone = booking.guest?.phone || booking.guestPhone;
  const guestName = booking.guest?.name || booking.guestName;
  const isWalkInNoProfile = !guestPhone || guestPhone.trim() === '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isWalkInNoProfile) {
      toastError('Không áp dụng ngoại lệ trả phòng còn nợ cho khách vãng lai chưa có hồ sơ (thiếu số điện thoại)!');
      return;
    }
    if (!debtAmount || Number(debtAmount) <= 0) {
      toastError('Vui lòng nhập số tiền còn nợ hợp lệ (> 0 VNĐ)');
      return;
    }
    if (!dueDate) {
      toastError('Vui lòng chọn hạn thu dự kiến');
      return;
    }
    if (!reason.trim()) {
      toastError('Vui lòng nhập lý do trả phòng còn nợ');
      return;
    }

    setLoading(true);
    try {
      await debtApprovalApi.requestDebtCheckout({
        bookingId: booking.id,
        debtAmount: Number(debtAmount),
        dueDate,
        reason: reason.trim()
      });
      toastSuccess('Đã gửi yêu cầu phê duyệt trả phòng còn nợ tới Chủ cơ sở!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đề nghị trả phòng còn nợ (Chờ Chủ cơ sở duyệt)" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isWalkInNoProfile ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <IoAlertCircleOutline size={24} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong className="font-semibold block mb-1">Không thể đề nghị nợ cho khách vãng lai:</strong>
              Khách hàng này chưa có số điện thoại hoặc hồ sơ khách lưu trong hệ thống. Quy tắc ngoại lệ công nợ chỉ áp dụng cho khách đã có thông tin liên hệ xác thực để thu hồi nợ.
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <IoTimeOutline size={18} className="text-amber-600 shrink-0" />
            <span>
              Quy tắc QTN-04: Đặt phòng chỉ được chuyển sang <strong>Đã trả phòng</strong> và phòng chuyển sang <strong>Cần dọn</strong> sau khi Chủ cơ sở phê duyệt yêu cầu này.
            </span>
          </div>
        )}

        <div className="bg-surface-container-low p-3.5 rounded-lg border border-border-grey space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Mã đặt phòng:</span>
            <span className="font-semibold text-on-surface">#{booking.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Khách hàng:</span>
            <span className="font-medium text-on-surface">{guestName || 'Khách vãng lai'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Số điện thoại:</span>
            <span className={guestPhone ? 'font-medium text-on-surface' : 'text-red-600 italic'}>
              {guestPhone || 'Chưa cập nhật'}
            </span>
          </div>
          {booking.roomNumber && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Phòng:</span>
              <span className="font-semibold text-primary">{booking.roomNumber}</span>
            </div>
          )}
        </div>

        <div>
          <Input
            label="Số tiền còn nợ (VNĐ)"
            type="number"
            required
            min="1000"
            step="1000"
            value={debtAmount}
            onChange={(e) => setDebtAmount(e.target.value)}
            disabled={isWalkInNoProfile || loading}
            placeholder="Ví dụ: 500000"
            helperText="Số tiền khách chưa thanh toán cần theo dõi công nợ"
          />
        </div>

        <div>
          <Input
            label="Hạn thu dự kiến"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isWalkInNoProfile || loading}
            min={new Date().toISOString().split('T')[0]}
            helperText="Thời hạn cam kết thu hồi công nợ từ khách"
          />
        </div>

        <div>
          <label className="block font-label-md text-on-surface-variant mb-1.5">
            Lý do còn nợ <span className="text-red-500">*</span>
          </label>
          <textarea
            rows="3"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isWalkInNoProfile || loading}
            placeholder="Ví dụ: Khách công ty chuyển khoản chậm theo hợp đồng, Khách quen xin thanh toán sau 3 ngày..."
            className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={isWalkInNoProfile || loading}
            icon={IoCheckmarkCircleOutline}
          >
            {loading ? 'Đang gửi...' : 'Gửi Chủ cơ sở duyệt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RequestDebtCheckoutModal;
