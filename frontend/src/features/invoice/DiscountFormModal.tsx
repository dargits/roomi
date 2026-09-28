import React, { useState, useEffect } from 'react';
import {
  IoTicketOutline,
  IoInformationCircleOutline,
  IoRibbonOutline,
  IoSparklesOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { InvoiceDiscountApplyRequest, InvoiceResponse, LoyaltyTierResponse } from '../../types';
import loyaltyApi from '../../services/loyaltyApi';

interface DiscountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: InvoiceDiscountApplyRequest) => Promise<{ success: boolean; data?: any }>;
  isLoading: boolean;
  invoice?: Partial<InvoiceResponse> & { roomAmount?: number; serviceAmount?: number; remainingAmount?: number; outstandingAmount?: number };
  remainingAmount?: number;
  booking?: any;
}

const DiscountFormModal: React.FC<DiscountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  invoice,
  remainingAmount,
  booking
}) => {
  const [form, setForm] = useState<{
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: string;
    reason: string;
  }>({
    discountType: 'PERCENTAGE',
    discountValue: '',
    reason: '',
  });
  const [errors, setErrors] = useState<{ discountValue?: string; reason?: string }>({});
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTierResponse[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loyaltyApi.getTiers()
        .then((data) => setLoyaltyTiers(data || []))
        .catch(() => setLoyaltyTiers([]));
    }
  }, [isOpen]);

  const grossTotal = (Number(invoice?.roomAmount) || 0) + (Number(invoice?.serviceAmount) || 0);
  const remVal = invoice?.remainingAmount != null
    ? Number(invoice.remainingAmount)
    : (remainingAmount != null
      ? Number(remainingAmount)
      : (invoice?.outstandingAmount != null ? Number(invoice.outstandingAmount) : grossTotal));

  // Base amount for discount: ưu tiên số tiền còn lại cần thanh toán (Giá cuối sau khi trừ cọc)
  const baseAmount = (!isNaN(remVal) && remVal > 0)
    ? remVal
    : (grossTotal > 0 ? grossTotal : (Number(invoice?.totalAmount) || 0));

  const formatVND = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Tìm hạng thành viên của khách trong booking nếu có
  const guestTier = loyaltyTiers.find(
    (t) => (booking?.loyaltyTierId && t.id === booking.loyaltyTierId) ||
           (booking?.loyaltyTierName && t.name.toLowerCase() === booking.loyaltyTierName.toLowerCase())
  );

  const applyTierDiscount = (tier: LoyaltyTierResponse) => {
    const percent = tier.discountPercent != null ? tier.discountPercent : 0;
    setSelectedTierId(tier.id);
    setForm({
      discountType: 'PERCENTAGE',
      discountValue: String(percent),
      reason: `Giảm giá theo hạng thành viên ${tier.name} (${percent}%)`,
    });
    setErrors({});
  };

  /** Tính preview số tiền giảm */
  const calcPreview = (): number | null => {
    const val = parseFloat(form.discountValue);
    if (!form.discountValue || isNaN(val) || val <= 0) return null;
    if (form.discountType === 'PERCENTAGE') {
      if (val > 100) return null;
      return (baseAmount * val) / 100;
    }
    return val;
  };

  const preview = calcPreview();
  const previewTotal = preview != null ? baseAmount - preview : null;
  const isOverLimit = preview != null && preview > baseAmount;

  const validate = () => {
    const errs: { discountValue?: string; reason?: string } = {};
    const val = parseFloat(form.discountValue);

    if (!form.discountValue || isNaN(val) || val <= 0) {
      errs.discountValue = 'Giá trị giảm giá phải lớn hơn 0.';
    } else if (form.discountType === 'PERCENTAGE' && val > 100) {
      errs.discountValue = 'Phần trăm không được vượt quá 100%.';
    } else if (form.discountType === 'FIXED_AMOUNT' && val > baseAmount) {
      errs.discountValue = `Số tiền giảm không được vượt quá số tiền cần thanh toán (${formatVND(baseAmount)}).`;
    }

    if (!form.reason.trim()) {
      errs.reason = 'Lý do giảm giá là bắt buộc nhập.';
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const result = await onSubmit({
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      reason: form.reason.trim(),
    });
    if (result && result.success) {
      handleClose();
    }
  };

  const handleClose = () => {
    setForm({ discountType: 'PERCENTAGE', discountValue: '', reason: '' });
    setSelectedTierId(null);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Áp dụng giảm giá" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tổng tiền cơ sở */}
        <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3.5">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <IoTicketOutline size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-medium">Số tiền áp dụng giảm giá (Giá cuối cần thanh toán)</p>
            <p className="text-base font-bold text-primary">{formatVND(baseAmount)}</p>
            {grossTotal > baseAmount ? (
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                (Tổng gốc: {formatVND(grossTotal)} - Đã thanh toán / cọc: {formatVND(grossTotal - baseAmount)})
              </p>
            ) : (
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                (Bao gồm toàn bộ Tiền phòng: {formatVND(invoice?.roomAmount ?? 0)} + Phụ thu dịch vụ: {formatVND(invoice?.serviceAmount ?? 0)})
              </p>
            )}
          </div>
        </div>

        {/* Tùy chọn giảm giá theo Hạng thành viên (Cấu hình bởi Chủ cơ sở) */}
        {loyaltyTiers.length > 0 && (
          <div className="rounded-xl border border-border-grey bg-surface-container-low/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5 text-primary">
                <IoSparklesOutline className="text-amber-500" size={14} /> Giảm giá theo Hạng thành viên
              </span>
              <span className="text-[10px] text-on-surface-variant/80 font-medium bg-surface-container px-2 py-0.5 rounded">
                Chủ cơ sở cấu hình
              </span>
            </div>

            {/* Thẻ ưu đãi nổi bật nếu khách hàng có hạng */}
            {guestTier && (
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    👑
                  </div>
                  <div>
                    <p className="font-bold text-amber-950">
                      Khách hàng: {booking?.guestName || 'Khách'} — <span className="text-amber-800">{guestTier.name}</span>
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Ưu đãi cấu hình: <strong className="text-amber-950 font-bold">Giảm {guestTier.discountPercent || 0}%</strong> hóa đơn
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => applyTierDiscount(guestTier)}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
                >
                  <IoCheckmarkCircleOutline size={14} /> Áp dụng ({guestTier.discountPercent || 0}%)
                </button>
              </div>
            )}

            {/* Danh sách các Hạng thành viên có thể chọn nhanh */}
            <div>
              <p className="text-[11px] text-on-surface-variant mb-1.5 font-medium">
                Chọn hạng thành viên để tự động điền mức giảm:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {loyaltyTiers.map((tier) => {
                  const isSelected = selectedTierId === tier.id ||
                    (form.discountType === 'PERCENTAGE' && form.discountValue === String(tier.discountPercent || 0) && form.reason.includes(tier.name));
                  const isClientTier = guestTier?.id === tier.id;

                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => applyTierDiscount(tier)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-2xs'
                          : 'border-border-grey bg-surface-container-lowest hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`} title={tier.name}>
                          {tier.name}
                        </span>
                        {isClientTier && <span className="text-[10px]" title="Hạng của khách">👑</span>}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className={`font-extrabold ${isSelected ? 'text-primary' : 'text-emerald-700'}`}>
                          {(tier.discountPercent || 0) > 0 ? `Giảm ${tier.discountPercent}%` : '0%'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {tier.minPoints}đ
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loại giảm giá */}
        <div>
          <label className="text-sm font-semibold text-on-surface block mb-2">
            Loại giảm giá <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'PERCENTAGE' as const, label: 'Phần trăm (%)', sub: 'Tính theo % tổng tiền' },
                { value: 'FIXED_AMOUNT' as const, label: 'Số tiền cố định', sub: 'Giảm trực tiếp (VNĐ)' },
              ]
            ).map(({ value, label, sub }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, discountType: value, discountValue: '' }))}
                className={`rounded-xl border p-3 text-left transition-all ${
                  form.discountType === value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'
                }`}
              >
                <p className={`text-sm font-semibold ${form.discountType === value ? 'text-primary' : 'text-on-surface'}`}>
                  {label}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Giá trị giảm */}
        <div>
          <label className="text-sm font-semibold text-on-surface block mb-1.5">
            {form.discountType === 'PERCENTAGE' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (VNĐ)'}
            <span className="text-error"> *</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
              step={form.discountType === 'PERCENTAGE' ? '0.01' : 'any'}
              value={form.discountValue}
              onChange={(e) => { setForm(f => ({ ...f, discountValue: e.target.value })); setErrors(v => ({ ...v, discountValue: '' })); }}
              placeholder={form.discountType === 'PERCENTAGE' ? 'Ví dụ: 10' : 'Ví dụ: 50000'}
              className={`w-full rounded-lg border px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-1
                bg-surface-container-lowest text-on-surface
                ${errors.discountValue ? 'border-error focus:ring-error' : 'border-outline-variant focus:ring-primary focus:border-primary'}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">
              {form.discountType === 'PERCENTAGE' ? '%' : '₫'}
            </span>
          </div>
          {errors.discountValue && (
            <p className="text-xs text-error mt-1">{errors.discountValue}</p>
          )}

          {/* Preview số tiền giảm */}
          {preview != null && (
            <div className={`mt-2 rounded-lg p-2.5 border text-xs space-y-1 ${
              isOverLimit ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              <div className="flex justify-between">
                <span>Số tiền giảm thực tế:</span>
                <span className="font-bold">{formatVND(preview)}</span>
              </div>
              {!isOverLimit && (
                <div className="flex justify-between border-t border-inherit pt-1 mt-1">
                  <span>Tổng sau giảm:</span>
                  <span className="font-bold">{formatVND(previewTotal ?? 0)}</span>
                </div>
              )}
              {isOverLimit && (
                <p className="flex items-center gap-1">
                  <IoInformationCircleOutline size={13} />
                  Vượt quá giới hạn cho phép (QTN-12)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lý do */}
        <div>
          <label className="text-sm font-semibold text-on-surface block mb-1.5">
            Lý do giảm giá <span className="text-error">*</span>
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => { setForm(f => ({ ...f, reason: e.target.value })); setErrors(v => ({ ...v, reason: '' })); }}
            rows={3}
            placeholder="Ví dụ: Khách hàng thân thiết, Lỗi phòng, Sự cố dịch vụ..."
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 resize-none
              bg-surface-container-lowest text-on-surface
              ${errors.reason ? 'border-error focus:ring-error' : 'border-outline-variant focus:ring-primary focus:border-primary'}`}
          />
          {errors.reason && <p className="text-xs text-error mt-1">{errors.reason}</p>}
        </div>

        {/* Lưu ý phê duyệt */}
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <IoInformationCircleOutline size={14} className="mt-0.5 shrink-0" />
          <span>
            Nếu số tiền giảm vượt ngưỡng quy định, hóa đơn sẽ chuyển sang trạng thái
            <strong> Chờ duyệt </strong> và cần Chủ cơ sở phê duyệt trước khi thanh toán.
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            icon={IoTicketOutline}
            isLoading={isLoading}
            disabled={isOverLimit}
            className="flex-1"
          >
            Áp dụng giảm giá
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            Hủy
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DiscountFormModal;
