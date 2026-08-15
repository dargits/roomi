import React, { useEffect, useState } from 'react';
import { IoCloseOutline, IoPrintOutline } from 'react-icons/io5';
import Button from '../../components/ui/Button';
import { numberToWords } from '../../utils/numberToWords';
import bookingApi from '../../services/bookingApi';

const InvoicePrintTemplate = ({ invoice, booking, onClose }) => {
  const [services, setServices] = useState([]);
  
  // Fake hotel settings for now (or could be fetched from API)
  const hotelInfo = {
    name: 'STAY AWAY HOTEL',
    address: '123 Đường Bờ Biển, Phường Cát Dài, TP. Vũng Tàu',
    phone: '0988.777.666',
    mst: '0101234567'
  };

  useEffect(() => {
    if (booking?.id) {
      bookingApi.getBookingServices(booking.id).then(data => {
        setServices(data);
      }).catch(console.error);
    }
  }, [booking?.id]);

  const handlePrint = () => {
    window.print();
  };

  // Tính toán trước thuế và thuế GTGT (giả sử VAT 10% và tổng tiền đã bao gồm VAT)
  const totalAmount = invoice.totalAmount || 0;
  const subtotal = totalAmount / 1.1;
  const vatAmount = totalAmount - subtotal;
  
  const discountAmount = invoice.discountAmount || 0;
  const totalPayment = totalAmount - discountAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 invoice-modal-container">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Thanh công cụ (ẩn khi in) */}
        <div className="bg-surface-container-low p-4 flex justify-between items-center border-b border-border-grey print:hidden">
          <h2 className="font-title-md text-on-surface">Xuất Hóa đơn GTGT</h2>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} icon={IoCloseOutline}>Đóng</Button>
            <Button onClick={handlePrint} icon={IoPrintOutline}>In Hóa đơn</Button>
          </div>
        </div>

        {/* Khung Hóa đơn chuẩn để in */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 print:p-0 print:overflow-visible bg-white" id="printable-invoice">
          
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-invoice, #printable-invoice * {
                visibility: visible;
              }
              #printable-invoice {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .invoice-modal-container {
                position: static;
                background: none;
              }
            }
          `}</style>

          <div className="max-w-3xl mx-auto space-y-6 text-black font-serif">
            {/* Header: Logo, Tên cty, Mẫu số, Ký hiệu */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 flex items-center justify-center font-bold text-2xl border border-gray-300">
                  LOGO
                </div>
                <div>
                  <h1 className="font-bold text-xl uppercase">{hotelInfo.name}</h1>
                  <p className="text-sm">Địa chỉ: {hotelInfo.address}</p>
                  <p className="text-sm">Điện thoại: {hotelInfo.phone}</p>
                  <p className="text-sm font-bold mt-1">Mã số thuế: {hotelInfo.mst}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p>Mẫu số: <strong>01GTKT0/001</strong></p>
                <p>Ký hiệu: <strong>AA/23E</strong></p>
                <p>Số: <strong className="text-red-600 text-lg">{String(invoice.id).padStart(7, '0')}</strong></p>
              </div>
            </div>

            {/* Tiêu đề hóa đơn */}
            <div className="text-center py-4">
              <h2 className="text-2xl font-bold uppercase mb-2">Hóa Đơn Giá Trị Gia Tăng</h2>
              <p className="text-sm italic">
                Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </p>
            </div>

            {/* Thông tin người mua */}
            <div className="space-y-2 text-sm border border-gray-300 p-4 rounded-md">
              <div className="flex">
                <span className="w-40 font-bold">Tên người mua hàng:</span>
                <span className="flex-1 uppercase font-medium">{booking?.guestName}</span>
              </div>
              <div className="flex">
                <span className="w-40 font-bold">Số điện thoại:</span>
                <span className="flex-1">{booking?.guestPhone}</span>
              </div>
              <div className="flex">
                <span className="w-40 font-bold">Căn cước công dân:</span>
                <span className="flex-1">{booking?.guestIdNumber || '—'}</span>
              </div>
              <div className="flex">
                <span className="w-40 font-bold">Mã số thuế (nếu có):</span>
                <span className="flex-1">—</span>
              </div>
              <div className="flex">
                <span className="w-40 font-bold">Địa chỉ:</span>
                <span className="flex-1">Khách lẻ</span>
              </div>
              <div className="flex">
                <span className="w-40 font-bold">Hình thức thanh toán:</span>
                <span className="flex-1">Tiền mặt / Chuyển khoản</span>
              </div>
            </div>

            {/* Chi tiết hàng hóa dịch vụ */}
            <table className="w-full border-collapse border border-black text-sm">
              <thead className="bg-gray-100 font-bold">
                <tr>
                  <th className="border border-black py-2 px-2 text-center w-12">STT</th>
                  <th className="border border-black py-2 px-2 text-center">Tên hàng hóa, dịch vụ</th>
                  <th className="border border-black py-2 px-2 text-center w-20">ĐVT</th>
                  <th className="border border-black py-2 px-2 text-center w-20">Số lượng</th>
                  <th className="border border-black py-2 px-2 text-center w-28">Đơn giá</th>
                  <th className="border border-black py-2 px-2 text-center w-32">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Tiền phòng */}
                <tr>
                  <td className="border border-black py-2 px-2 text-center">1</td>
                  <td className="border border-black py-2 px-2">
                    Dịch vụ lưu trú ({booking?.roomTypeName}) <br/>
                    <span className="italic text-xs">Từ {booking?.checkInDate} đến {booking?.checkOutDate}</span>
                  </td>
                  <td className="border border-black py-2 px-2 text-center">Đêm</td>
                  <td className="border border-black py-2 px-2 text-right">
                    {/* Tính số đêm gần đúng */}
                    {Math.max(1, Math.ceil((new Date(booking?.checkOutDate) - new Date(booking?.checkInDate)) / (1000 * 60 * 60 * 24)))}
                  </td>
                  <td className="border border-black py-2 px-2 text-right">
                    {Math.round((invoice.roomAmount || 0) / 1.1).toLocaleString('vi-VN')}
                  </td>
                  <td className="border border-black py-2 px-2 text-right font-medium">
                    {Math.round((invoice.roomAmount || 0) / 1.1).toLocaleString('vi-VN')}
                  </td>
                </tr>
                
                {/* 2. Dịch vụ phát sinh */}
                {services.map((svc, idx) => (
                  <tr key={idx}>
                    <td className="border border-black py-2 px-2 text-center">{idx + 2}</td>
                    <td className="border border-black py-2 px-2">{svc.serviceName}</td>
                    <td className="border border-black py-2 px-2 text-center">{svc.unit || 'Lần'}</td>
                    <td className="border border-black py-2 px-2 text-right">{svc.quantity}</td>
                    <td className="border border-black py-2 px-2 text-right">
                      {Math.round((svc.unitPrice || 0) / 1.1).toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-black py-2 px-2 text-right font-medium">
                      {Math.round((svc.unitPrice * svc.quantity) / 1.1).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>

            {/* Tổng cộng & Thuế */}
            <div className="flex text-sm">
              <div className="w-2/3 pr-4 border-t border-transparent pt-4">
                <p className="mb-2 italic text-gray-700">Tỷ giá: 1 USD = .... VNĐ (Nếu thanh toán ngoại tệ)</p>
              </div>
              <div className="w-1/3 space-y-2">
                <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold">Cộng tiền hàng hóa:</span>
                  <span>{Math.round(subtotal).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold">Thuế suất GTGT:</span>
                  <span>10%</span>
                </div>
                <div className="flex justify-between border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold">Tiền thuế GTGT:</span>
                  <span>{Math.round(vatAmount).toLocaleString('vi-VN')} đ</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between border-b border-dotted border-gray-400 pb-1 text-red-600">
                    <span className="font-bold">Giảm giá:</span>
                    <span>- {discountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="flex justify-between pb-1 pt-2">
                  <span className="font-bold text-base">Tổng tiền thanh toán:</span>
                  <span className="font-bold text-base">{Math.round(totalPayment).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* Bằng chữ */}
            <div className="bg-gray-50 p-2 font-bold italic text-sm border-b border-gray-300">
              Số tiền viết bằng chữ: {numberToWords(Math.round(totalPayment))}
            </div>

            {/* Chữ ký */}
            <div className="flex justify-around pt-8 pb-20 text-center text-sm">
              <div>
                <p className="font-bold">Người mua hàng</p>
                <p className="italic text-gray-500">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold">Người bán hàng</p>
                <p className="italic text-gray-500">(Ký, đóng dấu, ghi rõ họ tên)</p>
                <div className="mt-16 font-bold uppercase text-blue-800">CÔNG TY TNHH STAY AWAY</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-2 pb-8">
              (Cần kiểm tra đối chiếu khi lập, giao nhận hóa đơn) <br/>
              Giải pháp Hóa đơn Điện tử - StayGO PMS
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintTemplate;
