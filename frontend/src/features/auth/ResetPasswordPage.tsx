import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { passwordResetApi, VerifyResetTokenResponse } from '../../services/passwordResetApi';
import { useAppConfig } from '../../context/AppConfigContext';
import { useToast } from '../../context/ToastContext';
import {
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoArrowBackOutline,
  IoShieldCheckmarkOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';

const ResetPasswordPage: React.FC = () => {
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
    if (!pwd) return { level: 0, text: '', color: 'bg-border-grey' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, text: 'Mật khẩu yếu', color: 'bg-[#E53935]' };
    if (score <= 3) return { level: 2, text: 'Độ bảo mật trung bình', color: 'bg-[#FDD835]' };
    return { level: 3, text: 'Mật khẩu mạnh & an toàn', color: 'bg-[#43A047]' };
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
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4 sm:p-6 lg:p-8 antialiased overflow-y-auto">
      <div className="w-full max-w-lg bg-surface-container-lowest border border-border-grey shadow-sm p-6 sm:p-10 flex flex-col items-center my-auto">
        {/* Logo with 5 animated color dots */}
        <div
          className="flex flex-col items-center cursor-pointer select-none mb-5"
          onClick={() => navigate('/')}
        >
          <span className="font-logo font-medium text-[42px] tracking-wide text-[#4a4a4a] leading-none uppercase">
            {hotelSetting?.propertyName || 'STAY AWAY'}
          </span>
          <div className="flex gap-2 mt-2">
            <div className="w-3 h-3 rounded-full bg-[#E53935] animate-bounce [animation-delay:0ms]" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-[#FDD835] animate-bounce [animation-delay:150ms]" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-[#43A047] animate-bounce [animation-delay:300ms]" style={{ animationDelay: '300ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-[#8E24AA] animate-bounce [animation-delay:450ms]" style={{ animationDelay: '450ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-[#1E88E5] animate-bounce [animation-delay:600ms]" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>

        <h1 className="font-headline-md text-headline-md text-on-surface mb-1.5 text-center w-full">
          Cập nhật mật khẩu mới
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mb-6">
          Thiết lập mật khẩu mới an toàn cho tài khoản đăng nhập của bạn.
        </p>

        {/* 1. Loading State */}
        {isVerifying && (
          <div className="w-full py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="inline-block w-8 h-8 border-3 border-agoda-blue border-t-transparent animate-spin rounded-full" />
            <div className="font-title-lg text-sm text-on-surface font-semibold">
              Đang kiểm tra tính hợp lệ của liên kết...
            </div>
            <p className="text-xs text-on-surface-variant">Hệ thống đang xác thực mã bảo mật, vui lòng đợi trong giây lát.</p>
          </div>
        )}

        {/* 2. Error State (Invalid / Expired Token) */}
        {!isVerifying && verifyError && (
          <div className="w-full space-y-5 animate-fade-in">
            <div className="p-4 bg-[#ffebee] border border-[#ffcdd2] text-[#c62828] text-sm flex items-start gap-3">
              <IoAlertCircleOutline size={22} className="shrink-0 mt-0.5 text-[#E53935]" />
              <div>
                <div className="font-bold mb-0.5">Liên kết không hợp lệ hoặc đã hết hạn</div>
                <div className="text-xs text-[#c62828]/90 leading-relaxed">{verifyError}</div>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low border border-border-grey text-xs text-on-surface-variant space-y-2">
              <div className="font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <IoTimeOutline size={16} className="text-primary" /> Lưu ý về thời hạn liên kết:
              </div>
              <p className="leading-relaxed">
                Vì lý do an ninh, mỗi liên kết đặt lại mật khẩu chỉ có hiệu lực trong vòng <strong>10 phút</strong>. Bạn có thể quay lại trang đăng nhập để gửi lại yêu cầu cấp liên kết mới bất kỳ lúc nào.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full bg-agoda-blue hover:bg-primary-container text-on-primary font-title-lg text-title-lg py-2.5 rounded-DEFAULT shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <IoArrowBackOutline size={20} />
                <span>QUAY LẠI TRANG ĐĂNG NHẬP</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full border border-border-grey text-on-surface hover:bg-surface-container-low font-title-lg text-title-lg py-2.5 rounded-DEFAULT transition-colors"
              >
                CỔNG ĐẶT PHÒNG
              </button>
            </div>
          </div>
        )}

        {/* 3. Success State */}
        {!isVerifying && isSuccess && (
          <div className="w-full space-y-5 text-center animate-fade-in py-4">
            <div className="w-16 h-16 bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7] flex items-center justify-center mx-auto">
              <IoCheckmarkCircleOutline size={40} />
            </div>

            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                Đặt lại mật khẩu thành công!
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Mật khẩu cho tài khoản <strong>{tokenInfo?.account}</strong> đã được đổi thành công. Liên kết xác thực này hiện đã được vô hiệu hóa.
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left flex items-center gap-2.5">
              <IoShieldCheckmarkOutline size={20} className="text-emerald-700 shrink-0" />
              <span>Bây giờ bạn có thể đăng nhập bình thường bằng mật khẩu mới vừa thiết lập.</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full bg-agoda-blue hover:bg-primary-container text-on-primary font-title-lg text-title-lg py-3 rounded-DEFAULT shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <span>ĐĂNG NHẬP NGAY</span>
            </button>
          </div>
        )}

        {/* 4. Active Reset Form */}
        {!isVerifying && !verifyError && !isSuccess && tokenInfo && (
          <form onSubmit={handleSubmit} className="w-full space-y-5 animate-fade-in">
            {/* Account Card & Countdown Timer */}
            <div className="p-3.5 bg-surface-container-low border border-border-grey flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-agoda-blue text-white flex items-center justify-center shrink-0">
                  <IoPersonOutline size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-on-surface">{tokenInfo.userName || tokenInfo.account}</div>
                  <div className="text-xs text-on-surface-variant">
                    Tài khoản: <span className="font-semibold text-primary">{tokenInfo.account}</span>
                    {tokenInfo.userEmail && <span className="ml-1.5 opacity-80">({tokenInfo.userEmail})</span>}
                  </div>
                </div>
              </div>

              {/* 10-minute Countdown badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold shrink-0 ${
                  remainingSeconds < 120
                    ? 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2] animate-pulse'
                    : 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]'
                }`}
                title="Thời gian còn lại để cập nhật mật khẩu"
              >
                <IoTimeOutline size={16} />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
            </div>

            {/* Input: New Password */}
            <div className="relative">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                Mật khẩu mới <span className="text-alert-red">*</span>
              </label>
              <div className="relative flex items-center">
                <IoLockClosedOutline className="absolute left-3 text-outline" size={20} strokeWidth={1.5} />
                <input
                  className="w-full pl-10 pr-10 py-2.5 border border-border-grey rounded-DEFAULT focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface transition-colors"
                  placeholder="Nhập tối thiểu 6 ký tự"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  className="absolute right-3 text-outline hover:text-primary transition-colors focus:outline-none"
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <IoEyeOffOutline size={20} strokeWidth={1.5} /> : <IoEyeOutline size={20} strokeWidth={1.5} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-surface-container">
                    <div className={`h-full flex-1 transition-all duration-300 ${strength.level >= 1 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${strength.level >= 2 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 transition-all duration-300 ${strength.level >= 3 ? strength.color : 'bg-transparent'}`} />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                    <span>Độ bảo mật: <strong className="font-semibold">{strength.text}</strong></span>
                    <span className="opacity-75">{newPassword.length} ký tự</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input: Confirm Password */}
            <div className="relative">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                Xác nhận mật khẩu mới <span className="text-alert-red">*</span>
              </label>
              <div className="relative flex items-center">
                <IoLockClosedOutline className="absolute left-3 text-outline" size={20} strokeWidth={1.5} />
                <input
                  className={`w-full pl-10 pr-10 py-2.5 border ${
                    confirmPassword && !passwordsMatch
                      ? 'border-alert-red focus:border-alert-red focus:ring-1 focus:ring-alert-red'
                      : 'border-border-grey focus:border-primary focus:ring-1 focus:ring-primary'
                  } rounded-DEFAULT focus:outline-none font-body-md text-body-md text-on-surface transition-colors`}
                  placeholder="Nhập lại mật khẩu mới"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  className="absolute right-3 text-outline hover:text-primary transition-colors focus:outline-none"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <IoEyeOffOutline size={20} strokeWidth={1.5} /> : <IoEyeOutline size={20} strokeWidth={1.5} />}
                </button>
              </div>

              {/* Match Status */}
              {confirmPassword && (
                <div className="mt-1.5 text-xs font-medium">
                  {passwordsMatch ? (
                    <span className="text-[#2e7d32] flex items-center gap-1">
                      <IoCheckmarkCircleOutline size={15} /> Mật khẩu xác nhận trùng khớp
                    </span>
                  ) : (
                    <span className="text-[#c62828] flex items-center gap-1">
                      <IoAlertCircleOutline size={15} /> Mật khẩu xác nhận chưa khớp
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              className="w-full bg-agoda-blue hover:bg-primary-container text-on-primary font-title-lg text-title-lg py-2.5 rounded-DEFAULT shadow-sm hover:shadow-md transition-all disabled:opacity-70 flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting || !passwordsMatch || remainingSeconds <= 0}
            >
              {submitting && (
                <span className="inline-block w-4.5 h-4.5 border-2 border-white border-t-transparent border-l-transparent animate-square-spin" />
              )}
              <span>{submitting ? 'ĐANG CẬP NHẬT...' : 'XÁC NHẬN ĐỔI MẬT KHẨU'}</span>
            </button>

            {/* Secondary Button: Back to Login */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full border border-agoda-blue text-agoda-blue hover:bg-surface-blue-light font-title-lg text-title-lg py-2.5 rounded-DEFAULT transition-colors flex items-center justify-center gap-2"
            >
              <IoArrowBackOutline size={18} />
              <span>QUAY LẠI TRANG ĐĂNG NHẬP</span>
            </button>
          </form>
        )}

        {/* Footer copyright */}
        <div className="mt-8 text-center text-xs text-outline select-none">
          © {new Date().getFullYear()} {hotelSetting?.propertyName || 'Stay Away'}. Hệ thống quản lý vận hành chuyên nghiệp.
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
