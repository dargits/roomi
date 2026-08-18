import React, { useState, useEffect } from 'react';
import {
  IoCashOutline, IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoArrowUndoOutline, IoTimeOutline, IoWarningOutline, IoInformationCircleOutline,
  IoReceiptOutline
} from 'react-icons/io5';
import { depositApi } from '../../services/depositApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'CREDIT_CARD', label: 'Thẻ POS' },
];

const STATUS_LABELS = {
  PENDING: { label: 'Chờ thu', color: 'bg-yellow-100 text-yellow-800' },
  COLLECTED: { label: 'Đã thu', color: 'bg-blue-100 text-blue-800' },
  SHORT_PAID: { label: 'Thu thiếu', color: 'bg-orange-100 text-orange-800' },
  REFUNDED: { label: 'Đã hoàn', color: 'bg-green-100 text-green-800' },
  PARTIALLY_REFUNDED: { label: 'Hoàn một phần', color: 'bg-teal-100 text-teal-800' },
  FORFEITED: { label: 'Đã tịch thu', color: 'bg-red-100 text-red-800' },
};

const fmt = (n) => n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

/**
 * DepositTab — Tab quản lý đặt cọc trong BookingDetailsModal
 * NCL-11-CN-002: Thu tiền cọc
 * NCL-11-CN-003: Hoàn cọc (hủy miễn phí)
 * NCL-11-CN-004: Phí hủy theo mốc thời gian
 * NCL-11-CN-005: Xử lý cọc no-show
 * NCL-11-CN-006: Lịch sử cọc
 */
