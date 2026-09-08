import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { passwordResetApi } from '../../services/passwordResetApi';
import { useToast } from '../../context/ToastContext';
import { IoKeyOutline, IoCheckmarkCircleOutline, IoInformationCircleOutline } from 'react-icons/io5';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account.trim()) {
      toastError('Vui lòng nhập tên đăng nhập.');
      return;
    }

    setLoading(true);
    try {
      const res = await passwordResetApi.requestReset(account.trim());
      setSubmittedMessage(res.message || 'Yêu cầu cấp lại mật khẩu đã được ghi nhận. Vui lòng liên hệ Quản trị viên cơ sở để được xác minh và nhận mật khẩu tạm!');
      toastSuccess('Đã gửi yêu cầu cấp lại mật khẩu thành công!');
    } catch (err) {
      console.error(err);
      toastError('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAccount('');
    setSubmittedMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quên mật khẩu đăng nhập" maxWidth="max-w-md">
      {submittedMessage ? (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
            <IoCheckmarkCircleOutline size={28} />
          </div>
          <div className="text-sm font-semibold text-on-surface">Yêu cầu đã được ghi nhận</div>
          <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low p-3.5 rounded-lg border border-border-grey">
            {submittedMessage}
          </p>
          <Button onClick={handleClose} className="w-full">
            Đã hiểu và quay lại
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-surface-container-low rounded-lg border border-border-grey text-xs text-on-surface-variant flex items-start gap-2">
            <IoInformationCircleOutline size={18} className="text-primary shrink-0 mt-0.5" />
            <span>
              Hệ thống sẽ tạo yêu cầu gửi tới <strong>Quản trị viên</strong> cơ sở để xác minh trực tiếp và cấp mật khẩu tạm có hiệu lực 24 giờ.
            </span>
          </div>

          <div>
            <Input
              label="Tên đăng nhập tài khoản của bạn"
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Ví dụ: letan01, buongphong_mai..."
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button variant="ghost" onClick={handleClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading} icon={IoKeyOutline}>
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu cấp lại'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
