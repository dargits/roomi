import React, { useState, useEffect } from 'react';
import hotelSettingApi from '../../services/hotelSettingApi';
import roomApi from '../../services/roomApi';
import {
  IoAlertCircleOutline,
  IoBusinessOutline,
  IoCallOutline,
  IoCameraOutline,
  IoCheckmarkCircleOutline,
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
  IoEyeOffOutline,
  IoShieldCheckmarkOutline,
  IoReceiptOutline,
  IoPaperPlaneOutline,
  IoInformationCircleOutline
} from 'react-icons/io5';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { HotelSettingRequest } from '../../types';
import ConcurrentSessionControl from './ConcurrentSessionControl';

type SettingTabType = 'general' | 'security' | 'operations' | 'telegram';

interface TabItem {
  id: SettingTabType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const SETTING_TABS: TabItem[] = [
  {
    id: 'general',
    label: 'Thông tin cơ sở & Nhận diện',
    icon: IoBusinessOutline,
    description: 'Tên khách sạn, thông tin liên hệ, giờ nhận/trả phòng & ảnh đại diện'
  },
  {
    id: 'security',
    label: 'Bảo mật & Phiên đăng nhập',
    icon: IoShieldCheckmarkOutline,
    description: 'Chính sách phiên đăng nhập đồng thời, thời gian chờ timeout & Google AI Key'
  },
  {
    id: 'operations',
    label: 'Vận hành & Dịch vụ',
    icon: IoSparklesOutline,
    description: 'Lịch dọn định kỳ phòng trống, email nhắc nhận phòng & tra cứu hóa đơn'
  },
  {
    id: 'telegram',
    label: 'Telegram Bot & Sao lưu',
    icon: IoPaperPlaneOutline,
    description: 'Chỉ định tài khoản Telegram nhận bản sao lưu CSDL & thông báo hệ thống'
  }
];

const HotelSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingTabType>('general');
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
    maxConcurrentSessions: 0,
    maxSessionLifetimeHours: 24,
    publicInvoiceLookupEnabled: true,
    telegramBotToken: '',
    telegramChatIds: '6865922651',
    telegramBackupEnabled: true
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

