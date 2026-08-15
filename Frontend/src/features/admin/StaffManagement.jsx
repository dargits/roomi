import React, { useState, useEffect } from 'react';
import authApi from '../../services/authApi';
import userApi from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { IoAlertCircleOutline, IoCallOutline, IoCheckmarkCircleOutline, IoInformationCircleOutline, IoKeyOutline, IoLockClosedOutline, IoLockOpenOutline, IoMailOutline, IoPencilOutline, IoPersonAddOutline, IoPersonOutline, IoShieldOutline } from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const StaffManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const roles = [
    { value: 'RECEPTIONIST', label: 'Lễ tân' },
    { value: 'HOUSEKEEPER', label: 'Buồng phòng' },
    { value: 'ACCOUNTANT', label: 'Kế toán' },
    { value: 'ADMIN', label: 'Quản trị viên' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
      showActionMessage('error', 'Không thể tải danh sách nhân viên.');
    } finally {
      setIsLoading(false);
    }
  };

  const showActionMessage = (type, text) => {
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

  const handleOpenEditModal = (u) => {
    setSelectedUser(u);
    setFormData({
      name: u.name || '',
      phone: u.phone || '',
      email: u.email || ''
    });
    setErrors({});
    setShowEditModal(true);
  };

  const handleOpenRoleModal = (u) => {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // --- API Actions ---
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    try {
      await authApi.register(formData);
      showActionMessage('success', 'Tạo tài khoản thành công!');
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    try {
      await userApi.updateUserByAdmin(selectedUser.id, formData);
      showActionMessage('success', 'Cập nhật thông tin thành công!');
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    try {
      await userApi.updateUserRole(selectedUser.id, formData.role);
      showActionMessage('success', 'Đổi vai trò thành công!');
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLock = async (u) => {
    if (u.id === currentUser?.id) {
      alert("Bạn không thể khóa chính mình!");
      return;
    }

    const confirmMsg = u.active ? `Bạn có chắc muốn KHÓA tài khoản ${u.account}?` : `Mở khóa tài khoản ${u.account}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (u.active) {
        await userApi.lockUser(u.id);
        showActionMessage('success', 'Đã khóa tài khoản!');
      } else {
        await userApi.unlockUser(u.id);
        showActionMessage('success', 'Đã mở khóa tài khoản!');
      }
      fetchUsers();
    } catch (error) {
      showActionMessage('error', 'Lỗi thao tác.');
    }
  };

  const handleApiError = (error) => {
    if (error.response && error.response.status === 400 && error.response.data) {
      setErrors(error.response.data);
    } else if (error.response && error.response.status === 409) {
      alert(error.response.data.message || 'Dữ liệu đã tồn tại.');
    } else {
      alert('Đã xảy ra lỗi.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden">
      <div className="p-6 border-b border-border-grey flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest">
        <div>
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <IoPersonOutline size={28} className="text-primary" /> 
            Quản lý Nhân sự
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">Danh sách tài khoản và phân quyền cho nhân viên</p>
        </div>
        <Button onClick={handleOpenCreateModal} icon={IoPersonAddOutline} className="uppercase">
          Thêm nhân viên
        </Button>
      </div>

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
                    <span className="font-title-sm text-on-surface">{u.name}</span>
                  </td>
                  <td className="p-4 font-body-md text-on-surface-variant">{u.account}</td>
                  <td className="p-4">
                    <div className="font-body-sm text-on-surface-variant">{u.phone || '—'}</div>
                    <div className="font-body-sm text-on-surface-variant">{u.email || '—'}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {roles.find(r => r.value === u.role)?.label || u.role}
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
                        title="Đổi quyền"
                      >
                        <IoShieldOutline size={20} strokeWidth={1.5} />
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
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant">Chưa có nhân viên nào.</td>
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
            <Input label="Tên nhân viên" icon={IoInformationCircleOutline} name="name" value={formData.name} onChange={handleChange} required error={errors.name} />
            <Input label="Tên đăng nhập (Account)" icon={IoPersonOutline} name="account" value={formData.account} onChange={handleChange} required minLength={4} error={errors.account} />
            <Input label="Mật khẩu khởi tạo" icon={IoKeyOutline} type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} error={errors.password} />
            <Select label="Vai trò (Role)" icon={IoShieldOutline} name="role" value={formData.role} onChange={handleChange} options={roles} required />
            <Input label="Số điện thoại" icon={IoCallOutline} name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} />
            <Input label="Email" icon={IoMailOutline} type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email} />
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
              <Input label="Tên hiển thị" icon={IoInformationCircleOutline} name="name" value={formData.name} onChange={handleChange} required error={errors.name} />
              <Input label="Số điện thoại" icon={IoCallOutline} name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} />
              <Input label="Email" icon={IoMailOutline} type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email} />
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
              <p className="font-body-md text-on-surface mb-4">Thay đổi quyền hạn cho tài khoản <span className="font-semibold text-primary">{selectedUser.account}</span>.</p>
              <Select label="Chọn vai trò mới" icon={IoShieldOutline} name="role" value={formData.role} onChange={handleChange} options={roles} required />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
              <Button variant="ghost" onClick={handleCloseModal}>Hủy</Button>
              <Button type="submit" isLoading={isSaving}>Xác nhận</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default StaffManagement;
