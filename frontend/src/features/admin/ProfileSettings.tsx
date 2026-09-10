import React, { useState, useEffect, useRef } from 'react';
import userApi from '../../services/userApi';
import { fileApi } from '../../services/fileApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  IoAlertCircleOutline,
  IoCallOutline,
  IoCameraOutline,
  IoCheckmarkCircleOutline,
  IoCloudUploadOutline,
  IoKeyOutline,
  IoLockClosedOutline,
  IoMailOutline,
  IoPersonOutline,
  IoSaveOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline
} from 'react-icons/io5';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    avatarImage: ''
  });

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  const [profileErrors, setProfileErrors] = useState<Record<string, string | null>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data: any = await userApi.getProfile();
      if (data) {
        setProfile({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          avatarImage: data.avatarImage || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setProfileMessage({ type: 'error', text: 'Không thể tải thông tin cá nhân.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) setProfileErrors(prev => ({ ...prev, [name]: null }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastWarning('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toastWarning('Dung lượng ảnh tối đa cho phép là 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const res = await fileApi.uploadFile(file, (percent) => {
        setUploadProgress(percent);
      });

      const newAvatarUrl = res.url;
      setProfile(prev => ({ ...prev, avatarImage: newAvatarUrl }));

      // Cập nhật lên backend và đồng bộ AuthContext ngay lập tức
      const updatedUser: any = await userApi.updateProfile({
        name: profile.name || user?.name || '',
        phone: profile.phone,
        email: profile.email,
        avatarImage: newAvatarUrl
      });

      if (updatedUser) {
        updateUser(updatedUser);
      }
      toastSuccess('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      console.error('Lỗi khi tải ảnh đại diện lên:', err);
      toastError('Tải ảnh đại diện thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile.avatarImage) return;

    try {
      setIsUploadingAvatar(true);
      setProfile(prev => ({ ...prev, avatarImage: '' }));

      const updatedUser: any = await userApi.updateProfile({
        name: profile.name || user?.name || '',
        phone: profile.phone,
        email: profile.email,
        avatarImage: ''
      });

      if (updatedUser) {
        updateUser(updatedUser);
      }
      toastSuccess('Đã gỡ ảnh đại diện.');
    } catch (err) {
      console.error('Lỗi khi gỡ ảnh đại diện:', err);
      toastError('Không thể gỡ ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });
    setProfileErrors({});

    try {
      const updatedUser: any = await userApi.updateProfile(profile);
      setProfileMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      toastSuccess('Cập nhật thông tin tài khoản thành công!');
      if (updatedUser) {
        updateUser(updatedUser);
      }

      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      if (error.response && error.response.status === 400 && error.response.data) {
        setProfileErrors(error.response.data);
        setProfileMessage({ type: 'error', text: 'Vui lòng kiểm tra lại thông tin.' });
      } else if (error.response && error.response.status === 409) {
        setProfileMessage({ type: 'error', text: error.response.data.message || 'Dữ liệu đã tồn tại.' });
      } else {
        setProfileMessage({ type: 'error', text: 'Lỗi cập nhật thông tin.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage({ type: '', text: '' });
    setPasswordErrors({});

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Mật khẩu xác nhận không khớp.' });
      setIsSavingPassword(false);
      return;
    }

    try {
      await userApi.changePassword({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      if (error.response && error.response.data) {
        setPasswordMessage({ type: 'error', text: error.response.data.message || 'Lỗi đổi mật khẩu.' });
      } else {
        setPasswordMessage({ type: 'error', text: 'Lỗi đổi mật khẩu. Vui lòng thử lại.' });
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Đang tải dữ liệu hồ sơ..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Thông tin tài khoản */}
      <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
        <div className="px-6 py-4 border-b border-border-grey flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <IoPersonOutline size={20} className="text-primary" />
            <h2 className="font-title-lg text-on-surface font-bold text-base">
              Thông tin Tài khoản
            </h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            {user?.role}
          </span>
        </div>

        {/* Khối Ảnh Đại Diện (Avatar Section) */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 border-b border-border-grey bg-gradient-to-r from-primary/5 via-surface to-surface">
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-primary/20 shadow-md overflow-hidden bg-surface-container-low flex items-center justify-center relative">
              {profile.avatarImage ? (
                <img
                  src={profile.avatarImage}
                  alt={profile.name || 'Ảnh đại diện'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/35 text-primary flex items-center justify-center font-bold text-3xl uppercase select-none">
                  {profile.name?.[0] || user?.name?.[0] || 'U'}
                </div>
              )}

              {/* Uploading Overlay */}
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1.5" />
                  <span className="text-[11px] font-semibold">
                    {uploadProgress > 0 ? `${uploadProgress}%` : 'Đang tải...'}
                  </span>
                </div>
              )}

              {/* Hover Overlay to change avatar */}
              {!isUploadingAvatar && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                  title="Thay đổi ảnh đại diện"
                >
                  <IoCameraOutline size={28} className="drop-shadow" />
                  <span className="text-[10px] font-medium mt-1 drop-shadow">Đổi ảnh</span>
                </button>
              )}
            </div>

            {/* Floating Camera Button on bottom right */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-1 right-1 p-2 rounded-full bg-primary text-white shadow-md hover:bg-primary-hover active:scale-95 transition-all cursor-pointer border-2 border-white disabled:opacity-50"
              title="Tải ảnh mới"
            >
              <IoCameraOutline size={16} />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-bold text-on-surface">{profile.name || user?.name || 'Tài khoản'}</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Tên tài khoản: <span className="font-semibold text-on-surface font-mono">{user?.account || '—'}</span>
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelect}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <IoCloudUploadOutline size={15} />
                {isUploadingAvatar ? 'Đang tải ảnh...' : 'Tải ảnh mới'}
              </button>

              {profile.avatarImage && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Gỡ ảnh đại diện hiện tại"
                >
                  <IoTrashOutline size={14} />
                  Gỡ ảnh
                </button>
              )}
            </div>

            <p className="text-[11px] text-on-surface-variant/70">
              Hỗ trợ định dạng: JPG, PNG, WEBP (dung lượng tối đa 5MB).
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
          {profileMessage.text && (
            <div className={`p-4 rounded-md flex items-center gap-2 text-sm ${
              profileMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-error border border-red-200'
            }`}>
              {profileMessage.type === 'success' ? <IoCheckmarkCircleOutline size={18} /> : <IoAlertCircleOutline size={18} />}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Họ và Tên *"
              name="name"
              value={profile.name}
              onChange={handleProfileChange}
              error={profileErrors.name || undefined}
              icon={IoPersonOutline}
              required
            />

            <Input
              label="Số điện thoại *"
              name="phone"
              value={profile.phone}
              onChange={handleProfileChange}
              error={profileErrors.phone || undefined}
              icon={IoCallOutline}
              required
            />
          </div>

          <Input
            label="Email *"
            type="email"
            name="email"
            value={profile.email}
            onChange={handleProfileChange}
            error={profileErrors.email || undefined}
            icon={IoMailOutline}
            required
          />

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              icon={IoSaveOutline}
              isLoading={isSavingProfile}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>

      {/* Đổi mật khẩu */}
      <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
        <div className="px-6 py-4 border-b border-border-grey flex items-center gap-2 bg-surface-container-lowest">
          <IoShieldCheckmarkOutline size={20} className="text-primary" />
          <h2 className="font-title-lg text-on-surface font-bold text-base">
            Bảo mật & Đổi Mật khẩu
          </h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          {passwordMessage.text && (
            <div className={`p-4 rounded-md flex items-center gap-2 text-sm ${
              passwordMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-error border border-red-200'
            }`}>
              {passwordMessage.type === 'success' ? <IoCheckmarkCircleOutline size={18} /> : <IoAlertCircleOutline size={18} />}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <Input
            label="Mật khẩu hiện tại *"
            type="password"
            name="oldPassword"
            value={passwords.oldPassword}
            onChange={handlePasswordChange}
            error={passwordErrors.oldPassword || undefined}
            icon={IoLockClosedOutline}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mật khẩu mới *"
              type="password"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.newPassword || undefined}
              icon={IoKeyOutline}
              required
            />

            <Input
              label="Xác nhận mật khẩu mới *"
              type="password"
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.confirmPassword || undefined}
              icon={IoKeyOutline}
              required
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="outline"
              icon={IoKeyOutline}
              isLoading={isSavingPassword}
            >
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
