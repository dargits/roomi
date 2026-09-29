import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomTypeApi } from '../../services/roomTypeApi';
import { useAuth } from '../../context/AuthContext';
import { IoAddOutline, IoBedOutline, IoCashOutline, IoChevronDownOutline, IoCloseOutline, IoCloudUploadOutline, IoPencilOutline, IoTrashOutline, IoWarningOutline, IoTimeOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import RoomTypePricingConfig from '../rooms/RoomTypePricingConfig';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { RoomTypeResponse } from '../../types';

interface RoomTypeFormData {
  id: number | null;
  name: string;
  standardCapacity: number;
  maxCapacity: number;
  extraPersonChargePerNight: number;
  maxChildAgeFree: number;
  basePrice: number;
  amenitiesDescription: string;
  standardCheckoutCleaningMinutes: number;
  standardPeriodicCleaningMinutes: number;
  imageUrls: string[];
  active: boolean;
}

const RoomTypeManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<RoomTypeFormData>({
    id: null,
    name: '',
    standardCapacity: 2,
    maxCapacity: 2,
    extraPersonChargePerNight: 0,
    maxChildAgeFree: 6,
    basePrice: 0,
    amenitiesDescription: '',
    standardCheckoutCleaningMinutes: 45,
    standardPeriodicCleaningMinutes: 20,
    imageUrls: [],
    active: true
  });
  const [formError, setFormError] = useState<string>('');
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [expandedRoomTypeId, setExpandedRoomTypeId] = useState<number | null>(null);

  // Delete confirm state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<RoomTypeResponse | null>(null);

  const fetchRoomTypes = async () => {
    setLoading(true);
    try {
      const data = await roomTypeApi.getAllRoomTypes();
      setRoomTypes(data);
    } catch (error) {
      console.error("Failed to fetch room types", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
      fetchRoomTypes();
    }
  }, [user]);

  if (user?.role !== 'OWNER') {
    return <div className="p-6 text-alert-red bg-red-50 rounded-md">Bạn không có quyền truy cập trang này. Chỉ chủ sở hữu mới có quyền quản lý loại phòng.</div>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openAddModal = () => {
    setFormData({
      id: null,
      name: '',
      standardCapacity: 2,
      maxCapacity: 2,
      extraPersonChargePerNight: 0,
      maxChildAgeFree: 6,
      basePrice: 0,
      amenitiesDescription: '',
      standardCheckoutCleaningMinutes: 45,
      standardPeriodicCleaningMinutes: 20,
      imageUrls: [],
      active: true
    });
    setIsEditing(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (room: RoomTypeResponse) => {
    setFormData({
      id: room.id,
      name: room.name,
      standardCapacity: room.standardCapacity || 2,
      maxCapacity: room.maxCapacity,
      extraPersonChargePerNight: room.extraPersonChargePerNight || 0,
      maxChildAgeFree: room.maxChildAgeFree || 6,
      basePrice: room.basePrice,
      amenitiesDescription: room.amenitiesDescription || '',
      standardCheckoutCleaningMinutes: (room as any).standardCheckoutCleaningMinutes || 45,
      standardPeriodicCleaningMinutes: (room as any).standardPeriodicCleaningMinutes || 20,
      imageUrls: room.imageUrls || [],
      active: room.active
    });
    setIsEditing(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const { success: toastSuccess, error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (Number(formData.maxCapacity) < Number(formData.standardCapacity)) {
      setFormError('Sức chứa tối đa không được nhỏ hơn sức chứa tiêu chuẩn.');
      return;
    }
    if (Number(formData.extraPersonChargePerNight) < 0) {
      setFormError('Mức phụ thu thêm người không được là số âm.');
      return;
    }
    try {
      const payload = {
        ...formData,
        standardCapacity: Number(formData.standardCapacity),
        maxCapacity: Number(formData.maxCapacity),
        extraPersonChargePerNight: Number(formData.extraPersonChargePerNight),
        maxChildAgeFree: Number(formData.maxChildAgeFree),
        basePrice: Number(formData.basePrice),
        standardCheckoutCleaningMinutes: Number(formData.standardCheckoutCleaningMinutes) || 45,
        standardPeriodicCleaningMinutes: Number(formData.standardPeriodicCleaningMinutes) || 20
      };
      if (isEditing && formData.id) {
        await roomTypeApi.updateRoomType(formData.id, payload as any);
        toastSuccess(`Đã cập nhật loại phòng "${formData.name}" thành công!`);
      } else {
        await roomTypeApi.createRoomType(payload as any);
        toastSuccess(`Đã tạo loại phòng "${formData.name}" thành công!`);
      }
      setIsModalOpen(false);
      fetchRoomTypes();
    } catch (error: any) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const openDeleteModal = (room: RoomTypeResponse) => {
    setItemToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await roomTypeApi.deleteRoomType(itemToDelete.id);
      toastSuccess(`Đã xóa loại phòng "${itemToDelete.name}" thành công!`);
      setIsDeleteModalOpen(false);
      fetchRoomTypes();
    } catch (error: any) {
      console.error("Delete error", error);
      toastError(error.response?.data?.message || "Lỗi khi xóa loại phòng.");
    }
  };

  const formatPrice = (price?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-border-grey overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F2F6ED] text-[#4F5E37] flex items-center justify-center">
            <IoBedOutline size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-[#1A2411]">
              Quản lý Loại phòng & Cấu hình giá
            </h2>
            <p className="text-xs text-[#606D56]">Thiết lập các hạng phòng, giá tiêu chuẩn, phụ thu và bảng giá mùa</p>
          </div>
        </div>
        <Button variant="primary" onClick={openAddModal} icon={IoAddOutline} className="shrink-0">
          Thêm Loại phòng
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F9F5] border-b border-border-grey text-[11px] font-bold text-[#606D56] uppercase tracking-wider">
              <th className="p-4 w-14 text-center">ID</th>
              <th className="p-4">Ảnh</th>
              <th className="p-4">Tên loại phòng</th>
              <th className="p-4 text-center">Sức chứa (TC / TĐ)</th>
              <th className="p-4 text-right">Phụ thu thêm khách</th>
              <th className="p-4 text-right">Giá cơ bản</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4 text-center">Bảng giá</th>
              <th className="p-4 text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-grey text-xs">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <LoadingScreen message="Đang tải danh sách loại phòng..." />
                </td>
              </tr>
            ) : roomTypes.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-[#606D56]">Chưa có dữ liệu loại phòng.</td></tr>
            ) : (
              roomTypes.map(room => (
                <React.Fragment key={room.id}>
                  <tr className="hover:bg-[#F7F9F4] transition-colors group">
                    <td className="p-4 text-center text-[#606D56] font-mono">{room.id}</td>
                    <td className="p-4">
                      {room.imageUrls && room.imageUrls.length > 0 ? (
                        <img src={room.imageUrls[0]} alt={room.name} className="w-16 h-12 object-cover rounded-xl shadow-2xs border border-border-grey" />
                      ) : (
                        <div className="w-16 h-12 bg-[#F2F6ED] rounded-xl border border-border-grey flex items-center justify-center text-[#86967B] text-xs font-semibold">No img</div>
                      )}
                    </td>
                    <td className="p-4 group-hover:text-primary transition-colors">
                      <div className="font-bold text-sm text-[#1A2411]">{room.name}</div>
                      {room.maxChildAgeFree !== undefined && (
                        <div className="text-[11px] text-[#606D56] mt-0.5">Miễn phụ thu trẻ ≤ {room.maxChildAgeFree} tuổi</div>
                      )}
                      <div className="text-[10px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                        <span className="text-emerald-700 font-semibold" title="Định mức dọn sau trả phòng">⏱️ Khách trả: {(room as any).standardCheckoutCleaningMinutes || 45}p</span>
                        <span>•</span>
                        <span className="text-blue-700 font-semibold" title="Định mức dọn định kỳ">Định kỳ: {(room as any).standardPeriodicCleaningMinutes || 20}p</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F2F6ED] border border-border-grey text-[#4F5E37] font-bold text-xs">
                        {room.standardCapacity || 2} / {room.maxCapacity} người
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(room.extraPersonChargePerNight ?? 0) > 0 ? (
                        <span className="text-amber-800 font-bold">+{formatPrice(room.extraPersonChargePerNight)}/đêm</span>
                      ) : (
                        <span className="text-[#86967B] text-xs">0 ₫</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-sm text-[#1A2411]">{formatPrice(room.basePrice)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        room.active 
                          ? 'bg-[#EAF5CD] text-[#3F4F24] border border-[#D5EBA3]' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {room.active ? 'Hoạt động' : 'Tạm ẩn'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setExpandedRoomTypeId(expandedRoomTypeId === room.id ? null : room.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          expandedRoomTypeId === room.id
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'hover:bg-[#F2F6ED] border-border-grey text-[#1A2411] bg-white'
                        }`}
                        title="Cấu hình giá mùa, cuối tuần & ngày lễ"
                      >
                        <IoCashOutline size={14} />
                        <span>Giá</span>
                        <IoChevronDownOutline size={12} className={`transition-transform ${expandedRoomTypeId === room.id ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => openEditModal(room)}
                          className="w-8 h-8 rounded-xl hover:bg-[#F2F6ED] text-[#606D56] hover:text-primary transition-colors flex items-center justify-center border border-transparent hover:border-border-grey cursor-pointer"
                          title="Sửa"
                        >
                          <IoPencilOutline size={16} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(room)}
                          className="w-8 h-8 rounded-xl hover:bg-rose-50 text-[#606D56] hover:text-error transition-colors flex items-center justify-center border border-transparent hover:border-rose-200 cursor-pointer"
                          title="Xóa"
                        >
                          <IoTrashOutline size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expandable row for Unified Pricing Config */}
                  {expandedRoomTypeId === room.id && (
                    <tr className="bg-surface-container-low/20 border-b border-border-grey">
                      <td colSpan={9} className="px-6 pb-6 pt-2">
                        <RoomTypePricingConfig
                          roomTypeId={room.id}
                          roomTypeName={room.name}
                          basePrice={room.basePrice}
                          onClose={() => setExpandedRoomTypeId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Cập nhật loại phòng' : 'Thêm loại phòng mới'} maxWidth="max-w-2xl">
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
            {formError}
          </div>
        )}
        <form id="roomTypeForm" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <Input label="Tên loại phòng" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ví dụ: Phòng Tiêu Chuẩn Giường Đôi" />
            </div>
            
            <div>
              <Input 
                label="Sức chứa tiêu chuẩn (người)" 
                type="number" 
                name="standardCapacity" 
                required 
                min="1" 
                value={String(formData.standardCapacity)} 
                onChange={handleInputChange} 
                helperText="Số người chuẩn không tính phụ thu"
              />
            </div>
            
            <div>
              <Input 
                label="Sức chứa tối đa (người)" 
                type="number" 
                name="maxCapacity" 
                required 
                min={String(formData.standardCapacity || 1)} 
                value={String(formData.maxCapacity)} 
                onChange={handleInputChange} 
                helperText="Chặn nhận khách nếu vượt mức này"
              />
            </div>

            <div>
              <Input 
                label="Phụ thu thêm người (VNĐ/đêm)" 
                type="number" 
                name="extraPersonChargePerNight" 
                required 
                min="0" 
                step="any" 
                value={String(formData.extraPersonChargePerNight)} 
                onChange={handleInputChange} 
                helperText="Tính cho mỗi người vượt sức chứa tiêu chuẩn"
              />
            </div>

            <div>
              <Input 
                label="Tuổi tối đa trẻ em miễn phí" 
                type="number" 
                name="maxChildAgeFree" 
                required 
                min="0" 
                max="18" 
                value={String(formData.maxChildAgeFree)} 
                onChange={handleInputChange} 
                helperText="Trẻ em ≤ tuổi này không tính phụ thu"
              />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <Input label="Giá cơ bản (VNĐ/đêm)" type="number" name="basePrice" required min="0" step="any" value={String(formData.basePrice)} onChange={handleInputChange} />
            </div>

            <div className="col-span-1 md:col-span-2 p-3 bg-surface-container-low rounded-xl border border-border-grey space-y-2">
              <div className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <IoTimeOutline size={15} className="text-primary" />
                Định mức thời gian dọn buồng phòng
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Dọn sau khi khách trả (phút)"
                  type="number"
                  name="standardCheckoutCleaningMinutes"
                  min="5"
                  max="180"
                  value={String(formData.standardCheckoutCleaningMinutes || 45)}
                  onChange={handleInputChange}
                  helperText="Thay đồ vải, vệ sinh toàn diện & khử khuẩn (mặc định: 45p)"
                />
                <Input
                  label="Dọn định kỳ phòng trống (phút)"
                  type="number"
                  name="standardPeriodicCleaningMinutes"
                  min="5"
                  max="180"
                  value={String(formData.standardPeriodicCleaningMinutes || 20)}
                  onChange={handleInputChange}
                  helperText="Lau bụi, kiểm tra thiết bị định kỳ (mặc định: 20p)"
                />
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block font-label-md text-on-surface-variant mb-1.5">Mô tả tiện nghi</label>
              <textarea name="amenitiesDescription" rows={3} value={formData.amenitiesDescription} onChange={handleInputChange} className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-body-md text-on-surface" placeholder="Tivi, Máy lạnh, Bồn tắm..."></textarea>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block font-label-md text-on-surface-variant mb-1.5">Đường dẫn hình ảnh (URL)</label>
              <textarea 
                name="imageUrls" 
                rows={3} 
                value={formData.imageUrls.join('\n')} 
                onChange={(e) => setFormData(prev => ({...prev, imageUrls: e.target.value.split('\n').filter(url => url.trim() !== '')}))} 
                className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-body-md text-on-surface mb-2" 
                placeholder="Mỗi link ảnh một dòng (https://...)" 
              />
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-border-grey rounded-md transition-colors ${isUploadingImages ? 'opacity-50 pointer-events-none' : 'hover:bg-surface-container'}`}>
                  <IoCloudUploadOutline size={18} />
                  <span className="font-label-md text-sm">{isUploadingImages ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden"
                    disabled={isUploadingImages}
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setIsUploadingImages(true);
                        setUploadProgress(0);
                        try {
                          const { fileApi } = await import('../../services/fileApi');
                          const res = await fileApi.uploadMultipleFiles(Array.from(e.target.files), setUploadProgress);
                          setFormData(prev => ({...prev, imageUrls: [...prev.imageUrls, ...res.urls]}));
                        } catch (err) {
                          console.error('Upload failed', err);
                          toastError('Lỗi tải ảnh lên. Vui lòng thử lại.');
                        } finally {
                          setIsUploadingImages(false);
                          setUploadProgress(0);
                        }
                      }
                    }} 
                  />
                </label>
                {isUploadingImages && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1 bg-surface-container rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="text-xs text-on-surface-variant whitespace-nowrap">{uploadProgress}%</span>
                  </div>
                )}
              </div>
              
              {formData.imageUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded border border-border-grey overflow-hidden bg-surface-container-low shadow-sm">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Lỗi'; }} />
                      <button 
                        type="button"
                        onClick={() => {
                          const newUrls = [...formData.imageUrls];
                          newUrls.splice(idx, 1);
                          setFormData(prev => ({...prev, imageUrls: newUrls}));
                        }}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 flex items-center justify-center cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <IoCloseOutline size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="active" name="active" checked={formData.active} onChange={handleInputChange} className="w-4 h-4 text-primary border-border-grey rounded focus:ring-primary cursor-pointer" />
              <label htmlFor="active" className="font-body-md text-on-surface cursor-pointer">Đang hoạt động (Hiển thị cho khách hàng)</label>
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
          <Button type="submit" form="roomTypeForm">Lưu dữ liệu</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center pb-6">
          <div className="w-14 h-14 rounded-full bg-red-100 text-error flex items-center justify-center mb-5">
            <IoWarningOutline size={32} />
          </div>
          <h3 className="font-title-lg text-on-surface mb-2">Xóa loại phòng này?</h3>
          <p className="font-body-md text-on-surface-variant">Bạn có chắc chắn muốn xóa loại phòng <strong>{itemToDelete?.name}</strong> không? Hành động này không thể hoàn tác.</p>
        </div>
        <div className="flex gap-3 pt-6 border-t border-border-grey">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Hủy bỏ</Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Xóa cứng</Button>
        </div>
      </Modal>
    </div>
  );
};

export default RoomTypeManagement;
