import React, { useState } from 'react';
import { IoCallOutline, IoCalendarOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import debtApprovalApi from '../../services/debtApprovalApi';
import { DebtAgingItemResponse } from '../../types/report';

interface DebtCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtItem: DebtAgingItemResponse | null;
  onSuccess: () => void;
}

const CONTACT_METHODS = [
  { value: 'PHONE', label: '📞 Gọi điện thoại' },
  { value: 'ZALO', label: '💬 Nhắn Zalo' },
  { value: 'EMAIL', label: '✉️ Gửi Email đối soát' },
  { value: 'SMS', label: '📱 Gửi tin nhắn SMS' },
  { value: 'IN_PERSON', label: '🤝 Gặp trực tiếp' },
  { value: 'OTHER', label: '📋 Hình thức khác' }
];

const CONTACT_RESULTS = [
  { value: 'PROMISED_TO_PAY', label: '✅ Khách hẹn ngày thanh toán' },
  { value: 'NO_ANSWER', label: '📵 Không nghe máy / Không phản hồi' },
  { value: 'COMPLAINT', label: '⚠️ Khách có thắc mắc / khiếu nại hóa đơn' },
  { value: 'PENDING_APPROVAL', label: '⏳ Chờ phê duyệt từ kế toán bên khách' },
  { value: 'OTHER', label: 'Khác' }
];

const fmtCurrency = (amount?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

const DebtCollectionModal: React.FC<DebtCollectionModalProps> = ({
  isOpen,
  onClose,
  debtItem,
  onSuccess
}) => {
  const [contactMethod, setContactMethod] = useState('PHONE');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [nextReminderDate, setNextReminderDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (debtItem) {
      setRecipientEmail(debtItem.guestEmail || '');
    }
  }, [debtItem, isOpen]);

  if (!debtItem) return null;

  const handleContactMethodChange = (newMethod: string) => {
    setContactMethod(newMethod);
    if (newMethod === 'EMAIL' && !notes.trim()) {
      setNotes('Gửi email đối soát công nợ chi tiết & thông tin thanh toán cho khách hàng.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Vui lòng nhập nội dung trao đổi / ghi chú liên hệ');
      return;
    }

    if (contactMethod === 'EMAIL' && !recipientEmail.trim()) {
      setError('Vui lòng nhập địa chỉ email người nhận để gửi đối soát');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await debtApprovalApi.addCollectionLog(debtItem.id, {
        contactMethod,
        notes: notes.trim(),
        nextReminderDate: nextReminderDate || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        sendEmail: contactMethod === 'EMAIL'
      });
      onSuccess();
      onClose();
      // Reset form
      setNotes('');
      setNextReminderDate('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi ghi nhận nhật ký');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <IoCallOutline className="text-primary text-xl" />
          <span>Ghi nhận liên hệ đòi nợ — {debtItem.guestName}</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Card */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-border-grey space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Hóa đơn:</span>
            <span className="font-semibold text-on-surface">{debtItem.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Khách hàng:</span>
            <span className="font-semibold text-on-surface">{debtItem.guestName} ({debtItem.guestPhone || 'Không có SĐT'})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Số tiền còn nợ:</span>
            <span className="font-bold text-error text-base">{fmtCurrency(debtItem.debtAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Hạn cam kết ban đầu:</span>
            <span className="font-medium text-on-surface">{debtItem.dueDate}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-error border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form Inputs */}
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Hình thức liên hệ <span className="text-error">*</span>
          </label>
          <Select
            options={CONTACT_METHODS}
            value={contactMethod}
            onChange={(e) => handleContactMethodChange(e.target.value)}
          />
        </div>

        {contactMethod === 'EMAIL' && (
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
              <span className="text-base leading-none">✉️</span>
              <span>
                Hệ thống sẽ tự động gửi email thông báo đối soát công nợ chi tiết kèm thông tin số tài khoản và hạn thanh toán tới địa chỉ email dưới đây:
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-950 dark:text-blue-200 mb-1">
                Địa chỉ Email người nhận <span className="text-error">*</span>
              </label>
              <Input
                type="email"
                placeholder="Ví dụ: ketoan@khachhang.com hoặc guest@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Nội dung trao đổi / Ghi chú liên hệ <span className="text-error">*</span>
          </label>
          <textarea
            className="w-full p-3 rounded-lg border border-border-grey bg-surface focus:border-primary focus:outline-hidden text-sm text-on-surface min-h-[90px]"
            placeholder="Ví dụ: Đã gửi email đối soát chi tiết cho khách; hoặc đã gọi điện nhắc khách..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Hẹn ngày liên hệ lại (Hệ thống nhắc thu)
          </label>
          <Input
            type="date"
            value={nextReminderDate}
            onChange={(e) => setNextReminderDate(e.target.value)}
          />
          <span className="text-[11px] text-on-surface-variant mt-1 block">
            Hệ thống sẽ tự động cảnh báo nhắc thu cho kế toán vào ngày này.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Đang xử lý...' : (contactMethod === 'EMAIL' ? '✉️ Gửi Email & Lưu Nhật Ký' : 'Lưu nhật ký')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DebtCollectionModal;
