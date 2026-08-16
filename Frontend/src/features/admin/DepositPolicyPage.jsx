import React, { useState, useEffect } from 'react';
import {
  IoAddCircleOutline, IoAlertCircleOutline, IoCheckmarkCircleOutline,
  IoCloseOutline, IoPencilOutline, IoTrashOutline, IoInformationCircleOutline,
  IoCashOutline
} from 'react-icons/io5';
import { depositApi } from '../../services/depositApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';

/**
 * NCL-11-CN-001: Cấu hình chính sách đặt cọc
 * - Chủ cơ sở tạo/sửa/xóa chính sách
 * - Lễ tân/Kế toán chỉ xem
 */
const DepositPolicyPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [policies, setPolicies] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ roomTypeId: '', depositPercent: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [policiesData, roomTypesData] = await Promise.all([
        depositApi.getAllPolicies(),
        roomTypeApi.getAllRoomTypes()
      ]);
      setPolicies(policiesData || []);
      setRoomTypes(roomTypesData || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPolicy(null);
    setForm({ roomTypeId: '', depositPercent: '' });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (policy) => {
    setEditingPolicy(policy);
    setForm({
      roomTypeId: policy.roomTypeId ?? '',
      depositPercent: policy.depositPercent?.toString() ?? ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const pct = parseFloat(form.depositPercent);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setFormError('Tỷ lệ cọc phải từ 0 đến 100%');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        roomTypeId: form.roomTypeId === '' ? null : Number(form.roomTypeId),
        depositPercent: pct
      };
      if (editingPolicy) {
        await depositApi.updatePolicy(editingPolicy.id, payload);
        setMessage({ type: 'success', text: 'Đã cập nhật chính sách đặt cọc.' });
      } else {
        await depositApi.createPolicy(payload);
        setMessage({ type: 'success', text: 'Đã tạo chính sách đặt cọc mới.' });
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await depositApi.deletePolicy(id);
      setMessage({ type: 'success', text: 'Đã xóa chính sách.' });
      setDeleteConfirm(null);
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: 'Không thể xóa chính sách.' });
    }
  };

  const roomTypeOptions = [
    { value: '', label: 'Tất cả loại phòng (chính sách mặc định)' },
    ...roomTypes.map(rt => ({ value: rt.id, label: rt.name }))
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chính sách đặt cọc"
        subtitle="Cấu hình tỷ lệ tiền đặt cọc theo từng loại phòng"
        icon={IoCashOutline}
      >
        {isOwner && (
          <Button variant="primary" icon={IoAddCircleOutline} onClick={openCreate}>
            Thêm chính sách
          </Button>
        )}
      </PageHeader>

      {/* Thông báo phân quyền cho vai trò không phải OWNER */}
      {!isOwner && (
        <div className="flex items-start gap-3 bg-surface-blue-light border border-primary/20 rounded p-4 text-sm text-primary">
          <IoInformationCircleOutline size={18} className="mt-0.5 flex-shrink-0" />
          <span>Bạn chỉ có quyền xem. Chỉ Chủ cơ sở mới có thể thêm hoặc sửa chính sách đặt cọc.</span>
        </div>
      )}

      {/* Alert kết quả */}
      {message.text && (
        <div className={`flex items-center gap-2 p-3 rounded border text-sm ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-error'
        }`}>
          {message.type === 'success' ? <IoCheckmarkCircleOutline size={18} /> : <IoAlertCircleOutline size={18} />}
          {message.text}
          <button className="ml-auto" onClick={() => setMessage({ type: '', text: '' })}>
            <IoCloseOutline size={16} />
          </button>
        </div>
      )}

      {/* Bảng chính sách */}
      <div className="bg-surface-container-lowest rounded border border-border-grey overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Đang tải...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <IoCashOutline size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có chính sách đặt cọc nào</p>
            {isOwner && (
              <div className="mt-3">
                <Button variant="primary" icon={IoAddCircleOutline} onClick={openCreate} className="mx-auto text-sm">
                  Thêm chính sách
                </Button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-border-grey">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Loại phòng</th>
                <th className="text-center px-4 py-3 font-semibold text-on-surface-variant">Tỷ lệ cọc</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Cập nhật lần cuối</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Người sửa</th>
                {isOwner && <th className="text-right px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-grey">
              {policies.map(policy => (
                <tr key={policy.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-on-surface">
                    {policy.roomTypeName}
                    {!policy.roomTypeId && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Mặc định</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-tertiary/10 text-tertiary font-bold px-3 py-1 rounded-full">
                      {policy.depositPercent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {policy.updatedAt
                      ? new Date(policy.updatedAt).toLocaleString('vi-VN')
                      : new Date(policy.createdAt).toLocaleString('vi-VN')}
                    {policy.previousPercent && (
                      <span className="ml-2 text-xs text-on-surface-variant">
                        (trước: {policy.previousPercent}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {policy.updatedByName || '—'}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(policy)}
                          className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                          title="Sửa"
                        >
                          <IoPencilOutline size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(policy)}
                          className="p-1.5 rounded hover:bg-red-50 text-error transition-colors"
                          title="Xóa"
                        >
                          <IoTrashOutline size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Hướng dẫn */}
      <div className="bg-surface-container-low rounded border border-border-grey p-4 text-sm text-on-surface-variant space-y-1">
        <p className="font-medium text-on-surface mb-2">Lưu ý về chính sách đặt cọc:</p>
        <p>• Tỷ lệ cọc được tính trên <strong>tổng tiền phòng dự kiến</strong> của từng đặt phòng.</p>
        <p>• Nếu không cấu hình cho loại phòng cụ thể, hệ thống dùng <strong>chính sách mặc định</strong>.</p>
        <p>• Thay đổi chính sách chỉ ảnh hưởng đến đặt phòng <strong>tạo sau</strong> thời điểm sửa.</p>
        <p>• Mọi thay đổi được ghi nhật ký đầy đủ (người sửa, thời điểm, giá trị cũ/mới).</p>
      </div>

      {/* Modal thêm/sửa */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPolicy ? 'Sửa chính sách đặt cọc' : 'Thêm chính sách đặt cọc'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Select
            label="Loại phòng áp dụng"
            value={form.roomTypeId}
            onChange={e => setForm(p => ({ ...p, roomTypeId: e.target.value }))}
            options={roomTypeOptions}
          />
          <Input
            label="Tỷ lệ cọc (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.depositPercent}
            onChange={e => setForm(p => ({ ...p, depositPercent: e.target.value }))}
            placeholder="VD: 30"
          />
          {/* NCL-11-CN-001-TC-02: Validation 0–100% */}
          {formError && (
            <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
              <IoAlertCircleOutline size={16} />
              {formError}
            </div>
          )}
          <p className="text-xs text-on-surface-variant">
            Ví dụ: 30% → Đặt phòng 3.600.000đ sẽ thu cọc 1.080.000đ.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="ghost" icon={IoCloseOutline} onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button variant="primary" icon={IoCheckmarkCircleOutline} onClick={handleSave} isLoading={saving}>
              {editingPolicy ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Xác nhận xóa chính sách"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Bạn có chắc muốn xóa chính sách đặt cọc{' '}
            <strong className="text-on-surface">{deleteConfirm?.depositPercent}%</strong> cho{' '}
            <strong className="text-on-surface">{deleteConfirm?.roomTypeName}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={IoCloseOutline} onClick={() => setDeleteConfirm(null)}>Hủy</Button>
            <Button variant="danger" icon={IoTrashOutline} onClick={() => handleDelete(deleteConfirm.id)}>
              Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepositPolicyPage;
