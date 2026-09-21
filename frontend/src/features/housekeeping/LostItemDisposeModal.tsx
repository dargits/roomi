import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { lostItemApi } from '../../services/lostItemApi';
import { LostItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { extractErrorMessage } from '../../services/api';
import {
  IoTrashOutline,
  IoWarningOutline,
  IoDocumentTextOutline,
  IoCubeOutline,
} from 'react-icons/io5';

interface LostItemDisposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LostItem | null;
  onSuccess: (updatedItem: LostItem) => void;
}

const DISPOSAL_METHODS = [
  'Tiêu hủy',
  'Thanh lý',
  'Tặng từ thiện',
  'Sung công quỹ cơ sở',
  'Chuyển giao cho cơ quan chức năng',
  'Khác',
];

const LostItemDisposeModal: React.FC<LostItemDisposeModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [disposalMethod, setDisposalMethod] = useState('Tiêu hủy');
  const [disposalNote, setDisposalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalMethod) {
      toastError('Vui lòng chọn hình thức xử lý');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await lostItemApi.disposeItem(item.id, {
        disposalMethod,
        disposalNote: disposalNote.trim() || undefined,
      });
      toastSuccess(`Đã cập nhật xử lý quá hạn theo chính sách cho món đồ "${item.itemName}"!`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      toastError(extractErrorMessage(err, 'Không thể xử lý món đồ. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xử lý đồ quá hạn theo chính sách"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-start gap-2.5">
          <IoWarningOutline className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Món đồ đã quá thời hạn lưu giữ cấu hình của cơ sở. Việc xử lý sẽ được ghi nhận vào nhật ký kiểm toán với người phê duyệt hiện tại.
          </div>
        </div>

        {/* Tóm tắt món đồ */}
        <div className="bg-[#F4F6F0] p-3.5 rounded-xl border border-border-grey space-y-1">
          <div className="text-xs text-[#606D56]">Món đồ xử lý:</div>
          <div className="font-bold text-[#1A2411] text-sm">
            {item.itemName}
          </div>
          <div className="text-xs text-[#606D56] flex items-center gap-3">
            <span>Phòng: <strong className="text-[#16A34A]">P.{item.roomNumber}</strong></span>
            <span>Ngày phát hiện: <strong>{item.foundDate}</strong></span>
            {item.retentionExpiryDate && (
              <span className="text-error font-semibold">
                Hạn lưu giữ: <strong>{item.retentionExpiryDate}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Hình thức xử lý */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#606D56] mb-1">
            Hình thức xử lý <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DISPOSAL_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setDisposalMethod(method)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 transition cursor-pointer ${
                  disposalMethod === method
                    ? 'bg-rose-50 border-rose-400 text-rose-700 font-semibold shadow-xs'
                    : 'bg-white border-border-grey text-[#1A2411] hover:border-border-grey/80'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    disposalMethod === method ? 'bg-rose-500' : 'bg-neutral-300'
                  }`}
                />
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Ghi chú lý do / Biên bản */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#606D56] mb-1">
            Lý do / Biên bản xử lý chi tiết
          </label>
          <div className="relative">
            <IoDocumentTextOutline className="absolute left-3 top-3 text-[#8E9B86] w-4 h-4" />
            <textarea
              rows={3}
              placeholder="VD: Quá 30 ngày không liên lạc được với khách, cơ sở thực hiện tiêu hủy theo quy chế..."
              value={disposalNote}
              onChange={(e) => setDisposalNote(e.target.value)}
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
            variant="danger"
            isLoading={submitting}
          >
            <IoTrashOutline className="w-4 h-4 mr-1.5" />
            Xác nhận xử lý quá hạn
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LostItemDisposeModal;
