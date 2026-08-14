import React, { useState, useEffect } from 'react';
import { Info, ShoppingCart, FileText, CheckCircle, Clock, MapPin, User, Phone, X } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import bookingApi from '../../services/bookingApi';
import BookingServicesTab from './BookingServicesTab';
import BookingInvoiceTab from './BookingInvoiceTab';
import InvoicePrintTemplate from './InvoicePrintTemplate';

const BookingDetailsModal = ({ isOpen, onClose, bookingId }) => {
  const [activeTab, setActiveTab] = useState('info'); // info, services, invoice
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printingInvoice, setPrintingInvoice] = useState(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
      setActiveTab('info');
    }
  }, [isOpen, bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getBookingById(bookingId);
      setBooking(data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết đặt phòng", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'NEW': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium text-xs">Mới</span>;
      case 'CONFIRMED': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-medium text-xs">Đã xác nhận</span>;
      case 'CHECKED_IN': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium text-xs">Đang ở</span>;
      case 'CHECKED_OUT': return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">Đã đi</span>;
      case 'CANCELLED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md font-medium text-xs">Đã hủy</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">{status}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết & Hóa đơn Đặt phòng" maxWidth="max-w-4xl">
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant">Đang tải chi tiết...</div>
      ) : !booking ? (
        <div className="p-8 text-center text-error">Không tìm thấy thông tin đặt phòng.</div>
      ) : (
        <div className="flex flex-col h-full max-h-[80vh]">
          {/* Header Thông tin tóm tắt */}
          <div className="bg-surface-container-lowest p-4 rounded-lg border border-border-grey mb-6 shadow-sm flex flex-wrap gap-6 justify-between items-center">
            <div>
              <div className="font-title-lg text-on-surface flex items-center gap-2 mb-1">
                {booking.guestName}
                {getStatusBadge(booking.status)}
              </div>
              <div className="text-sm text-on-surface-variant flex items-center gap-4">
                <span className="flex items-center gap-1"><Phone size={14}/> {booking.guestPhone}</span>
                <span className="flex items-center gap-1">
                  <MapPin size={14}/> {booking.roomTypeName} {booking.roomNumber ? `- Phòng ${booking.roomNumber}` : ''}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Thời gian lưu trú</div>
              <div className="font-title-sm text-on-surface bg-surface-container-low px-3 py-1 rounded border border-border-grey">
                {booking.checkInDate} <span className="mx-2 text-on-surface-variant">→</span> {booking.checkOutDate}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border-grey mb-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'info' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <Info size={18} /> Thông tin chung
              {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'services' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <ShoppingCart size={18} /> Dịch vụ phụ thu
              {activeTab === 'services' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-4 py-3 font-title-sm flex items-center gap-2 transition-colors relative ${activeTab === 'invoice' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <FileText size={18} /> Hóa đơn & Thanh toán
              {activeTab === 'invoice' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-md"></span>}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
            
            {/* TAB INFO */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                    <h4 className="font-title-md text-on-surface mb-4 flex items-center gap-2 border-b border-border-grey pb-2">
                      <User size={18} className="text-primary"/> Chi tiết Khách hàng
                    </h4>
                    <div className="space-y-3 font-body-sm text-on-surface-variant">
                      <div className="flex justify-between"><span className="w-1/3">Họ tên:</span><span className="font-medium text-on-surface flex-1">{booking.guestName}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Số điện thoại:</span><span className="font-medium text-on-surface flex-1">{booking.guestPhone}</span></div>
                      {booking.guestEmail && <div className="flex justify-between"><span className="w-1/3">Email:</span><span className="font-medium text-on-surface flex-1">{booking.guestEmail}</span></div>}
                      {booking.guestIdNumber && <div className="flex justify-between"><span className="w-1/3">CCCD/CMND:</span><span className="font-medium text-on-surface flex-1">{booking.guestIdNumber}</span></div>}
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                    <h4 className="font-title-md text-on-surface mb-4 flex items-center gap-2 border-b border-border-grey pb-2">
                      <MapPin size={18} className="text-primary"/> Chi tiết Phòng
                    </h4>
                    <div className="space-y-3 font-body-sm text-on-surface-variant">
                      <div className="flex justify-between"><span className="w-1/3">Loại phòng:</span><span className="font-medium text-on-surface flex-1">{booking.roomTypeName}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Phòng:</span><span className="font-medium text-on-surface flex-1">{booking.roomNumber || 'Chưa phân phòng'}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Ngày nhận:</span><span className="font-medium text-on-surface flex-1">{booking.checkInDate}</span></div>
                      <div className="flex justify-between"><span className="w-1/3">Ngày trả:</span><span className="font-medium text-on-surface flex-1">{booking.checkOutDate}</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey">
                  <h4 className="font-title-md text-on-surface mb-4 border-b border-border-grey pb-2">Ghi chú đặt phòng</h4>
                  <p className="text-body-md text-on-surface-variant italic">
                    {booking.note || "Không có ghi chú nào."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB SERVICES */}
            {activeTab === 'services' && (
              <BookingServicesTab bookingId={bookingId} status={booking.status} />
            )}

            {/* TAB INVOICE */}
            {activeTab === 'invoice' && (
              <BookingInvoiceTab 
                bookingId={bookingId} 
                status={booking.status} 
                booking={booking}
                onPrintInvoice={(inv) => setPrintingInvoice(inv)}
              />
            )}

          </div>

          <div className="flex justify-end pt-4 mt-6 border-t border-border-grey">
            <Button variant="ghost" onClick={onClose} icon={X}>Đóng</Button>
          </div>
        </div>
      )}

      {printingInvoice && (
        <InvoicePrintTemplate 
          invoice={printingInvoice} 
          booking={booking} 
          onClose={() => setPrintingInvoice(null)} 
        />
      )}
    </Modal>
  );
};

export default BookingDetailsModal;