  // === Telegram Bot state ===
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);

  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await hotelSettingApi.testTelegram();
      const msg = res.message || 'Đã gửi thông báo thử nghiệm thành công tới Telegram!';
      if (msg.includes('Thất bại:')) {
        toastWarning(msg);
      } else {
        toastSuccess(msg);
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Không thể gửi tin nhắn thử nghiệm tới Telegram.');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const parsedChatIds = (settings.telegramChatIds || '')
    .split(/[\r\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

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
        rest.maxConcurrentSessions = rest.maxConcurrentSessions !== undefined ? rest.maxConcurrentSessions : 0;
        rest.maxSessionLifetimeHours = rest.maxSessionLifetimeHours || 24;
        rest.publicInvoiceLookupEnabled = rest.publicInvoiceLookupEnabled !== false;
        rest.telegramBotToken = rest.telegramBotToken || '';
        rest.telegramChatIds = rest.telegramChatIds || '6865922651';
        rest.telegramBackupEnabled = rest.telegramBackupEnabled !== false;
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
    return <LoadingScreen message="Đang tải thông tin cấu hình khách sạn..." />;
  }

  const currentTabObj = SETTING_TABS.find(t => t.id === activeTab) || SETTING_TABS[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        icon={IoBusinessOutline}
        title="Cài Đặt Khách Sạn"
        subtitle="Quản lý thông tin thương hiệu, chính sách bảo mật phiên làm việc và quy chuẩn vận hành buồng phòng"
      />

      {/* Tabs Chuyên Mục Hiện Đại */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-bright p-2 rounded-2xl border border-border-grey shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          {SETTING_TABS.map((tab) => {
            const isTabActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isTabActive
                    ? 'bg-surface-bright text-primary font-bold shadow-xs border border-border-grey/80'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50'
                }`}
              >
                <TabIcon className={isTabActive ? 'text-primary' : 'text-on-surface-variant'} size={18} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thông báo kết quả lưu */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2.5 text-sm animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-error border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <IoCheckmarkCircleOutline size={20} className="text-emerald-600 shrink-0" />
          ) : (
            <IoAlertCircleOutline size={20} className="text-red-600 shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: THÔNG TIN CƠ SỞ & NHẬN DIỆN */}
        {/* ========================================================================= */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Card 1: Thông tin liên hệ cơ bản */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-border-grey pb-3">
                <IoBusinessOutline size={20} className="text-primary" />
                <div>
                  <h3 className="font-title-md text-on-surface font-bold">Thông tin Thương hiệu & Liên hệ</h3>
                  <p className="text-xs text-on-surface-variant">Thông tin hiển thị trên website đặt phòng, phiếu xác nhận và hóa đơn</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Tên khách sạn / Cơ sở lưu trú *"
                  name="propertyName"
                  value={settings.propertyName}
                  onChange={handleChange}
                  error={errors.propertyName || undefined}
                  icon={IoBusinessOutline}
                  placeholder="Ví dụ: Khách sạn Stay Away Luxury"
                  required
                />

                <Input
                  label="Địa chỉ cơ sở *"
                  name="address"
                  value={settings.address}
                  onChange={handleChange}
                  error={errors.address || undefined}
                  icon={IoLocationOutline}
                  placeholder="Số nhà, tên đường, phường/xã, tỉnh/thành phố"
                  required
                />

                <Input
                  label="Số điện thoại liên hệ *"
                  name="phone"
                  value={settings.phone}
                  onChange={handleChange}
                  error={errors.phone || undefined}
                  icon={IoCallOutline}
                  placeholder="Ví dụ: 0365224245"
                  required
                />

                <Input
                  label="Email đại diện *"
                  type="email"
                  name="email"
                  value={settings.email}
                  onChange={handleChange}
                  error={errors.email || undefined}
                  icon={IoMailOutline}
                  placeholder="Ví dụ: lienhe@stayaway.vn"
                  required
                />
              </div>
            </div>

            {/* Card 2: Khung giờ nhận/trả phòng & Ảnh đại diện */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Giờ nhận/trả phòng */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-border-grey pb-3">
                  <IoTimeOutline size={20} className="text-primary" />
                  <div>
                    <h3 className="font-title-md text-on-surface font-bold">Khung Giờ Mặc Định</h3>
                    <p className="text-xs text-on-surface-variant">Giờ nhận và trả phòng tiêu chuẩn cho khách đặt phòng</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Input
                    label="Giờ nhận phòng chuẩn *"
                    type="time"
                    name="defaultCheckinTime"
                    value={settings.defaultCheckinTime || ''}
                    onChange={handleChange}
                    error={errors.defaultCheckinTime || undefined}
                    icon={IoLogInOutline}
                    helperText="Mặc định: 14:00"
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
                    helperText="Mặc định: 12:00"
                    required
                  />
                </div>

                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-on-surface-variant space-y-1">
                  <div className="font-semibold text-primary flex items-center gap-1">
                    <IoTimeOutline size={14} /> Quy tắc thời gian:
                  </div>
                  <div>• Khách nhận phòng trước giờ quy định hoặc trả phòng sau giờ quy định sẽ tự động áp dụng phụ thu theo bảng giá dịch vụ nếu có.</div>
                </div>
              </div>

              {/* Ảnh đại diện cơ sở */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-border-grey pb-3">
                  <IoImageOutline size={20} className="text-primary" />
                  <div>
                    <h3 className="font-title-md text-on-surface font-bold">Ảnh Đại Diện Khách Sạn</h3>
                    <p className="text-xs text-on-surface-variant">Hình ảnh hiển thị trên cổng đặt phòng và trang chủ</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {settings.homeImage ? (
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-border-grey group shadow-xs">
                      <img
                        src={settings.homeImage}
                        alt="Hotel preview"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setIsPreviewOpen(true)}
                      />
                      <div
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                        onClick={() => setIsPreviewOpen(true)}
                        title="Xem ảnh phóng to"
                      >
                        <IoImageOutline size={24} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-2xl border border-dashed border-border-grey flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-low">
                      <IoImageOutline size={28} className="opacity-40 mb-1" />
                      <span className="text-xs">Chưa có ảnh</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-border-grey rounded-xl text-xs font-bold text-on-surface bg-white hover:bg-surface-container-low cursor-pointer transition-colors shadow-2xs">
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
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Định dạng hỗ trợ: JPG, PNG, WEBP. Kích thước khuyến nghị tối thiểu 800x600px, dung lượng tối đa 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BẢO MẬT & PHIÊN ĐĂNG NHẬP */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Card 1: Chính sách Phiên đăng nhập & Bảo mật (ĐÃ THAY ĐỔI CONTROL THEO YÊU CẦU) */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-6">
              <div className="flex items-center gap-2.5 border-b border-border-grey pb-3">
                <IoKeyOutline size={20} className="text-primary" />
                <div>
                  <h3 className="font-title-md text-on-surface font-bold">Chính Sách Phiên Đăng Nhập & Kiểm Soát Thiết Bị</h3>
                  <p className="text-xs text-on-surface-variant">
                    Quản lý số lượng thiết bị đăng nhập đồng thời, thời gian khóa màn hình khi treo máy và thời hạn phiên
                  </p>
                </div>
              </div>

              {/* Control số phiên đăng nhập đồng thời - DÙNG CARD SELECTOR THAY VÌ NHẬP 0 HOẶC 1 */}
              <ConcurrentSessionControl
                value={settings.maxConcurrentSessions ?? 0}
                onChange={(val) => {
                  setSettings(prev => ({ ...prev, maxConcurrentSessions: val }));
                  if (errors.maxConcurrentSessions) {
                    setErrors(prev => ({ ...prev, maxConcurrentSessions: null }));
                  }
                }}
                error={errors.maxConcurrentSessions}
              />

              {/* Thời gian chờ & Thời hạn tối đa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-grey/70">
                <Input
                  label="Thời gian chờ không thao tác (phút) *"
                  type="number"
                  name="sessionTimeoutMinutes"
                  min={5}
                  max={1440}
                  value={settings.sessionTimeoutMinutes !== undefined ? String(settings.sessionTimeoutMinutes) : '120'}
                  onChange={handleChange}
                  error={errors.sessionTimeoutMinutes || undefined}
                  icon={IoTimeOutline}
                  helperText="Mặc định: 120 phút. Tự động kết thúc phiên khi không có thao tác chuột/bàn phím."
                  required
                />

                <Input
                  label="Thời hạn tối đa của phiên (giờ) *"
                  type="number"
                  name="maxSessionLifetimeHours"
                  min={1}
                  max={720}
                  value={settings.maxSessionLifetimeHours !== undefined ? String(settings.maxSessionLifetimeHours) : '24'}
                  onChange={handleChange}
                  error={errors.maxSessionLifetimeHours || undefined}
                  icon={IoTimeOutline}
                  helperText="Mặc định: 24 giờ. Bắt buộc đăng nhập lại sau khoảng thời gian này."
                  required
                />
              </div>

              {/* Hướng dẫn cơ chế bảo mật */}
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <IoShieldCheckmarkOutline size={16} className="text-primary" /> Cơ chế bảo mật phiên làm việc:
                </div>
                <div>• <strong>Chế độ 1 thiết bị duy nhất:</strong> Thích hợp nhất cho máy tính quầy lễ tân. Khi nhân viên đăng nhập tài khoản trên máy mới hoặc điện thoại, máy cũ sẽ bị đăng xuất ngay lập tức để tránh lộ mật khẩu hoặc làm việc hộ nhau.</div>
                <div>• <strong>Thời gian chờ không thao tác (Timeout):</strong> Khi nhân viên rời quầy đi kiểm tra phòng quá số phút đã chọn, phiên làm việc sẽ tự động khóa để bảo vệ thông tin khách hàng.</div>
              </div>
            </div>

            {/* Card 2: Cấu hình Google AI API Keys */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-grey pb-3">
                <div className="flex items-center gap-2.5">
                  <IoSparklesOutline size={20} className="text-primary" />
                  <div>
                    <h3 className="font-title-md text-on-surface font-bold">Khóa Google AI API Keys</h3>
                    <p className="text-xs text-on-surface-variant">Dùng cho các tính năng thông minh: Gợi ý điều chỉnh giá, trợ lý phòng & phân tích tự động</p>
                  </div>
                </div>
                {getKeyCount() > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    <IoKeyOutline size={13} />
                    {getKeyCount()} key đang kích hoạt
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
                    className="w-full font-mono text-sm bg-surface-container-low border border-border-grey rounded-xl px-4 py-3 pr-12 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(v => !v)}
                    className="absolute right-3.5 top-3.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title={showKeys ? 'Ẩn key' : 'Hiện key'}
                  >
                    {showKeys ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-on-surface-variant">
                    {getKeyCount() > 0
                      ? `Hệ thống có ${getKeyCount()} key và sẽ tự động xoay vòng round-robin khi gọi AI.`
                      : 'Chưa cấu hình key nào. Các tính năng AI sẽ tạm dừng cho đến khi được nhập key.'}
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

                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <IoAlertCircleOutline size={15} /> Hướng dẫn bảo mật:
                  </div>
                  <div>• Mỗi khóa API nằm trên 1 dòng riêng biệt. Các dòng trống sẽ được bỏ qua tự động.</div>
                  <div>• Lấy key miễn phí hoặc trả phí tại <strong>console.cloud.google.com</strong> → APIs &amp; Services → Credentials.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VẬN HÀNH & DỊCH VỤ KHÁCH */}
        {/* ========================================================================= */}
        {activeTab === 'operations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Card 1: Email nhắc nhận phòng */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-grey pb-3">
                <div className="flex items-center gap-2.5">
                  <IoMailOutline size={20} className="text-primary" />
                  <div>
                    <h3 className="font-title-md text-on-surface font-bold">
                      Tự Động Gửi Email Nhắc Nhận Phòng (1 Ngày Trước)
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Gửi email thông báo giờ nhận phòng, địa chỉ chỉ đường và lưu ý cho khách trước ngày đến
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
                    label="Giờ gửi email nhắc buổi sáng *"
                    type="time"
                    name="reminderMorningTime"
                    value={settings.reminderMorningTime || '10:30'}
                    onChange={handleChange}
                    error={errors.reminderMorningTime || undefined}
                    icon={IoTimeOutline}
                    helperText="Hệ thống tự động quét và gửi email nhắc cho các khách sẽ nhận phòng vào ngày mai"
                    required
                  />

                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <IoNotificationsOutline size={15} /> Cơ chế hoạt động:
                    </div>
                    <div>• Tự động quét và gửi mail 1 lần duy nhất mỗi ngày vào khung giờ đã chọn.</div>
                    <div>• Chỉ gửi cho các đặt phòng có ngày nhận phòng là ngày mai và chưa từng gửi email nhắc.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Lịch dọn định kỳ phòng trống */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border-grey pb-3">
                <div className="flex items-center gap-2.5">
                  <IoSparklesOutline size={20} className="text-primary" />
                  <div>
                    <h3 className="font-title-md text-on-surface font-bold">
                      Lịch Dọn Định Kỳ Cho Phòng Trống Dài Ngày
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Tự động chuyển phòng trống lâu ngày sang Cần dọn (DIRTY) để tránh bụi bẩn khi bất ngờ có khách
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
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                      Số ngày phòng trống để chuyển sang Cần dọn <span className="text-error">*</span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <IoCalendarOutline size={18} className="text-on-surface-variant" />
                        </div>
                        <input
                          type="number"
                          name="periodicCleaningDays"
                          min={1}
                          max={90}
                          value={settings.periodicCleaningDays !== undefined ? String(settings.periodicCleaningDays) : '5'}
                          onChange={handleChange}
                          className={`w-full h-[42px] py-2.5 pl-10 pr-4 bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-on-surface transition-all ${
                            errors.periodicCleaningDays ? 'border-error focus:ring-error/20 focus:border-error' : 'hover:border-primary'
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
                        className="h-[42px] px-4 text-xs font-bold rounded-xl shrink-0"
                      >
                        Quét phòng trống ngay
                      </Button>
                    </div>

                    <p className="text-xs text-on-surface-variant mt-1.5">
                      Sau {settings.periodicCleaningDays || 5} ngày phòng không có khách, hệ thống sẽ đánh dấu phòng cần dọn dẹp lại.
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <IoBrushOutline size={15} /> Quy chuẩn buồng phòng:
                    </div>
                    <div>• Theo dõi số ngày phòng ở trạng thái <strong>Sẵn sàng (AVAILABLE)</strong> kể từ lần dọn sạch gần nhất.</div>
                    <div>• Đảm bảo ga gối, mùi hương và không gian phòng luôn sạch sẽ thơm tho sẵn sàng đón khách bất ngờ.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Cổng tra cứu hóa đơn trực tuyến */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-border-grey pb-3">
                <IoReceiptOutline size={20} className="text-primary" />
                <div>
                  <h3 className="font-title-md text-on-surface font-bold">Cổng Tra Cứu Hóa Đơn Trực Tuyến</h3>
                  <p className="text-xs text-on-surface-variant">Cho phép khách lưu trú tra cứu và tải hóa đơn thanh toán trực tuyến</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-container-low rounded-xl border border-border-grey">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-on-surface">Cho phép khách xem & tải hóa đơn trực tuyến</span>
                  <p className="text-xs text-on-surface-variant max-w-xl">
                    Khách có thể nhập mã đặt phòng và số điện thoại để tra cứu và in hóa đơn VAT/hóa đơn dịch vụ bất kỳ lúc nào.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
          </div>
        )}

        {/* ================= TAB 4: TELEGRAM BOT & SAO LƯU ================= */}
        {activeTab === 'telegram' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Card 1: Cấu hình tích hợp bot */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-border-grey shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-border-grey pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                    <IoPaperPlaneOutline size={22} />
                  </div>
                  <div>
                    <h3 className="font-title-md text-on-surface font-bold">Tích hợp Telegram Bot Cloud &amp; Phân quyền</h3>
                    <p className="text-xs text-on-surface-variant">
                      Chỉ định các tài khoản Telegram được phép nhận tệp sao lưu CSDL toàn diện &amp; thông báo hệ thống
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {settings.telegramBackupEnabled !== false ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
                      <IoCheckmarkCircleOutline size={14} />
                      Đang bật sao lưu
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full">
                      <IoAlertCircleOutline size={14} />
                      Đang tắt sao lưu
                    </span>
                  )}
                </div>
              </div>

              {/* Bật/Tắt gửi Telegram */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-sky-50/50 rounded-xl border border-sky-100">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-sky-950">Tự động gửi bản sao lưu CSDL đến Telegram Bot</span>
                  <p className="text-xs text-sky-800/80 max-w-xl">
                    Mỗi khi tạo bản sao lưu (thủ công hoặc chạy tự động lúc 02:00 sáng), hệ thống sẽ nén và gửi tệp tin trực tiếp tới danh sách các tài khoản được ủy quyền bên dưới.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="telegramBackupEnabled"
                    checked={settings.telegramBackupEnabled !== false}
                    onChange={(e) => setSettings(prev => ({ ...prev, telegramBackupEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {/* Bot Token */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface">
                    Telegram Bot Token <span className="font-normal text-on-surface-variant">(Tùy chọn)</span>
                  </label>
                  <span className="text-[11px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-medium">
                    Bot mặc định: @ohhwsbot
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    name="telegramBotToken"
                    value={settings.telegramBotToken || ''}
                    onChange={handleChange}
                    placeholder="8227232435:AAHJJz3XQzLAdrac-ZYyMw0cJbSAWPM4p8Y (Để trống để dùng Bot mặc định)"
                    className="w-full h-[42px] px-4 pr-12 text-sm bg-white border border-border-grey rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono transition-all placeholder:text-on-surface-variant/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(v => !v)}
                    className="absolute right-3.5 top-2.5 text-on-surface-variant hover:text-sky-600 transition-colors cursor-pointer"
                    title={showTelegramToken ? 'Ẩn token' : 'Hiện token'}
                  >
                    {showTelegramToken ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Nếu cơ sở muốn dùng Bot riêng do bạn tự tạo qua @BotFather, hãy dán API Token vào đây. Nếu để trống, hệ thống sẽ sử dụng Bot dùng chung của StayAway PMS.
                </p>
              </div>

              {/* Danh sách Telegram Chat ID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span>Danh sách Telegram Chat ID được phép truy cập &amp; nhận sao lưu</span>
                    <span className="text-error">*</span>
                  </label>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {parsedChatIds.length} tài khoản được chỉ định
                  </span>
                </div>

                <textarea
                  name="telegramChatIds"
                  rows={4}
                  value={settings.telegramChatIds || ''}
                  onChange={handleChange}
                  placeholder={"6865922651\n123456789\n987654321"}
                  className="w-full font-mono text-sm bg-surface-container-low border border-border-grey rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all placeholder:text-on-surface-variant/40"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-on-surface-variant font-medium">Tài khoản nhận diện:</span>
                  {parsedChatIds.length > 0 ? (
                    parsedChatIds.map((id, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-sky-300 text-sky-800 text-xs font-mono font-bold rounded-lg shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                        ID: {id}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-error font-medium">Chưa có ID nào. Vui lòng nhập ít nhất 1 Chat ID.</span>
                  )}
                </div>

                <p className="text-xs text-on-surface-variant">
                  Nhập số Chat ID của từng người dùng, mỗi tài khoản trên một dòng hoặc phân tách nhau bằng dấu phẩy.
                </p>
              </div>

              {/* Thao tác Test Telegram */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border-grey/70">
                <div className="text-xs text-on-surface-variant">
                  Bấm nút bên cạnh để gửi ngay 1 tin nhắn test đến toàn bộ {parsedChatIds.length} tài khoản trên để kiểm tra kết nối.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  icon={IoPaperPlaneOutline}
                  isLoading={isTestingTelegram}
                  onClick={handleTestTelegram}
                  disabled={parsedChatIds.length === 0}
                  className="shrink-0 text-sky-700 border-sky-300 hover:bg-sky-50"
                  size="sm"
                >
                  Gửi thông báo thử nghiệm tới Telegram
                </Button>
              </div>
            </div>

            {/* Card 2: Hướng dẫn lấy Chat ID */}
            <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-6 space-y-3.5 text-xs text-sky-950">
              <div className="flex items-center gap-2 font-bold text-sm text-sky-900">
                <IoInformationCircleOutline size={20} className="text-sky-600" />
                Hướng dẫn người dùng kết nối &amp; lấy số Chat ID của Telegram:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-white/80 border border-sky-100 p-3.5 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white inline-flex items-center justify-center text-[10px]">1</span>
                    Khởi động Bot
                  </div>
                  <p className="text-sky-900/80 leading-relaxed">
                    Mở ứng dụng Telegram trên máy hoặc điện thoại, tìm kiếm <strong>@ohhwsbot</strong> rồi ấn nút <strong>START</strong> để kích hoạt cuộc trò chuyện.
                  </p>
                </div>

                <div className="bg-white/80 border border-sky-100 p-3.5 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white inline-flex items-center justify-center text-[10px]">2</span>
                    Lấy số Chat ID
                  </div>
                  <p className="text-sky-900/80 leading-relaxed">
                    Tìm kiếm bot <strong>@userinfobot</strong> trên Telegram và bấm Start, bot sẽ gửi lại thông tin chứa dòng <code>Id: 6865922651</code>.
                  </p>
                </div>

                <div className="bg-white/80 border border-sky-100 p-3.5 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white inline-flex items-center justify-center text-[10px]">3</span>
                    Dán &amp; Xác nhận
                  </div>
                  <p className="text-sky-900/80 leading-relaxed">
                    Dán dãy số ID vào ô bên trên, bấm <strong>Lưu toàn bộ cài đặt</strong>, sau đó bấm <strong>Gửi thông báo thử nghiệm</strong> để xác nhận.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thanh công cụ lưu cài đặt cố định */}
        <div className="p-4 bg-surface-container-lowest border border-border-grey rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-on-surface-variant">
            <span>Đang xem mục: <strong>{currentTabObj.label}</strong>. Các thay đổi sẽ được áp dụng ngay sau khi lưu.</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              icon={IoSaveOutline}
              isLoading={isSaving}
              className="px-6 py-2.5 font-bold shadow-xs"
            >
              Lưu toàn bộ cài đặt
            </Button>
          </div>
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
          {settings.homeImage && (
            <img
              src={settings.homeImage}
              alt="Hotel Full Preview"
              className="max-h-[70vh] object-contain rounded-xl shadow-sm"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default HotelSettings;
