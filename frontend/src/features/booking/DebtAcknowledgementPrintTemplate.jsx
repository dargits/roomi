import React from 'react';
import { createPortal } from 'react-dom';
import { IoCloseOutline, IoPrintOutline } from 'react-icons/io5';
import Button from '../../components/ui/Button';

const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(amount || 0);

const DebtAcknowledgementPrintTemplate = ({ data, onClose, onPrint }) => {
  const handlePrint = () => {
    onPrint?.();
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4 print:bg-white print:p-0">
      <style>{`@media print { body * { visibility: hidden; } #debt-acknowledgement, #debt-acknowledgement * { visibility: visible; } #debt-acknowledgement { position:absolute; inset:0; width:100%; } .no-print { display:none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-3xl justify-end gap-2">
        <Button variant="ghost" onClick={onClose} icon={IoCloseOutline}>Đóng</Button>
        <Button onClick={handlePrint} icon={IoPrintOutline}>In / Lưu PDF</Button>
      </div>
      <article id="debt-acknowledgement" className="mx-auto max-w-3xl bg-white p-8 text-sm text-slate-900 shadow-xl print:max-w-none print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-xl font-bold uppercase">Giấy xác nhận công nợ</h1>
          <p className="mt-1 font-semibold">Số: CN-{String(data.debtRequestId).padStart(6, '0')}</p>
          <p className="mt-2">{data.hotelName}</p>
          <p>{data.hotelAddress} | {data.hotelPhone}</p>
        </header>
        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2">
          <p><strong>Khách hàng:</strong> {data.guestName}</p>
          <p><strong>Số điện thoại:</strong> {data.guestPhone || '---'}</p>
          <p><strong>CCCD:</strong> {data.guestIdNumber || '---'}</p>
          <p><strong>Phòng / Booking:</strong> {data.roomNumber || '---'} / #{data.bookingId}</p>
          <p><strong>Nhận phòng:</strong> {data.checkInDate || '---'}</p>
          <p><strong>Trả phòng:</strong> {data.checkOutDate || '---'}</p>
        </section>
        <section className="mt-6 border border-slate-300">
          <div className="flex justify-between border-b border-slate-300 p-3"><span>Tổng giá trị hóa đơn</span><strong>{formatMoney(data.invoiceTotal)}</strong></div>
          <div className="flex justify-between border-b border-slate-300 p-3"><span>Đã thanh toán</span><strong>{formatMoney(data.paidAmount)}</strong></div>
          <div className="flex justify-between bg-red-50 p-3 text-base text-red-700"><span className="font-bold">Còn phải thanh toán</span><strong>{formatMoney(data.debtAmount)}</strong></div>
        </section>
        <section className="mt-6 space-y-3 leading-6">
          <p>Khách hàng xác nhận còn công nợ với cơ sở lưu trú số tiền nêu trên và cam kết thanh toán chậm nhất vào ngày <strong>{data.dueDate}</strong>.</p>
          <p><strong>Lý do trả sau:</strong> {data.reason}</p>
          <p>Chứng từ được xác nhận sau khi Chủ cơ sở phê duyệt bởi <strong>{data.approvedByName || '---'}</strong> vào {data.approvedAt ? new Date(data.approvedAt).toLocaleString('vi-VN') : '---'}.</p>
        </section>
        <footer className="mt-16 grid grid-cols-3 gap-8 text-center font-semibold">
          <div><p>Khách hàng</p><p className="mt-16 font-normal">(Ký, ghi rõ họ tên)</p></div>
          <div><p>Lễ tân</p><p className="mt-16 font-normal">(Ký, ghi rõ họ tên)</p></div>
          <div><p>Chủ cơ sở</p><p className="mt-16 font-normal">(Ký, ghi rõ họ tên)</p></div>
        </footer>
      </article>
    </div>,
    document.body
  );
};

export default DebtAcknowledgementPrintTemplate;
