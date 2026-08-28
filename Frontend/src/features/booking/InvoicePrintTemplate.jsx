import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoCloseOutline, IoPrintOutline } from 'react-icons/io5';
import Button from '../../components/ui/Button';
import { numberToWords } from '../../utils/numberToWords';
import { formatStayDateTime, calculateNights } from '../../utils/formatDate';
import bookingApi from '../../services/bookingApi';
import groupBookingApi from '../../services/groupBookingApi';
import { useAppConfig } from '../../context/AppConfigContext';

const InvoicePrintTemplate = ({ invoice, booking, group, onClose }) => {
  const { config } = useAppConfig();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const hotelInfo = {
    name: config?.hotelName || 'STAY AWAY HOTEL',
    address: config?.hotelAddress || '123 Đường Bờ Biển, Phường Cát Dài, TP. Vũng Tàu',
    phone: config?.hotelPhone || '0988.777.666',
    email: config?.hotelEmail || 'contact@stayaway.com',
    mst: config?.taxCode || '0101234567',
    logoUrl: config?.logoUrl || null
  };

  const [fetchedGroup, setFetchedGroup] = useState(null);
  const activeGroup = group || fetchedGroup;

  const isCombined = invoice?.mode === 'COMBINED' && activeGroup?.bookings?.length > 0;

  useEffect(() => {
    // Nếu là hóa đơn COMBINED nhưng component cha không truyền `group`, ta cần tự fetch
    if (invoice?.mode === 'COMBINED' && !group && invoice?.groupBookingId && !fetchedGroup) {
      groupBookingApi.getById(invoice.groupBookingId)
        .then(data => setFetchedGroup(data))
        .catch(err => console.error("Lỗi khi tải thông tin đoàn cho hóa đơn:", err));
    }
  }, [invoice, group, fetchedGroup]);

  useEffect(() => {
    if (isCombined) {
      setLoadingServices(true);
      Promise.all(activeGroup.bookings.map(b => bookingApi.getBookingServices(b.id)))
        .then(results => {
          setServices(results.flat());
        })
        .catch(err => {
          console.error("Lỗi khi tải dịch vụ hóa đơn đoàn:", err);
          setServices([]);
        })
        .finally(() => {
          setLoadingServices(false);
        });
    } else if (booking?.id) {
      setLoadingServices(true);
      bookingApi.getBookingServices(booking.id)
        .then(data => {
          setServices(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error("Lỗi khi tải dịch vụ hóa đơn:", err);
          setServices([]);
        })
        .finally(() => {
          setLoadingServices(false);
        });
    }
  }, [booking?.id, invoice?.mode, activeGroup?.bookings, isCombined]);

  const handlePrint = () => {
    window.print();
  };

  // Helper lấy đơn giá dịch vụ đã bao gồm VAT
  const getSvcUnitPriceWithVat = (svc) => {
    if (svc.unitPriceSnapshot != null && !isNaN(Number(svc.unitPriceSnapshot))) return Number(svc.unitPriceSnapshot);
    if (svc.unitPrice != null && !isNaN(Number(svc.unitPrice))) return Number(svc.unitPrice);
    if (svc.price != null && !isNaN(Number(svc.price))) return Number(svc.price);
    if (svc.total != null && svc.quantity && !isNaN(Number(svc.total))) return Number(svc.total) / Number(svc.quantity);
    return 0;
  };

  // Helper lấy thành tiền dịch vụ đã bao gồm VAT
  const getSvcTotalWithVat = (svc) => {
    if (svc.total != null && !isNaN(Number(svc.total))) return Number(svc.total);
    const uPrice = getSvcUnitPriceWithVat(svc);
    const qty = Number(svc.quantity) || 1;
    return uPrice * qty;
  };

  // 1. Tiền phòng
  const nights = calculateNights(booking?.checkInDate, booking?.checkOutDate) || 1;
  const roomTotalWithVat = Number(invoice?.roomAmount != null ? invoice.roomAmount : (booking?.expectedPrice || 0));
  const roomPreTax = Math.round(roomTotalWithVat / 1.1);
  const roomUnitPricePreTax = nights > 0 ? Math.round(roomPreTax / nights) : roomPreTax;

  // 2. Tiền dịch vụ
  const servicesTotalWithVat = services.reduce((sum, s) => sum + getSvcTotalWithVat(s), 0);

  // 3. Tổng cộng tiền trước giảm giá (bao gồm VAT)
  const grossTotalWithVat = roomTotalWithVat + servicesTotalWithVat;
  const subtotal = Math.round(grossTotalWithVat / 1.1);
  const vatAmount = grossTotalWithVat - subtotal;

  const discountAmount = Number(invoice?.discountAmount || 0);
  const totalPayment = (invoice?.totalAmount != null && !isNaN(Number(invoice.totalAmount)))
    ? Number(invoice.totalAmount)
    : Math.max(0, grossTotalWithVat - discountAmount);

  // Ngày hóa đơn
  const invoiceDate = invoice?.createdAt ? new Date(invoice.createdAt) : new Date();
  const invoiceDay = String(invoiceDate.getDate()).padStart(2, '0');
  const invoiceMonth = String(invoiceDate.getMonth() + 1).padStart(2, '0');
  const invoiceYear = invoiceDate.getFullYear();

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 invoice-modal-container font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative border border-gray-200">
        
        {/* Thanh công cụ (ẩn khi in) */}
        <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-base">Xem & Xuất Hóa đơn GTGT</h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
              Số: #{String(invoice?.id || booking?.id || 1).padStart(7, '0')}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} icon={IoCloseOutline}>Đóng</Button>
            <Button onClick={handlePrint} icon={IoPrintOutline} className="bg-blue-600 hover:bg-blue-700 text-white">
              In Hóa đơn
            </Button>
          </div>
        </div>

        {/* Khung Hóa đơn chuẩn in ấn */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 print:p-0 print:overflow-visible bg-white text-slate-900 leading-normal" id="printable-invoice">
          
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 15mm 15mm 15mm 15mm;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-invoice, #printable-invoice * {
                visibility: visible !important;
              }
              #printable-invoice {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
              }
              .invoice-modal-container {
                position: static !important;
                background: none !important;
                padding: 0 !important;
              }
            }
          `}</style>

          <div className="max-w-3xl mx-auto space-y-5 text-slate-900 font-sans">
            
            {/* 1. Header Khách sạn & Số hóa đơn */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
              <div className="flex items-center gap-4">
                {hotelInfo.logoUrl ? (
                  <img src={hotelInfo.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded border border-gray-200" />
                ) : (
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-lg flex items-center justify-center font-extrabold text-xl shadow-xs">
                    STAY
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-lg text-slate-900 uppercase tracking-wide">{hotelInfo.name}</h1>
                  <p className="text-xs text-slate-600 mt-0.5">Địa chỉ: {hotelInfo.address}</p>
                  <p className="text-xs text-slate-600">Điện thoại: {hotelInfo.phone} {hotelInfo.email ? `• Email: ${hotelInfo.email}` : ''}</p>
                  <p className="text-xs text-slate-800 font-semibold mt-0.5">Mã số thuế: {hotelInfo.mst}</p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-700 shrink-0 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                <p>Mẫu số: <strong className="text-slate-900">01GTKT0/001</strong></p>
                <p>Ký hiệu: <strong className="text-slate-900">AA/24E</strong></p>
                <p>Số HĐ: <strong className="text-red-600 text-sm font-mono">{String(invoice?.id || booking?.id || 1).padStart(7, '0')}</strong></p>
              </div>
            </div>

            {/* 2. Tiêu đề Hóa Đơn */}
            <div className="text-center py-2">
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h2>
              <p className="text-xs text-slate-500 italic mt-1">
                Ngày {invoiceDay} tháng {invoiceMonth} năm {invoiceYear}
              </p>
            </div>

            {/* 3. Thông tin người mua hàng */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex">
                  <span className="w-36 text-slate-600 font-semibold">Tên người mua hàng:</span>
                  <span className="flex-1 font-bold text-slate-900 uppercase">{isCombined ? (activeGroup?.representativeName || '—') : (booking?.guestName || '—')}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-600 font-semibold">Số điện thoại:</span>
                  <span className="flex-1 font-medium text-slate-900">{isCombined ? (activeGroup?.representativePhone || '—') : (booking?.guestPhone || '—')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex">
                  <span className="w-36 text-slate-600 font-semibold">Căn cước công dân:</span>
                  <span className="flex-1 text-slate-800">{booking?.guestIdNumber || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-600 font-semibold">Mã số thuế:</span>
                  <span className="flex-1 text-slate-800">—</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex">
                  <span className="w-36 text-slate-600 font-semibold">Địa chỉ:</span>
                  <span className="flex-1 text-slate-800">Khách lẻ lưu trú</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-600 font-semibold">Hình thức thanh toán:</span>
                  <span className="flex-1 font-medium text-slate-900">Tiền mặt / Chuyển khoản</span>
                </div>
              </div>
            </div>

            {/* 4. Bảng Chi tiết Hàng hóa / Dịch vụ */}
            <div className="overflow-hidden border border-slate-900 rounded-sm">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-100 font-bold text-slate-900 border-b border-slate-900">
                  <tr>
                    <th className="border-r border-slate-900 py-2 px-2 text-center w-10">STT</th>
                    <th className="border-r border-slate-900 py-2 px-3 text-left">Tên hàng hóa, dịch vụ</th>
                    <th className="border-r border-slate-900 py-2 px-2 text-center w-14">ĐVT</th>
                    <th className="border-r border-slate-900 py-2 px-2 text-center w-14">Số lượng</th>
                    <th className="border-r border-slate-900 py-2 px-3 text-right w-28">Đơn giá (chưa thuế)</th>
                    <th className="py-2 px-3 text-right w-32">Thành tiền (chưa thuế)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {/* Mục 1: Tiền phòng */}
                  {(isCombined ? activeGroup.bookings : [booking]).map((b, bIdx) => {
                    const bNights = calculateNights(b?.checkInDate, b?.checkOutDate) || 1;
                    const bRoomTotalWithVat = Number(b?.actualPrice != null ? b.actualPrice : (b?.expectedPrice || 0));
                    const bRoomPreTax = Math.round(bRoomTotalWithVat / 1.1);
                    const bRoomUnitPricePreTax = bNights > 0 ? Math.round(bRoomPreTax / bNights) : bRoomPreTax;
                    
                    return (
                      <tr key={`room-${b?.id || bIdx}`}>
                        <td className="border-r border-slate-900 py-2.5 px-2 text-center font-medium">{bIdx + 1}</td>
                        <td className="border-r border-slate-900 py-2.5 px-3">
                          <div className="font-semibold text-slate-900">
                            Dịch vụ lưu trú ({b?.roomTypeName || 'Phòng tiêu chuẩn'}) {b?.roomNumber ? `— Phòng ${b.roomNumber}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Từ {formatStayDateTime(b?.checkInDate, 'checkin')} đến {formatStayDateTime(b?.checkOutDate, 'checkout')}
                          </div>
                        </td>
                        <td className="border-r border-slate-900 py-2.5 px-2 text-center">Đêm</td>
                        <td className="border-r border-slate-900 py-2.5 px-2 text-center font-medium">{bNights}</td>
                        <td className="border-r border-slate-900 py-2.5 px-3 text-right font-mono">
                          {bRoomUnitPricePreTax.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                          {bRoomPreTax.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Mục 2..n: Dịch vụ phụ thu */}
                  {services.map((svc, idx) => {
                    const unitPriceWithVat = getSvcUnitPriceWithVat(svc);
                    const totalWithVat = getSvcTotalWithVat(svc);
                    const svcPreTaxUnitPrice = Math.round(unitPriceWithVat / 1.1);
                    const svcPreTaxTotal = Math.round(totalWithVat / 1.1);
                    const qty = Number(svc.quantity) || 1;

                    return (
                      <tr key={svc.id || idx}>
                        <td className="border-r border-slate-900 py-2 px-2 text-center">{(isCombined ? group.bookings.length : 1) + idx + 1}</td>
                        <td className="border-r border-slate-900 py-2 px-3">
                          <span className="font-medium text-slate-900">{svc.serviceName || 'Dịch vụ phụ thu'}</span>
                          {svc.note && <span className="text-[11px] text-slate-500 italic ml-1.5">({svc.note})</span>}
                        </td>
                        <td className="border-r border-slate-900 py-2 px-2 text-center">{svc.unit || 'Lần'}</td>
                        <td className="border-r border-slate-900 py-2 px-2 text-center font-medium">{qty}</td>
                        <td className="border-r border-slate-900 py-2 px-3 text-right font-mono">
                          {svcPreTaxUnitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                          {svcPreTaxTotal.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. Tổng kết Tiền hàng, Thuế GTGT 10%, Tổng thanh toán */}
            <div className="flex text-xs pt-1">
              <div className="w-1/2 pr-4 space-y-1">
                <p className="italic text-slate-600">Tỷ giá quy đổi: 1 USD = 25.450 VNĐ (Nếu thanh toán ngoại tệ)</p>
                <p className="italic text-slate-500 text-[11px]">Đã bao gồm thuế giá trị gia tăng GTGT 10% theo quy định.</p>
              </div>

              <div className="w-1/2 space-y-1.5 bg-slate-50 p-3 rounded border border-slate-200 font-sans">
                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                  <span className="text-slate-600 font-semibold">Cộng tiền hàng hóa (chưa thuế):</span>
                  <span className="font-bold font-mono text-slate-900">{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                  <span className="text-slate-600 font-semibold">Thuế suất GTGT:</span>
                  <span className="font-semibold text-slate-900">10%</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-300 pb-1">
                  <span className="text-slate-600 font-semibold">Tiền thuế GTGT (10%):</span>
                  <span className="font-bold font-mono text-slate-900">{vatAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between border-b border-dashed border-slate-300 pb-1 text-red-600">
                    <span className="font-semibold">Chiết khấu / Giảm giá:</span>
                    <span className="font-bold font-mono">- {discountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-blue-700 font-mono text-base">{totalPayment.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* 6. Số tiền viết bằng chữ */}
            <div className="bg-slate-100 p-2.5 rounded border border-slate-200 text-xs">
              <span className="font-semibold text-slate-700">Số tiền viết bằng chữ: </span>
              <strong className="text-slate-900 italic">{numberToWords(totalPayment)}</strong>
            </div>

            {/* 7. Chữ ký các bên */}
            <div className="grid grid-cols-2 pt-6 pb-12 text-center text-xs">
              <div>
                <p className="font-bold uppercase text-slate-900">Người mua hàng</p>
                <p className="italic text-slate-500 text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-semibold text-slate-800 uppercase">{isCombined ? (group?.representativeName || '') : (booking?.guestName || '')}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-slate-900">Người bán hàng</p>
                <p className="italic text-slate-500 text-[11px] mt-0.5">(Ký, đóng dấu, ghi rõ họ tên)</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-[11px] border border-green-600 text-green-700 font-bold px-2 py-0.5 rounded rotate-[-5deg] inline-block uppercase">
                    ✓ ĐÃ KÝ ĐIỆN TỬ
                  </span>
                </div>
                <p className="font-bold uppercase text-blue-900">{hotelInfo.name}</p>
              </div>
            </div>

            {/* 8. Footer */}
            <div className="text-center text-[11px] text-slate-500 border-t border-slate-200 pt-2 pb-4">
              (Hóa đơn điện tử có giá trị pháp lý theo quy định hiện hành • Hệ thống StayGO PMS)
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.getElementById('modal-root') || document.body);
};

export default InvoicePrintTemplate;
