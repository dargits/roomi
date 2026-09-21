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
      {/* ── PORTAL VIEW REVEALED AS FABRIC TEARS ── */}
      {isSuccess && (
        <div className="absolute inset-0 bg-[#0F172A] z-0 flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-200">
          <div className="w-20 h-20 rounded-3xl bg-primary/30 border-2 border-[#D4F63D] flex items-center justify-center text-[#D4F63D] shadow-[0_0_50px_rgba(212,246,61,0.7)] mb-5 animate-pulse">
            <span className="font-bold text-4xl font-mono">S</span>
          </div>
          <h2 className="font-display-lg text-3xl md:text-5xl font-extrabold text-white tracking-wide">
            {hotelSetting?.propertyName || 'STAY AWAY'} PMS
          </h2>
          <p className="text-sm font-mono text-[#D4F63D] mt-3 tracking-widest uppercase">
            Đang mở cổng tiến vào trang chủ điều hành...
          </p>
        </div>
      )}

      {/* Left Side: Image (50%) - Tears and moves to LEFT */}
      <div
        className={`hidden md:flex md:w-1/2 relative bg-surface-container-high h-full min-h-screen z-10 overflow-hidden ${
          isSuccess ? 'shadow-2xl' : ''
        }`}
        style={
          isSuccess
            ? { animation: 'tearLeft 0.75s cubic-bezier(0.85, 0, 0.15, 1) forwards' }
            : undefined
        }
      >
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

      {/* Right Side: Login Form (50%) - Tears and moves to RIGHT */}
      <div
        className={`w-full md:w-1/2 flex items-center justify-center p-6 lg:p-10 h-full bg-surface-container-lowest overflow-y-auto z-10 ${
          isSuccess ? 'shadow-2xl' : ''
        }`}
        style={
          isSuccess
            ? { animation: 'tearRight 0.75s cubic-bezier(0.85, 0, 0.15, 1) forwards' }
            : undefined
        }
      >
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

      {/* ── CINEMATIC VERTICAL ROCKET FABRIC-TEAR SCREEN SPLIT ANIMATION ── */}
      {isSuccess && (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none">
          {/* Jagged Fabric Tear Line Along Center Seam (Splits the two pages) */}
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[4px] z-30 pointer-events-none"
            style={{ animation: 'tearLineRip 0.75s ease-out forwards' }}
          >
            {/* Glowing neon rip beam */}
            <div className="w-full h-full bg-gradient-to-b from-[#D4F63D] via-white to-[#F97316] shadow-[0_0_25px_#D4F63D,0_0_50px_#D4F63D]" />
            {/* Jagged rip threads along the seam */}
            <svg
              className="absolute inset-0 w-8 -left-2 h-full opacity-80"
              preserveAspectRatio="none"
              viewBox="0 0 20 100"
            >
              <path
                d="M10 0 L14 10 L6 20 L15 30 L5 40 L14 50 L6 60 L15 70 L6 80 L13 90 L10 100"
                stroke="#D4F63D"
                strokeWidth="2.5"
                fill="none"
              />
            </svg>
          </div>

          {/* Vertical Flying Rocket Launching Up Along Center Seam */}
          <div
            className="absolute bottom-0 left-1/2 z-40 flex flex-col items-center"
            style={{
              animation: 'rocketShootUp 0.8s cubic-bezier(0.2, 0.85, 0.25, 1) forwards'
            }}
          >
            {/* Sonic Shockwave Ring around Rocket Nose */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-12 rounded-full border-2 border-white/80 opacity-80 animate-ping -mt-4" />

            {/* Stylized Space Rocket SVG (Facing UP) */}
            <svg
              viewBox="0 0 60 120"
              className="w-16 h-32 drop-shadow-[0_0_25px_rgba(212,246,61,0.95)] filter"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Rocket Body */}
              <path
                d="M30 10 C18 25, 16 65, 20 95 L40 95 C44 65, 42 25, 30 10 Z"
                fill="url(#rocketBodyVert)"
              />
              {/* Rocket Nosecone Tip */}
              <path
                d="M30 10 C24 15, 20 30, 20 40 L40 40 C40 30, 36 15, 30 10 Z"
                fill="#D4F63D"
              />
              {/* Cockpit Glass */}
              <ellipse cx="30" cy="50" rx="4" ry="8" fill="#38BDF8" opacity="0.95" />
              <ellipse cx="29" cy="49" rx="2" ry="5" fill="#FFFFFF" opacity="0.85" />
              {/* Left Wing Fin */}
              <path
                d="M18 75 L6 100 L20 90 Z"
                fill="#626F47"
              />
              {/* Right Wing Fin */}
              <path
                d="M42 75 L54 100 L40 90 Z"
                fill="#626F47"
              />
              {/* Center Fin Accent */}
              <path
                d="M27 82 L29 102 L31 102 L33 82 Z"
                fill="#BEDF2E"
              />
              {/* Thruster Nozzle */}
              <rect x="24" y="94" width="12" height="6" rx="2" fill="#334155" />
              <defs>
                <linearGradient id="rocketBodyVert" x1="30" y1="10" x2="30" y2="95" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="0.6" stopColor="#F4F6F0" />
                  <stop offset="1" stopColor="#CBD5E1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Downward Jet Exhaust Flame & Particles Trail */}
            <div className="flex flex-col items-center -mt-2">
              <div className="relative w-8 h-20 flex flex-col items-center">
                <div className="w-6 h-20 rounded-b-full bg-gradient-to-b from-white via-[#D4F63D] to-[#F97316] blur-[1px] animate-pulse" />
                <div className="absolute top-0 w-3 h-10 rounded-b-full bg-white blur-[0.5px]" />
                <div className="absolute -bottom-2 w-4 h-4 rounded-full bg-[#D4F63D] animate-ping opacity-85" />
              </div>
              <div className="w-[3px] h-72 bg-gradient-to-b from-[#D4F63D] via-[#F97316]/75 to-transparent shadow-[0_0_15px_#D4F63D]" />
            </div>

            {/* Spark Bursts along the Tear Seam */}
            <div className="absolute top-20 -left-6 w-3 h-3 rounded-full bg-[#D4F63D] animate-ping opacity-90" />
            <div className="absolute top-24 -right-6 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-90" />
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
