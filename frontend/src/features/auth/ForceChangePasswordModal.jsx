import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { passwordResetApi } from '../../services/passwordResetApi';
import { useToast } from '../../context/ToastContext';
import { IoLockClosedOutline, IoShieldCheckmarkOutline, IoAlertCircleOutline } from 'react-icons/io5';

const ForceChangePasswordModal = ({ isOpen, account, onSuccess, onCancel }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tempPassword) {
      toastError('Vui lòng nhập mật khẩu tạm thời đã được cấp.');
      return;
    }
    if (newPassword.length < 6) {
      toastError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    if (newPassword === tempPassword) {
      toastError('Mật khẩu mới không được trùng với mật khẩu tạm thời.');
      return;
    }

    setLoading(true);
    try {
      await passwordResetApi.forceChangePassword({
        account,
        tempPassword,
        newPassword,
        confirmPassword
      });
      toastSuccess('Đổi mật khẩu mới thành công! Bạn có thể tiếp tục làm việc.');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toastError(err.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      showCloseButton={false}
      closeOnBackdrop={false}
      title="Thiết lập mật khẩu mới (Bắt buộc)"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
          <IoAlertCircleOutline size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            Bạn vừa đăng nhập bằng <strong>mật khẩu tạm thời</strong>. Để bảo mật tài khoản cá nhân và nhật ký hệ thống, bạn bắt buộc phải tạo mật khẩu mới trước khi tiếp tục.
          </span>
        </div>

        <div>
          <Input
            label="Tài khoản đăng nhập"
            value={account || ''}
            disabled
          />
        </div>

        <div>
          <Input
            label="Mật khẩu tạm thời vừa nhận"
            type="password"
            required
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder="Nhập mật khẩu tạm được cấp..."
          />
        </div>

        <div>
          <Input
            label="Mật khẩu mới"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự..."
            helperText="Mật khẩu bảo mật cá nhân do chính bạn đặt"
          />
        </div>

        <div>
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới..."
          />
        </div>

        <div className="pt-4 border-t border-border-grey space-y-2">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            icon={IoShieldCheckmarkOutline}
          >
            {loading ? 'Đang lưu...' : 'Xác nhận đổi mật khẩu & Tiếp tục'}
          </Button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full py-1.5 text-xs text-on-surface-variant hover:text-error transition-colors text-center cursor-pointer"
            >
              Hủy và quay lại màn hình đăng nhập
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ForceChangePasswordModal;
