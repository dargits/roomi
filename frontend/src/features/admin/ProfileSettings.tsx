import React, { useState, useEffect } from 'react';
import userApi from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { IoAlertCircleOutline, IoCallOutline, IoCheckmarkCircleOutline, IoKeyOutline, IoLockClosedOutline, IoMailOutline, IoPersonOutline, IoSaveOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/common/LoadingScreen';

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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
          email: data.email || ''
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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });
    setProfileErrors({});

    try {
      const updatedUser: any = await userApi.updateProfile(profile);
      setProfileMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
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
