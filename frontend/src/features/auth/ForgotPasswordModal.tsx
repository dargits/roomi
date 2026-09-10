import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { passwordResetApi, AccountCheckResponse } from '../../services/passwordResetApi';
import { useToast } from '../../context/ToastContext';
import { 
  IoKeyOutline, 
  IoCheckmarkCircleOutline, 
  IoInformationCircleOutline, 
  IoShieldCheckmarkOutline
} from 'react-icons/io5';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<AccountCheckResponse | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState('');

  const handleAccountChange = (val: string) => {
    setAccount(val);
    if (errorMessage) setErrorMessage('');
    if (verifiedUser) setVerifiedUser(null);
  };

  const handleBlur = async () => {
    const cleanAccount = account.trim();
    if (!cleanAccount) return;

    try {
      const checkRes = await passwordResetApi.checkAccount(cleanAccount);
      if (checkRes && checkRes.exists) {
        if (!checkRes.active) {
          setErrorMessage(`Tài khoản "${cleanAccount}" đang bị khóa hoặc ngưng hoạt động.`);
          setVerifiedUser(null);
        } else {
          setVerifiedUser(checkRes);
          setErrorMessage('');
        }
      } else {
        setErrorMessage(`Tài khoản "${cleanAccount}" không tồn tại trong hệ thống. Vui lòng kiểm tra lại!`);
        setVerifiedUser(null);
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra tài khoản:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAccount = account.trim();
    if (!cleanAccount) {
      setErrorMessage('Vui lòng nhập tên đăng nhập tài khoản.');
      toastError('Vui lòng nhập tên đăng nhập.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Kiểm tra tài khoản trước khi gửi yêu cầu
      const checkRes = await passwordResetApi.checkAccount(cleanAccount);
      if (!checkRes || !checkRes.exists) {
        const msg = `Tài khoản "${cleanAccount}" không tồn tại trong hệ thống. Vui lòng kiểm tra lại!`;
        setErrorMessage(msg);
        toastError(msg);
        setLoading(false);
        return;
      }

      if (!checkRes.active) {
        const msg = `Tài khoản "${cleanAccount}" (${checkRes.name}) đang bị khóa. Vui lòng liên hệ trực tiếp Quản trị viên!`;
        setErrorMessage(msg);
        toastError(msg);
        setLoading(false);
        return;
      }

      // 2. Gửi yêu cầu cấp lại mật khẩu
      const res = await passwordResetApi.requestReset(cleanAccount);
      setSubmittedMessage(res.message || `Yêu cầu cấp lại mật khẩu cho tài khoản "${cleanAccount}" đã được gửi tới Quản trị viên thành công!`);
      toastSuccess('Đã gửi yêu cầu cấp lại mật khẩu thành công!');
    } catch (err: any) {
      console.error(err);
      const backendError = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
      setErrorMessage(backendError);
      toastError(backendError);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAccount('');
    setErrorMessage('');
    setVerifiedUser(null);
    setSubmittedMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quên mật khẩu đăng nhập" maxWidth="max-w-md">
      {submittedMessage ? (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 bg-green-100 text-green-700 flex items-center justify-center mx-auto border border-green-300">
            <IoCheckmarkCircleOutline size={30} />
          </div>
          <div className="text-sm font-bold uppercase tracking-wider text-on-surface">Yêu cầu đã được ghi nhận</div>
          <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low p-3.5 border border-border-grey">
            {submittedMessage}
          </p>
          <Button onClick={handleClose} className="w-full">
            Đã hiểu và quay lại
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-surface-container-low border border-border-grey text-xs text-on-surface-variant flex items-start gap-2.5">
            <IoInformationCircleOutline size={18} className="text-primary shrink-0 mt-0.5" />
            <span>
              Hệ thống sẽ kiểm tra tài khoản và gửi yêu cầu tới <strong>Quản trị viên</strong> cơ sở để xác minh và cấp mật khẩu tạm có hiệu lực 24 giờ.
            </span>
          </div>

          <div>
            <Input
              label="Tên đăng nhập tài khoản của bạn"
              required
              value={account}
              onChange={(e) => handleAccountChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="Ví dụ: letan, buongphong, ketoan..."
              autoFocus
              error={errorMessage}
            />

            {/* Thông tin xác thực tài khoản hợp lệ */}
            {verifiedUser && !errorMessage && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                <IoShieldCheckmarkOutline size={18} className="text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold">{verifiedUser.name}</span>
                  <span className="text-emerald-700 ml-1.5">({verifiedUser.role})</span>
                  <span className="text-emerald-600 block text-[11px]">Tài khoản hợp lệ và đang hoạt động.</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" isLoading={loading} icon={IoKeyOutline}>
              Gửi yêu cầu cấp lại
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
