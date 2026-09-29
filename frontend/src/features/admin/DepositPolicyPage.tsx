import React, { useState, useEffect } from 'react';
import {
  IoAddCircleOutline, IoAlertCircleOutline, IoCheckmarkCircleOutline,
  IoCloseOutline, IoPencilOutline, IoTrashOutline, IoInformationCircleOutline,
  IoCashOutline, IoCloseCircleOutline, IoTimeOutline, IoShieldCheckmarkOutline
} from 'react-icons/io5';
import { depositApi } from '../../services/depositApi';
import { cancellationPolicyApi, CancellationPolicyItem } from '../../services/cancellationPolicyApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { RoomTypeResponse } from '../../types';

/**
 * Quản lý Chính sách Cọc & Hoàn Hủy
 * - Tab 1: Chính sách đặt cọc (NCL-11-CN-001)
 * - Tab 2: Cấu hình chính sách hoàn hủy (% phí hủy / tiền cọc, thời gian tính phí sau khi xác nhận)
 * - Chủ cơ sở/Admin tạo/sửa/xóa chính sách
 * - Lễ tân/Kế toán chỉ xem
 * - Quy tắc: Phí hoàn hủy chỉ áp dụng với các booking có đặt cọc
 */
const DepositPolicyPage: React.FC = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'deposit' | 'cancellation'>('deposit');
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // === State cho Chính sách đặt cọc ===
  const [depositPolicies, setDepositPolicies] = useState<any[]>([]);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [editingDepositPolicy, setEditingDepositPolicy] = useState<any>(null);
  const [deleteDepositConfirm, setDeleteDepositConfirm] = useState<any>(null);
  const [depositForm, setDepositForm] = useState({ roomTypeId: '', depositPercent: '' });
  const [depositFormError, setDepositFormError] = useState('');
  const [depositSaving, setDepositSaving] = useState(false);

  // === State cho Chính sách hoàn hủy ===
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicyItem[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [editingCancelPolicy, setEditingCancelPolicy] = useState<CancellationPolicyItem | null>(null);
  const [deleteCancelConfirm, setDeleteCancelConfirm] = useState<CancellationPolicyItem | null>(null);
  const [cancelForm, setCancelForm] = useState({
    roomTypeId: '',
    penaltyPercent: '50',
    hoursAfterConfirmation: '24',
    freeCancelHours: '48',
    description: ''
  });
  const [cancelFormError, setCancelFormError] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [depData, cancelData, roomTypesData] = await Promise.all([
        depositApi.getAllPolicies(),
        cancellationPolicyApi.getAllPolicies(),
        roomTypeApi.getAllRoomTypes()
      ]);
      setDepositPolicies(depData || []);
      setCancellationPolicies(cancelData || []);
      setRoomTypes(roomTypesData || []);
    } catch {
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu chính sách. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Chính sách đặt cọc ---
  const openCreateDeposit = () => {
    setEditingDepositPolicy(null);
    setDepositForm({ roomTypeId: '', depositPercent: '' });
    setDepositFormError('');
    setDepositModalOpen(true);
  };

  const openEditDeposit = (policy: any) => {
    setEditingDepositPolicy(policy);
    setDepositForm({
      roomTypeId: policy.roomTypeId?.toString() ?? '',
      depositPercent: policy.depositPercent?.toString() ?? ''
    });
    setDepositFormError('');
    setDepositModalOpen(true);
  };

  const handleSaveDeposit = async () => {
    const pct = parseFloat(depositForm.depositPercent);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setDepositFormError('Tỷ lệ cọc phải từ 0 đến 100%');
      return;
    }
    setDepositSaving(true);
    setDepositFormError('');
    try {
      const payload = {
        roomTypeId: depositForm.roomTypeId === '' ? null : Number(depositForm.roomTypeId),
        depositPercent: pct
      };
      if (editingDepositPolicy) {
        await depositApi.updatePolicy(editingDepositPolicy.id, payload);
        setMessage({ type: 'success', text: 'Đã cập nhật chính sách đặt cọc.' });
      } else {
        await depositApi.createPolicy(payload);
        setMessage({ type: 'success', text: 'Đã tạo chính sách đặt cọc mới.' });
      }
      setDepositModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setDepositFormError(err.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setDepositSaving(false);
    }
  };

  const handleDeleteDeposit = async (id: number) => {
    try {
      await depositApi.deletePolicy(id);
      setMessage({ type: 'success', text: 'Đã xóa chính sách đặt cọc.' });
      setDeleteDepositConfirm(null);
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: 'Không thể xóa chính sách đặt cọc.' });
    }
  };

  // --- Handlers: Chính sách hoàn hủy ---
  const openCreateCancel = () => {
    setEditingCancelPolicy(null);
    setCancelForm({
      roomTypeId: '',
      penaltyPercent: '50',
      hoursAfterConfirmation: '24',
      freeCancelHours: '48',
      description: ''
    });
    setCancelFormError('');
    setCancelModalOpen(true);
  };

  const openEditCancel = (policy: CancellationPolicyItem) => {
    setEditingCancelPolicy(policy);
    setCancelForm({
      roomTypeId: policy.roomTypeId?.toString() ?? '',
      penaltyPercent: policy.penaltyPercent?.toString() ?? '50',
      hoursAfterConfirmation: (policy.hoursAfterConfirmation ?? 24).toString(),
      freeCancelHours: (policy.freeCancelHours ?? 48).toString(),
      description: policy.description || ''
    });
    setCancelFormError('');
    setCancelModalOpen(true);
  };

  const handleSaveCancel = async () => {
    const penaltyPct = parseFloat(cancelForm.penaltyPercent);
    const hoursAfterConf = parseInt(cancelForm.hoursAfterConfirmation, 10);
    const freeHours = parseInt(cancelForm.freeCancelHours, 10);

    if (isNaN(penaltyPct) || penaltyPct < 0 || penaltyPct > 100) {
      setCancelFormError('Tỷ lệ phí hủy trên tiền cọc phải từ 0% đến 100%');
      return;
    }
    if (isNaN(hoursAfterConf) || hoursAfterConf < 0) {
      setCancelFormError('Khoảng thời gian tính phí sau xác nhận phải là số giờ >= 0');
      return;
    }
    if (isNaN(freeHours) || freeHours < 0) {
      setCancelFormError('Thời hạn hủy miễn phí trước check-in phải là số giờ >= 0');
      return;
    }

    setCancelSaving(true);
    setCancelFormError('');
    try {
      const payload = {
        roomTypeId: cancelForm.roomTypeId === '' ? null : Number(cancelForm.roomTypeId),
        penaltyPercent: penaltyPct,
        hoursAfterConfirmation: hoursAfterConf,
        freeCancelHours: freeHours,
        description: cancelForm.description.trim() || undefined
      };

      if (editingCancelPolicy) {
        await cancellationPolicyApi.updatePolicy(editingCancelPolicy.id, payload);
        setMessage({ type: 'success', text: 'Đã cập nhật chính sách hoàn hủy.' });
      } else {
        await cancellationPolicyApi.createPolicy(payload);
        setMessage({ type: 'success', text: 'Đã tạo chính sách hoàn hủy mới.' });
      }
      setCancelModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setCancelFormError(err.response?.data?.message || 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setCancelSaving(false);
    }
  };

  const handleDeleteCancel = async (id: number) => {
    try {
      await cancellationPolicyApi.deletePolicy(id);
      setMessage({ type: 'success', text: 'Đã xóa chính sách hoàn hủy.' });
      setDeleteCancelConfirm(null);
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: 'Không thể xóa chính sách hoàn hủy.' });
    }
  };

  const roomTypeOptions = [
    { value: '', label: 'Tất cả loại phòng (chính sách mặc định)' },
    ...roomTypes.map(rt => ({ value: String(rt.id), label: rt.name }))
  ];

  // Helper preview calculation
  const previewPenalty = parseFloat(cancelForm.penaltyPercent) || 0;
  const sampleDeposit = 1000000;
  const sampleFee = (sampleDeposit * previewPenalty) / 100;
  const sampleRefund = sampleDeposit - sampleFee;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chính sách Cọc & Hoàn Hủy"
        subtitle="Cấu hình tỷ lệ tiền cọc và biểu phí hoàn hủy sau khi xác nhận theo loại phòng"
        icon={IoShieldCheckmarkOutline}
      >
        {isOwner && (
          <Button
            variant="primary"
            icon={IoAddCircleOutline}
            onClick={activeTab === 'deposit' ? openCreateDeposit : openCreateCancel}
          >
            {activeTab === 'deposit' ? 'Thêm chính sách cọc' : 'Thêm chính sách hoàn hủy'}
          </Button>
        )}
      </PageHeader>

      {/* Tabs navigation */}
      <div className="flex border-b border-border-grey space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'deposit'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoCashOutline size={18} />
          <span>Chính sách đặt cọc</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'deposit' ? 'bg-primary/10 text-primary font-bold' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {depositPolicies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cancellation')}
          className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'cancellation'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <IoCloseCircleOutline size={18} />
          <span>Chính sách hoàn hủy</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'cancellation' ? 'bg-primary/10 text-primary font-bold' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {cancellationPolicies.length}
          </span>
        </button>
      </div>

      {/* Thông báo phân quyền */}
      {!isOwner && (
        <div className="flex items-start gap-3 bg-surface-blue-light border border-primary/20 rounded p-4 text-sm text-primary">
          <IoInformationCircleOutline size={18} className="mt-0.5 flex-shrink-0" />
          <span>Bạn chỉ có quyền xem. Chỉ Chủ cơ sở (Owner/Admin) mới có thể thêm, sửa hoặc xóa các chính sách cọc & hoàn hủy.</span>
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

      {loading ? (
        <LoadingScreen message="Đang tải dữ liệu chính sách..." />
      ) : activeTab === 'deposit' ? (
        /* ================= TAB 1: CHÍNH SÁCH ĐẶT CỌC ================= */
        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded border border-border-grey overflow-hidden">
            {depositPolicies.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <IoCashOutline size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Chưa có chính sách đặt cọc nào</p>
                {isOwner && (
                  <div className="mt-3">
                    <Button variant="primary" icon={IoAddCircleOutline} onClick={openCreateDeposit} className="mx-auto text-sm">
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
                  {depositPolicies.map(policy => (
                    <tr key={policy.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-on-surface">
                        {policy.roomTypeName}
                        {!policy.roomTypeId && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-normal">Mặc định</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-primary/10 text-primary font-bold px-3 py-1 rounded-full">
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
                              onClick={() => openEditDeposit(policy)}
                              className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                              title="Sửa"
                            >
                              <IoPencilOutline size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteDepositConfirm(policy)}
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

          <div className="bg-surface-container-low rounded border border-border-grey p-4 text-sm text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface mb-2 flex items-center gap-1.5">
              <IoInformationCircleOutline className="text-primary" size={18} />
              Lưu ý về chính sách đặt cọc:
            </p>
            <p>• Tỷ lệ cọc được tính trên <strong>tổng tiền phòng dự kiến</strong> của từng đặt phòng.</p>
            <p>• Nếu không cấu hình cho loại phòng cụ thể, hệ thống dùng <strong>chính sách mặc định</strong>.</p>
            <p>• Thay đổi chính sách chỉ ảnh hưởng đến đặt phòng <strong>tạo sau</strong> thời điểm sửa.</p>
            <p>• Mọi thay đổi được ghi nhật ký đầy đủ (người sửa, thời điểm, giá trị cũ/mới).</p>
          </div>
        </div>
      ) : (
        /* ================= TAB 2: CHÍNH SÁCH HOÀN HỦY ================= */
        <div className="space-y-6">
          {/* Banner nguyên tắc cốt lõi */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900 flex items-start gap-3">
            <IoShieldCheckmarkOutline size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950">Quy tắc tính phí hoàn hủy quan trọng:</p>
              <p>
                1. <strong>Chỉ áp dụng với booking có đặt cọc</strong>: Phí hoàn hủy được tính bằng <strong>% trên số tiền cọc thực tế</strong>. Nếu đặt phòng <em>không có cọc</em> (tiền cọc = 0đ), hệ thống tự động miễn phí hủy 100% (0đ) vì không có tiền cọc để khấu trừ.
              </p>
              <p>
                2. <strong>Mốc thời gian tính phí sau khi xác nhận</strong>: Sau khi Lễ tân bấm xác nhận đặt phòng, trong vòng số giờ ân hạn quy định khách được hủy miễn phí hoàn 100% cọc. Hết thời gian này (hoặc cận ngày check-in), hệ thống sẽ trừ % phí phạt cọc và hoàn trả phần tiền cọc còn lại cho khách.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded border border-border-grey overflow-hidden">
            {cancellationPolicies.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant">
                <IoCloseCircleOutline size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Chưa có chính sách hoàn hủy nào</p>
                {isOwner && (
                  <div className="mt-3">
                    <Button variant="primary" icon={IoAddCircleOutline} onClick={openCreateCancel} className="mx-auto text-sm">
                      Thêm chính sách hoàn hủy
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low border-b border-border-grey">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Loại phòng áp dụng</th>
                    <th className="text-center px-4 py-3 font-semibold text-on-surface-variant">Phí hủy / Tiền cọc</th>
                    <th className="text-center px-4 py-3 font-semibold text-on-surface-variant">Tính phí sau xác nhận</th>
                    <th className="text-center px-4 py-3 font-semibold text-on-surface-variant">Hạn hủy miễn phí check-in</th>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Cập nhật lần cuối</th>
                    <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Người sửa</th>
                    {isOwner && <th className="text-right px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey">
                  {cancellationPolicies.map(policy => (
                    <tr key={policy.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-on-surface">
                        <div className="flex items-center gap-1.5">
                          <span>{policy.roomTypeName}</span>
                          {!policy.roomTypeId && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-normal">Mặc định</span>
                          )}
                        </div>
                        {policy.description && (
                          <div className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                            {policy.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-red-50 text-error font-bold px-3 py-1 rounded-full border border-red-200">
                          {policy.penaltyPercent}% tiền cọc
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-xs px-2.5 py-1 rounded border border-amber-200 font-medium">
                          <IoTimeOutline size={14} />
                          {policy.hoursAfterConfirmation && policy.hoursAfterConfirmation > 0
                            ? `Sau ${policy.hoursAfterConfirmation} giờ`
                            : 'Ngay sau xác nhận (0h)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-on-surface-variant">
                        {policy.freeCancelHours && policy.freeCancelHours > 0
                          ? `Trước ${policy.freeCancelHours} giờ`
                          : 'Không giới hạn'}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs">
                        {policy.updatedAt
                          ? new Date(policy.updatedAt).toLocaleString('vi-VN')
                          : policy.createdAt
                          ? new Date(policy.createdAt).toLocaleString('vi-VN')
                          : '—'}
                        {policy.previousPercent && (
                          <span className="ml-1 text-xs text-on-surface-variant">
                            (cũ: {policy.previousPercent}%)
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
                              onClick={() => openEditCancel(policy)}
                              className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                              title="Sửa"
                            >
                              <IoPencilOutline size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteCancelConfirm(policy)}
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

          <div className="bg-surface-container-low rounded border border-border-grey p-4 text-sm text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface mb-2 flex items-center gap-1.5">
              <IoInformationCircleOutline className="text-primary" size={18} />
              Cơ chế vận hành khi Khách hủy phòng:
            </p>
            <p>• <strong>Bước 1: Kiểm tra đặt cọc</strong>: Nếu booking chưa đặt cọc, phí hủy = <strong>0đ</strong>, không tính phí.</p>
            <p>• <strong>Bước 2: Kiểm tra thời gian sau xác nhận</strong>: Khách hủy trong thời gian ân hạn sau khi Lễ tân xác nhận → <strong>Miễn phí 100%</strong>, hoàn toàn bộ tiền cọc.</p>
            <p>• <strong>Bước 3: Khấu trừ phí cọc</strong>: Nếu đã quá thời gian ân hạn hoặc đến sát giờ check-in (nhỏ hơn số giờ miễn phí trước check-in) → Thu phí = <code>% Phí hủy × Tiền cọc</code>. Phần cọc còn lại (nếu có) được hoàn cho khách.</p>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM / SỬA CHÍNH SÁCH ĐẶT CỌC ================= */}
      <Modal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        title={editingDepositPolicy ? 'Sửa chính sách đặt cọc' : 'Thêm chính sách đặt cọc'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Select
            label="Loại phòng áp dụng"
            value={depositForm.roomTypeId}
            onChange={e => setDepositForm(p => ({ ...p, roomTypeId: e.target.value }))}
            options={roomTypeOptions}
          />
          <Input
            label="Tỷ lệ cọc (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={depositForm.depositPercent}
            onChange={e => setDepositForm(p => ({ ...p, depositPercent: e.target.value }))}
            placeholder="VD: 30"
          />
          {depositFormError && (
            <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
              <IoAlertCircleOutline size={16} />
              {depositFormError}
            </div>
          )}
          <p className="text-xs text-on-surface-variant">
            Ví dụ: 30% → Đặt phòng 3.600.000đ sẽ thu cọc 1.080.000đ.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="secondary" icon={IoCloseOutline} onClick={() => setDepositModalOpen(false)}>Hủy</Button>
            <Button variant="primary" icon={IoCheckmarkCircleOutline} onClick={handleSaveDeposit} isLoading={depositSaving}>
              {editingDepositPolicy ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: XÓA CHÍNH SÁCH ĐẶT CỌC ================= */}
      <Modal
        isOpen={!!deleteDepositConfirm}
        onClose={() => setDeleteDepositConfirm(null)}
        title="Xác nhận xóa chính sách cọc"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Bạn có chắc muốn xóa chính sách đặt cọc{' '}
            <strong className="text-on-surface">{deleteDepositConfirm?.depositPercent}%</strong> cho{' '}
            <strong className="text-on-surface">{deleteDepositConfirm?.roomTypeName}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={IoCloseOutline} onClick={() => setDeleteDepositConfirm(null)}>Hủy</Button>
            <Button variant="danger" icon={IoTrashOutline} onClick={() => handleDeleteDeposit(deleteDepositConfirm.id)}>
              Xóa
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: THÊM / SỬA CHÍNH SÁCH HOÀN HỦY ================= */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={editingCancelPolicy ? 'Sửa chính sách hoàn hủy' : 'Cấu hình chính sách hoàn hủy'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <Select
            label="Loại phòng áp dụng"
            value={cancelForm.roomTypeId}
            onChange={e => setCancelForm(p => ({ ...p, roomTypeId: e.target.value }))}
            options={roomTypeOptions}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phí hủy trên tiền cọc (%)"
              type="number"
              min="0"
              max="100"
              step="1"
              value={cancelForm.penaltyPercent}
              onChange={e => setCancelForm(p => ({ ...p, penaltyPercent: e.target.value }))}
              placeholder="VD: 50 hoặc 100"
            />
            <Input
              label="Tính phí sau khi xác nhận (giờ)"
              type="number"
              min="0"
              step="1"
              value={cancelForm.hoursAfterConfirmation}
              onChange={e => setCancelForm(p => ({ ...p, hoursAfterConfirmation: e.target.value }))}
              placeholder="VD: 24"
            />
          </div>

          <Input
            label="Hạn hủy miễn phí trước giờ nhận phòng (giờ)"
            type="number"
            min="0"
            step="1"
            value={cancelForm.freeCancelHours}
            onChange={e => setCancelForm(p => ({ ...p, freeCancelHours: e.target.value }))}
            placeholder="VD: 48 (hủy trước 48h miễn phí)"
          />

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Ghi chú / Điều khoản hiển thị
            </label>
            <textarea
              className="w-full text-sm border border-border-grey rounded p-2 focus:ring-1 focus:ring-primary focus:outline-none bg-surface"
              rows={2}
              value={cancelForm.description}
              onChange={e => setCancelForm(p => ({ ...p, description: e.target.value }))}
              placeholder="VD: Miễn phí hủy trong 24h sau khi xác nhận. Sau 24h trừ 50% tiền cọc."
            />
          </div>

          {/* Minh họa tính toán trực quan */}
          <div className="bg-surface-blue-light/50 border border-primary/20 rounded p-3 text-xs space-y-1.5">
            <div className="font-semibold text-primary flex items-center gap-1">
              <IoInformationCircleOutline size={14} />
              Ví dụ minh họa tính toán:
            </div>
            <p className="text-on-surface">
              • Giả sử khách cọc <strong>1.000.000 đ</strong>. Lễ tân xác nhận đặt phòng lúc <strong>08:00 ngày 01/10</strong>.
            </p>
            <p className="text-on-surface">
              • Nếu khách hủy <strong>trước {cancelForm.hoursAfterConfirmation || 0} giờ</strong> sau khi xác nhận: Phí hủy = <strong>0 đ</strong>, hoàn lại <strong>1.000.000 đ</strong> (100% cọc).
            </p>
            <p className="text-on-surface">
              • Nếu khách hủy <strong>sau {cancelForm.hoursAfterConfirmation || 0} giờ</strong>: Phí hủy = <strong>{previewPenalty}%</strong> × 1.000.000 đ = <strong className="text-error">{sampleFee.toLocaleString('vi-VN')} đ</strong>. Khách nhận lại <strong>{sampleRefund.toLocaleString('vi-VN')} đ</strong>.
            </p>
            <p className="text-on-surface-variant italic">
              * Trường hợp booking <strong>không đặt cọc</strong>: Luôn miễn phí hủy (0 đ).
            </p>
          </div>

          {cancelFormError && (
            <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded p-3">
              <IoAlertCircleOutline size={16} />
              {cancelFormError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
            <Button variant="secondary" icon={IoCloseOutline} onClick={() => setCancelModalOpen(false)}>Hủy</Button>
            <Button variant="primary" icon={IoCheckmarkCircleOutline} onClick={handleSaveCancel} isLoading={cancelSaving}>
              {editingCancelPolicy ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: XÓA CHÍNH SÁCH HOÀN HỦY ================= */}
      <Modal
        isOpen={!!deleteCancelConfirm}
        onClose={() => setDeleteCancelConfirm(null)}
        title="Xác nhận xóa chính sách hoàn hủy"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Bạn có chắc muốn xóa chính sách hoàn hủy phí{' '}
            <strong className="text-on-surface">{deleteCancelConfirm?.penaltyPercent}% tiền cọc</strong> cho{' '}
            <strong className="text-on-surface">{deleteCancelConfirm?.roomTypeName}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={IoCloseOutline} onClick={() => setDeleteCancelConfirm(null)}>Hủy</Button>
            <Button variant="danger" icon={IoTrashOutline} onClick={() => handleDeleteCancel(deleteCancelConfirm.id)}>
              Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepositPolicyPage;
