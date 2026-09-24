import React, { useState, useEffect, useMemo } from 'react';
import { extraServiceApi } from '../../services/extraServiceApi';
import inventoryApi from '../../services/inventoryApi';
import { useAuth } from '../../context/AuthContext';
import { 
  IoAddOutline, 
  IoCafeOutline, 
  IoPencilOutline, 
  IoTrashOutline, 
  IoCubeOutline,
  IoAlertCircleOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoCheckmarkDoneOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ExtraServiceResponse, InventoryItemResponse, ExtraServiceInventoryItemDto } from '../../types';

const ExtraServiceManagement: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<ExtraServiceResponse[]>([]);
  const [inventoryItemsList, setInventoryItemsList] = useState<InventoryItemResponse[]>([]);
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
    inventoryItems: ExtraServiceInventoryItemDto[];
  }>({
    id: null,
    name: '',
    description: '',
    unitPrice: 0,
    unit: '',
    active: true,
    inventoryItems: []
  });
  const [formError, setFormError] = useState('');

  // Delete confirm state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ExtraServiceResponse | null>(null);

  // Search & Pagination & Bulk Selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { success: toastSuccess, error: toastError, confirm } = useToast();

  const fetchServicesAndInventory = async () => {
    setLoading(true);
    try {
      const [serviceData, invData] = await Promise.all([
        extraServiceApi.getAllServices(),
        inventoryApi.getAll().catch(() => [])
      ]);
      setServices(serviceData || []);
      setInventoryItemsList(invData || []);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesAndInventory();
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

  const handleAddInventoryRow = () => {
    const chosenIds = new Set(formData.inventoryItems.map(i => i.inventoryItemId));
    const available = inventoryItemsList.find(i => !chosenIds.has(Number(i.id)));
    const itemToAdd = available || inventoryItemsList[0];
    if (!itemToAdd) return;

    setFormData(prev => ({
      ...prev,
      inventoryItems: [
        ...prev.inventoryItems,
        {
          inventoryItemId: Number(itemToAdd.id),
          quantity: 1,
          itemName: itemToAdd.name,
          unit: itemToAdd.unit,
          currentStock: itemToAdd.quantityOnHand
        }
      ]
    }));
  };

  const handleRemoveInventoryRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((_, idx) => idx !== index)
    }));
  };

  const handleInventoryRowChange = (index: number, field: 'inventoryItemId' | 'quantity', val: any) => {
    setFormData(prev => {
      const updated = [...prev.inventoryItems];
      if (field === 'inventoryItemId') {
        const found = inventoryItemsList.find(i => Number(i.id) === Number(val));
        updated[index] = {
          ...updated[index],
          inventoryItemId: Number(val),
          itemName: found?.name || '',
          unit: found?.unit || '',
          currentStock: found?.quantityOnHand
        };
      } else {
        updated[index] = {
          ...updated[index],
          quantity: Math.max(1, Number(val) || 1)
        };
      }
      return { ...prev, inventoryItems: updated };
    });
  };

  const openAddModal = () => {
    setFormData({ 
      id: null, 
      name: '', 
      description: '', 
      unitPrice: 0, 
      unit: '', 
      active: true,
      inventoryItems: []
    });
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
      active: service.active ?? true,
      inventoryItems: (service.inventoryItems || []).map(item => ({
        id: item.id,
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        currentStock: item.currentStock
      }))
    });
    setIsEditing(true);
    setFormError('');
    setIsModalOpen(true);
  };

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
      fetchServicesAndInventory();
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
      fetchServicesAndInventory();
    } catch (error: any) {
      console.error("Delete error", error);
      toastError(error.response?.data?.message || "Lỗi khi xóa dịch vụ.");
    }
  };

  const formatPrice = (price?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Lọc tìm kiếm & trạng thái
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.unit && s.unit.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.active) ||
        (statusFilter === 'INACTIVE' && !s.active);
      return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, statusFilter]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Chọn & Xóa hàng loạt
  const isAllPageSelected = paginatedServices.length > 0 && paginatedServices.every(s => selectedIds.has(s.id));

  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedServices.forEach(s => next.delete(s.id));
      } else {
        paginatedServices.forEach(s => next.add(s.id));
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredServices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredServices.map(s => s.id)));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const isConfirmed = await confirm({
      title: `Xác nhận xóa ${count} dịch vụ`,
      message: `Bạn có chắc chắn muốn xóa ${count} dịch vụ phụ thu đã chọn? Hành động này không thể hoàn tác.`,
      confirmText: `Xóa ${count} dịch vụ`,
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setBulkDeleting(true);
    try {
      await extraServiceApi.bulkDelete(Array.from(selectedIds));
      toastSuccess(`Đã xóa thành công ${count} dịch vụ phụ thu!`);
      setSelectedIds(new Set());
      fetchServicesAndInventory();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Lỗi khi xóa hàng loạt dịch vụ.');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="px-4 py-3 border-b border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container-lowest">
        <div className="flex items-center gap-2">
          <IoCafeOutline size={22} className="text-primary" /> 
          <div>
            <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
              Dịch vụ Phụ thu
            </h2>
            <p className="text-xs text-on-surface-variant">
              Quản lý các dịch vụ tính phí kèm định mức tự động xuất kho đồ dùng
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="danger"
              icon={IoTrashOutline}
              onClick={handleBulkDelete}
              isLoading={bulkDeleting}
            >
              Xóa đã chọn ({selectedIds.size})
            </Button>
          )}
          {isOwner && (
            <Button size="sm" onClick={openAddModal} icon={IoAddOutline} className="shrink-0">
              Thêm Dịch vụ
            </Button>
          )}
        </div>
      </div>

      {/* Thanh tìm kiếm & Lọc trạng thái */}
      <div className="px-4 py-2.5 bg-surface-container-low border-b border-border-grey flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <IoSearchOutline className="absolute left-3 top-2.5 text-on-surface-variant/70" size={15} />
            <input
              type="text"
              placeholder="Tìm theo tên dịch vụ, mô tả, đơn vị tính..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 border border-border-grey rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs bg-white text-on-surface"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <IoCloseOutline size={14} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 border border-border-grey rounded-lg text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng</option>
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-primary">
              Đã chọn {selectedIds.size} / {filteredServices.length}
            </span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-primary underline hover:text-primary-dark font-medium cursor-pointer"
            >
              {selectedIds.size === filteredServices.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả kết quả'}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-border-grey text-on-surface-variant font-label-md text-xs uppercase tracking-wider">
              {isOwner && (
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectPage}
                    className="rounded border-border-grey text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    title={isAllPageSelected ? "Bỏ chọn trang này" : "Chọn toàn bộ trang này"}
                  />
                </th>
              )}
              <th className="p-3">Tên Dịch vụ</th>
              <th className="p-3">Mô tả</th>
              <th className="p-3">Đơn giá</th>
              <th className="p-3">Đơn vị tính</th>
              <th className="p-3">Liên kết Kho Đồ Dùng</th>
              <th className="p-3">Trạng thái</th>
              {isOwner && <th className="p-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-grey font-body-md text-sm text-on-surface">
            {loading ? (
              <tr>
                <td colSpan={isOwner ? 8 : 7} className="p-8 text-center">
                  <LoadingScreen message="Đang tải danh sách dịch vụ..." />
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 8 : 7} className="p-8 text-center text-on-surface-variant">
                  {searchTerm || statusFilter !== 'ALL'
                    ? "Không tìm thấy dịch vụ nào phù hợp với bộ lọc."
                    : "Chưa có dịch vụ phụ thu nào."}
                </td>
              </tr>
            ) : (
              paginatedServices.map((service) => {
                const isSelected = selectedIds.has(service.id);
                return (
                  <tr 
                    key={service.id} 
                    className={`border-b border-border-grey/70 transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-low/50'
                    }`}
                  >
                    {isOwner && (
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(service.id)}
                          className="rounded border-border-grey text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        />
                      </td>
                    )}
                  <td className="p-3 font-semibold text-on-surface">
                    {service.name}
                  </td>
                  <td className="p-3 text-on-surface-variant">{service.description || '—'}</td>
                  <td className="p-3 font-medium text-primary">{formatPrice(service.unitPrice ?? (service as any).price)}</td>
                  <td className="p-3">{service.unit || 'Lần'}</td>
                  <td className="p-3">
                    {service.inventoryItems && service.inventoryItems.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {service.inventoryItems.map((inv, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                            title={`Mỗi 1 ${service.unit || 'lần'} dịch vụ sẽ tự động trừ ${inv.quantity} ${inv.unit || ''} trong kho`}
                          >
                            <IoCubeOutline size={12} className="text-emerald-600" />
                            {inv.itemName}: <strong>x{inv.quantity}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-on-surface-variant/70 italic">
                        Không trừ kho
                      </span>
                    )}
                  </td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phân trang hoàn chỉnh */}
      {!loading && filteredServices.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredServices.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[5, 10, 20, 50]}
          itemLabel="dịch vụ"
        />
      )}

      {/* Modal Thêm / Sửa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? "Chỉnh sửa Dịch vụ" : "Thêm Dịch vụ Phụ thu"}
        maxWidth="max-w-lg"
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
            placeholder="VD: Gói tiệc BBQ, Giặt ủi cao cấp..."
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
              placeholder="VD: Chai, Kg, Lần, Phần..."
            />
          </div>

          {/* Phần liên kết đồ dùng trong kho */}
          <div className="p-3.5 bg-surface-container-low rounded-lg border border-border-grey space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <IoCubeOutline size={18} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Định mức trừ kho đồ dùng (BOM)
                </span>
              </div>
              {inventoryItemsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddInventoryRow}
                  className="text-xs font-semibold text-primary hover:text-primary-dark inline-flex items-center gap-1 transition-colors"
                >
                  <IoAddOutline size={15} /> Thêm đồ dùng
                </button>
              )}
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Mỗi khi nhân viên ghi nhận dịch vụ này cho khách lưu trú, hệ thống sẽ <strong>tự động trừ số lượng tương ứng</strong> trong kho đồ dùng.
            </p>

            {inventoryItemsList.length === 0 ? (
              <div className="p-2.5 bg-surface rounded border border-dashed border-border-grey text-xs text-on-surface-variant text-center">
                Chưa có mặt hàng nào trong kho đồ dùng. Bạn có thể thêm hàng vào kho tại mục "Kho đồ dùng".
              </div>
            ) : formData.inventoryItems.length === 0 ? (
              <div className="p-3 bg-surface rounded border border-dashed border-border-grey text-center space-y-1.5">
                <p className="text-xs text-on-surface-variant">
                  Chưa chọn đồ dùng kho nào cho dịch vụ này.
                </p>
                <button
                  type="button"
                  onClick={handleAddInventoryRow}
                  className="px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                >
                  + Liên kết mặt hàng trong kho
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.inventoryItems.map((row, index) => {
                  const selectedItem = inventoryItemsList.find(i => Number(i.id) === Number(row.inventoryItemId));
                  return (
                    <div key={index} className="flex items-center gap-2 bg-surface p-2 rounded-md border border-border-grey">
                      <div className="flex-1">
                        <select
                          value={row.inventoryItemId}
                          onChange={(e) => handleInventoryRowChange(index, 'inventoryItemId', e.target.value)}
                          className="w-full text-xs rounded border border-border-grey px-2 py-1.5 bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {inventoryItemsList.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (Tồn: {item.quantityOnHand} {item.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24 flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleInventoryRowChange(index, 'quantity', e.target.value)}
                          className="w-14 text-xs rounded border border-border-grey px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="SL"
                          title="Số lượng trừ mỗi lần dùng dịch vụ"
                        />
                        <span className="text-[11px] text-on-surface-variant shrink-0">
                          {selectedItem?.unit || row.unit || 'cái'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInventoryRow(index)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-red-50 rounded transition-colors"
                        title="Xóa liên kết mặt hàng này"
                      >
                        <IoTrashOutline size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
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
