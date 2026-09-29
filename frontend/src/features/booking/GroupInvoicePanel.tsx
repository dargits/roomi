import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IoDocumentOutline,
  IoListOutline,
  IoCashOutline,
  IoPrintOutline,
  IoCheckmarkCircleOutline,
  IoReceiptOutline,
  IoQrCodeOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoGitBranchOutline,
  IoLayersOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { SquareSpinner } from '../../components/common/LoadingScreen';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import groupBookingApi from '../../services/groupBookingApi';
import invoiceApi from '../../services/invoiceApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GroupInvoiceResponse } from '../../types';

interface GroupInvoicePanelProps {
  group: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GroupInvoicePanel: React.FC<GroupInvoicePanelProps> = ({
  group,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GroupInvoiceResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'rooms'>('invoices');

  // Modal print
  const [printInvoice, setPrintInvoice] = useState<any>(null);

  // Payment states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [payNote, setPayNote] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const canManageFinance = !user?.role || ['OWNER', 'RECEPTIONIST', 'ACCOUNTANT', 'ADMIN', 'STAFF'].includes(String(user?.role || '').toUpperCase());

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadInvoices = async () => {
    if (!group?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await groupBookingApi.getInvoices(group.id);
      setData(res);
      const outstanding = Number(res?.outstandingAmount || 0);
      if (outstanding > 0) {
        setPayAmount(String(outstanding));
      }
      if (res?.invoices?.length) {
        setSelectedInvoiceId(res.invoices[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải thông tin hóa đơn của đoàn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && group?.id) {
      loadInvoices();
    } else {
      setData(null);
      setError('');
      setPayError('');
      setPayAmount('');
    }
  }, [isOpen, group?.id]);

  const handleCreateInvoices = async (mode: 'COMBINED' | 'SEPARATE', note?: string) => {
    if (!group?.id) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await groupBookingApi.createInvoices(group.id, { mode, note });
      setData(res);
      toastSuccess(
        mode === 'COMBINED'
          ? 'Đã tạo hóa đơn gộp đoàn và cấn trừ tiền cọc thành công!'
          : `Đã tách hóa đơn riêng cho ${res?.invoices?.length || 0} phòng trong đoàn!`
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi lập hóa đơn cho đoàn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayInvoice = async (invoiceId: number) => {
    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      setPayError('Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0.');
      return;
    }
    setPaySubmitting(true);
    setPayError('');
    try {
      await invoiceApi.recordPayment(invoiceId, {
        amount: numAmount,
        method: payMethod,
        note: payNote.trim() || `Thanh toán hóa đơn đoàn #${group?.id}`,
      });
      toastSuccess(`Đã ghi nhận thanh toán thành công ${numAmount.toLocaleString('vi-VN')} đ!`);
      setPayNote('');
      await loadInvoices();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setPayError(err.response?.data?.message || 'Không thể ghi nhận thanh toán. Vui lòng thử lại.');
    } finally {
      setPaySubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasInvoices = Boolean(data?.invoices && data.invoices.length > 0);
  const activeInvoice = data?.invoices?.find(inv => inv.id === selectedInvoiceId) || data?.invoices?.[0];
  const activeOutstanding = Number(activeInvoice?.remainingAmount ?? activeInvoice?.outstandingAmount ?? 0);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Quản lý Hóa đơn & Thanh toán — ĐOÀN-${String(group?.id || '').padStart(5, '0')} (${group?.representativeName || ''})`}
        maxWidth="max-w-4xl"
      >
        {loading ? (
          <div className="py-14 text-center text-on-surface-variant flex flex-col items-center justify-center">
            <SquareSpinner size="lg" className="mb-3" />
            <p className="text-xs uppercase font-bold tracking-wider text-on-surface">Đang tải hóa đơn đoàn...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Thẻ tóm tắt tài chính tổng đoàn */}
            {(() => {
              const roomAmount = Number(data?.roomAmount || 0) > 0 ? Number(data?.roomAmount) : Number(group?.expectedTotal || 0);
              const serviceAmount = Number(data?.serviceAmount || 0);
              const paidAmount = Number(data?.paidAmount || 0) > 0 ? Number(data?.paidAmount) : Number(group?.depositAmount || 0);
              const totalAmount = roomAmount + serviceAmount;
              const outstandingAmount = data?.outstandingAmount != null && Number(data?.outstandingAmount) >= 0
                ? Number(data.outstandingAmount)
                : Math.max(0, totalAmount - paidAmount);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-surface-container-low p-4 rounded-2xl border border-border-grey">
                  <div>
                    <span className="text-on-surface-variant block mb-1">Tiền phòng ({group?.bookings?.length || 0} phòng):</span>
                    <strong className="text-on-surface font-bold text-sm">
                      {roomAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block mb-1">Dịch vụ phụ thu:</span>
                    <strong className="text-on-surface font-bold text-sm">
                      {serviceAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block mb-1">Đã cọc &amp; Thanh toán:</span>
                    <strong className="text-emerald-800 font-bold text-sm">
                      {paidAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${outstandingAmount > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    <span className="block mb-0.5 font-semibold">Còn lại cần thu:</span>
                    <strong className="font-bold text-sm">
                      {outstandingAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>
              );
            })()}

            {!hasInvoices ? (
              /* Chưa lập hóa đơn: Cho phép chọn Tách hoặc Gộp */
              <div className="space-y-4">
                <div className="text-center py-4 bg-surface rounded-xl border border-dashed border-border-grey px-4">
                  <IoReceiptOutline size={36} className="text-primary/60 mx-auto mb-2" />
                  <h4 className="font-title-md text-on-surface">Đoàn này chưa được lập hóa đơn thanh toán</h4>
                  <p className="text-xs text-on-surface-variant max-w-lg mx-auto mt-1">
                    Vui lòng lựa chọn hình thức lập hóa đơn phù hợp theo yêu cầu của trưởng đoàn hoặc khách ở.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Hóa đơn gộp */}
                  <div className="border-2 border-primary/20 hover:border-primary rounded-2xl p-5 bg-primary/5 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary font-bold text-base mb-2">
                        <IoLayersOutline size={22} />
                        Lập Hóa Đơn Gộp (Combined)
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                        Gộp toàn bộ tiền phòng của <strong>{group?.bookings?.length || 0} phòng</strong> và các dịch vụ sử dụng thành <strong>1 hóa đơn duy nhất</strong> đứng tên người đại diện đoàn.
                      </p>
                      <ul className="text-[11px] text-on-surface space-y-1 mb-4">
                        <li>✓ Tự động cấn trừ toàn bộ tiền cọc đoàn ({Number(group?.depositAmount || 0).toLocaleString('vi-VN')} đ)</li>
                        <li>✓ Hiển thị tổng số tiền cần thanh toán cho toàn bộ đoàn</li>
                        <li>✓ Thuận tiện xuất 1 hóa đơn VAT / thanh toán công ty</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-primary/20">
                      <Button
                        variant="primary"
                        icon={IoLayersOutline}
                        className="w-full"
                        isLoading={submitting}
                        disabled={!canManageFinance}
                        onClick={() => handleCreateInvoices('COMBINED')}
                      >
                        Tạo hóa đơn gộp đoàn
                      </Button>
                    </div>
                  </div>

                  {/* Option 2: Tách theo phòng */}
                  <div className="border-2 border-border-grey hover:border-emerald-500 rounded-2xl p-5 bg-surface transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-2">
                        <IoGitBranchOutline size={22} />
                        Tách Hóa Đơn Theo Phòng (Separate)
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                        Tự động chia tách thành <strong>{group?.bookings?.length || 0} hóa đơn độc lập</strong> theo từng phòng để các thành viên trong đoàn tự thanh toán phần của mình.
                      </p>
                      <ul className="text-[11px] text-on-surface space-y-1 mb-4">
                        <li>✓ Mỗi phòng sở hữu 1 hóa đơn riêng lẻ</li>
                        <li>✓ Theo dõi trạng thái thanh toán riêng từng thành viên</li>
                        <li>✓ Khách tự trả tiền phòng và dịch vụ minibar của phòng mình</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-border-grey">
                      <Button
                        variant="secondary"
                        icon={IoGitBranchOutline}
                        className="w-full"
                        isLoading={submitting}
                        disabled={!canManageFinance}
                        onClick={() => handleCreateInvoices('SEPARATE')}
                      >
                        Tách hóa đơn từng phòng ({group?.bookings?.length || 0} HĐ)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Đã lập hóa đơn */
              <div className="space-y-4">
                {/* Mode indicator & Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-grey pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-on-surface-variant">Chế độ hóa đơn:</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      data.mode === 'COMBINED' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {data.mode === 'COMBINED' ? <IoLayersOutline size={14} /> : <IoGitBranchOutline size={14} />}
                      {data.mode === 'COMBINED' ? 'Hóa đơn gộp toàn đoàn' : `Tách riêng ${data.invoices.length} phòng`}
                    </span>
                  </div>

                  <div className="flex rounded-xl bg-surface-container-low p-1 border border-border-grey text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('invoices')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        activeTab === 'invoices' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <IoDocumentOutline size={15} /> Danh sách Hóa đơn ({data.invoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rooms')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        activeTab === 'rooms' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <IoListOutline size={15} /> Bảng kê từng phòng ({group?.bookings?.length || 0})
                    </button>
                  </div>
                </div>

                {activeTab === 'invoices' ? (
                  <div className="space-y-4">
                    {/* Danh sách các hóa đơn */}
                    <div className="space-y-3">
                      {data.invoices.map((inv, idx) => {
                        const isSelected = inv.id === selectedInvoiceId;
                        const invOutstanding = Number(inv.outstandingAmount ?? Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)));
                        const isPaid = inv.status === 'PAID' || invOutstanding <= 0;
                        return (
                          <div
                            key={inv.id}
                            className={`rounded-2xl border p-4 transition-all ${
                              isSelected ? 'border-primary bg-primary/5 shadow-2xs' : 'border-border-grey bg-surface hover:border-primary/50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-on-surface text-sm">
                                    Hóa đơn #{inv.id} {data.mode === 'COMBINED' ? '(Gộp toàn đoàn)' : `(Phòng ${inv.bookingId || idx + 1})`}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {isPaid ? '✓ Đã thanh toán' : 'Chờ thanh toán'}
                                  </span>
                                </div>
                                <div className="text-xs text-on-surface-variant mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>Tiền phòng: <strong>{Number(inv.roomAmount || 0).toLocaleString('vi-VN')} đ</strong></span>
                                  {Number(inv.serviceAmount || 0) > 0 && (
                                    <span>• Dịch vụ: <strong>{Number(inv.serviceAmount).toLocaleString('vi-VN')} đ</strong></span>
                                  )}
                                  {Number(inv.paidAmount || 0) > 0 && (
                                    <span className="text-emerald-700 font-semibold">• Đã trừ cọc / thanh toán: {Number(inv.paidAmount).toLocaleString('vi-VN')} đ</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <div className="text-right mr-2">
                                  <div className="text-xs text-on-surface-variant font-medium">Còn lại cần thu</div>
                                  <div className={`font-bold text-base ${isPaid ? 'text-green-700' : 'text-primary'}`}>
                                    {invOutstanding.toLocaleString('vi-VN')} đ
                                  </div>
                                  <div className="text-[11px] text-on-surface-variant">
                                    Tổng HĐ: {Number(inv.totalAmount || 0).toLocaleString('vi-VN')} đ
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={IoPrintOutline}
                                  onClick={() => setPrintInvoice(inv)}
                                >
                                  In HĐ
                                </Button>
                                {invOutstanding > 0 && (
                                  <Button
                                    size="sm"
                                    variant={isSelected ? 'primary' : 'secondary'}
                                    icon={IoCashOutline}
                                    onClick={() => {
                                      setSelectedInvoiceId(inv.id);
                                      setPayAmount(String(invOutstanding));
                                    }}
                                  >
                                    Thu tiền
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Khối thanh toán mở rộng cho hóa đơn được chọn */}
                            {isSelected && invOutstanding > 0 && (
                              <div className="mt-4 pt-4 border-t border-border-grey/70 bg-surface-container-low p-4 rounded-xl space-y-3">
                                <div className="font-semibold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                                  <IoCashOutline size={16} /> Thu tiền cho Hóa đơn #{inv.id} (Còn nợ: {invOutstanding.toLocaleString('vi-VN')} đ)
                                </div>
                                {payError && (
                                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                                    {payError}
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                                      Số tiền thanh toán (VNĐ) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="any"
                                      value={payAmount}
                                      onChange={(e) => setPayAmount(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                                      Phương thức
                                    </label>
                                    <select
                                      value={payMethod}
                                      onChange={(e) => setPayMethod(e.target.value as any)}
                                      className="w-full py-2.5 px-3 bg-surface border border-border-grey rounded-lg text-sm outline-none focus:border-primary"
                                    >
                                      <option value="TRANSFER">Chuyển khoản (VietQR)</option>
                                      <option value="CASH">Tiền mặt</option>
                                    </select>
                                  </div>

                                  {payMethod === 'TRANSFER' && parseFloat(payAmount) > 0 && (() => {
                                    const currentAmount = parseFloat(payAmount) || 0;
                                    const invCode = `INV${String(inv.id).padStart(6, '0')}`;
                                    const qrImageUrl = `https://img.vietqr.io/image/MB-0365221338-compact2.png?amount=${currentAmount}&addInfo=${invCode}&accountName=BAN%20HUU%20SU`;
                                    return (
                                      <div className="sm:col-span-2 bg-white p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-3 mt-1">
                                        <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                          <IoQrCodeOutline size={16} className="text-blue-600" /> Quét mã VietQR chuyển khoản
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                          <img
                                            src={qrImageUrl}
                                            alt="VietQR Payment"
                                            className="w-32 h-32 object-contain rounded-lg border border-border-grey bg-white p-1 shadow-xs shrink-0"
                                          />
                                          <div className="space-y-1 text-xs text-on-surface flex-1 w-full">
                                            <div className="flex justify-between items-center bg-white p-1 rounded border border-border-grey">
                                              <span className="text-on-surface-variant">Ngân hàng:</span>
                                              <strong className="font-semibold">MBBank</strong>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-1 rounded border border-border-grey">
                                              <span className="text-on-surface-variant">Số TK:</span>
                                              <div className="flex items-center gap-1">
                                                <strong className="font-mono font-bold text-primary">0365221338</strong>
                                                <button
                                                  type="button"
                                                  onClick={() => copyToClipboard('0365221338', 'acc')}
                                                  className="text-on-surface-variant hover:text-primary p-0.5"
                                                  title="Sao chép số TK"
                                                >
                                                  {copiedField === 'acc' ? <IoCheckmarkOutline className="text-green-600" size={14}/> : <IoCopyOutline size={13}/>}
                                                </button>
                                              </div>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-1 rounded border border-border-grey">
                                              <span className="text-on-surface-variant">Nội dung:</span>
                                              <strong className="font-mono font-bold text-primary">{invCode}</strong>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Ghi chú</label>
                                    <Input
                                      value={payNote}
                                      onChange={(e) => setPayNote(e.target.value)}
                                      placeholder="VD: Thu nốt khi đoàn trả phòng..."
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    icon={IoCheckmarkCircleOutline}
                                    isLoading={paySubmitting}
                                    onClick={() => handlePayInvoice(inv.id)}
                                  >
                                    Xác nhận thanh toán ({Number(payAmount || 0).toLocaleString('vi-VN')} đ)
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Tab Bảng kê chi tiết phòng */
                  <div className="rounded-xl border border-border-grey bg-surface overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-border-grey font-semibold text-on-surface-variant uppercase tracking-wider">
                          <th className="p-3">Mã phòng</th>
                          <th className="p-3">Khách ở</th>
                          <th className="p-3">Loại phòng</th>
                          <th className="p-3 text-right">Tiền phòng</th>
                          <th className="p-3 text-center">Trạng thái</th>
                          <th className="p-3 text-center">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-grey">
                        {group?.bookings?.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-primary">
                              {b.roomNumber ? `P.${b.roomNumber}` : `#${b.id}`}
                            </td>
                            <td className="p-3 text-on-surface font-medium">
                              {b.guestName || group?.representativeName}
                            </td>
                            <td className="p-3 text-on-surface-variant">{b.roomTypeName}</td>
                            <td className="p-3 text-right font-semibold text-on-surface">
                              {Number(b.expectedPrice || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                b.status === 'CHECKED_IN' ? 'bg-green-100 text-green-800' :
                                b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                b.status === 'CHECKED_OUT' ? 'bg-gray-100 text-gray-800' :
                                b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {b.status === 'NEW' ? 'Chưa xếp' :
                                 b.status === 'CONFIRMED' ? 'Đã gán' :
                                 b.status === 'CHECKED_IN' ? 'Đang ở' :
                                 b.status === 'CHECKED_OUT' ? 'Đã trả' :
                                 b.status === 'CANCELLED' ? 'Đã hủy' : b.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <Link
                                to={`/manage/bookings/${b.id}?tab=invoice`}
                                state={{ from: '/manage/bookings/groups' }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline bg-primary/5 px-2 py-0.5 rounded border border-primary/20"
                              >
                                <IoReceiptOutline size={13} /> Xem HĐ lẻ
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end border-t border-border-grey pt-3">
              <Button variant="secondary" onClick={onClose}>Đóng</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal In hóa đơn */}
      {printInvoice && (
        <InvoicePrintTemplate
          invoice={printInvoice}
          group={group}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </>
  );
};

export default GroupInvoicePanel;
