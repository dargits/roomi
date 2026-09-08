import React, { useState } from 'react';
import {
  IoTicketOutline,
  IoCloseCircleOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoAlertCircleOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

/**
 * Hiển thị badge trạng thái giảm giá với màu tương ứng.
 */
const DiscountStatusBadge = ({ status }) => {
  const config = {
    APPLIED: {
      label: 'Đã áp dụng',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      Icon: IoCheckmarkCircleOutline,
    },
    PENDING_APPROVAL: {
      label: 'Chờ duyệt',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      Icon: IoTimeOutline,
    },
    REJECTED: {
      label: 'Đã từ chối',
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
      Icon: IoCloseCircleOutline,
    },
  };
  const c = config[status] || config.APPLIED;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
    >
      <c.Icon size={13} />
      {c.label}
    </span>
  );
};

/**
 * Panel hiển thị khoản giảm giá đang hiệu lực trên hóa đơn.
 * Cho phép:
 *  - Lễ tân / Kế toán / Owner xóa khoản giảm (khi chưa PAID)
 *  - Owner nhấn Duyệt / Từ chối khi status = PENDING_APPROVAL
 *
 * Props:
 *  - discount: DiscountResponse object
 *  - invoiceStatus: trạng thái hóa đơn hiện tại
 *  - userRole: role của người dùng đang đăng nhập ('OWNER'|'RECEPTIONIST'|'ACCOUNTANT')
 *  - isLoading: loading state từ hook
 *  - onRemove: () => void
 *  - onApprove: () => void
 *  - onReject: (reason: string) => void
 *  - onAddDiscount: () => void – mở form để thêm giảm giá mới
 */