const DepositTab = ({ bookingId, booking, onRefresh }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canRecord = ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(user?.role);

  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellationFee, setCancellationFee] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);

  // Danh sách chính sách cọc
  const [policies, setPolicies] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(false);

  // Modal thu cọc
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({ amount: '', paymentMethod: 'CASH', note: '', shortPaidReason: '' });
  const [recordError, setRecordError] = useState('');
  const [recordLoading, setRecordLoading] = useState(false);
  const [showShortPaidReason, setShowShortPaidReason] = useState(false);

  // Modal hoàn tiền / phí hủy
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');

  // Modal no-show
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowData, setNoShowData] = useState({ reason: '', penaltyOverride: '' });
  const [noShowError, setNoShowError] = useState('');
  const [noShowLoading, setNoShowLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (bookingId) {
      fetchDeposits();
      fetchPolicies();
    }
  }, [bookingId]);

  const fetchPolicies = async () => {
    setPolicyLoading(true);
    try {
      const data = await depositApi.getAllPolicies();
      setPolicies(data || []);
    } catch (err) {
      console.error('Lỗi khi tải chính sách đặt cọc:', err);
      setPolicies([]);
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const data = await depositApi.getDepositsByBooking(bookingId);
      setDeposits(data || []);
    } catch {
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  // Xác định chính sách cọc áp dụng cho loại phòng hiện tại
  const getApplicablePolicy = () => {
    if (!policies || policies.length === 0) return null;
    // 1. Tìm chính sách đúng loại phòng
    if (booking?.roomTypeId != null) {
      const specific = policies.find(
        p => p.active !== false && p.roomTypeId != null && String(p.roomTypeId) === String(booking.roomTypeId)
      );
      if (specific) return specific;
    }
    // 2. Fallback: chính sách chung cho tất cả loại phòng
    return policies.find(p => p.active !== false && p.roomTypeId == null) || null;
  };

  const applicablePolicy = getApplicablePolicy();

  // Tự động tính số tiền cọc đề xuất dựa trên chính sách & giá dự kiến
  const calculateSuggestedDeposit = () => {
    if (!applicablePolicy || !booking?.expectedPrice) return null;
    const percent = Number(applicablePolicy.depositPercent) || 0;
    const expectedPrice = Number(booking.expectedPrice) || 0;
    if (percent <= 0 || expectedPrice <= 0) return 0;
    return Math.round((expectedPrice * percent) / 100);
  };

  const suggestedDepositAmount = calculateSuggestedDeposit();

  const openRecordModal = () => {
    const suggested = calculateSuggestedDeposit();
    const initAmount = suggested != null ? String(suggested) : '';
    setRecordForm({
      amount: initAmount,
      paymentMethod: 'CASH',
      note: '',
      shortPaidReason: ''
    });
    setRecordError('');
    setShowShortPaidReason(false);
    setShowRecordModal(true);
  };

  const handleAmountChange = (val) => {
    setRecordForm(p => ({ ...p, amount: val }));
    const numVal = parseFloat(val);
    if (!isNaN(numVal) && suggestedDepositAmount != null && suggestedDepositAmount > 0) {
      if (numVal < suggestedDepositAmount) {
        setShowShortPaidReason(true);
      } else {
        if (!recordForm.shortPaidReason) {
          setShowShortPaidReason(false);
        }
      }
    }
  };

  const fetchFee = async () => {
    setFeeLoading(true);
    try {
      const data = await depositApi.getCancellationFee(bookingId);
      setCancellationFee(data);
    } catch {
      setCancellationFee(null);
    } finally {
      setFeeLoading(false);
    }
  };

  // NCL-11-CN-002: Thu tiền cọc
  const handleRecordDeposit = async () => {
    const amount = parseFloat(recordForm.amount);
    if (!amount || amount <= 0) { setRecordError('Số tiền cọc phải lớn hơn 0'); return; }
    const totalExpected = booking?.expectedPrice;
    if (totalExpected && amount > parseFloat(totalExpected)) {
      setRecordError('Số tiền cọc không được vượt quá tổng tiền phòng dự kiến');
      return;
    }
    setRecordLoading(true); setRecordError('');
    try {
      await depositApi.recordDeposit(bookingId, {
        amount,
        paymentMethod: recordForm.paymentMethod,
        note: recordForm.note,
        shortPaidReason: recordForm.shortPaidReason || undefined
      });
      setShowRecordModal(false);
      toastSuccess(`Đã ghi nhận tiền đặt cọc ${fmt(amount)} (${recordForm.paymentMethod === 'CASH' ? 'Tiền mặt' : recordForm.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Thẻ POS'}) thành công!`);
      setActionMsg({ type: 'success', text: 'Đã ghi nhận tiền cọc thành công.' });
      fetchDeposits();
      onRefresh?.();
    } catch (err) {
      setRecordError(err.response?.data?.message || 'Không thể ghi nhận. Vui lòng thử lại.');
    } finally {
      setRecordLoading(false);
    }
  };

  // NCL-11-CN-003/004: Hoàn tiền cọc
  const handleRefund = async () => {
    setRefundLoading(true); setRefundError('');
    try {
      await depositApi.refundDeposit(bookingId, { reason: refundReason });
      setShowRefundModal(false);
      toastSuccess('Đã xử lý hoàn tiền cọc thành công!');
      setActionMsg({ type: 'success', text: 'Đã xử lý hoàn tiền cọc.' });
      fetchDeposits();
    } catch (err) {
      setRefundError(err.response?.data?.message || 'Không thể hoàn tiền. Vui lòng thử lại.');
    } finally {
      setRefundLoading(false);
    }
  };

  // NCL-11-CN-005: Xử lý no-show
  const handleNoShow = async () => {
    setNoShowLoading(true); setNoShowError('');
    try {
      const payload = { reason: noShowData.reason };
      if (isOwner && noShowData.penaltyOverride) {
        payload.penaltyOverride = parseFloat(noShowData.penaltyOverride);
      }
      await depositApi.noShowDeposit(bookingId, payload);
      setShowNoShowModal(false);
      toastSuccess('Đã xử lý phạt tiền cọc khách vắng mặt (No-Show)!');
      setActionMsg({ type: 'success', text: 'Đã chuyển toàn bộ tiền cọc thành phí phạt no-show.' });
      fetchDeposits();
    } catch (err) {
      setNoShowError(err.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại.');
    } finally {
      setNoShowLoading(false);
    }
  };

  const latestDeposit = deposits[0];
  const hasCollectedDeposit = deposits.some(d =>
    ['COLLECTED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FORFEITED'].includes(d.status)
  );
  const canRecord_deposit = canRecord &&
    !['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(booking?.status) &&
    !hasCollectedDeposit;
  const canRefund = canRecord && latestDeposit &&
    ['COLLECTED', 'SHORT_PAID'].includes(latestDeposit.status) &&
    ['CANCELLED', 'NO_SHOW'].includes(booking?.status) === false;
  const canNoShow = canRecord && latestDeposit &&
    ['COLLECTED', 'SHORT_PAID'].includes(latestDeposit.status) &&
    booking?.status === 'NO_SHOW';

  return (
    <div className="space-y-5">
      {/* Alert kết quả */}
      {actionMsg.text && (
        <div className={`flex items-center gap-2 p-3 rounded border text-sm ${
          actionMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-error'
        }`}>
          {actionMsg.type === 'success' ? <IoCheckmarkCircleOutline size={16} /> : <IoAlertCircleOutline size={16} />}
          {actionMsg.text}
          <button className="ml-auto" onClick={() => setActionMsg({ type: '', text: '' })}>
            <IoCloseOutline size={14} />
          </button>
        </div>
      )}

      {/* Tổng quan khoản cọc */}
      <div className="bg-surface-container-lowest rounded border border-border-grey p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border-grey pb-3">
          <h4 className="font-semibold text-on-surface flex items-center gap-2">
            <IoCashOutline size={18} className="text-primary" /> Thông tin đặt cọc
          </h4>
          <div className="flex items-center gap-2">
            {hasCollectedDeposit && latestDeposit?.status === 'COLLECTED' && (
              <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-md font-semibold text-xs flex items-center gap-1">
                <IoCheckmarkCircleOutline size={14} className="text-green-700" /> Đã thu đủ tiền cọc
              </span>
            )}
            {canRecord_deposit && (
              <Button
                variant="outline"
                size="sm"
                onClick={openRecordModal}
                icon={IoCashOutline}
              >
                Thu tiền cọc
              </Button>
            )}
            {canRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { fetchFee(); setShowRefundModal(true); setRefundError(''); }}
                icon={IoArrowUndoOutline}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                Hoàn / Phí hủy
              </Button>
            )}
            {canNoShow && (
              <Button
                variant="dangerOutline"
                size="sm"
                onClick={() => { setShowNoShowModal(true); setNoShowError(''); setNoShowData({ reason: '', penaltyOverride: '' }); }}
                icon={IoWarningOutline}
              >
                Khách không đến
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-on-surface-variant text-sm">Đang tải...</div>
        ) : deposits.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <IoCashOutline size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có khoản đặt cọc nào cho đặt phòng này.</p>
            {canRecord_deposit && (
              <div className="mt-2 space-y-1">
                {applicablePolicy && (
                  <p className="text-xs text-primary font-medium">
                    Chính sách cọc {applicablePolicy.roomTypeName}: {applicablePolicy.depositPercent}%
                    {suggestedDepositAmount != null && ` (${fmt(suggestedDepositAmount)})`}
                  </p>
                )}
                <p className="text-xs text-on-surface-variant">
                  Nhấn <strong>Thu tiền cọc</strong> để tự động tính và ghi nhận.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Khoản cọc mới nhất — hiển thị nổi bật */}
            {latestDeposit && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-low rounded p-3 text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Yêu cầu</div>
                  <div className="font-bold text-on-surface">{fmt(latestDeposit.requiredAmount)}</div>
                </div>
                <div className="bg-surface-container-low rounded p-3 text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Đã thu</div>
                  <div className="font-bold text-primary">{fmt(latestDeposit.collectedAmount)}</div>
                </div>
                <div className="bg-surface-container-low rounded p-3 text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Đã hoàn</div>
                  <div className="font-bold text-green-600">{fmt(latestDeposit.refundedAmount)}</div>
                </div>
                <div className="bg-surface-container-low rounded p-3 text-center">
                  <div className="text-xs text-on-surface-variant mb-1">Phí phạt</div>
                  <div className="font-bold text-error">{fmt(latestDeposit.penaltyAmount)}</div>
                </div>
              </div>
            )}

            {/* Trạng thái */}
            {latestDeposit && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-on-surface-variant">Trạng thái:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[latestDeposit.status]?.color || 'bg-gray-100'}`}>
                  {STATUS_LABELS[latestDeposit.status]?.label || latestDeposit.status}
                </span>
                {latestDeposit.paymentMethod && (
                  <span className="text-on-surface-variant text-xs">
                    · {latestDeposit.paymentMethod === 'CASH' ? 'Tiền mặt' : latestDeposit.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Thẻ POS'}
                  </span>
                )}
                {latestDeposit.shortPaidReason && (
                  <span className="text-xs text-orange-600 italic">({latestDeposit.shortPaidReason})</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NCL-11-CN-006: Timeline lịch sử cọc */}
      {deposits.length > 0 && (
        <div className="bg-surface-container-lowest rounded border border-border-grey p-5">
          <h4 className="font-semibold text-on-surface mb-4 flex items-center gap-2 border-b border-border-grey pb-3">
            <IoReceiptOutline size={18} className="text-primary" /> Lịch sử giao dịch cọc
          </h4>
          <div className="space-y-3">
            {deposits.map((dep, idx) => (
              <div key={dep.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  dep.status === 'COLLECTED' ? 'bg-blue-500' :
                  dep.status === 'REFUNDED' ? 'bg-green-500' :
                  dep.status === 'FORFEITED' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_LABELS[dep.status]?.color || 'bg-gray-100'}`}>
                      {STATUS_LABELS[dep.status]?.label || dep.status}
                    </span>
                    <span className="font-medium text-on-surface">{fmt(dep.collectedAmount)}</span>
                    {dep.refundedAmount > 0 && <span className="text-green-600">→ Hoàn {fmt(dep.refundedAmount)}</span>}
                    {dep.penaltyAmount > 0 && <span className="text-error">→ Phí {fmt(dep.penaltyAmount)}</span>}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-2">
                    <IoTimeOutline size={11} />
                    {dep.collectedAt ? new Date(dep.collectedAt).toLocaleString('vi-VN') : '—'}
                    {dep.collectedByName && <span>· Thu bởi: {dep.collectedByName}</span>}
                    {dep.processedAt && (
                      <span>
                        · Xử lý: {new Date(dep.processedAt).toLocaleString('vi-VN')}
                        {dep.processedByName && ` (${dep.processedByName})`}
                      </span>
                    )}
                  </div>
                  {dep.note && <p className="text-xs text-on-surface-variant italic mt-0.5">"{dep.note}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Modal Thu tiền cọc (NCL-11-CN-002) === */}
      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Thu tiền đặt cọc" maxWidth="max-w-md">
        <div className="space-y-4">
          {/* Thông tin tiền phòng & Chính sách cọc áp dụng */}
          <div className="bg-surface-blue-light border border-primary/20 rounded p-3 text-sm space-y-1.5">
            {booking?.expectedPrice && (
              <div className="flex justify-between items-center text-on-surface">
                <span>Tổng tiền phòng dự kiến:</span>
                <strong>{fmt(booking.expectedPrice)}</strong>
              </div>
            )}
            {applicablePolicy ? (
              <div className="flex justify-between items-center text-primary font-medium text-xs pt-1 border-t border-primary/10">
                <span>Chính sách cọc ({applicablePolicy.roomTypeName}):</span>
                <span className="font-bold text-sm">{applicablePolicy.depositPercent}% ({fmt(suggestedDepositAmount)})</span>
              </div>
            ) : (
              <div className="text-xs text-on-surface-variant italic pt-1 border-t border-border-grey">
                Không tìm thấy chính sách cọc riêng (Áp dụng mức cọc tự do)
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-on-surface">Số tiền đặt cọc (đ)</label>
              {suggestedDepositAmount != null && recordForm.amount !== String(suggestedDepositAmount) && (
                <button
                  type="button"
                  onClick={() => handleAmountChange(String(suggestedDepositAmount))}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  ↺ Theo chính sách ({fmt(suggestedDepositAmount)})
                </button>
              )}
            </div>
            <Input
              type="number"
              min="0"
              value={recordForm.amount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder="VD: 500000"
            />
          </div>

          <Select
            label="Hình thức thanh toán"
            value={recordForm.paymentMethod}
            onChange={e => setRecordForm(p => ({ ...p, paymentMethod: e.target.value }))}
            options={PAYMENT_METHODS}
          />

          <Input
            label="Ghi chú (tùy chọn)"
            value={recordForm.note}
            onChange={e => setRecordForm(p => ({ ...p, note: e.target.value }))}
            placeholder="Ghi chú thêm..."
          />

          {/* Cảnh báo thu thiếu so với chính sách & ô nhập lý do */}
          {suggestedDepositAmount != null && parseFloat(recordForm.amount || 0) < suggestedDepositAmount && (
            <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2.5">
              <IoWarningOutline size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <div>
                Số tiền thu (<strong>{fmt(recordForm.amount || 0)}</strong>) thấp hơn mức chính sách yêu cầu (<strong>{fmt(suggestedDepositAmount)}</strong>). Hệ thống yêu cầu nhập lý do thu thiếu.
              </div>
            </div>
          )}

          {/* NCL-11-CN-002-TC-03: Thu thiếu → nhập lý do */}
          <div>
            <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={showShortPaidReason}
                onChange={e => setShowShortPaidReason(e.target.checked)}
                className="rounded"
              />
              Số tiền thu thấp hơn mức chính sách yêu cầu (cần nhập lý do)
            </label>
            {showShortPaidReason && (
              <Input
                label="Lý do thu thiếu"
                value={recordForm.shortPaidReason}
                onChange={e => setRecordForm(p => ({ ...p, shortPaidReason: e.target.value }))}
                placeholder="VD: Khách xin nộp bổ sung khi nhận phòng..."
                className="mt-2"
              />
            )}
          </div>
          {recordError && (
            <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
              <IoAlertCircleOutline size={16} /> {recordError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="ghost" icon={IoCloseOutline} onClick={() => setShowRecordModal(false)}>Hủy</Button>
            <Button variant="primary" icon={IoCashOutline} onClick={handleRecordDeposit} isLoading={recordLoading}>
              Xác nhận thu cọc
            </Button>
          </div>
        </div>
      </Modal>

      {/* === Modal Hoàn tiền / Phí hủy (NCL-11-CN-003/004) === */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Hoàn tiền / Phí hủy" maxWidth="max-w-md">
        <div className="space-y-4">
          {/* Tính phí hủy */}
          {feeLoading ? (
            <div className="text-center py-4 text-on-surface-variant text-sm">Đang tính phí hủy...</div>
          ) : cancellationFee ? (
            <div className="bg-surface-container-low rounded p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Đã thu cọc:</span>
                <span className="font-medium">{fmt(cancellationFee.collectedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Phí hủy:</span>
                <span className="font-medium text-error">{fmt(cancellationFee.cancellationFee)}</span>
              </div>
              <div className="flex justify-between border-t border-border-grey pt-2 font-bold">
                <span>Số tiền hoàn lại:</span>
                <span className="text-green-700">{fmt(cancellationFee.refundAmount)}</span>
              </div>
              {parseFloat(cancellationFee.cancellationFee) === 0 && (
                <div className="flex items-center gap-2 text-green-700 text-xs mt-2">
                  <IoCheckmarkCircleOutline size={14} />
                  Hủy trong thời hạn miễn phí — hoàn 100% tiền cọc.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <IoInformationCircleOutline size={16} />
              Không thể tính phí hủy. Kiểm tra chính sách hủy đã được cấu hình chưa.
            </div>
          )}
          <Input
            label="Lý do hoàn tiền (tùy chọn)"
            value={refundReason}
            onChange={e => setRefundReason(e.target.value)}
            placeholder="Ghi chú..."
          />
          {refundError && (
            <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
              <IoAlertCircleOutline size={16} /> {refundError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="ghost" icon={IoCloseOutline} onClick={() => setShowRefundModal(false)}>Hủy</Button>
            <Button variant="primary" icon={IoArrowUndoOutline} onClick={handleRefund} isLoading={refundLoading}>
              Xác nhận hoàn tiền
            </Button>
          </div>
        </div>
      </Modal>

      {/* === Modal No-show (NCL-11-CN-005) === */}
      <Modal isOpen={showNoShowModal} onClose={() => setShowNoShowModal(false)} title="Xử lý đặt cọc — Khách không đến" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded p-4 text-sm">
            <div className="flex items-start gap-2 text-error font-medium mb-2">
              <IoWarningOutline size={16} className="mt-0.5" />
              Toàn bộ tiền cọc sẽ chuyển thành phí phạt do khách không đến.
            </div>
            <p className="text-on-surface-variant">
              Tiền cọc: <strong>{fmt(latestDeposit?.collectedAmount)}</strong>
            </p>
          </div>
          <Input
            label="Lý do (bắt buộc khi điều chỉnh)"
            value={noShowData.reason}
            onChange={e => setNoShowData(p => ({ ...p, reason: e.target.value }))}
            placeholder="Ghi chú..."
          />
          {/* Chỉ OWNER được override phí phạt */}
          {isOwner && (
            <Input
              label="Mức phí phạt tùy chỉnh (chỉ Chủ cơ sở)"
              type="number"
              min="0"
              value={noShowData.penaltyOverride}
              onChange={e => setNoShowData(p => ({ ...p, penaltyOverride: e.target.value }))}
              placeholder="Để trống = giữ 100% cọc"
            />
          )}
          {noShowError && (
            <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
              <IoAlertCircleOutline size={16} /> {noShowError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="ghost" icon={IoCloseOutline} onClick={() => setShowNoShowModal(false)}>Hủy</Button>
            <Button variant="danger" icon={IoWarningOutline} onClick={handleNoShow} isLoading={noShowLoading}>
              Xác nhận tịch thu cọc
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepositTab;
