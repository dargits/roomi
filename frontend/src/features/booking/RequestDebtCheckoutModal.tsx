import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { debtApprovalApi } from '../../services/debtApprovalApi';
import { invoiceApi } from '../../services/invoiceApi';
import { useToast } from '../../context/ToastContext';
import { IoAlertCircleOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { BookingResponse, InvoiceResponse } from '../../types';

interface RequestDebtCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingResponse | any;
  invoice?: InvoiceResponse | any;
  onSuccess?: () => void;
}

const RequestDebtCheckoutModal: React.FC<RequestDebtCheckoutModalProps> = ({ isOpen, onClose, booking, invoice: existingInvoice, onSuccess }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [debtAmount, setDebtAmount] = useState<number | string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !booking) return;

    const loadOutstandingBalance = async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setDueDate(nextWeek.toISOString().split('T')[0]);
      setReason('');
      setDebtAmount('');
      setBalanceError('');
      setLoadingBalance(true);
      try {
        const invoice = existingInvoice?.id
          ? existingInvoice
          : await invoiceApi.getInvoiceByBooking(booking.id);
        if (!invoice?.id) throw new Error('NO_INVOICE');
        const payments = await invoiceApi.getPayments(invoice.id);
        const paidAmount = payments.reduce((total: number, payment: any) => total + Number(payment.amount || 0), 0);
        setDebtAmount(Math.max(0, Number(invoice.totalAmount || 0) - paidAmount));
      } catch (err: any) {
        console.error(err);
        setBalanceError(err.message === 'NO_INVOICE'
          ? 'Đặt phòng chưa có hóa đơn. Vui lòng lập hóa đơn trước khi đề nghị trả phòng còn nợ.'
          : 'Không thể tải số dư hóa đơn hiện tại. Vui lòng thử lại.');
      } finally {
        setLoadingBalance(false);
      }
    };

    loadOutstandingBalance();
  }, [isOpen, booking, existingInvoice]);

  if (!booking) return null;

  const guestPhone = booking.guest?.phone || booking.guestPhone;
  const guestName = booking.guest?.name || booking.guestName;
  const guestIdNumber = booking.guest?.idNumber || booking.guestIdNumber;
  const isWalkInNoProfile = !guestPhone || guestPhone.trim() === '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isWalkInNoProfile) {
      toastError('Không áp dụng ngoại lệ trả phòng còn nợ cho khách vãng lai chưa có hồ sơ (thiếu số điện thoại)!');
      return;
    }
    if (loadingBalance || balanceError || Number(debtAmount) <= 0) {
      toastError('Số dư hóa đơn chưa sẵn sàng hoặc không còn khoản nợ để đề nghị.');
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
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

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
        ) : null}

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
          <div className="flex justify-between">
            <span className="text-on-surface-variant">CCCD:</span>
            <span className={guestIdNumber ? 'font-medium text-on-surface' : 'text-on-surface-variant italic'}>
              {guestIdNumber || 'Chưa cập nhật'}
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
            value={String(debtAmount)}
            readOnly
            disabled={isWalkInNoProfile || loading || loadingBalance}
            helperText={loadingBalance ? 'Đang tải số dư từ hóa đơn...' : 'Số dư được tính tự động từ hóa đơn và các khoản đã thanh toán'}
          />
          {balanceError && <p className="mt-1 text-xs text-red-600">{balanceError}</p>}
        </div>

        <div>
          <Input
            label="Hạn thu dự kiến"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isWalkInNoProfile || loading || loadingBalance}
            min={new Date().toISOString().split('T')[0]}
            helperText="Thời hạn cam kết thu hồi công nợ từ khách"
          />
        </div>

        <div>
          <label className="block font-label-md text-on-surface-variant mb-1.5">
            Lý do còn nợ <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isWalkInNoProfile || loading || loadingBalance}
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
            disabled={isWalkInNoProfile || loading || loadingBalance || !!balanceError || Number(debtAmount) <= 0}
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
