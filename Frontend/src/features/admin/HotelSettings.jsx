import React, { useState, useEffect } from 'react';
import hotelSettingApi from '../../services/hotelSettingApi';
import { Building, Mail, Phone, MapPin, Camera, Clock, LogIn, LogOut, CheckCircle, AlertCircle, Save, Info, ImagePlus, ZoomIn, X } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

import Modal from '../../components/ui/Modal';

const HotelSettings = () => {
  const [settings, setSettings] = useState({
    propertyName: '',
    address: '',
    phone: '',
    email: '',
    defaultCheckinTime: '14:00',
    defaultCheckoutTime: '12:00',
    homeImage: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await hotelSettingApi.getAdminSetting();
      if (data) {
        const { id, ...rest } = data;
        if (rest.defaultCheckinTime && rest.defaultCheckinTime.length > 5) {
          rest.defaultCheckinTime = rest.defaultCheckinTime.substring(0, 5);
        }
        if (rest.defaultCheckoutTime && rest.defaultCheckoutTime.length > 5) {
          rest.defaultCheckoutTime = rest.defaultCheckoutTime.substring(0, 5);
        }
        setSettings(rest);
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
      setMessage({ type: 'error', text: 'Không thể lấy cấu hình từ máy chủ.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleImageUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const { fileApi } = await import('../../services/fileApi');
        const res = await fileApi.uploadFile(e.target.files[0], setUploadProgress);
        setSettings(prev => ({ ...prev, homeImage: res.url }));
        if (errors.homeImage) setErrors(prev => ({ ...prev, homeImage: null }));
      } catch (err) {
        console.error('Upload failed', err);
        alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    setErrors({});

    if (settings.defaultCheckinTime >= settings.defaultCheckoutTime) {
      setErrors({ defaultCheckoutTime: 'Giờ trả phòng phải sau giờ nhận phòng' });
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        ...settings,
        defaultCheckinTime: settings.defaultCheckinTime.length === 5 ? `${settings.defaultCheckinTime}:00` : settings.defaultCheckinTime,
        defaultCheckoutTime: settings.defaultCheckoutTime.length === 5 ? `${settings.defaultCheckoutTime}:00` : settings.defaultCheckoutTime
      };

      await hotelSettingApi.updateSetting(payload);
      setMessage({ type: 'success', text: 'Cấu hình đã được lưu thành công!' });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to update settings', error);
      if (error.response && error.response.status === 400 && error.response.data) {
        setErrors(error.response.data);
        setMessage({ type: 'error', text: 'Vui lòng kiểm tra lại thông tin nhập.' });
      } else {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Lỗi khi cập nhật cấu hình.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden mb-12">
      <div className="p-6 border-b border-border-grey flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest">
        <div>
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <Building size={28} className="text-primary" />
            Cài đặt Khách sạn
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">Quản lý thông tin chung và quy định thời gian của cơ sở</p>
        </div>
        <Button onClick={handleSubmit} isLoading={isSaving} icon={Save} className="uppercase shrink-0 px-5 py-2.5">
          Lưu tất cả thay đổi
        </Button>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-10">

          {message.text && (
            <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm transition-all animate-fade-in ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-error border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <p className="font-body-md font-medium m-0">{message.text}</p>
            </div>
          )}

          {/* Thông tin cơ bản Section */}
          <section>
            <h3 className="font-title-lg text-primary flex items-center gap-2 mb-6 border-b border-border-grey pb-3">
              <Building size={24} strokeWidth={1.5} />
              Thông tin Khách sạn
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Hình ảnh đại diện */}
              <div className="md:col-span-2">
                <div className="relative w-full h-64 md:h-72 rounded-xl overflow-hidden border-2 border-dashed border-border-grey bg-surface-container-low group flex flex-col items-center justify-center transition-colors hover:border-primary/50">
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center w-full h-full gap-3">
                      <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div className="w-48">
                        <div className="w-full bg-surface-container rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <p className="text-xs text-center text-on-surface-variant mt-1">{uploadProgress}%</p>
                      </div>
                      <span className="font-label-md text-on-surface-variant">Đang tải lên Cloudinary...</span>
                    </div>
                  ) : settings.homeImage ? (
                    <>
                      <img src={settings.homeImage} alt="Cover" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/1200x400?text=Lỗi+Ảnh' }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => setIsPreviewOpen(true)}
                          className="bg-white/90 text-on-surface px-4 py-2.5 rounded-none font-label-md shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                        >
                          <ZoomIn size={20} strokeWidth={1.5} />
                          Xem ảnh lớn
                        </button>
                        <label className="cursor-pointer bg-primary text-on-primary px-4 py-2.5 rounded-none font-label-md shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                          <Camera size={20} strokeWidth={1.5} />
                          Đổi ảnh khác
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-primary transition-colors">
                      <div className="w-16 h-16 rounded-full bg-surface-blue-light text-primary flex items-center justify-center mb-3">
                        <ImagePlus size={32} strokeWidth={1.5} />
                      </div>
                      <span className="font-label-md">Tải ảnh lên</span>
                      <span className="text-xs mt-1 opacity-70">Khuyên dùng ảnh tỷ lệ 16:9 chất lượng cao</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
                {errors.homeImage && <p className="text-error text-xs mt-2">{errors.homeImage}</p>}
              </div>

              <div className="space-y-5">
                <Input label="Tên khách sạn" icon={Building} name="propertyName" value={settings.propertyName} onChange={handleChange} required placeholder="VD: StayGO Hotel" error={errors.propertyName} />
                <Input label="Email liên hệ" icon={Mail} type="email" name="email" value={settings.email} onChange={handleChange} required placeholder="contact@staygo.com" error={errors.email} />
              </div>

              <div className="space-y-5">
                <Input label="Số điện thoại" icon={Phone} name="phone" value={settings.phone} onChange={handleChange} required placeholder="0987654321" error={errors.phone} />
                <Input label="Địa chỉ đầy đủ" icon={MapPin} name="address" value={settings.address} onChange={handleChange} required placeholder="123 Đường ABC, Quận XYZ..." error={errors.address} />
              </div>
            </div>
          </section>

          {/* Quy định thời gian Section */}
          <section>
            <h3 className="font-title-lg text-primary flex items-center gap-2 mb-6 border-b border-border-grey pb-3">
              <Clock size={24} strokeWidth={1.5} />
              Quy định Thời gian
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input label="Giờ nhận phòng (Check-in)" icon={LogIn} type="time" name="defaultCheckinTime" value={settings.defaultCheckinTime} onChange={handleChange} required error={errors.defaultCheckinTime} />

              <div>
                <Input label="Giờ trả phòng (Check-out)" icon={LogOut} type="time" name="defaultCheckoutTime" value={settings.defaultCheckoutTime} onChange={handleChange} required error={errors.defaultCheckoutTime} />
                <p className="text-on-surface-variant text-[11px] mt-1.5 opacity-80 flex items-center gap-1">
                  <Info size={14} strokeWidth={1.5} />
                  Giờ trả phòng phải muộn hơn giờ nhận phòng
                </p>
              </div>
            </div>
          </section>
        </form>
      </div>

      {/* Image Preview Modal */}
      {settings.homeImage && (
        <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} maxWidth="max-w-5xl">
          <div className="relative flex justify-center items-center bg-surface-container-lowest">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
              title="Đóng"
            >
              <X size={20} />
            </button>
            <img src={settings.homeImage} alt="Cover Preview" className="max-w-full max-h-[80vh] object-contain rounded-md" />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HotelSettings;
