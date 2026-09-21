import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLoginDropdown from './QuickLoginDropdown';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import {
  IoEyeOffOutline,
  IoEyeOutline,
  IoLockClosedOutline,
  IoPersonOutline,
  IoCheckmarkCircle
} from 'react-icons/io5';
import Button from '../../components/ui/Button';
import ForgotPasswordModal from './ForgotPasswordModal';
import ForceChangePasswordModal from './ForceChangePasswordModal';

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState<any>(null);

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
        navigate('/manage/dashboard');
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
        // Trigger cinematic Rocket Screen-Split Animation
        setIsSuccess(true);
        setSuccessUser(result.user);
        setTimeout(() => {
          navigate('/manage/dashboard');
        }, 800);
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
    navigate('/manage/dashboard');
  };

  const handleForceChangeCancel = () => {
    setShowForceChangeModal(false);
    logout();
  };

  return (
    <div className="bg-surface text-on-surface h-screen overflow-hidden flex flex-col md:flex-row antialiased relative">
      {/* Left Side: Image (50%) */}
      <div className="hidden md:flex md:w-1/2 relative bg-surface-container-high h-full min-h-screen">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full"
          style={{
            backgroundImage: `url('${hotelSetting?.homeImage || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=85'}')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12 h-full w-full">
          <h1 className="font-display-lg text-4xl text-white font-bold max-w-lg mb-3 leading-tight">
            Trải nghiệm dịch vụ đẳng cấp cùng {hotelSetting?.propertyName || 'Stay Away'}
          </h1>
          <p className="font-body-lg text-base text-white/80">
            Hệ thống quản lý vận hành chuyên nghiệp.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form (50%) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 lg:p-10 h-full bg-surface-container-lowest overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Logo */}
          <div
            className="flex flex-col items-center cursor-pointer select-none mb-6"
            onClick={() => navigate('/')}
          >
            <span className="font-logo font-medium text-[44px] tracking-wide text-[#4a4a4a] leading-none uppercase">
              {hotelSetting?.propertyName || 'STAY AWAY'}
            </span>
            <div className="flex gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>

          <h2 className="font-headline-md text-base text-on-surface mb-6 text-center w-full font-semibold">
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
                  disabled={isLoading || isSuccess}
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
                  disabled={isLoading || isSuccess}
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
                  disabled={isLoading || isSuccess}
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

            {/* Login Button with Success Transition */}
            {isSuccess ? (
              <div className="w-full bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transform scale-[1.02] transition-all duration-200">
                <IoCheckmarkCircle size={20} className="animate-spin" />
                <span>Đang khởi hành vào hệ thống...</span>
              </div>
            ) : (
              <Button
                className="w-full py-2.5 text-sm font-semibold rounded-xl"
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
              >
                Đăng nhập
              </Button>
            )}
          </form>

          <div className="w-full my-5 border-t border-border-grey relative">
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest px-4 text-xs font-medium text-outline">
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
            className="mt-4 w-full text-sm font-semibold"
          >
            Cổng đặt phòng
          </Button>
        </div>
      </div>

      {/* ── CINEMATIC ROCKET SCREEN-SPLIT ANIMATION ── */}
      {isSuccess && (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none">
          {/* Top Half Curtain (Splits Upwards) */}
          <div
            className="absolute top-0 left-0 right-0 h-1/2 bg-[#1A2411] border-b-2 border-[#D4F63D] z-20 shadow-2xl flex flex-col justify-end items-center pb-6 overflow-hidden"
            style={{
              animation: 'screenSplitTop 0.52s cubic-bezier(0.85, 0, 0.15, 1) 0.22s forwards'
            }}
          >
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#D4F63D_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="text-center relative z-10 opacity-80">
              <span className="font-mono text-[10px] tracking-[0.3em] text-[#D4F63D] uppercase">
                StayGo PMS Hyper-Drive Activated
              </span>
            </div>
          </div>

          {/* Bottom Half Curtain (Splits Downwards) */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#1A2411] border-t-2 border-[#D4F63D] z-20 shadow-2xl flex flex-col justify-start items-center pt-6 overflow-hidden"
            style={{
              animation: 'screenSplitBottom 0.52s cubic-bezier(0.85, 0, 0.15, 1) 0.22s forwards'
            }}
          >
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#D4F63D_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="text-center relative z-10 opacity-80">
              <span className="font-mono text-[10px] tracking-[0.3em] text-white uppercase">
                Entering Hospitality Command Center
              </span>
            </div>
          </div>

          {/* Laser Cut Beam at Center (Splits the Screen) */}
          <div
            className="absolute top-1/2 left-0 h-[3px] bg-gradient-to-r from-transparent via-[#D4F63D] to-white shadow-[0_0_20px_#D4F63D,0_0_40px_#D4F63D] z-30 transform -translate-y-1/2"
            style={{
              animation: 'laserCutBeam 0.75s ease-out forwards'
            }}
          />

          {/* The Flying Rocket */}
          <div
            className="absolute top-1/2 z-40 flex items-center"
            style={{
              animation: 'rocketFlyAcross 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}
          >
            {/* Jet Exhaust Flame & Particles Trail */}
            <div className="flex items-center -mr-2">
              <div className="w-56 h-[2px] bg-gradient-to-l from-[#D4F63D] via-[#F97316]/80 to-transparent" />
              <div className="relative w-16 h-8 flex items-center justify-end">
                <div className="w-14 h-4 rounded-l-full bg-gradient-to-l from-white via-[#D4F63D] to-[#F97316] blur-[1px] animate-pulse" />
                <div className="absolute right-0 w-8 h-2 rounded-l-full bg-white blur-[0.5px]" />
                <div className="absolute -left-2 w-3 h-3 rounded-full bg-[#D4F63D] animate-ping opacity-75" />
              </div>
            </div>

            {/* Stylized Space Rocket SVG */}
            <svg
              viewBox="0 0 120 60"
              className="w-24 h-12 drop-shadow-[0_0_15px_rgba(212,246,61,0.9)] filter"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Rocket Body */}
              <path
                d="M110 30 C95 18, 55 16, 25 20 L25 40 C55 44, 95 42, 110 30 Z"
                fill="url(#rocketBodyGrad)"
              />
              {/* Rocket Nosecone Tip */}
              <path
                d="M110 30 C105 24, 90 20, 80 20 L80 40 C90 40, 105 36, 110 30 Z"
                fill="#D4F63D"
              />
              {/* Cockpit Glass */}
              <ellipse cx="70" cy="30" rx="8" ry="4" fill="#38BDF8" opacity="0.9" />
              <ellipse cx="71" cy="29" rx="5" ry="2" fill="#FFFFFF" opacity="0.8" />
              {/* Top Wing Fin */}
              <path
                d="M45 18 L20 6 L30 20 Z"
                fill="#626F47"
              />
              {/* Bottom Wing Fin */}
              <path
                d="M45 42 L20 54 L30 40 Z"
                fill="#626F47"
              />
              {/* Center Fin Accent */}
              <path
                d="M38 27 L18 29 L18 31 L38 33 Z"
                fill="#BEDF2E"
              />
              {/* Thruster Nozzle */}
              <rect x="20" y="24" width="6" height="12" rx="2" fill="#334155" />
              <defs>
                <linearGradient id="rocketBodyGrad" x1="25" y1="30" x2="110" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="0.6" stopColor="#F4F6F0" />
                  <stop offset="1" stopColor="#E2E8F0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Sonic Shockwave Ring around Rocket Nose */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-16 rounded-full border-2 border-white/60 opacity-60 animate-ping -mr-3" />
          </div>

          {/* Underlying Portal Revealed as Screen Splits */}
          <div className="absolute inset-0 bg-[#0F172A] z-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/30 border border-[#D4F63D] flex items-center justify-center text-[#D4F63D] shadow-[0_0_30px_#D4F63D] mb-4">
              <span className="font-bold text-3xl font-mono">S</span>
            </div>
            <h2 className="font-display-lg text-2xl md:text-3xl font-extrabold text-white tracking-wide">
              {hotelSetting?.propertyName || 'STAY AWAY'} PMS
            </h2>
            <p className="text-xs font-mono text-[#D4F63D] mt-2 tracking-widest uppercase animate-pulse">
              Đang mở cổng điều hành khách sạn...
            </p>
          </div>
        </div>
      )}

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
