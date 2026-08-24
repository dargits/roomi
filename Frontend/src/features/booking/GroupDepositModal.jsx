import React, { useEffect, useState } from 'react';
import {
  IoCashOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoDocumentTextOutline,
  IoInformationCircleOutline,
  IoRefreshOutline,
  IoWalletOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import groupBookingApi from '../../services/groupBookingApi';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatDate';

const GroupDepositModal = ({ isOpen, onClose, group, onSuccess }) => {
  const { toastSuccess, toastError } = useToast();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const expectedTotal = Number(group?.expectedTotal || 0);
  const requiredDeposit = Math.round(expectedTotal * 0.3); // 30% default

  useEffect(() => {
    if (isOpen && group?.id) {
      loadDeposits();
      setAmount(requiredDeposit ? String(requiredDeposit) : '');
      setPaymentMethod('TRANSFER');
      setNote(`Thu tiền đặt cọc ĐOÀN-${String(group.id).padStart(5, '0')}`);
      setErrorMsg('');
    }
  }, [isOpen, group?.id]);

  const loadDeposits = async () => {
    if (!group?.id) return;
    setLoading(true);
    try {
      const data = await groupBookingApi.getDeposits(group.id);
      setDeposits(data || []);
    } catch (err) {
      console.error('Error loading deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalDeposited = deposits
    .filter(d => d.status === 'COLLECTED' || d.status === 'SHORT_PAID')
    .reduce((sum, d) => sum + (Number(d.collectedAmount) || 0) - (Number(d.refundedAmount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền cọc hợp lệ lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await groupBookingApi.createDeposit(group.id, {
        amount: numAmount,
        paymentMethod,
        note: note.trim() || undefined
      });
      toastSuccess(`Đã thu cọc ${numAmount.toLocaleString('vi-VN')} đ cho đoàn thành công!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating group deposit:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể ghi nhận thu cọc. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }

  };

  if (!isOpen || !group) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thu tiền đặt cọc — ĐOÀN-${String(group.id).padStart(5, '0')}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        {/* Tóm tắt hồ sơ đoàn */}
        <div className="p-4 bg-surface-container-low rounded-xl border border-border-grey space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <div className="font-semibold text-on-surface text-base">
                {group.representativeName}
              </div>
              <div className="text-xs text-on-surface-variant mt-0.5">
                {group.totalRooms} phòng • {formatDate(group.checkInDate)} → {formatDate(group.checkOutDate)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-on-surface-variant">Tổng dự kiến</div>
              <div className="font-title-md text-primary font-bold">
                {expectedTotal.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border-grey text-xs">
            <div className="bg-surface p-2 rounded-lg border border-border-grey">
              <span className="text-on-surface-variant block">Mức cọc tối thiểu (30%):</span>
              <strong className="text-on-surface font-semibold">
                {requiredDeposit.toLocaleString('vi-VN')} đ
              </strong>
            </div>
            <div className="bg-surface p-2 rounded-lg border border-border-grey">
              <span className="text-on-surface-variant block">Đã thu cọc:</span>
              <strong className={totalDeposited > 0 ? 'text-green-700 font-bold' : 'text-amber-700'}>
                {totalDeposited.toLocaleString('vi-VN')} đ
              </strong>
            </div>
            <div className="bg-surface p-2 rounded-lg border border-border-grey col-span-2 sm:col-span-1">
              <span className="text-on-surface-variant block">Còn thiếu:</span>
              <strong className="text-on-surface font-semibold">
                {Math.max(0, requiredDeposit - totalDeposited).toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>
        </div>

        {/* Lịch sử các lần cọc trước đó */}
        {deposits.length > 0 && (
          <div>
            <div className="font-label-md font-semibold text-on-surface mb-2 flex items-center gap-1.5">
              <IoWalletOutline className="text-primary" size={16} /> Lịch sử các lần cọc ({deposits.length})
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {deposits.map((d) => (
                <div key={d.id} className="flex justify-between items-center p-2.5 bg-green-50/60 rounded-lg border border-green-200 text-xs">
                  <div>
                    <div className="font-semibold text-green-900">
                      +{Number(d.collectedAmount || 0).toLocaleString('vi-VN')} đ ({d.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : d.paymentMethod === 'POS' ? 'Thẻ POS' : 'Tiền mặt'})
                    </div>
                    <div className="text-[11px] text-green-700 mt-0.5">
                      {d.collectedAt ? new Date(d.collectedAt).toLocaleString('vi-VN') : ''} {d.note ? `• ${d.note}` : ''}
                    </div>
                  </div>
                  <span className="bg-green-200 text-green-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                    Đã thu
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form ghi nhận thu cọc mới */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border-grey">
          <div className="font-label-md font-semibold text-on-surface flex items-center gap-1.5">
            <IoCashOutline className="text-primary" size={16} /> Ghi nhận khoản thu cọc
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Số tiền cọc (VNĐ) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1000"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Nhập số tiền..."
            />
            {/* Quick buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(expectedTotal * 0.3)))}
                className="px-2.5 py-1 text-xs bg-surface-container-low hover:bg-surface-container border border-border-grey rounded-md font-medium text-on-surface cursor-pointer"
              >
                30% ({Math.round(expectedTotal * 0.3).toLocaleString('vi-VN')} đ)
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(expectedTotal * 0.5)))}
                className="px-2.5 py-1 text-xs bg-surface-container-low hover:bg-surface-container border border-border-grey rounded-md font-medium text-on-surface cursor-pointer"
              >
                50% ({Math.round(expectedTotal * 0.5).toLocaleString('vi-VN')} đ)
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(expectedTotal))}
                className="px-2.5 py-1 text-xs bg-surface-container-low hover:bg-surface-container border border-border-grey rounded-md font-medium text-on-surface cursor-pointer"
              >
                100% ({expectedTotal.toLocaleString('vi-VN')} đ)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Phương thức thanh toán <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer text-sm font-semibold transition-all ${paymentMethod === 'TRANSFER' ? 'border-primary bg-primary/10 text-primary' : 'border-border-grey bg-surface text-on-surface hover:bg-surface-container-low'}`}>
                <input
                  type="radio"
                  name="depositMethod"
                  value="TRANSFER"
                  checked={paymentMethod === 'TRANSFER'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="sr-only"
                />
                Chuyển khoản
              </label>
              <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer text-sm font-semibold transition-all ${paymentMethod === 'CASH' ? 'border-primary bg-primary/10 text-primary' : 'border-border-grey bg-surface text-on-surface hover:bg-surface-container-low'}`}>
                <input
                  type="radio"
                  name="depositMethod"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="sr-only"
                />
                Tiền mặt
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Ghi chú thu cọc
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Khách chuyển khoản cọc qua Techcombank..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={onClose} disabled={submitting} icon={IoCloseOutline}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={IoCheckmarkCircleOutline}
              isLoading={submitting}
            >
              Xác nhận Thu cọc
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default GroupDepositModal;
