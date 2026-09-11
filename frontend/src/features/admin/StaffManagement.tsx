import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import authApi from '../../services/authApi';
import userApi from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { IoAlertCircleOutline, IoCallOutline, IoCheckmarkCircleOutline, IoInformationCircleOutline, IoKeyOutline, IoLockClosedOutline, IoLockOpenOutline, IoMailOutline, IoPencilOutline, IoPersonAddOutline, IoPersonOutline, IoShieldOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useToast, useConfirm } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import PasswordResetManagementModal from './PasswordResetManagementModal';
import UserPermissionModal from './UserPermissionModal';
import usePasswordResetNotification from '../../hooks/usePasswordResetNotification';
import { UserResponse, Role } from '../../types';

const StaffManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { pendingCount: pendingResetCount } = usePasswordResetNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [permissionModalUser, setPermissionModalUser] = useState<UserResponse | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const roles = [
    { value: 'RECEPTIONIST', label: 'Lễ tân' },
    { value: 'HOUSEKEEPER', label: 'Buồng phòng' },
    { value: 'ACCOUNTANT', label: 'Kế toán' },
    { value: 'ADMIN', label: 'Quản trị viên' },
    { value: 'OWNER', label: 'Chủ sở hữu' }
  ];

  const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Chủ sở hữu',
    ADMIN: 'Quản trị viên',
    RECEPTIONIST: 'Lễ tân',
    HOUSEKEEPER: 'Buồng phòng',
    ACCOUNTANT: 'Kế toán'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchParams.get('openReset') === 'true') {
      setShowPasswordResetModal(true);
    }
  }, [searchParams]);

  const handleClosePasswordResetModal = () => {
    setShowPasswordResetModal(false);
    if (searchParams.get('openReset')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('openReset');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getAllUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
      showActionMessage('error', 'Không thể tải danh sách nhân viên.');
    } finally {
      setIsLoading(false);
    }
  };

  const showActionMessage = (type: string, text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
  };

  // --- Handlers for Modals ---
  const handleOpenCreateModal = () => {
    setFormData({
      account: '',
      password: '',
      name: '',
      phone: '',
      email: '',
      role: 'RECEPTIONIST'
    });
    setErrors({});
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (u: UserResponse) => {
    setSelectedUser(u);
    setFormData({
      name: u.name || '',
      phone: u.phone || '',
      email: u.email || ''
    });
    setErrors({});
    setShowEditModal(true);
  };

  const handleOpenRoleModal = (u: UserResponse) => {
    setSelectedUser(u);
    setFormData({ role: u.role });
    setErrors({});
    setShowRoleModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowRoleModal(false);
    setSelectedUser(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const confirm = useConfirm();

  // --- API Actions ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    try {
      await authApi.register(formData);
      showActionMessage('success', 'Tạo tài khoản thành công!');
      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSaving(true);
    setErrors({});

    try {
      await userApi.updateUserByAdmin(selectedUser.id, formData);
      showActionMessage('success', 'Cập nhật thông tin thành công!');
      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSaving(true);
    setErrors({});

    try {
      await userApi.updateUserRole(selectedUser.id, formData.role as Role);
      showActionMessage('success', 'Đổi vai trò thành công!');
      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLock = async (u: UserResponse) => {
    if (u.id === currentUser?.id) {
      toastWarning("Bạn không thể khóa chính mình!", "Không được phép");
      return;
    }

    const isLocking = u.active;
    const isConfirmed = await confirm({
      title: isLocking ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản',
      message: isLocking 
        ? `Bạn có chắc chắn muốn KHÓA tài khoản "${(u as any).account || u.name}" (${u.name})? Nhân viên này sẽ không thể đăng nhập.`
        : `Mở khóa và cho phép tài khoản "${(u as any).account || u.name}" (${u.name}) đăng nhập lại vào hệ thống?`,
      confirmText: isLocking ? 'Khóa tài khoản' : 'Mở khóa',
      type: isLocking ? 'danger' : 'info'
    });
    if (!isConfirmed) return;

    try {
      if (u.active) {
        await userApi.lockUser(u.id);
        toastSuccess('Đã khóa tài khoản thành công!');
      } else {
        await userApi.unlockUser(u.id);
        toastSuccess('Đã mở khóa tài khoản thành công!');
      }
      fetchUsers();
    } catch {
      toastError('Có lỗi xảy ra khi thao tác tài khoản.');
    }
  };

  const handleApiError = (error: any) => {
    if (error.response && error.response.status === 400 && error.response.data) {
      setErrors(error.response.data);
    } else if (error.response && error.response.status === 409) {
      toastError(error.response.data.message || 'Dữ liệu đã tồn tại.');
    } else {
      toastError('Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Đang tải danh sách nhân sự..." />;
  }

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="px-4 py-3 border-b border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container-lowest">
        <div className="flex items-center gap-2">
          <IoPersonOutline size={22} className="text-primary" /> 
          <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
            Quản lý Nhân sự
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={pendingResetCount > 0 ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowPasswordResetModal(true)}
            icon={IoKeyOutline}
            className={`shrink-0 relative ${
              pendingResetCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold border-amber-600 shadow-sm'
                : ''
            }`}
          >
            <span>Cấp lại mật khẩu</span>
            {pendingResetCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 bg-red-600 text-white text-[11px] font-extrabold rounded-full animate-pulse shadow-xs">
                {pendingResetCount} chờ cấp
              </span>
            )}
          </Button>
          <Button size="sm" onClick={handleOpenCreateModal} icon={IoPersonAddOutline} className="shrink-0">
            Thêm nhân viên
          </Button>
        </div>
      </div>

      {pendingResetCount > 0 && (
        <div className="mx-4 mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <IoKeyOutline size={20} className="text-amber-700 shrink-0 animate-bounce" />
            <span>
              Đang có <strong>{pendingResetCount}</strong> yêu cầu cấp lại mật khẩu từ nhân viên đang chờ quản trị viên phê duyệt. Nhấn <strong>"Cấp lại mật khẩu"</strong> để xem chi tiết và cấp mật khẩu tạm.
            </span>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 text-xs py-1"
            onClick={() => setShowPasswordResetModal(true)}
          >
            Mở danh sách ({pendingResetCount})
          </Button>
        </div>
      )}

      {actionMessage.text && (
        <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm animate-fade-in ${actionMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-error border border-red-200'}`}>
          {actionMessage.type === 'success' ? <IoCheckmarkCircleOutline size={24} /> : <IoAlertCircleOutline size={24} />}
          <p className="font-body-md font-medium m-0">{actionMessage.text}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-low border-b-2 border-border-grey text-on-surface-variant font-label-md uppercase tracking-wider">
                <th className="p-4 font-semibold">Nhân viên</th>
                <th className="p-4 font-semibold">Tài khoản</th>
                <th className="p-4 font-semibold">Liên hệ</th>
                <th className="p-4 font-semibold">Vai trò</th>
                <th className="p-4 font-semibold">Trạng thái</th>
                <th className="p-4 font-semibold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border-grey hover:bg-surface-container-low/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.avatarImage ? (
                        <img
                          src={u.avatarImage}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover border border-border-grey shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {u.name?.[0] || 'U'}
                        </div>
                      )}
                      <span className="font-title-sm text-on-surface font-semibold">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-body-md text-on-surface-variant">{(u as any).account || '—'}</td>
                  <td className="p-4">
                    <div className="font-body-sm text-on-surface-variant">{u.phone || '—'}</div>
                    <div className="font-body-sm text-on-surface-variant">{u.email || '—'}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {ROLE_LABELS[u.role] || roles.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.active ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-blue-light rounded-md transition-colors"
                        title="Sửa thông tin"
                      >
                        <IoPencilOutline size={20} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        disabled={u.id === currentUser?.id}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-blue-light rounded-md transition-colors disabled:opacity-30"
                        title="Đổi quyền vai trò"
                      >
                        <IoShieldOutline size={20} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setPermissionModalUser(u)}
                        className="p-1.5 text-on-surface-variant hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Phân quyền xem bổ sung"
                      >
                        <IoShieldCheckmarkOutline size={20} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleToggleLock(u)}
                        disabled={u.id === currentUser?.id}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${u.active ? 'text-on-surface-variant hover:text-error hover:bg-red-50' : 'text-error hover:bg-red-50'}`}
                        title={u.active ? "Khóa tài khoản" : "Mở khóa"}
                      >
                        {u.active ? <IoLockClosedOutline size={20} strokeWidth={1.5} /> : <IoLockOpenOutline size={20} strokeWidth={1.5} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">Chưa có nhân viên nào.</td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* --- MODALS --- */}

      {/* Create Account Modal */}
      <Modal isOpen={showCreateModal} onClose={handleCloseModal} title="Tạo Tài khoản mới" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Tên nhân viên" icon={IoInformationCircleOutline} name="name" value={formData.name || ''} onChange={handleChange} required error={errors.name} />
            <Input label="Tên đăng nhập" icon={IoPersonOutline} name="account" value={formData.account || ''} onChange={handleChange} required minLength={4} error={errors.account} />
            <Input label="Mật khẩu khởi tạo" icon={IoKeyOutline} type="password" name="password" value={formData.password || ''} onChange={handleChange} required minLength={6} error={errors.password} />
            <Select label="Vai trò" icon={IoShieldOutline} name="role" value={formData.role || 'RECEPTIONIST'} onChange={handleChange} options={roles} required />
            <Input label="Số điện thoại" icon={IoCallOutline} name="phone" value={formData.phone || ''} onChange={handleChange} error={errors.phone} />
            <Input label="Email" icon={IoMailOutline} type="email" name="email" value={formData.email || ''} onChange={handleChange} error={errors.email} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <Button variant="ghost" onClick={handleCloseModal}>Hủy</Button>
            <Button type="submit" isLoading={isSaving}>Tạo tài khoản</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Info Modal */}
      {selectedUser && (
        <Modal isOpen={showEditModal} onClose={handleCloseModal} title="Cập nhật thông tin" maxWidth="max-w-xl">
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input label="Tên hiển thị" icon={IoInformationCircleOutline} name="name" value={formData.name || ''} onChange={handleChange} required error={errors.name} />
              <Input label="Số điện thoại" icon={IoCallOutline} name="phone" value={formData.phone || ''} onChange={handleChange} error={errors.phone} />
              <Input label="Email" icon={IoMailOutline} type="email" name="email" value={formData.email || ''} onChange={handleChange} error={errors.email} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button variant="ghost" onClick={handleCloseModal}>Hủy</Button>
              <Button type="submit" isLoading={isSaving}>Lưu thay đổi</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Role Modal */}
      {selectedUser && (
        <Modal isOpen={showRoleModal} onClose={handleCloseModal} title="Đổi Vai trò" maxWidth="max-w-sm">
          <form onSubmit={handleRoleSubmit} className="space-y-6">
            <div>
              <p className="font-body-md text-on-surface mb-4">Thay đổi quyền hạn cho tài khoản <span className="font-semibold text-primary">{(selectedUser as any).account || selectedUser.name}</span>.</p>
              <Select label="Chọn vai trò mới" icon={IoShieldOutline} name="role" value={formData.role || ''} onChange={handleChange} options={roles} required />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button variant="ghost" onClick={handleCloseModal}>Hủy</Button>
              <Button type="submit" isLoading={isSaving}>Xác nhận</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password Reset Requests Modal (Story NCL-01-CN-005) */}
      <PasswordResetManagementModal
        isOpen={showPasswordResetModal}
        onClose={handleClosePasswordResetModal}
      />

      {/* Extra User Permissions Modal (Story NCL-01-CN-006) */}
      {permissionModalUser && (
        <UserPermissionModal
          isOpen={Boolean(permissionModalUser)}
          user={permissionModalUser}
          onClose={() => setPermissionModalUser(null)}
        />
      )}
    </div>
  );
};

export default StaffManagement;
