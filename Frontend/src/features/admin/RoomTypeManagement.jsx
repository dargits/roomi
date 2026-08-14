import React, { useState, useEffect } from 'react';
import { roomTypeApi } from '../../services/roomTypeApi';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, X, Upload, AlertTriangle, Bed } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
const RoomTypeManagement = () => {
  const { user } = useAuth();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    maxCapacity: 1,
    basePrice: 0,
    amenitiesDescription: '',
    imageUrls: [],
    active: true
  });
  const [formError, setFormError] = useState('');
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Delete confirm state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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
    if (user?.role === 'OWNER') {
      fetchRoomTypes();
    }
  }, [user]);

  if (user?.role !== 'OWNER') {
    return <div className="p-6 text-alert-red bg-red-50 rounded-md">Bạn không có quyền truy cập trang này. Chỉ chủ sở hữu (OWNER) mới có quyền quản lý loại phòng.</div>;
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openAddModal = () => {
    setFormData({ id: null, name: '', maxCapacity: 1, basePrice: 0, amenitiesDescription: '', imageUrls: [], active: true });
    setIsEditing(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setFormData({
      id: room.id,
      name: room.name,
      maxCapacity: room.maxCapacity,
      basePrice: room.basePrice,
      amenitiesDescription: room.amenitiesDescription,
      imageUrls: room.imageUrls || [],
      active: room.active
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
        await roomTypeApi.updateRoomType(formData.id, formData);
      } else {
        await roomTypeApi.createRoomType(formData);
      }
      setIsModalOpen(false);
      fetchRoomTypes();
    } catch (error) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const openDeleteModal = (room) => {
    setItemToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await roomTypeApi.deleteRoomType(itemToDelete.id);
      setIsDeleteModalOpen(false);
      fetchRoomTypes();
    } catch (error) {
      console.error("Delete error", error);
      alert(error.response?.data?.message || "Lỗi khi xóa loại phòng.");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="p-6 border-b border-border-grey flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest">
        <div>
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <Bed size={28} className="text-primary" /> 
            Quản lý Loại phòng
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">Danh sách phân hạng phòng và cấu hình tiện nghi</p>
        </div>
        <Button onClick={openAddModal} icon={Plus} className="uppercase px-5 py-2.5">
          Thêm Loại phòng
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b-2 border-border-grey font-label-md text-on-surface-variant uppercase tracking-wider">
              <th className="p-4 w-16 text-center font-semibold">ID</th>
              <th className="p-4 font-semibold">Ảnh</th>
              <th className="p-4 font-semibold">Tên loại phòng</th>
              <th className="p-4 text-right font-semibold">Sức chứa</th>
              <th className="p-4 text-right font-semibold">Giá cơ bản</th>
              <th className="p-4 text-center font-semibold">Trạng thái</th>
              <th className="p-4 text-center w-32 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-on-surface-variant">Đang tải dữ liệu...</td></tr>
            ) : roomTypes.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-on-surface-variant">Chưa có dữ liệu loại phòng.</td></tr>
            ) : (
              roomTypes.map(room => (
                <tr key={room.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                  <td className="p-4 text-center text-on-surface-variant font-body-sm">{room.id}</td>
                  <td className="p-4">
                    {room.imageUrls && room.imageUrls.length > 0 ? (
                      <img src={room.imageUrls[0]} alt={room.name} className="w-16 h-12 object-cover rounded shadow-sm border border-border-grey" />
                    ) : (
                      <div className="w-16 h-12 bg-surface-container rounded flex items-center justify-center text-outline text-xs">No img</div>
                    )}
                  </td>
                  <td className="p-4 font-title-sm text-on-surface group-hover:text-primary transition-colors">{room.name}</td>
                  <td className="p-4 text-right font-body-md">{room.maxCapacity} người</td>
                  <td className="p-4 text-right font-body-md text-primary font-semibold">{formatPrice(room.basePrice)}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-label-md ${room.active ? 'bg-surface-container border border-border-grey text-green-600' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {room.active ? 'Hoạt động' : 'Tạm ẩn'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(room)}
                        className="text-primary p-1.5 rounded-md hover:bg-surface-blue-light hover:shadow-sm transition-all"
                        title="Sửa"
                      >
                        <Edit size={20} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(room)}
                        className="text-error p-1.5 rounded-md hover:bg-red-50 hover:shadow-sm transition-all"
                        title="Xóa"
                      >
                        <Trash2 size={20} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
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
              <Input label="Tên loại phòng" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ví dụ: Deluxe Double" />
            </div>
            
            <div>
              <Input label="Sức chứa tối đa (người)" type="number" name="maxCapacity" required min="1" value={formData.maxCapacity} onChange={handleInputChange} />
            </div>
            
            <div>
              <Input label="Giá cơ bản (VNĐ)" type="number" name="basePrice" required min="0" step="1000" value={formData.basePrice} onChange={handleInputChange} />
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block font-label-md text-on-surface-variant mb-1.5">Mô tả tiện nghi</label>
              <textarea name="amenitiesDescription" rows="3" value={formData.amenitiesDescription} onChange={handleInputChange} className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-body-md text-on-surface" placeholder="Tivi, Máy lạnh, Bồn tắm..."></textarea>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block font-label-md text-on-surface-variant mb-1.5">Link ảnh (URLs)</label>
              <textarea 
                name="imageUrls" 
                rows="3" 
                value={formData.imageUrls.join('\n')} 
                onChange={(e) => setFormData(prev => ({...prev, imageUrls: e.target.value.split('\n').filter(url => url.trim() !== '')}))} 
                className="w-full px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm font-body-md text-on-surface mb-2" 
                placeholder="Mỗi link ảnh một dòng (https://...)" 
              />
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-border-grey rounded-md transition-colors ${isUploadingImages ? 'opacity-50 pointer-events-none' : 'hover:bg-surface-container'}`}>
                  <Upload size={18} strokeWidth={1.5} />
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
                          const res = await fileApi.uploadMultipleFiles(e.target.files, setUploadProgress);
                          setFormData(prev => ({...prev, imageUrls: [...prev.imageUrls, ...res.urls]}));
                        } catch (err) {
                          console.error('Upload failed', err);
                          alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
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
                      <img src={url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=Lỗi' }} />
                      <button 
                        type="button"
                        onClick={() => {
                          const newUrls = [...formData.imageUrls];
                          newUrls.splice(idx, 1);
                          setFormData(prev => ({...prev, imageUrls: newUrls}));
                        }}
                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 flex items-center justify-center"
                        title="Xóa ảnh"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="active" name="active" checked={formData.active} onChange={handleInputChange} className="w-4 h-4 text-primary border-border-grey rounded focus:ring-primary" />
              <label htmlFor="active" className="font-body-md text-on-surface cursor-pointer">Đang hoạt động (Hiển thị cho khách hàng)</label>
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
          <Button type="submit" form="roomTypeForm">Lưu dữ liệu</Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center pb-6">
          <div className="w-14 h-14 rounded-full bg-red-100 text-error flex items-center justify-center mb-5">
            <AlertTriangle size={32} strokeWidth={1.5} />
          </div>
          <h3 className="font-title-lg text-on-surface mb-2">Xóa loại phòng này?</h3>
          <p className="font-body-md text-on-surface-variant">Bạn có chắc chắn muốn xóa loại phòng <strong>{itemToDelete?.name}</strong> không? Hành động này không thể hoàn tác.</p>
        </div>
        <div className="flex gap-3 pt-6 border-t border-border-grey">
          <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Hủy bỏ</Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Xóa cứng</Button>
        </div>
      </Modal>
    </div>
  );
};

export default RoomTypeManagement;
