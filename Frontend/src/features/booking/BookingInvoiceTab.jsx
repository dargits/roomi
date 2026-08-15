import React, { useState, useEffect } from 'react';
import { IoAddCircleOutline, IoAlertCircleOutline, IoCashOutline, IoCheckmarkCircleOutline, IoDocumentOutline, IoDocumentTextOutline } from 'react-icons/io5';
import { invoiceApi } from '../../services/invoiceApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import bookingApi from '../../services/bookingApi';

const BookingInvoiceTab = ({ bookingId, status, booking, onPrintInvoice }) => {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [provisionalServices, setProvisionalServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', paymentMethod: 'CASH', note: '' });
  const [processing, setProcessing] = useState(false);

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
      const invData = await invoiceApi.getInvoiceByBooking(bookingId);
      setInvoice(invData);
      
      if (invData && invData.id) {
        const payData = await invoiceApi.getPayments(invData.id);
        setPayments(payData);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setInvoice(null);
        try {
          const servicesData = await bookingApi.getBookingServices(bookingId);
          setProvisionalServices(servicesData);
        } catch (e) {
          console.error("Lỗi lấy dịch vụ tạm tính", e);
        }
      } else {
        console.error("Lỗi tải hóa đơn:", error);
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
      fetchInvoiceData();
    } catch (error) {
      alert("Lỗi lập hóa đơn: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
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
      setShowPaymentForm(false);
      setNewPayment({ amount: '', paymentMethod: 'CASH', note: '' });
      fetchInvoiceData();
    } catch (error) {
      alert("Lỗi ghi nhận thanh toán: " + (error.response?.data?.message || error.message));
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
      alert('Đã lập hóa đơn điều chỉnh thành công!');
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
      alert("Trả phòng thành công!");
      window.location.reload();
    } catch (error) {
      alert("Lỗi trả phòng: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu hóa đơn...</div>;

  if (!invoice) {
    const provisionalRoomAmount = booking?.expectedPrice || 0;
    const provisionalServicesAmount = provisionalServices.reduce((sum, s) => sum + (s.unitPriceSnapshot * s.quantity), 0);
    const provisionalTotal = provisionalRoomAmount + provisionalServicesAmount;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <IoDocumentOutline size={20} className="text-primary"/> Chi phí Tạm tính
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
              <div className="border-t border-border-grey mt-4 pt-4 flex justify-between items-end">
                <span className="font-title-md text-on-surface">Tổng tạm tính:</span>
                <span className="font-headline-sm text-primary">{provisionalTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border-grey">
              {status === 'CHECKED_IN' ? (
                <Button onClick={handleCreateInvoice} isLoading={processing} icon={IoAddCircleOutline} className="w-full">
                  Chốt & Lập Hóa Đơn
                </Button>
              ) : (
                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                  Chỉ có thể lập hóa đơn khi khách đang ở phòng (Trạng thái CHECKED_IN).
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
      </div>
    );
  }

  const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingAmount = invoice.totalAmount - paidAmount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Cột Trái: Chi tiết Hóa đơn */}
      <div className="space-y-4">
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
            <h3 className="font-title-lg text-on-surface flex items-center gap-2">
              <IoDocumentOutline size={20} className="text-primary"/> Chi tiết Hóa đơn
            </h3>
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : invoice.status === 'ADJUSTED' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {invoice.status === 'PAID' ? 'ĐÃ THANH TOÁN' : invoice.status === 'ADJUSTED' ? 'ĐÃ ĐIỀU CHỈNH' : 'CHỜ THANH TOÁN'}
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
              <span className="font-title-md text-on-surface">Tổng cộng:</span>
              <span className="font-headline-sm text-primary">{invoice.totalAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>
        
        {invoice.status === 'PAID' && (
          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 flex items-center gap-3">
              <IoCheckmarkCircleOutline size={24} className="flex-shrink-0" />
              <div>
                <div className="font-title-sm">Đã thanh toán đủ</div>
                <div className="text-xs text-green-700 mt-0.5">Hóa đơn này đã được thanh toán hoàn tất.</div>
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

        {status === 'CHECKED_IN' && invoice.status === 'PAID' && (
          <div className="mt-4">
            <Button onClick={handleCheckOut} isLoading={processing} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Xác nhận Trả phòng
            </Button>
          </div>
        )}
      </div>

      {/* Cột Phải: Thanh toán */}
      <div className="space-y-4">
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
            <h3 className="font-title-lg text-on-surface flex items-center gap-2">
              <IoCashOutline size={20} className="text-primary"/> Lịch sử Thanh toán
            </h3>
          </div>

          {/* Danh sách thanh toán */}
          <div className="space-y-3 mb-6">
            {payments.length === 0 ? (
              <div className="text-center py-4 text-on-surface-variant text-sm italic">
                Chưa có giao dịch thanh toán nào.
              </div>
            ) : (
              payments.map((p, idx) => (
                <div key={p.id || idx} className="flex justify-between items-center p-3 bg-surface-container-low rounded border border-border-grey">
                  <div>
                    <div className="font-title-sm text-on-surface flex items-center gap-2">
                      {p.method === 'CASH' ? 'Tiền mặt' : p.method === 'TRANSFER' ? 'Chuyển khoản' : 'Khác'}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(p.paidAt).toLocaleString('vi-VN')} {p.collectedByName ? `• Thu bởi: ${p.collectedByName}` : ''}
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

          {/* Tổng quan thanh toán & Form nạp tiền */}
          <div className="border-t border-border-grey pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Đã thanh toán:</span>
              <span className="font-bold text-green-600">{paidAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Còn lại:</span>
              <span className={`font-bold ${remainingAmount <= 0 ? 'text-green-600' : 'text-error'}`}>
                {remainingAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {invoice.status !== 'PAID' && invoice.status !== 'ADJUSTED' && (
              <div className="pt-3">
                {!showPaymentForm ? (
                  <Button onClick={() => setShowPaymentForm(true)} icon={IoAddCircleOutline} className="w-full">
                    Thêm lượt thanh toán
                  </Button>
                ) : (
                  <form onSubmit={handleAddPayment} className="space-y-3 bg-surface-container-low p-4 rounded-lg border border-border-grey">
                    <div className="font-title-sm text-on-surface">Ghi nhận thanh toán mới</div>
                    <Input
                      label="Số tiền (VNĐ)"
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      placeholder={`Ví dụ: ${remainingAmount}`}
                      max={remainingAmount}
                      required
                    />
                    <Select
                      label="Hình thức thanh toán"
                      value={newPayment.paymentMethod}
                      onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                      options={[
                        { value: 'CASH', label: 'Tiền mặt' },
                        { value: 'TRANSFER', label: 'Chuyển khoản' },
                        { value: 'CREDIT_CARD', label: 'Thẻ tín dụng' }
                      ]}
                    />
                    <Input
                      label="Ghi chú"
                      type="text"
                      value={newPayment.note}
                      onChange={(e) => setNewPayment({ ...newPayment, note: e.target.value })}
                      placeholder="Mã chuẩn chi, tên người gửi..."
                    />
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" type="button" onClick={() => setShowPaymentForm(false)} className="flex-1">
                        Hủy
                      </Button>
                      <Button type="submit" isLoading={processing} className="flex-1">
                        Lưu
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
