import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLoginDropdown from './QuickLoginDropdown';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { IoEyeOffOutline, IoEyeOutline, IoLockClosedOutline, IoPersonOutline } from 'react-icons/io5';
import logoUrl from '../../assets/logo.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { hotelSetting } = useAppConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/manage/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const result = await login(username, password, rememberMe);

    setIsLoading(false);

    if (result.success) {
      navigate('/manage/dashboard');
    } else {
      setErrorMsg(result.message || 'Đăng nhập thất bại.');
    }
  };

  return (
    <div className="bg-surface text-on-surface h-screen overflow-hidden flex flex-col md:flex-row antialiased">
      {/* Left Side: Image (50%) */}
      <div className="hidden md:flex md:w-1/2 relative bg-surface-container-high h-full">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full"
          style={{ backgroundImage: `url('${hotelSetting?.homeImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAGYGh5uSprtLZ0Ajn5eQ1MUjb5Bu_6qCP-B4gML3wMngrGNe2n7GTKkdAPKZrGFAmCHJdzb11z-zz-xfLMdSJ5PyjbDRnIIRrZ5S0frR4TCZC1fBgR7czsFRpndcEEOdKagyWx7UOpmprA3mH7SceN64aoJLHWZv3NZP6-1ncGvfOeHB5PA62Yp_1ifx34PnKPFXe_-xr_1xcfcCjGequX0Hlnw045H36w1BHc-i3afi9FwcoW0IfsA'}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface to-transparent opacity-80"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12 h-full w-full">
          <h1 className="font-display-lg text-display-lg text-on-primary max-w-lg mb-4">Trải nghiệm dịch vụ đẳng cấp cùng {hotelSetting?.propertyName || 'StayGO'}</h1>
          <p className="font-body-lg text-body-lg text-on-primary opacity-80">Hệ thống quản lý vận hành chuyên nghiệp.</p>
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
            <span className="font-logo font-medium text-[48px] tracking-wide text-[#4a4a4a] leading-none uppercase">{hotelSetting?.propertyName || 'STAYGO'}</span>
            <div className="flex gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]"></div>
              <div className="w-3 h-3 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]"></div>
            </div>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-6 text-center w-full">Đăng nhập hệ thống quản lý khách sạn {hotelSetting?.propertyName || 'StayGO'}</h2>

          {errorMsg && (
            <div className="w-full mb-4 p-3 bg-[#ffebee] border border-[#ffcdd2] text-[#c62828] rounded-md text-sm">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form className="w-full space-y-4" onSubmit={handleLogin}>
            {/* Username */}
            <div className="relative">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Tài khoản</label>
              <div className="relative flex items-center">
                <IoPersonOutline className="absolute left-3 text-outline" size={20} strokeWidth={1.5} />
                <input
                  className="w-full pl-10 pr-4 py-2.5 border border-border-grey rounded-DEFAULT focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface transition-colors"
                  placeholder="Nhập tài khoản"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Mật khẩu</label>
              <div className="relative flex items-center">
                <IoLockClosedOutline className="absolute left-3 text-outline" size={20} strokeWidth={1.5} />
                <input
                  className="w-full pl-10 pr-10 py-2.5 border border-border-grey rounded-DEFAULT focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface transition-colors"
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-3 text-outline hover:text-primary transition-colors focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IoEyeOffOutline size={20} strokeWidth={1.5} /> : <IoEyeOutline size={20} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input className="w-4 h-4 border-border-grey rounded-sm text-primary focus:ring-primary" id="remember" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <label className="ml-2 font-body-md text-body-md text-on-surface-variant cursor-pointer" htmlFor="remember">Ghi nhớ đăng nhập</label>
            </div>

            {/* Login Button */}
            <button
              className="w-full bg-agoda-blue hover:bg-primary-container text-on-primary font-title-lg text-title-lg py-2.5 rounded-DEFAULT shadow-sm hover:shadow-md transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          <div className="w-full my-6 border-t border-border-grey relative">
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest px-4 font-label-md text-label-md text-outline">Hoặc</span>
          </div>

          {/* Quick Login Section */}
          <QuickLoginDropdown onSelectRole={handleRoleSelect} />

          {/* Back to Booking */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 w-full border border-agoda-blue text-agoda-blue hover:bg-surface-blue-light font-title-lg text-title-lg py-2.5 rounded-DEFAULT transition-colors"
          >
            cổng đặt phòng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
