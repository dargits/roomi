import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { passwordResetApi, VerifyResetTokenResponse } from '../../services/passwordResetApi';
import { useAppConfig } from '../../context/AppConfigContext';
import { useToast } from '../../context/ToastContext';
import useSEO from '../../hooks/useSEO';
import {
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoArrowBackOutline,
  IoShieldCheckmarkOutline,
  IoAlertCircleOutline,
  IoKeyOutline
} from 'react-icons/io5';

const ResetPasswordPage: React.FC = () => {
  useSEO({
    title: 'Cập Nhật Mật Khẩu Mới',
    description: 'Thiết lập mật khẩu mới an toàn cho tài khoản nhân viên hệ thống quản lý khách sạn StayAway PMS.',
    keywords: 'đặt lại mật khẩu, reset password, stay away pms',
    canonical: 'https://stayaway.io.vn/reset-password'
  });

  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get('token') || '';

  const navigate = useNavigate();
  const { hotelSetting } = useAppConfig();
  const { success: toastSuccess, error: toastError } = useToast();

  // Token Verification State
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<VerifyResetTokenResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string>('');

  // Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Countdown timer in seconds (10 minutes max)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // 1. Verify token on page load
  useEffect(() => {
    if (!token || token.trim().length < 10) {
      setIsVerifying(false);
      setVerifyError('Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu mã xác thực.');
      return;
    }

    let isMounted = true;
    const verify = async () => {
      setIsVerifying(true);
      setVerifyError('');
      try {
        const res = await passwordResetApi.verifyResetToken(token.trim());
        if (!isMounted) return;

        if (res.valid) {
          setTokenInfo(res);
          setRemainingSeconds(res.remainingSeconds || 600);
        } else {
          setVerifyError(res.message || 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hiệu lực.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.response?.data?.message || err.message || 'Không thể kiểm tra tính hợp lệ của liên kết.';
        setVerifyError(msg);
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Countdown timer effect
  useEffect(() => {
    if (!tokenInfo?.valid || remainingSeconds <= 0 || isSuccess) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setVerifyError('Liên kết đặt lại mật khẩu đã hết hiệu lực (quá 10 phút). Vui lòng yêu cầu liên kết mới!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenInfo, remainingSeconds, isSuccess]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, text: 'Mật khẩu yếu', color: 'bg-rose-500' };
    if (score <= 3) return { level: 2, text: 'Độ bảo mật trung bình', color: 'bg-amber-500' };
    return { level: 3, text: 'Mật khẩu mạnh & an toàn', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);

  // Handle submit new password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (remainingSeconds <= 0) {
      toastError('Liên kết đã hết hiệu lực. Vui lòng yêu cầu cấp lại mật khẩu mới!');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toastError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await passwordResetApi.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword
      });

      setIsSuccess(true);
      toastSuccess(res.message || 'Đặt lại mật khẩu thành công!');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại!';
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-on-surface min-h-screen md:h-screen w-full flex flex-col md:flex-row antialiased overflow-x-hidden relative">
      {/* ── Left Side: Luxury Hotel Editorial Showcase (50% desktop, hidden mobile) ── */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900 h-full overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full transform scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('${hotelSetting?.homeImage || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=85'}')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35" />
        </div>

        {/* Content on Image Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 h-full w-full">
          {/* Top badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold w-fit shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cổng Xác Thực An Ninh Hệ Thống</span>
          </div>

          {/* Bottom text & Security highlights */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl lg:text-4xl text-white font-bold max-w-lg mb-3 leading-tight tracking-tight">
                Bảo vệ tài khoản cùng {hotelSetting?.propertyName || 'Stay Away'}
              </h1>
              <p className="text-sm lg:text-base text-white/80 leading-relaxed max-w-md">
                Thiết lập mật khẩu mới an toàn cho hệ thống quản lý và vận hành khách sạn chuyên nghiệp.
              </p>
            </div>

            {/* 3 Security Pillars */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <IoShieldCheckmarkOutline size={20} className="text-emerald-400 mb-1.5" />
                <div className="text-xs font-bold leading-tight">Mã Hóa 256-bit</div>
                <div className="text-[10px] text-white/70 mt-0.5">Tiêu chuẩn quốc tế</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <IoTimeOutline size={20} className="text-sky-400 mb-1.5" />
                <div className="text-xs font-bold leading-tight">Thời Hạn 10 Phút</div>
                <div className="text-[10px] text-white/70 mt-0.5">Tự động hủy mã</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <IoKeyOutline size={20} className="text-amber-400 mb-1.5" />
                <div className="text-xs font-bold leading-tight">Thu Hồi Phiên</div>
                <div className="text-[10px] text-white/70 mt-0.5">Xóa phiên cũ</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: Reset Password Form (50% desktop, full width on mobile) ── */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-8 lg:p-12 min-h-screen md:min-h-0 md:h-full bg-white overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center my-auto">
          {/* Logo & Animated 5 Color Dots (Matching LoginPage) */}
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

          <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-1 text-center w-full">
            Cập nhật mật khẩu mới
          </h2>
          <p className="text-xs md:text-sm text-slate-500 text-center mb-6 max-w-xs">
            Thiết lập mật khẩu mới an toàn cho tài khoản đăng nhập của bạn.
          </p>

          {/* 1. Loading State */}
          {isVerifying && (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <div className="text-sm text-slate-800 font-bold">
                  Đang kiểm tra tính hợp lệ của liên kết...
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Hệ thống đang xác thực mã bảo mật, vui lòng đợi trong giây lát.
                </p>
              </div>
            </div>
          )}

          {/* 2. Error State (Invalid / Expired Token) */}
          {!isVerifying && verifyError && (
            <div className="w-full space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <IoAlertCircleOutline size={22} />
                </div>
                <div>
                  <div className="font-bold text-sm text-rose-900 mb-0.5">Liên kết không hợp lệ hoặc đã hết hạn</div>
                  <div className="text-xs text-rose-700/90 leading-relaxed">{verifyError}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <IoTimeOutline size={15} className="text-primary" /> Lưu ý về thời hạn liên kết:
                </div>
                <p className="leading-relaxed">
                  Vì lý do an ninh, mỗi liên kết đặt lại mật khẩu chỉ có hiệu lực trong vòng <strong>10 phút</strong>. Bạn có thể quay lại trang đăng nhập để gửi lại yêu cầu cấp liên kết mới bất kỳ lúc nào.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs md:text-sm py-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <IoArrowBackOutline size={18} />
                  <span>QUAY LẠI TRANG ĐĂNG NHẬP</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-semibold text-xs md:text-sm py-3 rounded-xl transition-colors cursor-pointer"
                >
                  CỔNG ĐẶT PHÒNG
                </button>
              </div>
            </div>
          )}

          {/* 3. Success State */}
          {!isVerifying && isSuccess && (
            <div className="w-full space-y-5 text-center animate-fade-in py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/10">
                <IoCheckmarkCircleOutline size={40} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-1.5">
                  Đặt lại mật khẩu thành công!
                </h3>
                <p className="text-xs md:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Mật khẩu cho tài khoản <strong>{tokenInfo?.account}</strong> đã được đổi thành công. Liên kết xác thực này hiện đã được vô hiệu hóa.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 text-left flex items-center gap-3">
                <IoShieldCheckmarkOutline size={22} className="text-emerald-700 shrink-0" />
                <span>Bây giờ bạn có thể đăng nhập bình thường bằng mật khẩu mới vừa thiết lập.</span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-xs md:text-sm py-3.5 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <span>ĐĂNG NHẬP NGAY</span>
              </button>
            </div>
          )}

          {/* 4. Active Reset Form */}
          {!isVerifying && !verifyError && !isSuccess && tokenInfo && (
            <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-in">
              {/* Account Card & Countdown Timer */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {(tokenInfo.userName || tokenInfo.account)[0]?.toUpperCase() || <IoPersonOutline size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{tokenInfo.userName || tokenInfo.account}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      Tài khoản: <span className="font-semibold text-primary">{tokenInfo.account}</span>
                      {tokenInfo.userEmail && <span className="ml-1 opacity-80">({tokenInfo.userEmail})</span>}
                    </div>
                  </div>
                </div>

                {/* 10-minute Countdown badge */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-colors shadow-2xs ${
                    remainingSeconds < 120
                      ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                  title="Thời gian còn lại để cập nhật mật khẩu"
                >
                  <IoTimeOutline size={15} />
                  <span className="font-mono tracking-tight">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              {/* Input: New Password */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <IoLockClosedOutline className="absolute left-3.5 text-slate-400" size={18} strokeWidth={1.5} />
                  <input
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm text-slate-800 placeholder-slate-400 transition-all"
                    placeholder="Nhập tối thiểu 6 ký tự"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <IoEyeOffOutline size={18} strokeWidth={1.5} /> : <IoEyeOutline size={18} strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex gap-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.level >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.level >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.level >= 3 ? strength.color : 'bg-transparent'}`} />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Độ bảo mật: <strong className="font-semibold text-slate-700">{strength.text}</strong></span>
                      <span className="opacity-75">{newPassword.length} ký tự</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input: Confirm Password */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <IoLockClosedOutline className="absolute left-3.5 text-slate-400" size={18} strokeWidth={1.5} />
                  <input
                    className={`w-full pl-10 pr-10 py-2.5 bg-white border ${
                      confirmPassword && !passwordsMatch
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                        : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } rounded-xl focus:outline-none text-sm text-slate-800 placeholder-slate-400 transition-all`}
                    placeholder="Nhập lại mật khẩu mới"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <IoEyeOffOutline size={18} strokeWidth={1.5} /> : <IoEyeOutline size={18} strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Match Status */}
                {confirmPassword && (
                  <div className="mt-1.5 text-xs font-medium">
                    {passwordsMatch ? (
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <IoCheckmarkCircleOutline size={16} /> Mật khẩu xác nhận trùng khớp
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1.5">
                        <IoAlertCircleOutline size={16} /> Mật khẩu xác nhận chưa khớp
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit & Secondary Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-xs md:text-sm py-3 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider"
                  type="submit"
                  disabled={submitting || !passwordsMatch || remainingSeconds <= 0}
                >
                  {submitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{submitting ? 'ĐANG CẬP NHẬT...' : 'XÁC NHẬN ĐỔI MẬT KHẨU'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-semibold text-xs md:text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <IoArrowBackOutline size={17} />
                  <span>QUAY LẠI TRANG ĐĂNG NHẬP</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Copyright */}
          <div className="mt-8 text-center text-xs text-slate-400 select-none">
            © {new Date().getFullYear()} {hotelSetting?.propertyName || 'Stay Away'}. Hệ thống quản lý vận hành chuyên nghiệp.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
