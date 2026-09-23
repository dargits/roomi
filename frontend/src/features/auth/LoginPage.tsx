import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLoginDropdown from './QuickLoginDropdown';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import {
  IoEyeOffOutline,
  IoEyeOutline,
  IoLockClosedOutline,
  IoPersonOutline
} from 'react-icons/io5';
import Button from '../../components/ui/Button';
import ForgotPasswordModal from './ForgotPasswordModal';
import ForceChangePasswordModal from './ForceChangePasswordModal';
import { getDefaultRouteForRole } from '../../routes/ProtectedRoute';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, user, updateUser } = useAuth();
  const { hotelSetting } = useAppConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isLoggingInRef = useRef(false);

  // Modals state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [pendingChangeAccount, setPendingChangeAccount] = useState('');

  useEffect(() => {
    const forcedReason = sessionStorage.getItem('stayaway_logout_reason');
    if (forcedReason) {
      setErrorMsg(forcedReason);
      sessionStorage.removeItem('stayaway_logout_reason');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoggingInRef.current) {
      if (user?.mustChangePassword) {
        setPendingChangeAccount(user.account);
        setShowForceChangeModal(true);
      } else {
        navigate(getDefaultRouteForRole(user?.role));
      }
    }
  }, [isAuthenticated, user, navigate]);

  const executeLogin = async (loginUsername: string, loginPassword: string) => {
    if (!loginUsername || !loginPassword) {
      setErrorMsg('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }

    isLoggingInRef.current = true;
    setIsLoading(true);
    setErrorMsg('');

    const result = await login(loginUsername, loginPassword, rememberMe);

    setIsLoading(false);

    if (result.success) {
      if (result.user?.mustChangePassword) {
        setPendingChangeAccount(result.user.account);
        setShowForceChangeModal(true);
        isLoggingInRef.current = false;
      } else {
        navigate(getDefaultRouteForRole(result.user?.role));
      }
    } else {
      isLoggingInRef.current = false;
      setErrorMsg(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
    }
  };

  const handleRoleSelect = (account: { username: string; password: string }) => {
    setUsername(account.username);
    setPassword(account.password);
    setErrorMsg('');
    executeLogin(account.username, account.password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(username, password);
  };

  const handleForceChangeSuccess = () => {
    setShowForceChangeModal(false);
    if (user) {
      updateUser({ ...user, mustChangePassword: false });
    }
    navigate(getDefaultRouteForRole(user?.role));
  };

  const handleForceChangeCancel = () => {
    setShowForceChangeModal(false);
    logout();
  };

  return (
    <div className="bg-white text-on-surface min-h-screen md:h-screen w-full flex flex-col md:flex-row antialiased overflow-x-hidden relative">
      {/* Left Side: Editorial Lifestyle Showcase (50% desktop, hidden mobile) */}
      <div className="hidden md:flex md:w-1/2 relative bg-surface-container-high h-full overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full"
          style={{
            backgroundImage: `url('${hotelSetting?.homeImage || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=85'}')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-8 lg:p-12 h-full w-full">
          <h1 className="font-display-lg text-2xl lg:text-4xl text-white font-bold max-w-lg mb-3 leading-tight">
            Trải nghiệm dịch vụ đẳng cấp cùng {hotelSetting?.propertyName || 'Stay Away'}
          </h1>
          <p className="font-body-lg text-sm lg:text-base text-white/80">
            Hệ thống quản lý vận hành chuyên nghiệp.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form (50% desktop, full width on mobile) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-8 lg:p-12 min-h-screen md:min-h-0 md:h-full bg-white overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center my-auto">
          {/* Logo */}
          <div
            className="flex flex-col items-center cursor-pointer select-none mb-5"
            onClick={() => navigate('/')}
          >
            <span className="font-logo font-medium text-3xl lg:text-4xl tracking-wide text-[#4a4a4a] leading-none uppercase">
              {hotelSetting?.propertyName || 'STAY AWAY'}
            </span>
            <div className="flex gap-2 mt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>

          <h2 className="font-headline-md text-sm lg:text-base text-on-surface mb-5 text-center w-full font-semibold">
            Đăng nhập hệ thống quản lý khách sạn {hotelSetting?.propertyName || 'Stay Away'}
          </h2>

          {errorMsg && (
            <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form className="w-full space-y-4" onSubmit={handleLogin}>
            {/* Username */}
            <div className="relative">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tài khoản</label>
              <div className="relative flex items-center">
                <IoPersonOutline className="absolute left-3.5 text-outline" size={18} strokeWidth={1.5} />
                <input
                  className="w-full pl-10 pr-4 py-2.5 border border-border-grey rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-sm text-on-surface transition-colors"
                  placeholder="Nhập tài khoản"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">Mật khẩu</label>
              <div className="relative flex items-center">
                <IoLockClosedOutline className="absolute left-3.5 text-outline" size={18} strokeWidth={1.5} />
                <input
                  className="w-full pl-10 pr-10 py-2.5 border border-border-grey rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-sm text-on-surface transition-colors"
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  className="absolute right-3.5 text-outline hover:text-primary transition-colors focus:outline-none cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IoEyeOffOutline size={18} strokeWidth={1.5} /> : <IoEyeOutline size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  className="w-4 h-4 border-border-grey rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <label className="ml-2 text-xs font-medium text-on-surface-variant cursor-pointer select-none" htmlFor="remember">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Login Button */}
            <Button
              className="w-full py-2.5 text-sm font-semibold rounded-xl"
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
            >
              Đăng nhập
            </Button>
          </form>

          <div className="w-full my-4 border-t border-border-grey relative">
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-medium text-outline">
              Hoặc
            </span>
          </div>

          {/* Quick Login Section */}
          <QuickLoginDropdown onSelectRole={handleRoleSelect} />

          {/* Back to Booking */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => navigate('/')}
            className="mt-3.5 w-full text-sm font-semibold"
          >
            Cổng đặt phòng
          </Button>
        </div>
      </div>

      {/* Forgot Password Request Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />

      {/* Force Change Password Modal */}
      <ForceChangePasswordModal
        isOpen={showForceChangeModal}
        account={pendingChangeAccount || user?.account}
        onSuccess={handleForceChangeSuccess}
        onCancel={handleForceChangeCancel}
      />
    </div>
  );
};

export default LoginPage;
