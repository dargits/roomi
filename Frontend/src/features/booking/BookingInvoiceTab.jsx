import React, { useState, useEffect } from 'react';
import {
  IoAddCircleOutline,
  IoAlertCircleOutline,
  IoCashOutline,
  IoCheckmarkCircleOutline,
  IoDocumentOutline,
  IoDocumentTextOutline,
  IoQrCodeOutline,
  IoCopyOutline,
  IoCalculatorOutline,
  IoCardOutline,
  IoWalletOutline,
  IoCheckmarkOutline,
  IoTicketOutline
} from 'react-icons/io5';
import { invoiceApi } from '../../services/invoiceApi';
import { depositApi } from '../../services/depositApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';
import InvoiceDiscountSection from '../invoice/InvoiceDiscountSection';
import DiscountFormModal from '../invoice/DiscountFormModal';

const BookingInvoiceTab = ({ bookingId, status, booking, onPrintInvoice }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [provisionalServices, setProvisionalServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', paymentMethod: 'CASH', note: '' });
  const [receivedCash, setReceivedCash] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [processing, setProcessing] = useState(false);

  // Modal giảm giá trong quá trình lập hóa đơn
  const [showProvisionalDiscountModal, setShowProvisionalDiscountModal] = useState(false);

  // Modal điều chỉnh hóa đơn
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({ discountAmount: '', note: '' });
  const [adjustError, setAdjustError] = useState('');

  const canAdjust = ['OWNER', 'ACCOUNTANT', 'ADMIN'].includes(user?.role);

  useEffect(() => {
    fetchInvoiceData();
  }, [bookingId]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      // 1. Tải danh sách đặt cọc của booking
      try {
        const depData = await depositApi.getDepositsByBooking(bookingId);
        setDeposits(depData || []);
      } catch (e) {
        setDeposits([]);
      }

      // 2. Chỉ kiểm tra hóa đơn chính thức nếu booking đang/đã ở (CHECKED_IN / CHECKED_OUT)
      if (status === 'CHECKED_IN' || status === 'CHECKED_OUT') {
        try {
          const invData = await invoiceApi.getInvoiceByBooking(bookingId);
          if (invData && invData.id) {
            setInvoice(invData);
            const payData = await invoiceApi.getPayments(invData.id);
            setPayments(payData || []);
            return;
          }
        } catch (error) {
          // Chưa có hóa đơn -> chuyển sang hiển thị tạm tính bên dưới
        }
      }

      // Mặc định: chưa lập hóa đơn (CONFIRMED, NEW, hoặc CHECKED_IN chưa lập)
      setInvoice(null);
      try {
        const servicesData = await bookingApi.getBookingServices(bookingId);
        setProvisionalServices(servicesData || []);
      } catch (e) {
        console.error("Lỗi lấy dịch vụ tạm tính", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (status !== 'CHECKED_IN') return;
    setProcessing(true);
    try {
      await invoiceApi.createInvoice(bookingId);
      toastSuccess("Tạo hóa đơn thành công!");
      fetchInvoiceData();
    } catch (error) {
      toastError(error.response?.data?.message || error.message || "Lỗi lập hóa đơn");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateInvoiceWithDiscount = async (discountPayload) => {
    if (status !== 'CHECKED_IN') return { success: false };
    setProcessing(true);
    try {
      const createdInv = await invoiceApi.createInvoice(bookingId);
      toastSuccess("Tạo hóa đơn thành công!");

      if (discountPayload && discountPayload.discountValue > 0 && discountPayload.reason) {
        try {
          const discRes = await invoiceApi.applyDiscount(createdInv.id, discountPayload);
          toastSuccess(discRes.statusMessage || "Đã áp dụng giảm giá cho hóa đơn!");
        } catch (discErr) {
          toastError(discErr.response?.data?.message || "Lỗi khi áp dụng giảm giá cho hóa đơn mới tạo");
        }
      }
      setShowProvisionalDiscountModal(false);
      fetchInvoiceData();
      return { success: true };
    } catch (error) {
      toastError(error.response?.data?.message || error.message || "Lỗi lập hóa đơn");
      return { success: false };
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentForm = (remAmount) => {
    const defaultAmt = remAmount > 0 ? remAmount : '';
    setNewPayment({
      amount: defaultAmt,
      paymentMethod: 'CASH',
      note: 'Thanh toán tiền mặt tại quầy'
    });
    setReceivedCash(defaultAmt);
    setShowPaymentForm(true);
  };

  const handleMethodChange = (method) => {
    let defaultNote = '';
    if (method === 'CASH') {
      defaultNote = 'Thanh toán tiền mặt tại quầy';
    } else if (method === 'TRANSFER') {
      defaultNote = `CK ngân hàng INV-${String(invoice?.id || '').padStart(6, '0')}`;
    } else if (method === 'CREDIT_CARD') {
      defaultNote = 'Quẹt thẻ POS';
    }
    setNewPayment(prev => ({
      ...prev,
      paymentMethod: method,
      note: defaultNote
    }));
  };

  const handleSetAmount = (amt, remAmount) => {
    const validAmt = Math.min(Math.max(0, amt), remAmount);
    setNewPayment(prev => ({ ...prev, amount: validAmt }));
    if (newPayment.paymentMethod === 'CASH') {
      setReceivedCash(validAmt);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const getCashPresets = (payAmount) => {
    if (!payAmount || payAmount <= 0) return [];
    const presets = new Set();
    presets.add(payAmount);

    const step100k = Math.ceil(payAmount / 100000) * 100000;
    if (step100k > payAmount) presets.add(step100k);

    const step500k = Math.ceil(payAmount / 500000) * 500000;
    if (step500k > payAmount) presets.add(step500k);

    const step1M = Math.ceil(payAmount / 1000000) * 1000000;
    if (step1M > payAmount) presets.add(step1M);

    return Array.from(presets).sort((a, b) => a - b).slice(0, 4);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await invoiceApi.recordPayment(invoice.id, {
        amount: parseFloat(newPayment.amount),
        method: newPayment.paymentMethod,
        note: newPayment.note
      });
      toastSuccess("Ghi nhận thanh toán thành công!");
      setShowPaymentForm(false);
      setNewPayment({ amount: '', paymentMethod: 'CASH', note: '' });
      fetchInvoiceData();
    } catch (error) {
      toastError(error.response?.data?.message || error.message || "Lỗi ghi nhận thanh toán");
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjustInvoice = async (e) => {
    e.preventDefault();
    setAdjustError('');
    if (!adjustData.discountAmount || parseFloat(adjustData.discountAmount) < 0) {
      setAdjustError('Vui lòng nhập số tiền điều chỉnh giảm hợp lệ.');
      return;
    }
    if (parseFloat(adjustData.discountAmount) > invoice.totalAmount) {
      setAdjustError('Số tiền điều chỉnh không thể vượt quá tổng hóa đơn gốc.');
      return;
    }
    if (!adjustData.note.trim()) {
      setAdjustError('Vui lòng ghi rõ lý do điều chỉnh hóa đơn.');
      return;
    }

    setProcessing(true);
    try {
      await invoiceApi.adjustInvoice(invoice.id, {
        discountAmount: parseFloat(adjustData.discountAmount),
        note: adjustData.note.trim()
      });
      setShowAdjustModal(false);
      setAdjustData({ discountAmount: '', note: '' });
      toastSuccess('Đã lập hóa đơn điều chỉnh thành công!');
      fetchInvoiceData();
    } catch (error) {
      setAdjustError(error.response?.data?.message || 'Có lỗi xảy ra khi điều chỉnh hóa đơn.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    setProcessing(true);
    try {
      await bookingApi.checkOut(bookingId);
      toastSuccess("Trả phòng thành công!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toastError(error.response?.data?.message || error.message || "Lỗi trả phòng");
    } finally {
      setProcessing(false);
    }
  };

  // Tiền cọc đã thu thực tế từ khách (đã trừ hoàn/phạt)
  const collectedDepositAmount = deposits.reduce((sum, d) => {
    if (d.status === 'COLLECTED' || d.status === 'SHORT_PAID') {
      const col = Number(d.collectedAmount) || 0;
      const ref = Number(d.refundedAmount) || 0;
      const pen = Number(d.penaltyAmount) || 0;
      return sum + Math.max(0, col - ref - pen);
    }
    return sum;
  }, 0);

  // Kiểm tra xem trong danh sách payments đã có lượt thanh toán cọc chưa
  const isDepositInPayments = payments.some(p =>
    p.note?.includes('đặt cọc') || p.note?.includes('cọc') || p.note?.includes('Deposit')
  );
  const effectiveDepositDeduction = isDepositInPayments ? 0 : collectedDepositAmount;
  const rawPaymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidAmount = rawPaymentsTotal + effectiveDepositDeduction;
  const remainingAmount = invoice ? Math.max(0, Number(invoice.totalAmount) - paidAmount) : 0;
  const currentPayAmount = parseFloat(newPayment.amount) || 0;
  const currentReceivedCash = parseFloat(receivedCash) || 0;
  const cashChange = currentReceivedCash - currentPayAmount;
  const invCode = invoice ? `INV${String(invoice.id).padStart(6, '0')}` : '';
  const qrImageUrl = `https://img.vietqr.io/image/MB-0365224245-compact2.png?amount=${currentPayAmount}&addInfo=${invCode}&accountName=STAY%20AWAY`;

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu hóa đơn...</div>;

  if (!invoice) {
    const provisionalRoomAmount = Number(booking?.expectedPrice) || 0;
    const provisionalServicesAmount = provisionalServices.reduce((sum, s) => sum + (s.unitPriceSnapshot * s.quantity), 0);
    const provisionalGrossTotal = provisionalRoomAmount + provisionalServicesAmount;
    const provisionalNetTotal = Math.max(0, provisionalGrossTotal - collectedDepositAmount);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <IoDocumentOutline size={20} className="text-primary" /> Chi phí Tạm tính
              </h3>
              <span className="px-2 py-1 bg-surface-container-high rounded text-xs text-on-surface-variant font-label-md">
                Chưa lập hóa đơn
              </span>
            </div>

            <div className="space-y-3 font-body-md text-on-surface">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tiền phòng dự kiến:</span>
                <span className="font-medium">{provisionalRoomAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Dịch vụ phụ thu ({provisionalServices.length} món):</span>
                <span>{provisionalServicesAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              {collectedDepositAmount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold bg-green-50 p-2.5 rounded border border-green-200 text-sm">
                  <span className="flex items-center gap-1.5">
                    <IoCashOutline size={16} /> Tiền đặt cọc đã thu:
                  </span>
                  <span>-{collectedDepositAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="border-t border-border-grey mt-4 pt-4 flex justify-between items-end">
                <div>
                  <span className="font-title-md text-on-surface block">Còn lại tạm tính:</span>
                  {collectedDepositAmount > 0 && (
                    <span className="text-xs text-on-surface-variant">
                      Tổng tiền: {provisionalGrossTotal.toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>
                <span className="font-headline-sm text-primary">{provisionalNetTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border-grey space-y-2.5">
              {status === 'CHECKED_IN' ? (
                <>
                  <Button onClick={handleCreateInvoice} isLoading={processing} icon={IoAddCircleOutline} className="w-full">
                    Chốt & Lập Hóa Đơn (Tự động trừ cọc)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowProvisionalDiscountModal(true)}
                    isLoading={processing}
                    icon={IoTicketOutline}
                    className="w-full text-primary border-primary hover:bg-primary/5"
                  >
                    Lập Hóa Đơn Kèm Giảm Giá
                  </Button>
                </>
              ) : (
                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                  Chỉ có thể lập hóa đơn khi khách đang ở phòng (Trạng thái <strong>Đang ở</strong>).
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-dashed border-border-grey h-full flex flex-col justify-center items-center text-center">
            <IoCashOutline size={40} className="text-on-surface-variant/30 mb-3" />
            <div className="text-on-surface-variant font-medium">Chưa thể thanh toán</div>
            <div className="text-sm text-on-surface-variant/70 mt-1 max-w-xs">
              Vui lòng chốt & lập hóa đơn trước khi có thể ghi nhận thanh toán từ khách hàng.
            </div>
          </div>
        </div>

        {/* Modal nhập giảm giá trực tiếp trong quá trình lập hóa đơn */}
        <DiscountFormModal
          isOpen={showProvisionalDiscountModal}
          onClose={() => setShowProvisionalDiscountModal(false)}
          onSubmit={handleCreateInvoiceWithDiscount}
          isLoading={processing}
          invoice={{
            roomAmount: provisionalRoomAmount,
            serviceAmount: provisionalServicesAmount,
            totalAmount: provisionalGrossTotal
          }}
        />
      </div>
    );
  }

  const isFullyPaid = invoice?.status === 'PAID' || (invoice && remainingAmount <= 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cột Trái: Chi tiết Hóa đơn */}
      <div className="space-y-4">
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
            <h3 className="font-title-lg text-on-surface flex items-center gap-2">
              <IoDocumentOutline size={20} className="text-primary" /> Chi tiết Hóa đơn
            </h3>
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
              isFullyPaid
                ? 'bg-green-100 text-green-800'
                : invoice.status === 'PENDING_DISCOUNT_APPROVAL'
                ? 'bg-amber-100 text-amber-800'
                : invoice.status === 'ADJUSTED'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {isFullyPaid
                ? 'ĐÃ THANH TOÁN'
                : invoice.status === 'PENDING_DISCOUNT_APPROVAL'
                ? 'CHỜ DUYỆT GIẢM GIÁ'
                : invoice.status === 'ADJUSTED'
                ? 'ĐÃ ĐIỀU CHỈNH'
                : 'CHỜ THANH TOÁN'}
            </span>
          </div>

          <div className="space-y-3 font-body-md text-on-surface">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Mã hóa đơn:</span>
              <span className="font-medium font-mono">INV-{invoice.id.toString().padStart(6, '0')}</span>
            </div>
            {invoice.adjustmentOfId && (
              <div className="flex justify-between text-xs text-purple-700 bg-purple-50 p-2 rounded">
                <span>Điều chỉnh từ hóa đơn:</span>
                <span className="font-mono font-bold">INV-{invoice.adjustmentOfId.toString().padStart(6, '0')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Ngày lập:</span>
              <span>{new Date(invoice.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            <div className="border-t border-dashed border-border-grey my-3"></div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Tiền phòng:</span>
              <span>{invoice.roomAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Tiền dịch vụ:</span>
              <span>{invoice.serviceAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Giảm giá / Điều chỉnh:</span>
                <span>-{invoice.discountAmount?.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            {invoice.note && (
              <div className="text-xs text-on-surface-variant italic bg-surface-container-low p-2 rounded">
                Ghi chú: {invoice.note}
              </div>
            )}
            <div className="border-t border-border-grey mt-4 pt-4 flex justify-between items-end">
              <span className="font-title-md text-on-surface">Tổng cộng hóa đơn:</span>
              <span className="font-headline-sm text-primary">{invoice.totalAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        {/* Khu vực Quản lý Giảm giá Hóa đơn */}
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
          <InvoiceDiscountSection
            invoice={invoice}
            userRole={user?.role}
            onInvoiceChange={fetchInvoiceData}
          />
        </div>

        {invoice.status === 'PENDING_DISCOUNT_APPROVAL' && (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-900 flex items-start gap-3">
            <IoAlertCircleOutline size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Hóa đơn đang chờ phê duyệt giảm giá</p>
              <p className="mt-0.5 text-amber-800">
                Chức năng thanh toán và trả phòng tạm thời bị khóa cho đến khi Chủ cơ sở (Owner) duyệt hoặc từ chối khoản giảm giá.
              </p>
            </div>
          </div>
        )}

        {isFullyPaid && invoice.status !== 'ADJUSTED' && invoice.status !== 'PENDING_DISCOUNT_APPROVAL' && (
          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 flex items-center gap-3">
              <IoCheckmarkCircleOutline size={24} className="flex-shrink-0" />
              <div>
                <div className="font-title-sm">Đã thanh toán đủ</div>
                <div className="text-xs text-green-700 mt-0.5">Hóa đơn này đã được thanh toán hoàn tất (đã khấu trừ tiền cọc).</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={() => onPrintInvoice(invoice)} icon={IoDocumentOutline} className="w-full">
                In Hóa Đơn
              </Button>
              {canAdjust && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAdjustData({ discountAmount: '', note: '' });
                    setAdjustError('');
                    setShowAdjustModal(true);
                  }}
                  icon={IoDocumentTextOutline}
                  className="w-full border border-border-grey text-on-surface hover:bg-surface-container-low"
                >
                  Điều chỉnh Hóa đơn
                </Button>
              )}
            </div>
          </div>
        )}

        {invoice.status === 'ADJUSTED' && (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-900 flex items-start gap-3">
            <IoAlertCircleOutline size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Hóa đơn đã được điều chỉnh</p>
              <p className="mt-0.5 text-purple-700">Hóa đơn gốc này đã đóng và được thay thế bằng bản điều chỉnh mới.</p>
            </div>
          </div>
        )}

        {status === 'CHECKED_IN' && isFullyPaid && (
          <div className="mt-4">
            <Button onClick={handleCheckOut} isLoading={processing} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Xác nhận Trả phòng
            </Button>
          </div>
        )}
      </div>

      {/* Cột Phải: Lịch sử & Form Thanh toán nhanh */}
      <div className="space-y-4">
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
            <h3 className="font-title-lg text-on-surface flex items-center gap-2">
              <IoCashOutline size={20} className="text-primary" /> Lịch sử Thanh toán
            </h3>
            <span className="text-xs text-on-surface-variant">
              {payments.length + (effectiveDepositDeduction > 0 ? 1 : 0)} lượt thanh toán
            </span>
          </div>

          {/* Danh sách thanh toán */}
          <div className="space-y-2.5 mb-5 max-h-48 overflow-y-auto">
            {/* Nếu có cọc chưa hiển thị trong bảng payments */}
            {effectiveDepositDeduction > 0 && (
              <div className="flex justify-between items-center p-3 bg-green-50/80 rounded-lg border border-green-200">
                <div>
                  <div className="font-title-sm text-green-900 flex items-center gap-1.5 font-bold">
                    <span>Tiền đặt cọc</span>
                    <span className="text-[11px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-normal">Đã thu trước</span>
                  </div>
                  <div className="text-xs text-green-700 mt-0.5">
                    Đã tự động khấu trừ vào số tiền cần thanh toán
                  </div>
                </div>
                <div className="font-title-md text-green-700 font-bold">
                  +{effectiveDepositDeduction.toLocaleString('vi-VN')} đ
                </div>
              </div>
            )}

            {payments.length === 0 && effectiveDepositDeduction === 0 ? (
              <div className="text-center py-4 text-on-surface-variant text-sm italic">
                Chưa có giao dịch thanh toán nào.
              </div>
            ) : (
              payments.map((p, idx) => (
                <div key={p.id || idx} className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg border border-border-grey">
                  <div>
                    <div className="font-title-sm text-on-surface flex items-center gap-2">
                      {p.method === 'CASH' ? 'Tiền mặt' : p.method === 'TRANSFER' ? 'Chuyển khoản' : 'Thẻ POS'}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(p.paidAt).toLocaleString('vi-VN')} {p.collectedByName ? `• ${p.collectedByName}` : ''}
                    </div>
                    {p.note && <div className="text-xs text-on-surface-variant/80 italic mt-0.5">"{p.note}"</div>}
                  </div>
                  <div className="font-title-md text-green-600 font-bold">
                    +{p.amount?.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tổng quan thanh toán */}
          <div className="border-t border-border-grey pt-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Tổng hóa đơn:</span>
              <span className="font-medium">{invoice.totalAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
            {collectedDepositAmount > 0 && (
              <div className="flex justify-between text-sm text-green-700 font-medium">
                <span>Đã khấu trừ cọc:</span>
                <span>-{collectedDepositAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Đã thanh toán (tổng):</span>
              <span className="font-bold text-green-600">{paidAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-dashed border-border-grey">
              <span className="text-on-surface-variant font-medium">Còn lại cần thanh toán:</span>
              <span className={`font-bold ${remainingAmount <= 0 ? 'text-green-600' : 'text-error font-title-sm'}`}>
                {remainingAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {!isFullyPaid && invoice.status !== 'ADJUSTED' && (
              <div className="pt-3">
                {invoice.status === 'PENDING_DISCOUNT_APPROVAL' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg text-center font-medium">
                    ⚠️ Tạm khóa thanh toán: Khoản giảm giá đang chờ Owner phê duyệt.
                  </div>
                ) : !showPaymentForm ? (
                  <Button onClick={() => openPaymentForm(remainingAmount)} icon={IoAddCircleOutline} className="w-full">
                    Thêm lượt thanh toán
                  </Button>
                ) : (
                  <form onSubmit={handleAddPayment} className="space-y-4 bg-surface-container-low p-4 rounded-xl border border-border-grey shadow-sm animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center border-b border-border-grey pb-2">
                      <div className="font-title-sm text-on-surface flex items-center gap-1.5">
                        <IoWalletOutline size={17} className="text-primary" /> Ghi nhận thanh toán mới
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Cần thu: <strong className="text-primary font-bold">{remainingAmount.toLocaleString('vi-VN')} đ</strong>
                      </span>
                    </div>

                    {/* 1. Chọn phương thức thanh toán */}
                    <div>
                      <label className="block font-label-md text-on-surface-variant mb-1.5 text-xs">Phương thức thanh toán</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleMethodChange('CASH')}
                          className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${newPayment.paymentMethod === 'CASH' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white text-on-surface border-border-grey hover:bg-surface-container-lowest'}`}
                        >
                          <IoCashOutline size={16} /> Tiền mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMethodChange('TRANSFER')}
                          className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${newPayment.paymentMethod === 'TRANSFER' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white text-on-surface border-border-grey hover:bg-surface-container-lowest'}`}
                        >
                          <IoQrCodeOutline size={16} /> Chuyển khoản
                        </button>
                      </div>
                    </div>

                    {/* 2. Nhập số tiền & Nút chọn nhanh (Preset chips) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-label-md text-on-surface-variant text-xs">Số tiền thanh toán (VNĐ) *</label>
                        {newPayment.amount > 0 && (
                          <span className="text-[11px] text-primary font-medium">
                            {parseInt(newPayment.amount).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="1000"
                        max={remainingAmount}
                        step="1000"
                        value={newPayment.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPayment({ ...newPayment, amount: val });
                          if (newPayment.paymentMethod === 'CASH') setReceivedCash(val);
                        }}
                        placeholder={`Ví dụ: ${remainingAmount}`}
                        required
                      />

                      {/* Nút bấm nhanh số tiền */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => handleSetAmount(remainingAmount, remainingAmount)}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Trả hết (100%)
                        </button>
                        {remainingAmount > 100000 && (
                          <button
                            type="button"
                            onClick={() => handleSetAmount(Math.round(remainingAmount / 2), remainingAmount)}
                            className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-border-grey text-xs font-medium cursor-pointer transition-colors"
                          >
                            50% ({Math.round(remainingAmount / 2 / 1000).toLocaleString()}k)
                          </button>
                        )}
                        {remainingAmount >= 500000 && (
                          <button
                            type="button"
                            onClick={() => handleSetAmount(500000, remainingAmount)}
                            className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-border-grey text-xs font-medium cursor-pointer transition-colors"
                          >
                            500k
                          </button>
                        )}
                        {remainingAmount >= 1000000 && (
                          <button
                            type="button"
                            onClick={() => handleSetAmount(1000000, remainingAmount)}
                            className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-border-grey text-xs font-medium cursor-pointer transition-colors"
                          >
                            1 Tr
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSetAmount(0, remainingAmount)}
                          className="px-2 py-1 rounded text-xs text-on-surface-variant hover:text-error hover:bg-red-50 cursor-pointer ml-auto transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    {/* 3. Máy tính tiền thừa khi chọn Tiền mặt */}
                    {newPayment.paymentMethod === 'CASH' && currentPayAmount > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-border-grey/80 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="font-label-md text-xs text-on-surface flex items-center gap-1">
                            <IoCalculatorOutline size={15} className="text-primary" /> Tiền khách đưa:
                          </span>
                          {currentReceivedCash > 0 && (
                            <span className="text-xs font-semibold text-on-surface">
                              {currentReceivedCash.toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>

                        <Input
                          type="number"
                          step="1000"
                          value={receivedCash}
                          onChange={(e) => setReceivedCash(e.target.value)}
                          placeholder="Nhập số tiền khách đưa..."
                        />

                        {/* Gợi ý mệnh giá tiền mặt */}
                        <div className="flex flex-wrap gap-1.5">
                          {getCashPresets(currentPayAmount).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setReceivedCash(preset)}
                              className={`px-2 py-0.5 rounded text-xs border transition-colors cursor-pointer ${currentReceivedCash === preset ? 'bg-primary text-white border-primary font-bold' : 'bg-surface-container-low text-on-surface border-border-grey hover:bg-surface-container'}`}
                            >
                              {preset === currentPayAmount ? `Đủ tiền (${(preset / 1000).toLocaleString()}k)` : `${(preset / 1000).toLocaleString()}k`}
                            </button>
                          ))}
                        </div>

                        {/* Kết quả tiền thối lại */}
                        {currentReceivedCash > 0 && (
                          <div className={`p-2.5 rounded-md flex justify-between items-center text-xs font-bold ${cashChange >= 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                            <span>{cashChange >= 0 ? '👉 Tiền thối lại cho khách:' : '⚠️ Khách còn thiếu:'}</span>
                            <span className="text-sm">{Math.abs(cashChange).toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. Thẻ VietQR động khi chọn Chuyển khoản */}
                    {newPayment.paymentMethod === 'TRANSFER' && currentPayAmount > 0 && (
                      <div className="bg-white p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-3">
                        <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <IoQrCodeOutline size={16} className="text-blue-600" /> Quét mã VietQR chuyển khoản nhanh
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <img
                            src={qrImageUrl}
                            alt="VietQR Payment"
                            className="w-36 h-36 object-contain rounded-lg border border-border-grey bg-white p-1 shadow-xs shrink-0"
                            loading="lazy"
                          />
                          <div className="space-y-1.5 text-xs text-on-surface flex-1 w-full">
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                              <span className="text-on-surface-variant">Ngân hàng:</span>
                              <strong className="font-semibold">MBBank</strong>
                            </div>
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                              <span className="text-on-surface-variant">Số TK:</span>
                              <div className="flex items-center gap-1">
                                <strong className="font-mono font-bold text-primary">0365224245</strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard('0365224245', 'acc')}
                                  className="text-on-surface-variant hover:text-primary p-0.5"
                                  title="Sao chép số TK"
                                >
                                  {copiedField === 'acc' ? <IoCheckmarkOutline className="text-green-600" size={14} /> : <IoCopyOutline size={13} />}
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                              <span className="text-on-surface-variant">Số tiền:</span>
                              <strong className="text-green-600 font-bold">{currentPayAmount.toLocaleString('vi-VN')} đ</strong>
                            </div>
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-border-grey">
                              <span className="text-on-surface-variant">Nội dung:</span>
                              <div className="flex items-center gap-1">
                                <strong className="font-mono font-bold text-primary">{invCode}</strong>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(invCode, 'memo')}
                                  className="text-on-surface-variant hover:text-primary p-0.5"
                                  title="Sao chép nội dung"
                                >
                                  {copiedField === 'memo' ? <IoCheckmarkOutline className="text-green-600" size={14} /> : <IoCopyOutline size={13} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. Ghi chú thông minh */}
                    <div>
                      <Input
                        label="Ghi chú"
                        type="text"
                        value={newPayment.note}
                        onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                        placeholder="Ghi chú giao dịch..."
                      />
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border-grey">
                      <Button variant="ghost" type="button" onClick={() => setShowPaymentForm(false)} className="flex-1">
                        Hủy
                      </Button>
                      <Button type="submit" isLoading={processing} className="flex-1">
                        Lưu thanh toán
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Lập hóa đơn điều chỉnh */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Lập Hóa Đơn Điều Chỉnh (QTN-11)"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustInvoice} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
            Hóa đơn đã thanh toán là bất biến. Khi điều chỉnh, hệ thống sẽ chuyển hóa đơn hiện tại sang <strong>ĐÃ ĐIỀU CHỈNH</strong> và tạo hóa đơn mới với số tiền khấu trừ.
          </div>

          <div className="bg-surface-container-low p-3 rounded-lg border border-border-grey text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Tổng hóa đơn hiện tại:</span>
              <span className="font-bold text-on-surface">{invoice.totalAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
            {adjustData.discountAmount && parseFloat(adjustData.discountAmount) > 0 && (
              <div className="flex justify-between text-primary font-bold">
                <span>Tổng tiền sau điều chỉnh:</span>
                <span>{Math.max(0, invoice.totalAmount - parseFloat(adjustData.discountAmount)).toLocaleString('vi-VN')} đ</span>
              </div>
            )}
          </div>

          {adjustError && (
            <div className="p-3 bg-red-50 border border-red-200 text-error rounded text-xs font-medium">
              {adjustError}
            </div>
          )}

          <Input
            label="Số tiền giảm trừ / điều chỉnh (VNĐ)"
            type="number"
            min="1000"
            max={invoice.totalAmount}
            step="1000"
            value={adjustData.discountAmount}
            onChange={(e) => setAdjustData({ ...adjustData, discountAmount: e.target.value })}
            placeholder="Ví dụ: 100000"
            required
          />

          <div>
            <label className="block font-label-md text-on-surface-variant mb-1.5 text-xs">Lý do điều chỉnh *</label>
            <textarea
              value={adjustData.note}
              onChange={(e) => setAdjustData({ ...adjustData, note: e.target.value })}
              placeholder="Ghi rõ lý do điều chỉnh: Sự cố phòng, Khuyến mãi bù, Khách trả phòng sớm..."
              rows={3}
              className="w-full px-3 py-2 border border-border-grey rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-body-md text-sm bg-white"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button variant="ghost" type="button" onClick={() => setShowAdjustModal(false)}>
              Hủy
            </Button>
            <Button type="submit" isLoading={processing}>
              Xác nhận Điều chỉnh
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BookingInvoiceTab;
