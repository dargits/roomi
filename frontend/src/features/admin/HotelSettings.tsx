import React, { useState, useEffect } from 'react';
import hotelSettingApi from '../../services/hotelSettingApi';
import { IoAlertCircleOutline, IoBusinessOutline, IoCallOutline, IoCameraOutline, IoCheckmarkCircleOutline, IoCloseOutline, IoImageOutline, IoLocationOutline, IoLogInOutline, IoLogOutOutline, IoMailOutline, IoSaveOutline } from 'react-icons/io5';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { HotelSettingRequest } from '../../types';

const HotelSettings: React.FC = () => {
  const [settings, setSettings] = useState<HotelSettingRequest>({
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
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await hotelSettingApi.getAdminSetting();
      if (data) {
        const { id: _, ...rest } = data as any;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const { success: toastSuccess, error: toastError } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const { fileApi } = await import('../../services/fileApi');
        const res = await fileApi.uploadFile(e.target.files[0], setUploadProgress);
        setSettings(prev => ({ ...prev, homeImage: res.url }));
        if (errors.homeImage) setErrors(prev => ({ ...prev, homeImage: null }));
        toastSuccess('Tải ảnh đại diện khách sạn thành công!');
      } catch (err) {
        console.error('Upload failed', err);
        toastError('Lỗi tải ảnh lên. Vui lòng thử lại.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    setErrors({});

    if (
      settings.defaultCheckinTime &&
      settings.defaultCheckoutTime &&
      settings.defaultCheckinTime >= settings.defaultCheckoutTime
    ) {
      setErrors({ defaultCheckoutTime: 'Giờ trả phòng phải sau giờ nhận phòng' });
      setIsSaving(false);
      return;
    }

    try {
      const payload: HotelSettingRequest = {
        ...settings,
        defaultCheckinTime: settings.defaultCheckinTime && settings.defaultCheckinTime.length === 5 ? `${settings.defaultCheckinTime}:00` : settings.defaultCheckinTime,
        defaultCheckoutTime: settings.defaultCheckoutTime && settings.defaultCheckoutTime.length === 5 ? `${settings.defaultCheckoutTime}:00` : settings.defaultCheckoutTime
      };

      await hotelSettingApi.updateSetting(payload);
      toastSuccess('Cấu hình khách sạn đã được lưu thành công!');
      setMessage({ type: 'success', text: 'Cấu hình đã được lưu thành công!' });

      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      console.error('Failed to update settings', error);
      if (error.response && error.response.status === 400 && error.response.data) {
        setErrors(error.response.data);
        setMessage({ type: 'error', text: 'Vui lòng kiểm tra lại thông tin nhập.' });
      } else {
        toastError(error.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
        setMessage({ type: 'error', text: error.response?.data?.message || 'Lỗi khi cập nhật cấu hình.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Đang tải thông tin cấu hình..." />;
  }

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-border-grey flex items-center justify-between bg-surface-container-lowest">
        <div className="flex items-center gap-2">
          <IoBusinessOutline size={22} className="text-primary" />
          <h2 className="font-title-lg text-on-surface font-bold text-lg">
            Cấu hình Thông tin Khách sạn
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {message.text && (
          <div className={`p-4 rounded-md flex items-center gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-error border border-red-200'
          }`}>
            {message.type === 'success' ? <IoCheckmarkCircleOutline size={18} /> : <IoAlertCircleOutline size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-title-md text-on-surface font-semibold border-b border-border-grey pb-2">
              Thông tin Cơ bản
            </h3>
            
            <Input
              label="Tên khách sạn / cơ sở *"
              name="propertyName"
              value={settings.propertyName}
              onChange={handleChange}
              error={errors.propertyName || undefined}
              icon={IoBusinessOutline}
              required
            />

            <Input
              label="Địa chỉ *"
              name="address"
              value={settings.address}
              onChange={handleChange}
              error={errors.address || undefined}
              icon={IoLocationOutline}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Số điện thoại *"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                error={errors.phone || undefined}
                icon={IoCallOutline}
                required
              />

              <Input
                label="Email liên hệ *"
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                error={errors.email || undefined}
                icon={IoMailOutline}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-title-md text-on-surface font-semibold border-b border-border-grey pb-2">
              Thời gian Mặc định
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Giờ nhận phòng chuẩn *"
                type="time"
                name="defaultCheckinTime"
                value={settings.defaultCheckinTime || ''}
                onChange={handleChange}
                error={errors.defaultCheckinTime || undefined}
                icon={IoLogInOutline}
                required
              />

              <Input
                label="Giờ trả phòng chuẩn *"
                type="time"
                name="defaultCheckoutTime"
                value={settings.defaultCheckoutTime || ''}
                onChange={handleChange}
                error={errors.defaultCheckoutTime || undefined}
                icon={IoLogOutOutline}
                required
              />
            </div>

            <div className="pt-2">
              <h3 className="font-title-md text-on-surface font-semibold border-b border-border-grey pb-2 mb-3">
                Ảnh đại diện Khách sạn
              </h3>
              
              <div className="flex items-center gap-4">
                {settings.homeImage ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border-grey group">
                    <img 
                      src={settings.homeImage} 
                      alt="Hotel preview" 
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setIsPreviewOpen(true)}
                    />
                    <div 
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                      onClick={() => setIsPreviewOpen(true)}
                    >
                      <IoImageOutline size={20} />
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed border-border-grey flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-low">
                    <IoImageOutline size={24} />
                    <span className="text-xs mt-1">Chưa có ảnh</span>
                  </div>
                )}

                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-border-grey rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low cursor-pointer transition-colors shadow-xs">
                    <IoCameraOutline size={18} className="text-primary" />
                    <span>{isUploading ? 'Đang tải lên...' : 'Chọn ảnh mới'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-xs text-on-surface-variant mt-1">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border-grey flex justify-end">
          <Button
            type="submit"
            variant="primary"
            icon={IoSaveOutline}
            isLoading={isSaving}
          >
            Lưu thay đổi
          </Button>
        </div>
      </form>

      {/* Modal xem trước ảnh */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Ảnh đại diện Khách sạn"
        maxWidth="max-w-2xl"
      >
        <div className="flex justify-center p-2">
          <img 
            src={settings.homeImage} 
            alt="Hotel Full Preview" 
            className="max-h-[70vh] object-contain rounded-lg shadow-sm"
          />
        </div>
      </Modal>
    </div>
  );
};

export default HotelSettings;
