import React, { useState, useEffect } from 'react';
import {
  IoCashOutline, IoAlertCircleOutline, IoCheckmarkCircleOutline, IoCloseOutline,
  IoArrowUndoOutline, IoTimeOutline, IoWarningOutline,
  IoReceiptOutline, IoQrCodeOutline, IoCopyOutline, IoCheckmarkOutline
} from 'react-icons/io5';
import { depositApi } from '../../services/depositApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { DepositResponse, DepositPolicyResponse, BookingResponse } from '../../types';

interface DepositTabProps {
  bookingId: number;
  booking?: BookingResponse | any;
  onRefresh?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ thu', color: 'bg-yellow-100 text-yellow-800' },
  COLLECTED: { label: 'Đã thu', color: 'bg-blue-100 text-blue-800' },
  SHORT_PAID: { label: 'Thu thiếu', color: 'bg-orange-100 text-orange-800' },
  REFUNDED: { label: 'Đã hoàn', color: 'bg-green-100 text-green-800' },
  PARTIALLY_REFUNDED: { label: 'Hoàn một phần', color: 'bg-teal-100 text-teal-800' },
  FORFEITED: { label: 'Đã tịch thu', color: 'bg-red-100 text-red-800' },
};

const fmt = (n?: number | string | null) => n != null ? Number(n).toLocaleString('vi-VN') + 'đ' : '—';

