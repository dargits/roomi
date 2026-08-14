import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, PlusCircle, CheckCircle } from 'lucide-react';
import { invoiceApi } from '../../services/invoiceApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import bookingApi from '../../services/bookingApi';

const BookingInvoiceTab = ({ bookingId, status, booking, onPrintInvoice }) => {
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [provisionalServices, setProvisionalServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', paymentMethod: 'CASH', note: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchInvoiceData();
  }, [bookingId]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      // API có thể throw 404 nếu chưa lập hóa đơn
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
    if (!window.confirm("Khách đang ở phòng. Bạn có chắc chắn muốn chốt số liệu và Lập Hóa Đơn ngay bây giờ không?")) return;
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

  const handleCheckOut = async () => {
    if (!window.confirm("Xác nhận Trả phòng cho khách?")) return;
    setProcessing(true);
    try {
      await bookingApi.checkOut(bookingId);
      alert("Trả phòng thành công!");
      window.location.reload(); // Reload the page to reflect the new booking status
    } catch (error) {
      alert("Lỗi trả phòng: " + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu hóa đơn...</div>;

  if (!invoice) {
    const roomAmount = booking?.actualPrice || booking?.expectedPrice || 0;
    const serviceAmount = provisionalServices.reduce((sum, item) => sum + (item.total || (item.unitPriceSnapshot * item.quantity)), 0);
    const totalAmount = roomAmount + serviceAmount;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
              <h3 className="font-title-lg text-on-surface flex items-center gap-2">
                <FileText size={20} className="text-primary"/> Hóa đơn Tạm tính
              </h3>
              <span className="px-2 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-800">
                CHƯA LẬP
              </span>
            </div>

            <div className="space-y-3 font-body-md text-on-surface">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tiền phòng:</span>
                <span>{roomAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tiền dịch vụ:</span>
                <span>{serviceAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="border-t border-border-grey mt-4 pt-4 flex justify-between items-end">
                <span className="font-title-md text-on-surface">Tổng tạm tính:</span>
                <span className="font-headline-sm text-primary">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-dashed border-border-grey">
              <p className="text-sm text-on-surface-variant mb-4">
                Lưu ý: Hóa đơn chưa được lập chính thức. Click <b>Chốt & Lập hóa đơn</b> để tạo hóa đơn và ghi nhận thanh toán.
              </p>
              <Button 
                onClick={handleCreateInvoice} 
                isLoading={processing} 
                icon={FileText} 
                className="w-full"
                disabled={status !== 'CHECKED_IN'}
              >
                Chốt & Lập Hóa Đơn
              </Button>
              {status !== 'CHECKED_IN' && (
                  <p className="text-xs text-error mt-2 text-center">
                      Chỉ có thể lập hóa đơn khi khách đang ở phòng.
                  </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-dashed border-border-grey h-full flex flex-col justify-center items-center text-center">
            <DollarSign size={40} className="text-on-surface-variant/30 mb-3" />
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
              <FileText size={20} className="text-primary"/> Chi tiết Hóa đơn
            </h3>
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : invoice.status === 'ADJUSTED' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {invoice.status}
            </span>
          </div>

          <div className="space-y-3 font-body-md text-on-surface">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Mã hóa đơn:</span>
              <span className="font-medium">INV-{invoice.id.toString().padStart(6, '0')}</span>
            </div>
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
              <div className="flex justify-between text-green-600">
                <span>Giảm giá:</span>
                <span>-{invoice.discountAmount?.toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div className="border-t border-border-grey mt-4 pt-4 flex justify-between items-end">
              <span className="font-title-md text-on-surface">Tổng cộng:</span>
              <span className="font-headline-sm text-primary">{invoice.totalAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>
        
        {invoice.status === 'PAID' && (
           <div className="space-y-4">
             <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 flex items-center gap-3">
               <CheckCircle size={24} />
               <div>
                 <div className="font-title-sm">Đã thanh toán đủ</div>
                 <div className="text-sm">Hóa đơn này đã được thanh toán hoàn tất.</div>
               </div>
             </div>
             <Button onClick={() => onPrintInvoice(invoice)} icon={FileText} className="w-full">
               Xuất hóa đơn (In)
             </Button>
           </div>
        )}
        {status === 'CHECKED_IN' && invoice.status === 'PAID' && (
          <div className="mt-4">
            <Button onClick={handleCheckOut} isLoading={processing} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Trả phòng
            </Button>
          </div>
        )}
      </div>

      {/* Cột Phải: Thanh toán */}
      <div className="space-y-4">
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-grey">
            <h3 className="font-title-lg text-on-surface flex items-center gap-2">
              <DollarSign size={20} className="text-primary"/> Lịch sử Thanh toán
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
                    <div className="text-xs text-on-surface-variant mt-1">{new Date(p.paidAt || p.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-title-md text-green-600">+{p.amount?.toLocaleString('vi-VN')} đ</div>
                    {p.note && <div className="text-xs text-on-surface-variant mt-1">{p.note}</div>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tổng quan Thu */}
          <div className="bg-surface-blue-light p-4 rounded-lg border border-primary/20 space-y-2">
            <div className="flex justify-between font-title-sm text-on-surface">
              <span>Đã thu:</span>
              <span className="text-green-600">{paidAmount?.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between font-title-sm text-on-surface">
              <span>Còn nợ:</span>
              <span className="text-error">{remainingAmount > 0 ? remainingAmount.toLocaleString('vi-VN') : 0} đ</span>
            </div>
          </div>

          {/* Form thêm thanh toán */}
          {invoice.status === 'PENDING' && (
            <div className="mt-6">
              {!showPaymentForm ? (
                <Button onClick={() => {
                  setNewPayment({ ...newPayment, amount: remainingAmount });
                  setShowPaymentForm(true);
                }} icon={PlusCircle} className="w-full">
                  Ghi nhận thanh toán
                </Button>
              ) : (
                <form onSubmit={handleAddPayment} className="p-4 bg-surface-container rounded-lg border border-border-grey space-y-3">
                  <h4 className="font-title-sm text-on-surface mb-2">Thông tin giao dịch</h4>
                  <Input 
                    label="Số tiền thu" 
                    type="number" 
                    value={newPayment.amount} 
                    onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                    required
                  />
                  <Select 
                    label="Phương thức"
                    value={newPayment.paymentMethod}
                    onChange={e => setNewPayment({...newPayment, paymentMethod: e.target.value})}
                    options={[
                      { value: 'CASH', label: 'Tiền mặt' },
                      { value: 'TRANSFER', label: 'Chuyển khoản' }
                    ]}
                  />
                  <Input 
                    label="Ghi chú" 
                    value={newPayment.note} 
                    onChange={e => setNewPayment({...newPayment, note: e.target.value})}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" type="button" onClick={() => setShowPaymentForm(false)}>Hủy</Button>
                    <Button type="submit" isLoading={processing}>Lưu</Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingInvoiceTab;