const DiscountPanel = ({
  discount,
  invoiceStatus,
  userRole,
  isLoading,
  onRemove,
  onApprove,
  onReject,
  onAddDiscount,
}) => {
  const { confirm } = useToast();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const isPaid = invoiceStatus === 'PAID';
  const isOwner = userRole === 'OWNER';
  const canDelete = !isPaid && discount?.status !== 'REJECTED';

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleRemove = async () => {
    const ok = await confirm({
      title: 'Xóa giảm giá',
      message: 'Bạn có chắc muốn xóa khoản giảm giá này? Hóa đơn sẽ trở về giá gốc.',
      confirmText: 'Xóa',
      type: 'warning',
    });
    if (ok) onRemove();
  };

  const handleApprove = async () => {
    const ok = await confirm({
      title: 'Phê duyệt giảm giá',
      message: `Xác nhận phê duyệt khoản giảm giá ${formatCurrency(discount?.calculatedAmount)}?`,
      confirmText: 'Phê duyệt',
      type: 'warning',
    });
    if (ok) onApprove();
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối.');
      return;
    }
    setRejectError('');
    await onReject(rejectReason.trim());
    setShowRejectInput(false);
    setRejectReason('');
  };

  // Không có giảm giá → hiện nút Thêm
  if (!discount) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-5 flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <IoTicketOutline size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">Chưa có giảm giá</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Áp dụng khoản giảm giá cho hóa đơn này</p>
        </div>
        {!isPaid && (
          <Button
            size="sm"
            variant="outline"
            icon={IoTicketOutline}
            onClick={onAddDiscount}
            disabled={isLoading}
          >
            Thêm giảm giá
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${
      discount.status === 'PENDING_APPROVAL'
        ? 'border-amber-200 bg-amber-50/40'
        : discount.status === 'REJECTED'
        ? 'border-red-200 bg-red-50/30'
        : 'border-green-200 bg-green-50/30'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <IoTicketOutline size={16} className="text-on-surface-variant" />
          <span className="text-sm font-semibold text-on-surface">Khoản giảm giá</span>
        </div>
        <DiscountStatusBadge status={discount.status} />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Giá trị & Số tiền */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
            <p className="text-xs text-on-surface-variant font-medium mb-1">Loại giảm giá</p>
            <p className="text-sm font-semibold text-on-surface">
              {discount.discountType === 'PERCENTAGE'
                ? `${discount.discountValue}%`
                : formatCurrency(discount.discountValue)}
              <span className="text-xs text-on-surface-variant font-normal ml-1">
                ({discount.discountType === 'PERCENTAGE' ? 'Phần trăm' : 'Số tiền cố định'})
              </span>
            </p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-white/50">
            <p className="text-xs text-on-surface-variant font-medium mb-1">Số tiền giảm</p>
            <p className="text-sm font-bold text-green-700">{formatCurrency(discount.calculatedAmount)}</p>
          </div>
        </div>

        {/* Lý do */}
        <div className="bg-white/70 rounded-lg p-3 border border-white/50">
          <p className="text-xs text-on-surface-variant font-medium mb-1">Lý do giảm giá</p>
          <p className="text-sm text-on-surface">{discount.reason}</p>
        </div>

        {/* Thông tin tạo */}
        <div className="text-xs text-on-surface-variant space-y-1">
          <p>Tạo bởi <span className="font-medium text-on-surface">{discount.createdByName || '—'}</span> lúc {formatDate(discount.createdAt)}</p>
          {discount.reviewedByName && (
            <p>
              {discount.status === 'APPLIED' ? 'Duyệt bởi' : 'Từ chối bởi'}{' '}
              <span className="font-medium text-on-surface">{discount.reviewedByName}</span> lúc {formatDate(discount.reviewedAt)}
            </p>
          )}
          {discount.rejectReason && (
            <div className="flex items-start gap-1.5 mt-2 text-red-600 bg-red-50 rounded-lg p-2.5 border border-red-100">
              <IoAlertCircleOutline size={14} className="mt-0.5 shrink-0" />
              <span>Lý do từ chối: {discount.rejectReason}</span>
            </div>
          )}
        </div>

        {/* Thông báo trạng thái nếu cần */}
        {discount.statusMessage && (
          <div className={`flex items-start gap-2 text-xs rounded-lg p-2.5 border ${
            discount.status === 'PENDING_APPROVAL'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <IoTimeOutline size={14} className="mt-0.5 shrink-0" />
            <span>{discount.statusMessage}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {/* Xóa giảm giá – Lễ tân / Owner / Accountant */}
        {canDelete && (
          <Button
            size="sm"
            variant="dangerOutline"
            icon={IoTrashOutline}
            onClick={handleRemove}
            isLoading={isLoading}
          >
            Xóa giảm giá
          </Button>
        )}

        {/* Duyệt / Từ chối – chỉ OWNER khi PENDING_APPROVAL */}
        {isOwner && discount.status === 'PENDING_APPROVAL' && !isPaid && (
          <>
            <Button
              size="sm"
              variant="success"
              icon={IoCheckmarkCircleOutline}
              onClick={handleApprove}
              isLoading={isLoading}
            >
              Phê duyệt
            </Button>
            <Button
              size="sm"
              variant="dangerOutline"
              icon={IoCloseCircleOutline}
              onClick={() => setShowRejectInput(true)}
              isLoading={isLoading}
            >
              Từ chối
            </Button>
          </>
        )}
      </div>

      {/* Reject reason input */}
      {showRejectInput && (
        <div className="px-4 pb-4 border-t border-inherit pt-3 space-y-2">
          <label className="text-xs font-semibold text-on-surface block">
            Lý do từ chối <span className="text-error">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
            rows={2}
            placeholder="Nhập lý do từ chối giảm giá..."
            className={`w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-1 resize-none
              bg-surface-container-lowest text-on-surface
              ${rejectError ? 'border-error focus:ring-error' : 'border-outline-variant focus:ring-primary focus:border-primary'}`}
          />
          {rejectError && <p className="text-xs text-error">{rejectError}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={handleRejectSubmit} isLoading={isLoading}>
              Xác nhận từ chối
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowRejectInput(false); setRejectReason(''); }}>
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountPanel;
