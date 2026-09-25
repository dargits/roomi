import React, { useState, useEffect } from 'react';
import hotelSettingApi from '../../services/hotelSettingApi';
import roomApi from '../../services/roomApi';
import { 
  IoAlertCircleOutline, 
  IoBusinessOutline, 
  IoCallOutline, 
  IoCameraOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseOutline, 
  IoImageOutline, 
  IoLocationOutline, 
  IoLogInOutline, 
  IoLogOutOutline, 
  IoMailOutline, 
  IoNotificationsOutline, 
  IoSaveOutline, 
  IoTimeOutline,
  IoBrushOutline,
  IoSparklesOutline,
  IoRefreshOutline,
  IoCalendarOutline,
  IoKeyOutline,
  IoEyeOutline,
  IoEyeOffOutline
} from 'react-icons/io5';
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
    homeImage: '',
    reminderEmailEnabled: true,
    reminderMorningTime: '10:30',
    periodicCleaningEnabled: true,
    periodicCleaningDays: 5,
    sessionTimeoutMinutes: 120,
    publicInvoiceLookupEnabled: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [, setUploadProgress] = useState(0);

  // === Google API Keys state ===
  const [googleApiKeys, setGoogleApiKeys] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchGoogleApiKeys();
  }, []);

  const fetchGoogleApiKeys = async () => {
    try {
      const data = await hotelSettingApi.getGoogleApiKeys();
      setGoogleApiKeys(data.googleApiKeys || '');
    } catch (err) {
      console.error('Failed to fetch Google API Keys', err);
    }
  };

  const handleSaveGoogleApiKeys = async () => {
    setIsSavingKeys(true);
    try {
      await hotelSettingApi.updateGoogleApiKeys(googleApiKeys);
      toastSuccess('Đã lưu Google API Key thành công!');
      await fetchGoogleApiKeys();
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Lỗi khi lưu Google API Key.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const getKeyCount = () => {
    return googleApiKeys.split('\n').map(k => k.trim()).filter(k => k.length > 0).length;
  };

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
        rest.reminderEmailEnabled = rest.reminderEmailEnabled !== false;
        rest.reminderMorningTime = rest.reminderMorningTime || '10:30';
        rest.periodicCleaningEnabled = rest.periodicCleaningEnabled !== false;
        rest.periodicCleaningDays = rest.periodicCleaningDays || 5;
        rest.sessionTimeoutMinutes = rest.sessionTimeoutMinutes || 120;
        rest.publicInvoiceLookupEnabled = rest.publicInvoiceLookupEnabled !== false;
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
        defaultCheckoutTime: settings.defaultCheckoutTime && settings.defaultCheckoutTime.length === 5 ? `${settings.defaultCheckoutTime}:00` : settings.defaultCheckoutTime,
        reminderMorningTime: settings.reminderMorningTime && settings.reminderMorningTime.length === 5 ? `${settings.reminderMorningTime}:00` : settings.reminderMorningTime,
        periodicCleaningEnabled: settings.periodicCleaningEnabled !== false,
        periodicCleaningDays: Number(settings.periodicCleaningDays) || 5,
        sessionTimeoutMinutes: Number(settings.sessionTimeoutMinutes) || 120,
        maxConcurrentSessions: Number(settings.maxConcurrentSessions) >= 0 ? Number(settings.maxConcurrentSessions) : 0,
        maxSessionLifetimeHours: Number(settings.maxSessionLifetimeHours) || 24,
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

  const handleScanPeriodicCleaning = async () => {
    setIsScanning(true);
    try {
      const res = await roomApi.scanPeriodicCleaning();
      toastSuccess(res.message || 'Quét phòng trống định kỳ thành công!');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi quét phòng trống.');
    } finally {
      setIsScanning(false);
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

        {/* Cấu hình tự động gửi email nhắc nhận phòng */}
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center justify-between border-b border-border-grey pb-3">
            <div className="flex items-center gap-2">
              <IoMailOutline size={20} className="text-primary" />
              <div>
                <h3 className="font-title-md text-on-surface font-semibold">
                  Tự động gửi Email nhắc nhận phòng (1 ngày trước)
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Gửi email thông báo lịch trình & lưu ý nhận phòng cho khách hàng trước ngày đến.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.reminderEmailEnabled ?? true} 
                onChange={(e) => setSettings(prev => ({ ...prev, reminderEmailEnabled: e.target.checked }))}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {settings.reminderEmailEnabled && (
            <div className="space-y-4 pt-1">
              <Input
                label="Giờ gửi nhắc buổi sáng *"
                type="time"
                name="reminderMorningTime"
                value={settings.reminderMorningTime || '10:30'}
                onChange={handleChange}
                error={errors.reminderMorningTime || undefined}
                icon={IoTimeOutline}
                helperText="Hệ thống quét và gửi nhắc cho các khách check-in vào ngày hôm sau"
                required
              />

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <IoNotificationsOutline size={15} /> Cơ chế hoạt động:
                </div>
                <div>• Hệ thống tự động gửi email 1 lần/ngày vào buổi sáng theo khung giờ đã đặt ở trên.</div>
                <div>• Chỉ gửi cho các đặt phòng có ngày nhận phòng là <strong>ngày mai</strong>.</div>
                <div>• Mỗi đặt phòng chỉ nhận email <strong>1 lần duy nhất</strong>, các ngày lưu trú tiếp theo sẽ không gửi mail lặp lại.</div>
              </div>
            </div>
          )}
        </div>

        {/* Cấu hình lịch dọn định kỳ cho phòng trống dài ngày */}
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center justify-between border-b border-border-grey pb-3">
            <div className="flex items-center gap-2">
              <IoSparklesOutline size={20} className="text-primary" />
              <div>
                <h3 className="font-title-md text-on-surface font-semibold">
                  Lịch dọn định kỳ cho phòng trống dài ngày
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Tự động chuyển phòng trống lâu ngày sang trạng thái Cần dọn (DIRTY) để tránh bụi bẩn khi bất ngờ có khách nhận phòng.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.periodicCleaningEnabled ?? true} 
                onChange={(e) => setSettings(prev => ({ ...prev, periodicCleaningEnabled: e.target.checked }))}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {settings.periodicCleaningEnabled && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#586650] uppercase tracking-wider mb-1.5">
                  Số ngày không có khách để chuyển sang Cần dọn <span className="text-error">*</span>
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <IoCalendarOutline size={18} strokeWidth={1.5} className="text-[#606D56]" />
                    </div>
                    <input
                      type="number"
                      name="periodicCleaningDays"
                      min={1}
                      max={90}
                      value={settings.periodicCleaningDays !== undefined ? String(settings.periodicCleaningDays) : '5'}
                      onChange={handleChange}
                      className={`w-full h-[42px] py-2.5 pl-10 pr-4 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47] outline-none text-sm text-[#1A2411] placeholder:text-[#8E9B86] transition-all ${
                        errors.periodicCleaningDays ? 'border-error focus:ring-error/20 focus:border-error' : 'hover:border-[#CCD8C2]'
                      }`}
                      required
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    icon={IoRefreshOutline}
                    onClick={handleScanPeriodicCleaning}
                    isLoading={isScanning}
                    className="h-[42px] px-4 text-xs font-bold rounded-xl shrink-0 inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-2xs hover:bg-[#F2F6EC]"
                  >
                    Quét phòng trống ngay
                  </Button>
                </div>

                {errors.periodicCleaningDays ? (
                  <p className="text-error text-xs mt-1.5 font-medium">{errors.periodicCleaningDays}</p>
                ) : (
                  <p className="text-[#606D56] text-xs mt-1.5">
                    Sau số ngày này không có khách, phòng sẽ tự động chuyển sang Cần dọn
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <IoBrushOutline size={15} /> Cơ chế hoạt động:
                </div>
                <div>• Hệ thống tự động theo dõi số ngày phòng ở trạng thái <strong>Sẵn sàng (AVAILABLE)</strong> kể từ lần dọn sạch gần nhất.</div>
                <div>• Nếu phòng để trống từ <strong>{settings.periodicCleaningDays || 5} ngày</strong> trở lên không có khách, hệ thống tự động đưa vào danh sách <strong>Cần dọn</strong> với nhãn <strong>Dọn định kỳ</strong>.</div>
                <div>• Giúp cơ sở lưu trú luôn chủ động vệ sinh sạch bụi bẩn, ga gối thơm tho để đón khách bất ngờ hoặc khách đặt gấp trong ngày.</div>
              </div>
            </div>
          )}
        </div>

        {/* Cấu hình chính sách phiên đăng nhập & thời gian chờ (NCL-10-CN-007) */}
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center gap-2 border-b border-border-grey pb-3">
            <IoKeyOutline size={20} className="text-primary" />
            <div>
              <h3 className="font-title-md text-on-surface font-semibold">
                Chính sách Phiên đăng nhập & Bảo mật tài khoản
              </h3>
              <p className="text-xs text-on-surface-variant">
                Cấu hình thời gian chờ không thao tác, giới hạn thiết bị đăng nhập đồng thời và thời hạn tối đa của phiên.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-stretch">
            <Input
              label="Thời gian chờ không thao tác (phút) *"
              labelClassName="min-h-[32px] sm:min-h-[36px] flex items-start"
              helperTextClassName="min-h-[32px] sm:min-h-[36px]"
              containerClassName="flex flex-col justify-between h-full"
              type="number"
              name="sessionTimeoutMinutes"
              min={5}
              max={1440}
              value={settings.sessionTimeoutMinutes !== undefined ? String(settings.sessionTimeoutMinutes) : '120'}
              onChange={handleChange}
              error={errors.sessionTimeoutMinutes || undefined}
              icon={IoTimeOutline}
              helperText="Mặc định: 120 phút. Tự động kết thúc khi treo máy."
              required
            />

            <Input
              label="Số phiên đồng thời tối đa *"
              labelClassName="min-h-[32px] sm:min-h-[36px] flex items-start"
              helperTextClassName="min-h-[32px] sm:min-h-[36px]"
              containerClassName="flex flex-col justify-between h-full"
              type="number"
              name="maxConcurrentSessions"
              min={0}
              max={50}
              value={settings.maxConcurrentSessions !== undefined ? String(settings.maxConcurrentSessions) : '0'}
              onChange={handleChange}
              error={errors.maxConcurrentSessions || undefined}
              icon={IoKeyOutline}
              helperText="0 = Không giới hạn. 1 = Chỉ 1 thiết bị (đăng nhập mới tự hủy phiên cũ)."
              required
            />

            <Input
              label="Thời hạn tối đa của phiên (giờ) *"
              labelClassName="min-h-[32px] sm:min-h-[36px] flex items-start"
              helperTextClassName="min-h-[32px] sm:min-h-[36px]"
              containerClassName="flex flex-col justify-between h-full"
              type="number"
              name="maxSessionLifetimeHours"
              min={1}
              max={720}
              value={settings.maxSessionLifetimeHours !== undefined ? String(settings.maxSessionLifetimeHours) : '24'}
              onChange={handleChange}
              error={errors.maxSessionLifetimeHours || undefined}
              icon={IoTimeOutline}
              helperText="Mặc định: 24 giờ. Hết hạn phiên tuyệt đối."
              required
            />
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <IoKeyOutline size={15} /> Cơ chế kiểm soát phiên:
            </div>
            <div>• <strong>Chế độ 1 phiên duy nhất (Giá trị = 1):</strong> Nếu bật tính năng này, khi nhân viên đăng nhập trên máy tính hoặc điện thoại mới, phiên cũ sẽ tự động bị thu hồi ngay lập tức kèm thông báo lý do rõ ràng.</div>
            <div>• <strong>Thời gian chờ (Timeout):</strong> Nếu nhân viên rời khỏi quầy quá số phút quy định không có thao tác chuột/bàn phím, hệ thống tự động khóa phiên để ngăn chặn truy cập trái phép.</div>
            <div>• <strong>Thời hạn tối đa:</strong> Bắt buộc làm mới xác thực sau khoảng thời gian này kể từ khi đăng nhập.</div>
          </div>
        </div>

        {/* NCL-09-CN-008: Cấu hình Cổng tra cứu hóa đơn trực tuyến */}
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center gap-2 border-b border-border-grey pb-3">
            <IoSparklesOutline size={20} className="text-primary" />
            <div>
              <h3 className="font-title-md text-on-surface font-semibold">
                Cổng Tra Cứu Hóa Đơn Trực Tuyến Cho Khách (NCL-09-CN-008)
              </h3>
              <p className="text-xs text-on-surface-variant">
                Quyết định việc cho phép khách lưu trú tự xem và tải hóa đơn của mình qua liên kết hoặc mã đặt phòng.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-border-grey">
            <div className="space-y-1">
              <span className="text-sm font-bold text-on-surface">Cho phép khách xem & tải hóa đơn trực tuyến</span>
              <p className="text-xs text-on-surface-variant max-w-xl">
                Khi bật, khách có thể dùng mã đặt phòng và số điện thoại đã đăng ký để xem và tải bản in hóa đơn thanh toán trực tuyến. Khi tắt, chức năng này sẽ tạm khóa để bảo mật theo chính sách nội bộ.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                name="publicInvoiceLookupEnabled"
                checked={settings.publicInvoiceLookupEnabled !== false}
                onChange={(e) => setSettings(prev => ({ ...prev, publicInvoiceLookupEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* === Cấu hình Google AI API Keys === */}
        <div className="bg-surface-container-lowest p-5 rounded-lg border border-border-grey space-y-4">
          <div className="flex items-center gap-2 border-b border-border-grey pb-3">
            <IoSparklesOutline size={20} className="text-primary" />
            <div className="flex-1">
              <h3 className="font-title-md text-on-surface font-semibold">
                Google AI API Keys
              </h3>
              <p className="text-xs text-on-surface-variant">
                Nhập các Google API Key dùng cho tính năng AI. Mỗi key trên một dòng.
              </p>
            </div>
            {getKeyCount() > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                <IoKeyOutline size={12} />
                {getKeyCount()} key
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="relative">
              <textarea
                id="google-api-keys-textarea"
                value={showKeys ? googleApiKeys : googleApiKeys.replace(/[A-Za-z0-9_\-]{10,}/g, (m) => m.slice(0, 8) + '••••••••')}
                onChange={(e) => setGoogleApiKeys(e.target.value)}
                onFocus={() => setShowKeys(true)}
                onBlur={() => setShowKeys(false)}
                rows={Math.max(3, getKeyCount() + 1)}
                placeholder={"AIzaSy...key1\nAIzaSy...key2\nAIzaSy...key3"}
                spellCheck={false}
                className="w-full font-mono text-sm bg-surface-container-low border border-border-grey rounded-lg px-4 py-3 pr-12 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKeys(v => !v)}
                className="absolute right-3 top-3 text-on-surface-variant hover:text-primary transition-colors"
                title={showKeys ? 'Ẩn key' : 'Hiện key'}
              >
                {showKeys ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">
                {getKeyCount() > 0
                  ? `Hiện có ${getKeyCount()} key. Hệ thống sẽ xoay vòng key khi gọi AI.`
                  : 'Chưa có key nào. Tính năng AI sẽ không hoạt động.'}
              </p>
              <Button
                type="button"
                variant="primary"
                icon={IoSaveOutline}
                isLoading={isSavingKeys}
                onClick={handleSaveGoogleApiKeys}
                size="sm"
              >
                Lưu API Keys
              </Button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <IoAlertCircleOutline size={14} /> Lưu ý bảo mật:
              </div>
              <div>• Không chia sẻ API Key với người khác. Key được lưu mã hóa trong cơ sở dữ liệu.</div>
              <div>• Mỗi key trên một dòng riêng. Dòng trống sẽ tự động bỏ qua khi lưu.</div>
              <div>• Lấy key tại <strong>console.cloud.google.com</strong> → APIs &amp; Services → Credentials.</div>
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
