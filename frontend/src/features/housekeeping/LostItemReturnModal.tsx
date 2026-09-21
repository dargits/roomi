import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { lostItemApi } from '../../services/lostItemApi';
import { LostItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { extractErrorMessage } from '../../services/api';
import {
  IoCheckmarkCircleOutline,
  IoPersonOutline,
  IoCallOutline,
  IoDocumentTextOutline,
  IoWarningOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';

interface LostItemReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LostItem | null;
  onSuccess: (updatedItem: LostItem) => void;
}

const LostItemReturnModal: React.FC<LostItemReturnModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverNote, setReceiverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setReceiverName(item.guestName || '');
      setReceiverPhone(item.guestPhone || '');
      setReceiverNote('Khách trực tiếp đến nhận tại quầy lễ tân.');
    }
  }, [isOpen, item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName.trim()) {
      toastError('Vui lòng nhập họ tên người nhận');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await lostItemApi.returnToGuest(item.id, {
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim() || undefined,
        receiverNote: receiverNote.trim() || undefined,
      });
      toastSuccess(`Đã hoàn tất bàn giao món đồ "${item.itemName}" cho ${receiverName}!`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      toastError(extractErrorMessage(err, 'Không thể thực hiện trả đồ cho khách.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thủ tục bàn giao / Trả đồ cho khách"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tóm tắt món đồ */}
        <div className="bg-[#F4F6F0] p-3.5 rounded-xl border border-border-grey space-y-1.5">
          <div className="text-xs text-[#606D56]">Món đồ bàn giao:</div>
          <div className="font-bold text-[#1A2411] text-sm">
            {item.itemName}
          </div>
          <div className="text-xs text-[#606D56] flex items-center gap-3">
            <span>Phòng: <strong className="text-[#16A34A]">P.{item.roomNumber}</strong></span>
            <span>Vị trí: <strong>{item.foundLocation}</strong></span>
          </div>
        </div>

        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex items-start gap-2.5">
          <IoShieldCheckmarkOutline className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            Hệ thống sẽ lưu lại người thực hiện bàn giao (Lễ tân đang đăng nhập), thời điểm bàn giao và thông tin người nhận vào nhật ký kiểm toán.
          </div>
        </div>

        {/* Form nhập */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#606D56] mb-1">
            Họ tên người nhận <span className="text-error">*</span>
          </label>
          <div className="relative">
            <IoPersonOutline className="absolute left-3 top-3 text-[#8E9B86] w-4 h-4" />
            <input
              type="text"
              required
              placeholder="VD: Nguyễn Văn A (chủ phòng / người được ủy quyền)"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#606D56] mb-1">
            Số điện thoại người nhận
          </label>
          <div className="relative">
            <IoCallOutline className="absolute left-3 top-3 text-[#8E9B86] w-4 h-4" />
            <input
              type="tel"
              placeholder="VD: 0912345678"
              value={receiverPhone}
              onChange={(e) => setReceiverPhone(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#606D56] mb-1">
            Ghi chú bàn giao
          </label>
          <div className="relative">
            <IoDocumentTextOutline className="absolute left-3 top-3 text-[#8E9B86] w-4 h-4" />
            <textarea
              rows={2}
              placeholder="VD: Khách xuất trình CCCD nhận lại, hoặc bạn khách nhận thay..."
              value={receiverNote}
              onChange={(e) => setReceiverNote(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47]"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-grey">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
          >
            <IoCheckmarkCircleOutline className="w-4 h-4 mr-1.5" />
            Xác nhận bàn giao
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LostItemReturnModal;
