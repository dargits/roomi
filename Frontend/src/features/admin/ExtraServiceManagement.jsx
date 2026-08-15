import React, { useState, useEffect } from 'react';
import { extraServiceApi } from '../../services/extraServiceApi';
import { useAuth } from '../../context/AuthContext';
import { IoAddOutline, IoCafeOutline, IoPencilOutline, IoTrashOutline, IoWarningOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const ExtraServiceManagement = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    description: '',
    unitPrice: 0,
    unit: '',
    active: true
  });
  const [formError, setFormError] = useState('');

  // Delete confirm state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await extraServiceApi.getAllServices();
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch extra services", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openAddModal = () => {
    setFormData({ id: null, name: '', description: '', unitPrice: 0, unit: '', active: true });
    setIsEditing(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setFormData({
      id: service.id,
      name: service.name,
      description: service.description || '',
      unitPrice: service.unitPrice,
      unit: service.unit || '',
      active: service.active
    });
    setIsEditing(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (isEditing) {
        await extraServiceApi.updateService(formData.id, formData);
      } else {
        await extraServiceApi.createService(formData);
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (error) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const openDeleteModal = (service) => {
    setItemToDelete(service);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await extraServiceApi.deleteService(itemToDelete.id);
      setIsDeleteModalOpen(false);
      fetchServices();
    } catch (error) {
      console.error("Delete error", error);
      alert(error.response?.data?.message || "Lỗi khi xóa dịch vụ.");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="p-6 border-b border-border-grey flex justify-between items-center bg-surface-container-lowest">
        <div>
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <IoCafeOutline size={28} className="text-primary" /> 
            Quản lý Dịch vụ Phụ thu
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">Danh sách các dịch vụ bán kèm (Giặt là, thuê xe, spa,...)</p>
        </div>
        {isOwner && (
          <Button onClick={openAddModal} icon={IoAddOutline} className="px-5 py-2.5">
            Thêm Dịch vụ
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b-2 border-border-grey font-label-md text-on-surface-variant uppercase tracking-wider">
              <th className="p-4 w-16 text-center font-semibold">ID</th>
              <th className="p-4 font-semibold">Tên dịch vụ</th>
              <th className="p-4 font-semibold">Mô tả</th>
              <th className="p-4 text-right font-semibold">Đơn giá</th>
              <th className="p-4 text-left font-semibold">Đơn vị</th>
              <th className="p-4 text-center font-semibold">Trạng thái</th>
              {isOwner && <th className="p-4 text-center w-32 font-semibold">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isOwner ? "7" : "6"} className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={isOwner ? "7" : "6"} className="p-8 text-center text-on-surface-variant">Chưa có dữ liệu dịch vụ phụ thu.</td></tr>
            ) : (
              services.map(service => (
                <tr key={service.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                  <td className="p-4 text-center text-on-surface-variant font-body-sm">{service.id}</td>
                  <td className="p-4 font-title-sm text-on-surface group-hover:text-primary transition-colors">{service.name}</td>
                  <td className="p-4 text-on-surface-variant font-body-sm max-w-xs truncate" title={service.description}>{service.description || '—'}</td>
                  <td className="p-4 text-right font-body-md text-primary font-semibold">{formatPrice(service.unitPrice)}</td>
                  <td className="p-4 text-left font-body-sm text-on-surface-variant">{service.unit}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-label-md ${service.active ? 'bg-surface-container border border-border-grey text-green-600' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {service.active ? 'Hoạt động' : 'Tạm ẩn'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(service)}
                          className="text-primary p-1.5 rounded-md hover:bg-surface-blue-light hover:shadow-sm transition-all"
                          title="Sửa"
                        >
                          <IoPencilOutline size={20} strokeWidth={1.5} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(service)}
                          className="text-error p-1.5 rounded-md hover:bg-red-50 hover:shadow-sm transition-all"
                          title="Xóa"
                        >
                          <IoTrashOutline size={20} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isOwner && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'} maxWidth="max-w-xl">
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
              {formError}
            </div>
          )}
          <form id="serviceForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <Input label="Tên dịch vụ" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ví dụ: Giặt là, Thuê xe máy..." />
              </div>
              
              <div>
                <Input label="Đơn giá (VNĐ)" type="number" name="unitPrice" required min="0" step="1000" value={formData.unitPrice} onChange={handleInputChange} />
              </div>
              
              <div>
                <Input label="Đơn vị tính" name="unit" required value={formData.unit} onChange={handleInputChange} placeholder="Ví dụ: Lần, Ngày, Kg, Bộ..." />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label className="block font-label-md text-on-surface-variant mb-1.5">Mô tả (Tùy chọn)</label>
                <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-body-md text-on-surface" placeholder="Mô tả chi tiết về dịch vụ này..."></textarea>
              </div>
              
              <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2">
                <input type="checkbox" id="activeService" name="active" checked={formData.active} onChange={handleInputChange} className="w-4 h-4 text-primary border-border-grey rounded focus:ring-primary" />
                <label htmlFor="activeService" className="font-body-md text-on-surface cursor-pointer">Đang hoạt động (Hiển thị cho khách hàng)</label>
              </div>
            </div>
          </form>
          <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" form="serviceForm">Lưu dữ liệu</Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="max-w-md">
          <div className="flex flex-col items-center text-center pb-6">
            <div className="w-14 h-14 rounded-full bg-red-100 text-error flex items-center justify-center mb-5">
              <IoWarningOutline size={32} strokeWidth={1.5} />
            </div>
            <h3 className="font-title-lg text-on-surface mb-2">Xóa dịch vụ này?</h3>
            <p className="font-body-md text-on-surface-variant">Bạn có chắc chắn muốn xóa dịch vụ <strong>{itemToDelete?.name}</strong> không? Hành động này không thể hoàn tác.</p>
          </div>
          <div className="flex gap-3 pt-6 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Hủy bỏ</Button>
            <Button variant="danger" onClick={confirmDelete} className="flex-1">Xóa cứng</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ExtraServiceManagement;
