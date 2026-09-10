import React, { useState, useEffect } from 'react';
import { extraServiceApi } from '../../services/extraServiceApi';
import { useAuth } from '../../context/AuthContext';
import { IoAddOutline, IoCafeOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ExtraServiceResponse } from '../../types';

const ExtraServiceManagement: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ExtraServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    id: number | null;
    name: string;
    description: string;
    unitPrice: number;
    unit: string;
    active: boolean;
  }>({
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
  const [itemToDelete, setItemToDelete] = useState<ExtraServiceResponse | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await extraServiceApi.getAllServices();
      setServices(data || []);
    } catch (error) {
      console.error("Failed to fetch extra services", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
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

  const openEditModal = (service: ExtraServiceResponse) => {
    setFormData({
      id: service.id,
      name: service.name,
      description: service.description || '',
      unitPrice: service.unitPrice ?? (service as any).price ?? 0,
      unit: service.unit || '',
      active: service.active ?? true
    });
    setIsEditing(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const { success: toastSuccess, error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (isEditing && formData.id) {
        await extraServiceApi.updateService(formData.id, formData as any);
        toastSuccess(`Đã cập nhật dịch vụ "${formData.name}" thành công!`);
      } else {
        await extraServiceApi.createService(formData as any);
        toastSuccess(`Đã tạo mới dịch vụ "${formData.name}" thành công!`);
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (error: any) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const openDeleteModal = (service: ExtraServiceResponse) => {
    setItemToDelete(service);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await extraServiceApi.deleteService(itemToDelete.id);
      toastSuccess(`Đã xóa dịch vụ "${itemToDelete.name}" thành công!`);
      setIsDeleteModalOpen(false);
      fetchServices();
    } catch (error: any) {
      console.error("Delete error", error);
      toastError(error.response?.data?.message || "Lỗi khi xóa dịch vụ.");
    }
  };

  const formatPrice = (price?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="px-4 py-3 border-b border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container-lowest">
        <div className="flex items-center gap-2">
          <IoCafeOutline size={22} className="text-primary" /> 
          <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
            Dịch vụ Phụ thu
          </h2>
        </div>
        {isOwner && (
          <Button size="sm" onClick={openAddModal} icon={IoAddOutline} className="shrink-0">
            Thêm Dịch vụ
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-border-grey text-on-surface-variant font-label-md text-xs uppercase tracking-wider">
              <th className="p-3">Tên Dịch vụ</th>
              <th className="p-3">Mô tả</th>
              <th className="p-3">Đơn giá</th>
              <th className="p-3">Đơn vị tính</th>
              <th className="p-3">Trạng thái</th>
              {isOwner && <th className="p-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-grey font-body-md text-sm text-on-surface">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  <LoadingScreen message="Đang tải danh sách dịch vụ..." />
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                  Chưa có dịch vụ phụ thu nào.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-3 font-semibold text-on-surface">{service.name}</td>
                  <td className="p-3 text-on-surface-variant">{service.description || '—'}</td>
                  <td className="p-3 font-medium text-primary">{formatPrice(service.unitPrice ?? (service as any).price)}</td>
                  <td className="p-3">{service.unit || 'Lần'}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      service.active ? 'bg-green-50 text-green-700' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {service.active ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-1 rounded hover:bg-surface-container text-primary transition-colors"
                          title="Chỉnh sửa"
                        >
                          <IoPencilOutline size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(service)}
                          className="p-1 rounded hover:bg-red-50 text-error transition-colors"
                          title="Xóa"
                        >
                          <IoTrashOutline size={16} />
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

      {/* Modal Thêm / Sửa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Chỉnh sửa Dịch vụ" : "Thêm Dịch vụ Phụ thu"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm text-error bg-red-50 rounded border border-red-200">
              {formError}
            </div>
          )}
          <Input
            label="Tên dịch vụ *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="VD: Nước suối, Giặt ủi..."
          />
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              className="w-full text-sm rounded-lg border border-border-grey px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="Chi tiết về dịch vụ..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Đơn giá (VNĐ) *"
              type="number"
              name="unitPrice"
              min="0"
              step="1000"
              value={formData.unitPrice}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Đơn vị tính *"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              required
              placeholder="VD: Chai, Kg, Lần..."
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleInputChange}
              className="rounded border-border-grey text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="active" className="text-sm font-medium text-on-surface">Đang cung cấp (Active)</label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-grey">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              {isEditing ? "Lưu thay đổi" : "Tạo dịch vụ"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận xóa dịch vụ"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface">
            Bạn có chắc chắn muốn xóa dịch vụ <strong>{itemToDelete?.name}</strong>? Thao tác này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExtraServiceManagement;
