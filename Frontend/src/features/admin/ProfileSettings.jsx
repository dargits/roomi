import React, { useState, useEffect } from 'react';
import userApi from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { IoAlertCircleOutline, IoCallOutline, IoCheckmarkCircleOutline, IoCheckmarkOutline, IoInformationCircleOutline, IoKeyOutline, IoLockClosedOutline, IoMailOutline, IoPersonOutline, IoSaveOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
const ProfileSettings = () => {
  const { user, login } = useAuth(); // Need login to update context if possible, or just refresh
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
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

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getProfile();
      if (data) {
        setProfile({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
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

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) setProfileErrors(prev => ({ ...prev, [name]: null }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors(prev => ({ ...prev, [name]: null }));
  };



  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage({ type: '', text: '' });
    setProfileErrors({});

    try {
      const updatedUser = await userApi.updateProfile(profile);
      setProfileMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });

      // Update local storage / context if possible
      const token = localStorage.getItem('staygo_token') || sessionStorage.getItem('staygo_token');
      if (token) {
        // Just a hacky way to update context since we don't have a specific update method in AuthContext
        login(token, updatedUser);
      }

      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (error) {
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage({ type: '', text: '' });
    setPasswordErrors({});

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Mật khẩu xác nhận không khớp' });
      setIsSavingPassword(false);
      return;
    }

    try {
      await userApi.changePassword(passwords.oldPassword, passwords.newPassword);
      setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setPasswordErrors({ oldPassword: 'Mật khẩu cũ không chính xác' });
      } else {
        setPasswordMessage({ type: 'error', text: 'Lỗi đổi mật khẩu.' });
      }
    } finally {
      setIsSavingPassword(false);
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
    <div className="w-full pb-12 space-y-8">
      <div className="mb-8">
        <h1 className="font-headline-lg text-on-surface mb-2">Hồ sơ Cá nhân</h1>

      </div>

      {/* Thông tin cá nhân Form */}
      <form onSubmit={handleProfileSubmit} className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-grey overflow-hidden">
        <div className="p-6 border-b border-border-grey bg-surface-container-low/50">
          <h2 className="font-title-lg text-primary flex items-center gap-2">
            <IoPersonOutline size={24} strokeWidth={1.5} />
            Thông tin Cá nhân
          </h2>
        </div>

        <div className="p-6">
          {profileMessage.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm animate-fade-in ${profileMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-error border border-red-200'}`}>
              {profileMessage.type === 'success' ? <IoCheckmarkCircleOutline size={24} /> : <IoAlertCircleOutline size={24} />}
              <p className="font-body-md font-medium m-0">{profileMessage.text}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <Input label="Tên hiển thị" icon={IoInformationCircleOutline} name="name" value={profile.name} onChange={handleProfileChange} required error={profileErrors.name} />
              <Input label="Số điện thoại" icon={IoCallOutline} name="phone" value={profile.phone} onChange={handleProfileChange} required error={profileErrors.phone} />
            </div>

            <div className="space-y-5">
              <Input label="Email liên hệ" icon={IoMailOutline} type="email" name="email" value={profile.email} onChange={handleProfileChange} required error={profileErrors.email} />
              <div>
                <Input label="Tài khoản đăng nhập" icon={IoPersonOutline} value={user?.account || ''} disabled className="bg-surface-container-low cursor-not-allowed text-on-surface-variant" />
                <p className="text-xs text-on-surface-variant mt-1.5 opacity-80">Tài khoản và quyền hệ thống không thể thay đổi.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-grey bg-surface-container-lowest flex justify-end">
          <Button type="submit" isLoading={isSavingProfile} icon={IoSaveOutline}>
            Lưu thông tin
          </Button>
        </div>
      </form>

      {/* Đổi mật khẩu Form */}
      <form onSubmit={handlePasswordSubmit} className="bg-surface-container-lowest rounded-xl shadow-sm border border-border-grey overflow-hidden">
        <div className="p-6 border-b border-border-grey bg-surface-container-low/50">
          <h2 className="font-title-lg text-primary flex items-center gap-2">
            <IoLockClosedOutline size={24} strokeWidth={1.5} />
            Đổi Mật khẩu
          </h2>
        </div>

        <div className="p-6">
          {passwordMessage.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm animate-fade-in ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-error border border-red-200'}`}>
              {passwordMessage.type === 'success' ? <IoCheckmarkCircleOutline size={24} /> : <IoAlertCircleOutline size={24} />}
              <p className="font-body-md font-medium m-0">{passwordMessage.text}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <Input label="Mật khẩu hiện tại" icon={IoKeyOutline} type="password" name="oldPassword" value={passwords.oldPassword} onChange={handlePasswordChange} required error={passwordErrors.oldPassword} />
              <Input label="Mật khẩu mới" icon={IoLockClosedOutline} type="password" name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} required minLength={6} error={passwordErrors.newPassword} />
              <Input label="Xác nhận mật khẩu mới" icon={IoLockClosedOutline} type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handlePasswordChange} required error={passwordErrors.confirmPassword} />
            </div>

            <div className="bg-surface-container-low rounded-lg p-6 border border-border-grey h-fit">
              <h3 className="font-title-sm text-on-surface mb-3 flex items-center gap-2">
                <IoShieldCheckmarkOutline size={20} className="text-primary" />
                Yêu cầu mật khẩu
              </h3>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <IoCheckmarkOutline size={16} className="text-green-600 mt-0.5" />
                  Ít nhất 6 ký tự
                </li>
                <li className="flex items-start gap-2">
                  <IoCheckmarkOutline size={16} className="text-green-600 mt-0.5" />
                  Nên chứa cả chữ và số để tăng tính bảo mật
                </li>
                <li className="flex items-start gap-2">
                  <IoCheckmarkOutline size={16} className="text-green-600 mt-0.5" />
                  Không sử dụng mật khẩu dễ đoán hoặc đã từng bị lộ
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-grey bg-surface-container-lowest flex justify-end">
          <Button type="submit" isLoading={isSavingPassword} icon={IoKeyOutline}>
            Cập nhật mật khẩu
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
