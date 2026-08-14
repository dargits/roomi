import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
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
      setServices(usageData);
      setAvailableServices(allServices.filter(s => s.active));
      
      try {
        const invData = await invoiceApi.getInvoiceByBooking(bookingId);
        if (invData && invData.status === 'PAID') {
          setInvoicePaid(true);
        }
      } catch (invErr) {
        // Có thể là 404 (chưa có hóa đơn), không làm gì cả
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
        quantity: parseInt(newService.quantity),
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
      alert("Lỗi xóa dịch vụ");
    }
  };

  const serviceOptions = availableServices.map(s => ({ value: s.id, label: `${s.name} (${s.unitPrice?.toLocaleString('vi-VN')} đ/${s.unit})` }));
  const totalAmount = services.reduce((sum, item) => sum + (item.total || (item.unitPriceSnapshot * item.quantity)), 0);

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu dịch vụ...</div>;

  return (
    <div className="space-y-6">
      {/* Thêm dịch vụ mới */}
      {canEdit && (
        <div className="bg-surface-container-low p-4 rounded-lg border border-border-grey">
          <h4 className="font-title-md text-on-surface mb-4 flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary"/> Thêm dịch vụ phụ thu
          </h4>
          <form onSubmit={handleAddService} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <Select
                label="Chọn dịch vụ"
                name="serviceId"
                value={newService.serviceId}
                onChange={(e) => setNewService(prev => ({...prev, serviceId: e.target.value}))}
                options={serviceOptions}
                required
              />
            </div>
            <div className="w-24">
              <Input
                label="Số lượng"
                type="number"
                min="1"
                value={newService.quantity}
                onChange={(e) => setNewService(prev => ({...prev, quantity: e.target.value}))}
                required
              />
            </div>
            <div className="flex-1">
              <Input
                label="Ghi chú"
                value={newService.note}
                onChange={(e) => setNewService(prev => ({...prev, note: e.target.value}))}
                placeholder="Ghi chú thêm..."
              />
            </div>
            <Button type="submit" isLoading={adding} icon={Plus}>Thêm</Button>
          </form>
        </div>
      )}

      {/* Danh sách đã dùng */}
      <div className="border border-border-grey rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low border-b border-border-grey">
            <tr className="font-label-md text-on-surface-variant uppercase text-sm">
              <th className="p-3">Dịch vụ</th>
              <th className="p-3 text-right">Đơn giá</th>
              <th className="p-3 text-right">SL</th>
              <th className="p-3 text-right">Thành tiền</th>
              {canEdit && <th className="p-3 text-center">Xóa</th>}
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="p-6 text-center text-on-surface-variant italic">
                  Chưa sử dụng dịch vụ nào.
                </td>
              </tr>
            ) : (
              services.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-border-grey last:border-0 hover:bg-surface-container-lowest">
                  <td className="p-3">
                    <div className="font-title-sm text-on-surface">{item.serviceName}</div>
                    {item.note && <div className="text-xs text-on-surface-variant mt-1">{item.note}</div>}
                    <div className="text-xs text-on-surface-variant mt-1">{new Date(item.usageTime || item.createdAt).toLocaleString('vi-VN')}</div>
                  </td>
                  <td className="p-3 text-right">{item.unitPriceSnapshot?.toLocaleString('vi-VN')} đ</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right font-medium text-primary">
                    {(item.total || (item.unitPriceSnapshot * item.quantity))?.toLocaleString('vi-VN')} đ
                  </td>
                  {canEdit && (
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-red-50 rounded transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {services.length > 0 && (
            <tfoot className="bg-surface-container-low border-t border-border-grey">
              <tr>
                <td colSpan="3" className="p-3 text-right font-title-sm text-on-surface">Tổng tiền dịch vụ:</td>
                <td className="p-3 text-right font-title-md text-primary">{totalAmount.toLocaleString('vi-VN')} đ</td>
                {canEdit && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default BookingServicesTab;
