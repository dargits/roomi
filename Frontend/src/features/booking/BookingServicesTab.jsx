import React, { useState, useEffect } from 'react';
import { IoAddOutline, IoCartOutline, IoTrashOutline, IoInformationCircleOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import bookingApi from '../../services/bookingApi';
import { extraServiceApi } from '../../services/extraServiceApi';
import { invoiceApi } from '../../services/invoiceApi';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';

const BookingServicesTab = ({ bookingId, status }) => {
  const [services, setServices] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newService, setNewService] = useState({
    serviceId: '',
    quantity: 1,
    note: ''
  });
  const [adding, setAdding] = useState(false);
  const [invoicePaid, setInvoicePaid] = useState(false);

  const canEdit = status === 'CHECKED_IN' && !invoicePaid;

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usageData, allServices] = await Promise.all([
        bookingApi.getBookingServices(bookingId),
        extraServiceApi.getAllServices()
      ]);
      setServices(usageData || []);
      setAvailableServices((allServices || []).filter(s => s.active));
      
      // Chỉ cần kiểm tra hóa đơn khi booking đang CHECKED_IN
      if (status === 'CHECKED_IN') {
        try {
          const invData = await invoiceApi.getInvoiceByBooking(bookingId);
          if (invData && invData.status === 'PAID') {
            setInvoicePaid(true);
          } else {
            setInvoicePaid(false);
          }
        } catch (invErr) {
          setInvoicePaid(false);
        }
      } else {
        setInvoicePaid(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải dịch vụ:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newService.serviceId) return;
    
    setAdding(true);
    try {
      await bookingApi.addBookingService(bookingId, {
        extraServiceId: parseInt(newService.serviceId),
        quantity: parseInt(newService.quantity) || 1,
        note: newService.note
      });
      setNewService({ serviceId: '', quantity: 1, note: '' });
      fetchData();
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || "Không thể thêm dịch vụ"));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (usageId) => {
    if (!window.confirm("Xác nhận xóa dịch vụ này?")) return;
    try {
      await bookingApi.removeBookingService(bookingId, usageId);
      fetchData();
    } catch (error) {
      alert("Lỗi xóa dịch vụ: " + (error.response?.data?.message || "Không thể xóa dịch vụ"));
    }
  };

  const serviceOptions = availableServices.map(s => ({
    value: s.id,
    label: `${s.name} (${s.unitPrice?.toLocaleString('vi-VN')} đ/${s.unit || 'lượt'})`
  }));

  const totalAmount = services.reduce(
    (sum, item) => sum + (item.total || (item.unitPriceSnapshot * item.quantity)),
    0
  );

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu dịch vụ...</div>;

  return (
    <div className="space-y-5">
      {/* Thông báo trạng thái nếu không thể thêm dịch vụ */}
      {!canEdit && (
        <div className="bg-surface-container-low border border-border-grey p-3.5 rounded-lg flex items-center gap-2.5 text-xs text-on-surface-variant">
          <IoInformationCircleOutline size={18} className="text-primary shrink-0" />
          {status !== 'CHECKED_IN' ? (
            <span>Dịch vụ phụ thu chỉ áp dụng khi khách đang ở phòng (Trạng thái <strong>Đang ở</strong>).</span>
          ) : invoicePaid ? (
            <span>Hóa đơn đã thanh toán hoàn tất, không thể thêm hoặc xóa dịch vụ phụ thu.</span>
          ) : null}
        </div>
      )}

      {/* Thêm dịch vụ mới */}
      {canEdit && (
        <div className="bg-surface-container-low p-4 rounded-lg border border-border-grey shadow-sm">
          <h4 className="font-title-md text-on-surface mb-3 flex items-center gap-2">
            <IoCartOutline size={18} className="text-primary"/> Thêm dịch vụ phụ thu
          </h4>
          <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Select
                label="Chọn dịch vụ"
                name="serviceId"
                value={newService.serviceId}
                onChange={(e) => setNewService(prev => ({...prev, serviceId: e.target.value}))}
                options={serviceOptions}
                placeholder="Chọn loại dịch vụ / phụ thu..."
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Số lượng"
                type="number"
                min="1"
                value={newService.quantity}
                onChange={(e) => setNewService(prev => ({...prev, quantity: e.target.value}))}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label="Ghi chú"
                value={newService.note}
                onChange={(e) => setNewService(prev => ({...prev, note: e.target.value}))}
                placeholder="Ghi chú thêm..."
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" isLoading={adding} icon={IoAddOutline} className="w-full">
                Thêm
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách dịch vụ đã dùng có scrollbox cố định */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border-grey bg-surface-container-low flex justify-between items-center">
          <span className="font-title-sm text-on-surface flex items-center gap-2">
            Danh sách dịch vụ đã sử dụng
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {services.length}
            </span>
          </span>
          <span className="text-xs text-on-surface-variant">
            Tổng tiền: <strong className="text-primary font-bold">{totalAmount.toLocaleString('vi-VN')} đ</strong>
          </span>
        </div>

        {/* Khung bảng cuộn nội bộ max-h-56 để không bị tràn modal khi có nhiều dịch vụ */}
        <div className="max-h-60 sm:max-h-64 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-border-grey sticky top-0 z-10">
              <tr className="font-label-md text-on-surface-variant uppercase text-xs">
                <th className="p-3">Dịch vụ</th>
                <th className="p-3 text-right">Đơn giá</th>
                <th className="p-3 text-right">SL</th>
                <th className="p-3 text-right">Thành tiền</th>
                {canEdit && <th className="p-3 text-center w-14">Xóa</th>}
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="p-8 text-center text-on-surface-variant italic">
                    Chưa sử dụng dịch vụ phụ thu nào.
                  </td>
                </tr>
              ) : (
                services.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-border-grey last:border-0 hover:bg-surface-container-low/60 transition-colors">
                    <td className="p-3">
                      <div className="font-title-sm text-on-surface">{item.serviceName}</div>
                      {item.note && <div className="text-xs text-on-surface-variant mt-0.5 italic">{item.note}</div>}
                      <div className="text-[11px] text-on-surface-variant/80 mt-0.5">
                        {new Date(item.usageTime || item.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td className="p-3 text-right text-sm">{item.unitPriceSnapshot?.toLocaleString('vi-VN')} đ</td>
                    <td className="p-3 text-right text-sm font-semibold">{item.quantity}</td>
                    <td className="p-3 text-right font-semibold text-primary text-sm">
                      {(item.total || (item.unitPriceSnapshot * item.quantity))?.toLocaleString('vi-VN')} đ
                    </td>
                    {canEdit && (
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-red-50 rounded transition-colors"
                          title="Xóa dịch vụ"
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer tổng kết cố định ở đáy bảng */}
        {services.length > 0 && (
          <div className="bg-surface-container-low border-t border-border-grey px-4 py-3 flex justify-between items-center shrink-0">
            <span className="font-title-sm text-on-surface">Tổng tiền phụ thu:</span>
            <span className="font-title-md text-primary font-bold">{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingServicesTab;