const DepositTab: React.FC<DepositTabProps> = ({ bookingId, booking, onRefresh }) => {
  const { user } = useAuth();
  const { success: toastSuccess } = useToast();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canRecord = ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(user?.role || '');

  const [deposits, setDeposits] = useState<DepositResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setCancellationFee] = useState<any>(null);
  const [, setFeeLoading] = useState<boolean>(false);

  // Danh sách chính sách cọc
  const [policies, setPolicies] = useState<DepositPolicyResponse[]>([]);
  const [, setPolicyLoading] = useState<boolean>(false);

  // Modal thu cọc
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [recordForm, setRecordForm] = useState({ amount: '', paymentMethod: 'CASH', note: '', shortPaidReason: '' });
  const [recordError, setRecordError] = useState<string>('');
  const [recordLoading, setRecordLoading] = useState<boolean>(false);
  const [showShortPaidReason, setShowShortPaidReason] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string>('');

  // Modal hoàn tiền / phí hủy
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundLoading, setRefundLoading] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string>('');

  // Modal no-show
  const [showNoShowModal, setShowNoShowModal] = useState<boolean>(false);
  const [noShowData, setNoShowData] = useState({ reason: '', penaltyOverride: '' });
  const [noShowError, setNoShowError] = useState<string>('');
  const [noShowLoading, setNoShowLoading] = useState<boolean>(false);

  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

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

  useEffect(() => {
    if (bookingId) {
      fetchDeposits();
      fetchPolicies();
    }
  }, [bookingId]);

  const getApplicablePolicy = (): DepositPolicyResponse | null => {
    if (!policies || policies.length === 0) return null;
    if (booking?.roomTypeId != null) {
      const specific = policies.find(
        p => p.active !== false && p.roomTypeId != null && String(p.roomTypeId) === String(booking.roomTypeId)
      );
      if (specific) return specific;
    }
    return policies.find(p => p.active !== false && p.roomTypeId == null) || null;
  };

  const applicablePolicy = getApplicablePolicy();

  const calculateSuggestedDeposit = () => {
    if (!applicablePolicy || !booking?.expectedPrice) return null;
    const percent = Number(applicablePolicy.depositPercent) || 0;
    const expectedPrice = Number(booking.expectedPrice) || 0;
    if (percent <= 0 || expectedPrice <= 0) return 0;
    return Math.round((expectedPrice * percent) / 100);
  };

  const suggestedDepositAmount = calculateSuggestedDeposit();

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const currentPayAmount = parseFloat(recordForm.amount) || 0;
  const transferCode = `COC-${String(bookingId || '').padStart(5, '0')}`;
  const qrImageUrl = `https://img.vietqr.io/image/MB-0365221338-compact2.png?amount=${currentPayAmount}&addInfo=${encodeURIComponent(transferCode)}&accountName=BAN%20HUU%20SU`;

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

  const handleAmountChange = (val: string) => {
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

  const handleRecordDeposit = async () => {
    const amount = parseFloat(recordForm.amount);
    if (!amount || amount <= 0) { setRecordError('Số tiền cọc phải lớn hơn 0'); return; }
    const totalExpected = booking?.expectedPrice;
    if (totalExpected && amount > parseFloat(String(totalExpected))) {
      setRecordError('Số tiền cọc không được vượt quá tổng tiền phòng dự kiến');
      return;
    }
    setRecordLoading(true); setRecordError('');
    try {
      await depositApi.recordDeposit(bookingId, {
        amount,
        paymentMethod: recordForm.paymentMethod as any,
        note: recordForm.note,
        shortPaidReason: recordForm.shortPaidReason || undefined
      });
      setShowRecordModal(false);
      toastSuccess(`Đã ghi nhận tiền đặt cọc ${fmt(amount)} (${recordForm.paymentMethod === 'CASH' ? 'Tiền mặt' : recordForm.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Thẻ POS'}) thành công!`);
      setActionMsg({ type: 'success', text: 'Đã ghi nhận tiền cọc thành công.' });
      fetchDeposits();
      onRefresh?.();
    } catch (err: any) {
      setRecordError(err.response?.data?.message || 'Không thể ghi nhận. Vui lòng thử lại.');
    } finally {
      setRecordLoading(false);
    }
  };

  const handleRefund = async () => {
    setRefundLoading(true); setRefundError('');
    try {
      await depositApi.refundDeposit(bookingId, { reason: refundReason });
      setShowRefundModal(false);
      toastSuccess('Đã xử lý hoàn tiền cọc thành công!');
      setActionMsg({ type: 'success', text: 'Đã xử lý hoàn tiền cọc.' });
      fetchDeposits();
      onRefresh?.();
    } catch (err: any) {
      setRefundError(err.response?.data?.message || 'Không thể hoàn tiền. Vui lòng thử lại.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleNoShow = async () => {
    setNoShowLoading(true); setNoShowError('');
    try {
      const payload: any = { reason: noShowData.reason };
      if (isOwner && noShowData.penaltyOverride) {
        payload.penaltyOverride = parseFloat(noShowData.penaltyOverride);
      }
      await depositApi.noShowDeposit(bookingId, payload);
      setShowNoShowModal(false);
      toastSuccess('Đã xử lý phạt tiền cọc khách vắng mặt (No-Show)!');
      setActionMsg({ type: 'success', text: 'Đã chuyển toàn bộ tiền cọc thành phí phạt no-show.' });
      fetchDeposits();
      onRefresh?.();
    } catch (err: any) {
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
      {actionMsg.text && (
        <div className={`flex items-center gap-2 p-3 rounded border text-sm ${
          actionMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-error'
        }`}>
          {actionMsg.type === 'success' ? <IoCheckmarkCircleOutline size={16} /> : <IoAlertCircleOutline size={16} />}
          {actionMsg.text}
          <button className="ml-auto cursor-pointer" onClick={() => setActionMsg({ type: '', text: '' })}>
            <IoCloseOutline size={14} />
          </button>
        </div>
      )}

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
                variant="danger"
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

      {deposits.length > 0 && (
        <div className="bg-surface-container-lowest rounded border border-border-grey p-5">
          <h4 className="font-semibold text-on-surface mb-4 flex items-center gap-2 border-b border-border-grey pb-3">
            <IoReceiptOutline size={18} className="text-primary" /> Lịch sử giao dịch cọc
          </h4>
          <div className="space-y-3">
            {deposits.map((dep) => (
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
                    {(dep.refundedAmount || 0) > 0 && <span className="text-green-600">→ Hoàn {fmt(dep.refundedAmount)}</span>}
                    {(dep.penaltyAmount || 0) > 0 && <span className="text-error">→ Phí {fmt(dep.penaltyAmount)}</span>}
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

      {/* Modal Thu tiền cọc */}
      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Thu tiền đặt cọc" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-surface-blue-light border border-primary/20 rounded p-3 text-sm space-y-1.5">
            {booking?.expectedPrice && (
              <div className="flex justify-between items-center text-on-surface">
                <span>Tổng tiền phòng dự kiến:</span>
                <strong>{fmt(booking.expectedPrice)}</strong>
              </div>
            )}
            {applicablePolicy && (
              <div className="flex justify-between items-center text-primary font-medium text-xs pt-1 border-t border-primary/10">
                <span>Chính sách cọc ({applicablePolicy.roomTypeName}):</span>
                <span className="font-bold text-sm">{applicablePolicy.depositPercent}% ({fmt(suggestedDepositAmount)})</span>
              </div>
            )}
          </div>

          <div>
            <Input
              label="Số tiền cọc thực thu (VNĐ)"
              type="number"
              min="1000"
              step="1000"
              value={recordForm.amount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder="VD: 500000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer text-sm transition-all ${recordForm.paymentMethod === 'TRANSFER' ? 'border-primary bg-primary text-white font-bold shadow-xs' : 'border-border-grey bg-surface text-on-surface font-medium'}`}>
                <input
                  type="radio"
                  name="bookingDepositMethod"
                  value="TRANSFER"
                  checked={recordForm.paymentMethod === 'TRANSFER'}
                  onChange={e => setRecordForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="sr-only"
                />
                Chuyển khoản
              </label>
              <label className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer text-sm transition-all ${recordForm.paymentMethod === 'CASH' ? 'border-primary bg-primary text-white font-bold shadow-xs' : 'border-border-grey bg-surface text-on-surface font-medium'}`}>
                <input
                  type="radio"
                  name="bookingDepositMethod"
                  value="CASH"
                  checked={recordForm.paymentMethod === 'CASH'}
                  onChange={e => setRecordForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="sr-only"
                />
                Tiền mặt
              </label>
            </div>
          </div>

          {recordForm.paymentMethod === 'TRANSFER' && currentPayAmount > 0 && (
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <IoQrCodeOutline size={16} className="text-blue-600" /> Quét mã VietQR chuyển khoản nhanh
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <img
                  src={qrImageUrl}
                  alt="VietQR"
                  className="w-32 h-32 object-contain rounded border border-border-grey bg-white p-1"
                />
                <div className="space-y-1 text-xs flex-1 w-full">
                  <div className="flex justify-between bg-white p-1.5 rounded border border-border-grey">
                    <span className="text-on-surface-variant">Số TK:</span>
                    <div className="flex items-center gap-1">
                      <strong className="font-mono text-primary font-bold">0365221338</strong>
                      <button type="button" onClick={() => copyToClipboard('0365221338', 'acc')} className="p-0.5 cursor-pointer">
                        {copiedField === 'acc' ? <IoCheckmarkOutline className="text-green-600" size={14} /> : <IoCopyOutline size={12} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between bg-white p-1.5 rounded border border-border-grey">
                    <span className="text-on-surface-variant">Nội dung:</span>
                    <div className="flex items-center gap-1">
                      <strong className="font-mono text-primary font-bold">{transferCode}</strong>
                      <button type="button" onClick={() => copyToClipboard(transferCode, 'memo')} className="p-0.5 cursor-pointer">
                        {copiedField === 'memo' ? <IoCheckmarkOutline className="text-green-600" size={14} /> : <IoCopyOutline size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showShortPaidReason && (
            <div>
              <Input
                label="Lý do thu thiếu cọc"
                value={recordForm.shortPaidReason}
                onChange={e => setRecordForm(p => ({ ...p, shortPaidReason: e.target.value }))}
                placeholder="VD: Khách chuyển trước 1 phần, thanh toán nốt khi nhận phòng..."
              />
            </div>
          )}

          <div>
            <Input
              label="Ghi chú thêm"
              value={recordForm.note}
              onChange={e => setRecordForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Ghi chú nội bộ..."
            />
          </div>

          {recordError && (
            <div className="p-2 bg-red-50 text-red-700 rounded text-xs">
              {recordError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setShowRecordModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleRecordDeposit} isLoading={recordLoading}>Ghi nhận cọc</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Hoàn cọc */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title="Xử lý hoàn tiền cọc / Phí hủy" maxWidth="max-w-md">
        <div className="space-y-4">
          <Input
            label="Lý do hoàn cọc"
            value={refundReason}
            onChange={e => setRefundReason(e.target.value)}
            placeholder="VD: Hủy phòng đúng hạn theo quy định..."
          />
          {refundError && (
            <div className="p-2 bg-red-50 text-red-700 rounded text-xs">
              {refundError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setShowRefundModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={handleRefund} isLoading={refundLoading}>Xác nhận hoàn</Button>
          </div>
        </div>
      </Modal>

      {/* Modal No-Show */}
      <Modal isOpen={showNoShowModal} onClose={() => setShowNoShowModal(false)} title="Xử lý cọc khách không đến (No-Show)" maxWidth="max-w-md">
        <div className="space-y-4">
          <Input
            label="Lý do tịch thu cọc"
            value={noShowData.reason}
            onChange={e => setNoShowData(p => ({ ...p, reason: e.target.value }))}
            placeholder="VD: Khách không đến nhận phòng và không thông báo..."
          />
          {isOwner && (
            <Input
              label="Mức phạt ghi đè (VNĐ, tùy chọn)"
              type="number"
              value={noShowData.penaltyOverride}
              onChange={e => setNoShowData(p => ({ ...p, penaltyOverride: e.target.value }))}
              placeholder="Để trống để áp dụng mức phạt tự động"
            />
          )}
          {noShowError && (
            <div className="p-2 bg-red-50 text-red-700 rounded text-xs">
              {noShowError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setShowNoShowModal(false)}>Hủy</Button>
            <Button variant="danger" onClick={handleNoShow} isLoading={noShowLoading}>Tịch thu cọc</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepositTab;
