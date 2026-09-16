import React, { useState, useEffect } from 'react';
import {
  IoCalendarOutline,
  IoSyncOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoShieldCheckmarkOutline,
  IoWarningOutline,
  IoTimeOutline,
  IoAddCircleOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoDownloadOutline,
  IoLayersOutline,
  IoInformationCircleOutline,
  IoRefreshOutline,
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoLinkOutline,
  IoAddOutline,
  IoSearchOutline,
} from 'react-icons/io5';
import { channelApi } from '../../services/channelApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Channel,
  ChannelRequest,
  ChannelRoomMapping,
  ChannelCalendarSyncLog,
  ChannelAvailabilityCheckResponse,
  RoomTypeResponse,
  RoomResponse,
} from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';

const CHANNEL_PLATFORMS = [
  { value: 'AIRBNB', label: 'Airbnb', color: '#FF5A5F', bg: '#FFF0F0' },
  { value: 'BOOKING_COM', label: 'Booking.com', color: '#003580', bg: '#EBF3FF' },
  { value: 'AGODA', label: 'Agoda', color: '#589442', bg: '#F0F9EB' },
  { value: 'TRIP_COM', label: 'Trip.com', color: '#2577E3', bg: '#EFF6FF' },
  { value: 'DIRECT', label: 'Kênh Trực tiếp / Website', color: '#6366F1', bg: '#EEF2FF' },
  { value: 'OTHER', label: 'Kênh OTA khác', color: '#64748B', bg: '#F1F5F9' },
];

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  INITIAL_CREATION: { label: 'Tạo kênh mới', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  CONFIG_UPDATED: { label: 'Cập nhật cấu hình', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  CHANNEL_ACTIVATED: { label: 'Kích hoạt kênh', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  SCHEDULED_CYCLE: { label: 'Quét định kỳ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  BOOKING_CREATED: { label: 'Đặt phòng mới', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  BOOKING_CANCELLED: { label: 'Hủy đặt phòng', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  BOOKING_RESCHEDULED: { label: 'Dời ngày / Gia hạn', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  ROOM_MAINTENANCE: { label: 'Khóa / Giải phóng bảo trì', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  MANUAL_REFRESH: { label: 'Đồng bộ thủ công', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  MANUAL_USER_REQUEST: { label: 'Đồng bộ thủ công', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  TOKEN_REGENERATED: { label: 'Làm mới liên kết', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  FEED_ACCESS: { label: 'Bot truy cập lần đầu', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const ChannelCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { success, error, warning } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'channels' | 'all-logs'>('channels');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [form, setForm] = useState<ChannelRequest>({
    name: '',
    channelCode: 'AIRBNB',
    externalCalendarUrl: '',
    mappings: [],
    syncIntervalMinutes: 15,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Refresh Token Modal
  const [refreshTokenModal, setRefreshTokenModal] = useState<Channel | null>(null);
  const [refreshingToken, setRefreshingToken] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState<Channel | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Logs Modal
  const [logsModalChannel, setLogsModalChannel] = useState<Channel | null>(null);
  const [channelLogs, setChannelLogs] = useState<ChannelCalendarSyncLog[]>([]);
  const [allLogs, setAllLogs] = useState<ChannelCalendarSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Copy tracking
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedExternalId, setCopiedExternalId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Availability Checker State
  const [checkerModalOpen, setCheckerModalOpen] = useState(false);
  const [checkerChannelId, setCheckerChannelId] = useState<number>(0);
  const [checkerRoomTypeId, setCheckerRoomTypeId] = useState<number>(0);
  const [checkerCheckIn, setCheckerCheckIn] = useState<string>('');
  const [checkerCheckOut, setCheckerCheckOut] = useState<string>('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<ChannelAvailabilityCheckResponse | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [channelsData, roomTypesData, roomsData] = await Promise.all([
        channelApi.getAll(),
        roomTypeApi.getAllRoomTypes(),
        roomApi.getAllRooms(),
      ]);
      setChannels(channelsData || []);
      setRoomTypes(roomTypesData || []);
      setRooms(roomsData || []);
    } catch {
      error('Không thể tải danh sách kênh phân phối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await channelApi.getRecentLogs();
      setAllLogs(logs || []);
    } catch {
      error('Không thể tải nhật ký đồng bộ.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getPhysicalRoomCount = (roomTypeId: number): number => {
    return rooms.filter((r) => r.roomTypeId === roomTypeId).length;
  };

  const getAllocatedOnOtherActiveChannels = (
    roomTypeId: number,
    excludeChannelId?: number
  ): number => {
    return channels
      .filter((c) => c.isActive && c.id !== excludeChannelId)
      .reduce((sum, c) => {
        if (c.mappings && c.mappings.length > 0) {
          const m = c.mappings.find((map) => map.roomTypeId === roomTypeId);
          return sum + (m ? m.allocatedRooms : 0);
        } else if (c.roomTypeId === roomTypeId) {
          return sum + (c.allocatedRooms || 0);
        }
        return sum;
      }, 0);
  };

  const handleOpenCreate = () => {
    setEditingChannel(null);
    setForm({
      name: '',
      channelCode: 'AIRBNB',
      externalCalendarUrl: '',
      syncIntervalMinutes: 15,
      isActive: true,
      mappings:
        roomTypes.length > 0
          ? [
              {
                externalRoomTypeCode: 'ROOM_01',
                roomTypeId: roomTypes[0].id,
                allocatedRooms: 1,
              },
            ]
          : [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (channel: Channel) => {
    setEditingChannel(channel);
    let mappings: ChannelRoomMapping[] = [];
    if (channel.mappings && channel.mappings.length > 0) {
      mappings = channel.mappings.map((m) => ({
        id: m.id,
        externalRoomTypeCode: m.externalRoomTypeCode,
        roomTypeId: m.roomTypeId,
        allocatedRooms: m.allocatedRooms,
      }));
    } else if (channel.roomTypeId) {
      mappings = [
        {
          externalRoomTypeCode: `${channel.channelCode}_${channel.roomTypeId}`,
          roomTypeId: channel.roomTypeId,
          allocatedRooms: channel.allocatedRooms || 1,
        },
      ];
    }

    setForm({
      name: channel.name,
      channelCode: channel.channelCode,
      externalCalendarUrl: channel.externalCalendarUrl || '',
      mappings,
      syncIntervalMinutes: channel.syncIntervalMinutes,
      isActive: channel.isActive,
    });
    setModalOpen(true);
  };

  const handleAddMappingRow = () => {
    if (roomTypes.length === 0) {
      warning('Chưa có loại phòng nào trong hệ thống.');
      return;
    }
    const unusedRt = roomTypes.find(
      (rt) => !form.mappings?.some((m) => m.roomTypeId === rt.id)
    );
    const selectedRtId = unusedRt ? unusedRt.id : roomTypes[0].id;
    const newMapping: ChannelRoomMapping = {
      externalRoomTypeCode: `ROOM_${(form.mappings?.length || 0) + 1}`,
      roomTypeId: selectedRtId,
      allocatedRooms: 1,
    };
    setForm((prev) => ({
      ...prev,
      mappings: [...(prev.mappings || []), newMapping],
    }));
  };

  const handleRemoveMappingRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      mappings: prev.mappings?.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateMappingRow = (
    index: number,
    field: keyof ChannelRoomMapping,
    value: any
  ) => {
    setForm((prev) => {
      const nextMappings = [...(prev.mappings || [])];
      nextMappings[index] = { ...nextMappings[index], [field]: value };
      return { ...prev, mappings: nextMappings };
    });
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      warning('Vui lòng nhập tên kênh');
      return;
    }

    if (form.isActive && (!form.mappings || form.mappings.length === 0)) {
      error(
        'Kênh chưa ánh xạ đủ loại phòng thì không được bật đồng bộ. Vui lòng thêm ít nhất một ánh xạ loại phòng.'
      );
      return;
    }

    if (form.mappings && form.mappings.length > 0) {
      const seen = new Set<number>();
      for (const m of form.mappings) {
        if (!m.externalRoomTypeCode || !m.externalRoomTypeCode.trim()) {
          warning('Vui lòng nhập đầy đủ mã loại phòng bên kênh');
          return;
        }
        if (!m.roomTypeId) {
          warning('Vui lòng chọn loại phòng hệ thống cho từng dòng ánh xạ');
          return;
        }
        if (m.allocatedRooms < 1) {
          warning('Số phòng phân bổ phải từ 1 trở lên');
          return;
        }
        if (seen.has(m.roomTypeId)) {
          error('Không thể ánh xạ trùng lặp cùng một loại phòng trong một kênh');
          return;
        }
        seen.add(m.roomTypeId);

        // Client pre-validation
        if (form.isActive) {
          const physical = getPhysicalRoomCount(m.roomTypeId);
          const other = getAllocatedOnOtherActiveChannels(
            m.roomTypeId,
            editingChannel?.id
          );
          if (other + m.allocatedRooms > physical) {
            const rtName =
              roomTypes.find((r) => r.id === m.roomTypeId)?.name || 'Loại phòng';
            error(
              `Tổng phân bổ loại phòng "${rtName}" (${other + m.allocatedRooms}) vượt quá số phòng thực có (${physical} phòng). Hệ thống sẽ chặn lưu.`
            );
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      if (editingChannel) {
        const updated = await channelApi.update(editingChannel.id, form);
        setChannels((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        success(`Đã cập nhật kênh "${updated.name}" thành công!`);
      } else {
        const created = await channelApi.create(form);
        setChannels((prev) => [created, ...prev]);
        success(
          `Đã tạo kênh "${created.name}" và thiết lập ánh xạ loại phòng thành công!`
        );
      }
      setModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu kênh.';
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (channel: Channel) => {
    setTogglingId(channel.id);
    try {
      const updated = await channelApi.toggleActive(channel.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      if (updated.isActive) {
        success(`Đã bật đồng bộ kênh "${updated.name}" thành công!`);
      } else {
        warning(
          `Đã tắt đồng bộ kênh "${updated.name}". Dữ liệu lịch và nhật ký cũ được lưu giữ nguyên.`
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Không thể thay đổi trạng thái kênh.';
      error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenChecker = (channel?: Channel) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setCheckerCheckIn(today);
    setCheckerCheckOut(tomorrow);
    setAvailabilityResult(null);

    const targetChannel = channel || channels[0];
    if (targetChannel) {
      setCheckerChannelId(targetChannel.id);
      const firstMappedRtId =
        targetChannel.mappings && targetChannel.mappings.length > 0
          ? targetChannel.mappings[0].roomTypeId
          : targetChannel.roomTypeId || (roomTypes[0]?.id || 0);
      setCheckerRoomTypeId(firstMappedRtId);
    } else {
      setCheckerChannelId(0);
      setCheckerRoomTypeId(roomTypes[0]?.id || 0);
    }
    setCheckerModalOpen(true);
  };

  const handleRunCheckAvailability = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkerChannelId) {
      warning('Vui lòng chọn kênh đặt phòng');
      return;
    }
    if (!checkerRoomTypeId) {
      warning('Vui lòng chọn loại phòng muốn kiểm tra');
      return;
    }
    if (!checkerCheckIn || !checkerCheckOut) {
      warning('Vui lòng chọn ngày nhận phòng và ngày trả phòng');
      return;
    }
    if (checkerCheckOut <= checkerCheckIn) {
      warning('Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày');
      return;
    }

    setCheckingAvailability(true);
    try {
      const res = await channelApi.checkAvailability(checkerChannelId, {
        roomTypeId: checkerRoomTypeId,
        checkInDate: checkerCheckIn,
        checkOutDate: checkerCheckOut,
      });
      setAvailabilityResult(res);
      if (res.isAvailable) {
        success(
          `CÒN PHÒNG! Kênh "${res.channelName}" còn ${res.availableRooms} phòng loại "${res.roomTypeName}".`
        );
      } else {
        warning(
          `ĐÃ HẾT PHÒNG! Kênh "${res.channelName}" không còn phòng loại "${res.roomTypeName}" cho giai đoạn này.`
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra phòng trống.';
      error(msg);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleCopyUrl = (channel: Channel) => {
    if (!channel.feedUrl) return;
    navigator.clipboard.writeText(channel.feedUrl);
    setCopiedId(channel.id);
    success(`Đã sao chép liên kết tệp lịch iCal cho kênh "${channel.name}"!`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleCopyExternalUrl = (channel: Channel) => {
    if (!channel.externalCalendarUrl) return;
    navigator.clipboard.writeText(channel.externalCalendarUrl);
    setCopiedExternalId(channel.id);
    success(`Đã sao chép đường dẫn lịch phía kênh "${channel.name}"!`);
    setTimeout(() => setCopiedExternalId(null), 3000);
  };

  const handleRefreshTokenConfirm = async () => {
    if (!refreshTokenModal) return;
    setRefreshingToken(true);
    try {
      const updated = await channelApi.refreshToken(refreshTokenModal.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      success(
        `Đã làm mới liên kết lịch thành công! Liên kết cũ đã bị vô hiệu hóa.`
      );
      setRefreshTokenModal(null);
    } catch {
      error('Không thể làm mới liên kết. Vui lòng thử lại.');
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleSyncNow = async (channel: Channel) => {
    setSyncingId(channel.id);
    try {
      const updated = await channelApi.syncChannel(channel.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      success(
        `Đồng bộ tệp lịch thành công! Đã ghi nhận ${
          updated.lastBlockedPeriodsCount || 0
        } khoảng hết chỗ.`
      );
    } catch {
      error('Đồng bộ thất bại. Vui lòng thử lại.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await channelApi.delete(deleteConfirm.id);
      setChannels((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      success(`Đã xóa kênh "${deleteConfirm.name}" thành công.`);
      setDeleteConfirm(null);
    } catch {
      error('Không thể xóa kênh. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const handleViewLogs = async (channel: Channel) => {
    setLogsModalChannel(channel);
    setLoadingLogs(true);
    try {
      const logs = await channelApi.getChannelLogs(channel.id);
      setChannelLogs(logs || []);
    } catch {
      error('Không thể tải nhật ký của kênh.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getPlatformInfo = (code: string) => {
    return (
      CHANNEL_PLATFORMS.find((p) => p.value === code) ||
      CHANNEL_PLATFORMS[CHANNEL_PLATFORMS.length - 1]
    );
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return 'Chưa đồng bộ';
    try {
      const d = new Date(dtStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dtStr;
    }
  };

  if (loading) {
    return <LoadingScreen message="Đang tải dữ liệu kênh phân phối..." />;
  }

  const activeChannelsCount = channels.filter((c) => c.isActive).length;
  const totalAllocatedRooms = channels.reduce((sum, c) => {
    if (c.mappings && c.mappings.length > 0) {
      return sum + c.mappings.reduce((acc, m) => acc + m.allocatedRooms, 0);
    }
    return sum + (c.allocatedRooms || 0);
  }, 0);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Quản Lý Kênh Phân Phối & Đồng Bộ Lịch (OTA Calendar)"
        subtitle="Khai báo kênh OTA, liên kết tệp lịch 2 chiều, ánh xạ loại phòng và tự động đồng bộ theo chuẩn RFC 5545"
        actions={
          <div className="flex items-center space-x-2.5">
            <Button
              variant="outline"
              onClick={() => handleOpenChecker()}
              icon={IoSearchOutline}
            >
              Kiểm Tra Phòng Trống
            </Button>
            {isOwner && (
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                icon={IoAddCircleOutline}
              >
                Thêm Kênh Phân Phối
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <IoLayersOutline size={26} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Tổng số kênh</div>
            <div className="text-2xl font-bold text-gray-900">
              {channels.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IoCheckmarkCircleOutline size={26} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Kênh đang bật đồng bộ
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {activeChannelsCount} / {channels.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <IoCalendarOutline size={26} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Phòng phân bổ qua OTA
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {totalAllocatedRooms} phòng
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <IoSyncOutline size={26} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Chu kỳ cập nhật
            </div>
            <div className="text-sm font-semibold text-gray-800">
              Tức thì + Định kỳ
            </div>
          </div>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 rounded-xl border border-blue-200 text-sm text-gray-700 shadow-sm">
        <div className="flex items-start space-x-3">
          <IoInformationCircleOutline
            className="text-blue-600 mt-0.5 flex-shrink-0"
            size={22}
          />
          <div className="space-y-1.5 leading-relaxed">
            <div className="font-semibold text-gray-900">
              Quy tắc quản lý & Đồng bộ lịch kênh phân phối:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>
                <strong>Đồng bộ 2 chiều:</strong> Khai báo đường dẫn tệp lịch do
                kênh cung cấp và lấy đường dẫn tệp lịch cơ sở chia sẻ ngược lại để
                dán vào kênh OTA (Airbnb, Booking.com...).
              </li>
              <li>
                <strong>Bảng ánh xạ loại phòng:</strong> Cho phép 1 loại phòng bán
                trên nhiều kênh. Tổng số phòng phân bổ qua các kênh không được vượt
                quá số phòng thực có của loại phòng đó.
              </li>
              <li>
                <strong>Điều kiện bật đồng bộ:</strong> Kênh chưa ánh xạ loại phòng
                thì không được bật đồng bộ. Hệ thống tự động chặn nếu vi phạm.
              </li>
              <li>
                <strong>Bật/Tắt linh hoạt:</strong> Chủ cơ sở có thể bật hoặc tắt
                đồng bộ từng kênh bất cứ lúc nào. <em>Tắt kênh không xóa dữ liệu
                hay nhật ký đã đồng bộ trước đó</em>.
              </li>
              <li>
                <strong>Nhật ký & An toàn:</strong> Mọi thay đổi cấu hình kênh đều
                được ghi nhật ký kiểm tra (Audit Log). Đường dẫn có token bảo mật
                khó đoán và có thể làm mới bất cứ lúc nào.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'channels'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <IoLayersOutline size={16} />
          <span>Danh sách Kênh Phân Phối ({channels.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('all-logs');
            fetchAllLogs();
          }}
          className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'all-logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <IoDocumentTextOutline size={16} />
          <span>Nhật Ký Sinh Tệp Toàn Hệ Thống</span>
        </button>
      </div>

      {/* Tab 1: Channels List */}
      {activeTab === 'channels' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {channels.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <IoCalendarOutline
                size={48}
                className="mx-auto text-gray-400 mb-3"
              />
              <p className="text-base font-medium">
                Chưa có kênh phân phối nào được cấu hình
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Bấm "Thêm kênh phân phối" để khai báo kênh và thiết lập ánh xạ loại
                phòng.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Kênh & Nền tảng</th>
                    <th className="py-3.5 px-4">Đường dẫn lịch 2 chiều</th>
                    <th className="py-3.5 px-4">Ánh xạ loại phòng</th>
                    <th className="py-3.5 px-4 text-center">Tổng phân bổ</th>
                    <th className="py-3.5 px-4 text-center">Chu kỳ</th>
                    <th className="py-3.5 px-4 text-center">Khoảng chặn</th>
                    <th className="py-3.5 px-4">Lần đồng bộ cuối</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {channels.map((channel) => {
                    const platform = getPlatformInfo(channel.channelCode);
                    const isCopied = copiedId === channel.id;
                    const isCopiedExternal = copiedExternalId === channel.id;
                    const isSyncing = syncingId === channel.id;
                    const isToggling = togglingId === channel.id;

                    const mappingList =
                      channel.mappings && channel.mappings.length > 0
                        ? channel.mappings
                        : channel.roomTypeId
                        ? [
                            {
                              id: 0,
                              externalRoomTypeCode: `${channel.channelCode}_${channel.roomTypeId}`,
                              roomTypeId: channel.roomTypeId,
                              roomTypeName: channel.roomTypeName,
                              allocatedRooms: channel.allocatedRooms || 1,
                            },
                          ]
                        : [];

                    const channelAllocatedTotal = mappingList.reduce(
                      (sum, m) => sum + m.allocatedRooms,
                      0
                    );

                    return (
                      <tr
                        key={channel.id}
                        className="hover:bg-gray-50/75 transition-colors"
                      >
                        {/* Kênh & Nền tảng */}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <span
                              className="px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide"
                              style={{
                                color: platform.color,
                                backgroundColor: platform.bg,
                              }}
                            >
                              {platform.label}
                            </span>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {channel.name}
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                Token:{' '}
                                {channel.feedToken
                                  ? `${channel.feedToken.slice(0, 10)}...`
                                  : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Đường dẫn lịch 2 chiều */}
                        <td className="py-4 px-4 text-xs space-y-1.5 min-w-[200px]">
                          {/* Phía cơ sở xuất */}
                          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/80 px-2 py-1 rounded">
                            <span className="text-blue-700 font-medium truncate max-w-[140px]" title={channel.feedUrl}>
                              Cơ sở chia sẻ: .ics
                            </span>
                            <button
                              onClick={() => handleCopyUrl(channel)}
                              title="Sao chép link tệp lịch cơ sở chia sẻ cho kênh"
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1"
                            >
                              {isCopied ? (
                                <IoCheckmarkOutline className="text-emerald-600" size={14} />
                              ) : (
                                <IoCopyOutline size={14} />
                              )}
                            </button>
                          </div>

                          {/* Phía kênh cấp */}
                          {channel.externalCalendarUrl ? (
                            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                              <span className="text-gray-600 truncate max-w-[140px]" title={channel.externalCalendarUrl}>
                                Kênh cấp: URL
                              </span>
                              <button
                                onClick={() => handleCopyExternalUrl(channel)}
                                title="Sao chép đường dẫn lịch mà kênh cung cấp"
                                className="text-gray-500 hover:text-gray-700 p-0.5 ml-1"
                              >
                                {isCopiedExternal ? (
                                  <IoCheckmarkOutline className="text-emerald-600" size={14} />
                                ) : (
                                  <IoCopyOutline size={14} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-400 italic text-[11px]">
                              Chưa gắn URL phía kênh
                            </div>
                          )}
                        </td>

                        {/* Ánh xạ loại phòng */}
                        <td className="py-4 px-4">
                          {mappingList.length === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded">
                              Chưa ánh xạ loại phòng
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {mappingList.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center text-xs text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded"
                                >
                                  <span className="font-mono font-bold text-blue-700 mr-1.5">
                                    {m.externalRoomTypeCode}
                                  </span>
                                  <span className="text-gray-400 mr-1.5">→</span>
                                  <span className="font-medium text-gray-900 mr-1.5">
                                    {m.roomTypeName || 'Loại phòng'}
                                  </span>
                                  <span className="text-indigo-600 font-semibold ml-auto">
                                    ({m.allocatedRooms} ph)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Tổng phân bổ */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {channelAllocatedTotal} phòng
                          </span>
                        </td>

                        {/* Chu kỳ */}
                        <td className="py-4 px-4 text-center text-xs text-gray-600">
                          {channel.syncIntervalMinutes} phút
                        </td>

                        {/* Khoảng chặn */}
                        <td className="py-4 px-4 text-center">
                          {channel.lastBlockedPeriodsCount &&
                          channel.lastBlockedPeriodsCount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                              {channel.lastBlockedPeriodsCount} khoảng hết chỗ
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Còn chỗ toàn bộ
                            </span>
                          )}
                        </td>

                        {/* Lần đồng bộ cuối */}
                        <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(channel.lastSyncedAt)}
                        </td>

                        {/* Trạng thái & Toggle */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            {isOwner ? (
                              <button
                                onClick={() => handleToggleActive(channel)}
                                disabled={isToggling}
                                title={
                                  channel.isActive
                                    ? 'Bấm để Tắt đồng bộ (dữ liệu lịch và nhật ký cũ được giữ nguyên)'
                                    : 'Bấm để Bật đồng bộ kênh'
                                }
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  channel.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                                } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    channel.isActive ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            ) : null}
                            <span
                              className={`text-[11px] font-semibold ${
                                channel.isActive
                                  ? 'text-emerald-700'
                                  : 'text-gray-400'
                              }`}
                            >
                              {channel.isActive ? 'Đang bật' : 'Tạm ngưng'}
                            </span>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Copy URL */}
                            <button
                              onClick={() => handleCopyUrl(channel)}
                              title="Sao chép đường dẫn tệp lịch iCal (.ics)"
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isCopied
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                              }`}
                            >
                              {isCopied ? (
                                <IoCheckmarkOutline size={16} />
                              ) : (
                                <IoCopyOutline size={16} />
                              )}
                            </button>

                            {/* Download .ics */}
                            <a
                              href={channel.feedUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Tải / Xem tệp .ics"
                              className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            >
                              <IoDownloadOutline size={16} />
                            </a>

                            {/* Regenerate Token */}
                            {isOwner && (
                              <button
                                onClick={() => setRefreshTokenModal(channel)}
                                title="Làm mới liên kết (Đổi Token bảo mật khi nghi ngờ bị lộ)"
                                className="p-1.5 rounded-lg border bg-white border-gray-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                              >
                                <IoShieldCheckmarkOutline size={16} />
                              </button>
                            )}

                            {/* Sync Now */}
                            <button
                              onClick={() => handleSyncNow(channel)}
                              disabled={isSyncing || !channel.isActive}
                              title={
                                channel.isActive
                                  ? 'Đồng bộ lại tệp lịch ngay lập tức'
                                  : 'Kênh đang tắt đồng bộ'
                              }
                              className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-40"
                            >
                              <IoRefreshOutline
                                size={16}
                                className={isSyncing ? 'animate-spin' : ''}
                              />
                            </button>

                            {/* Check Availability */}
                            <button
                              onClick={() => handleOpenChecker(channel)}
                              title="Kiểm tra tình trạng phòng trống (Còn/Hết phòng) cho kênh này"
                              className="p-1.5 rounded-lg border bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                            >
                              <IoSearchOutline size={16} />
                            </button>

                            {/* View Logs */}
                            <button
                              onClick={() => handleViewLogs(channel)}
                              title="Xem lịch sử các lần sinh tệp"
                              className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            >
                              <IoTimeOutline size={16} />
                            </button>

                            {/* Edit */}
                            {isOwner && (
                              <button
                                onClick={() => handleOpenEdit(channel)}
                                title="Chỉnh sửa cấu hình kênh"
                                className="p-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                              >
                                <IoPencilOutline size={16} />
                              </button>
                            )}

                            {/* Delete */}
                            {isOwner && (
                              <button
                                onClick={() => setDeleteConfirm(channel)}
                                title="Xóa kênh phân phối"
                                className="p-1.5 rounded-lg border bg-white border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                              >
                                <IoTrashOutline size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All System Logs */}
      {activeTab === 'all-logs' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <div className="font-semibold text-gray-800 text-sm">
              50 Lần Sinh Tệp Gần Nhất Toàn Hệ Thống
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllLogs}
              icon={IoRefreshOutline}
              disabled={loadingLogs}
            >
              Làm mới nhật ký
            </Button>
          </div>

          {loadingLogs ? (
            <div className="py-12 text-center text-gray-500">
              Đang tải nhật ký...
            </div>
          ) : allLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Chưa có bản ghi nhật ký sinh tệp nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Kênh phân phối</th>
                    <th className="py-3 px-4">Loại phòng</th>
                    <th className="py-3 px-4">Nguyên nhân kích hoạt</th>
                    <th className="py-3 px-4 text-center">Số khoảng đã chặn</th>
                    <th className="py-3 px-4">Chi tiết các khoảng hết chỗ</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allLogs.map((log) => {
                    const trigger = TRIGGER_LABELS[log.triggeredBy] || {
                      label: log.triggeredBy,
                      color: 'text-gray-600 bg-gray-50 border-gray-200',
                    };

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/75">
                        <td className="py-3 px-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {formatDateTime(log.syncedAt)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {log.channelName}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {log.roomTypeName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${trigger.color}`}
                          >
                            {trigger.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {log.blockedPeriodsCount > 0 ? (
                            <span className="text-rose-600 font-bold">
                              {log.blockedPeriodsCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td
                          className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate"
                          title={log.blockedSummary}
                        >
                          {log.blockedSummary || 'Không có khoảng chặn'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Thành công
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Thêm / Sửa Kênh */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingChannel
            ? 'Chỉnh Sửa Kênh Phân Phối'
            : 'Khai Báo Kênh Phân Phối Mới'
        }
      >
        <form onSubmit={handleSaveChannel} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Tên kênh & Nền tảng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tên kênh phân phối"
              placeholder="Ví dụ: Airbnb - Căn hộ Studio & Deluxe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Select
              label="Nền tảng OTA"
              value={form.channelCode}
              onChange={(e) => setForm({ ...form, channelCode: e.target.value })}
              options={CHANNEL_PLATFORMS.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
              required
            />
          </div>

          {/* Đường dẫn lịch phía kênh cung cấp */}
          <Input
            label="Đường dẫn tệp lịch mà kênh cung cấp (externalCalendarUrl)"
            placeholder="https://www.airbnb.com/calendar/ical/12345678.ics?s=..."
            value={form.externalCalendarUrl || ''}
            onChange={(e) =>
              setForm({ ...form, externalCalendarUrl: e.target.value })
            }
            helperText="Đường dẫn tệp lịch do kênh OTA cung cấp để hệ thống đồng bộ phòng"
          />

          {/* Đường dẫn lịch cơ sở chia sẻ ngược lại (khi sửa kênh) */}
          {editingChannel && editingChannel.feedUrl && (
            <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg text-xs space-y-1.5">
              <div className="font-semibold text-blue-900 flex items-center justify-between">
                <span>Đường dẫn tệp lịch cơ sở chia sẻ ngược lại cho kênh:</span>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(editingChannel)}
                  className="text-blue-700 hover:text-blue-900 flex items-center space-x-1 font-bold"
                >
                  <IoCopyOutline size={14} />
                  <span>Sao chép</span>
                </button>
              </div>
              <div className="font-mono text-gray-700 bg-white p-2 rounded border border-blue-200/80 break-all select-all">
                {editingChannel.feedUrl}
              </div>
              <div className="text-gray-500 text-[11px]">
                Dán liên kết này vào mục "Import Calendar" trên trang quản trị của kênh OTA (Airbnb, Booking.com...).
              </div>
            </div>
          )}

          {/* Chu kỳ đồng bộ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Chu kỳ quét đồng bộ định kỳ (phút)"
              type="number"
              min={1}
              value={form.syncIntervalMinutes?.toString() || '15'}
              onChange={(e) =>
                setForm({
                  ...form,
                  syncIntervalMinutes: Math.max(1, Number(e.target.value)),
                })
              }
              helperText="Hệ thống luôn đồng bộ tức thì khi có biến động booking hoặc bảo trì"
              required
            />

            <div className="flex flex-col justify-center space-y-1 pt-2">
              <label className="text-sm font-medium text-gray-700">
                Trạng thái đồng bộ của kênh
              </label>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700 select-none cursor-pointer"
                >
                  Bật đồng bộ kênh phân phối này
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Kênh chưa ánh xạ loại phòng thì không được bật đồng bộ. Tắt kênh không xóa dữ liệu cũ.
              </p>
            </div>
          </div>

          {/* Bảng ánh xạ loại phòng */}
          <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-gray-900 text-sm flex items-center space-x-1.5">
                  <IoLayersOutline className="text-indigo-600" size={18} />
                  <span>Bảng Ánh Xạ Loại Phòng & Hạn Mức Phân Bổ</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Một loại phòng có thể bán trên nhiều kênh, nhưng tổng phân bổ không được vượt quá số phòng thực có.
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleAddMappingRow}
                icon={IoAddOutline}
              >
                Thêm loại phòng
              </Button>
            </div>

            {form.mappings && form.mappings.length > 0 ? (
              <div className="space-y-3 pt-2">
                {form.mappings.map((mapping, idx) => {
                  const physical = getPhysicalRoomCount(mapping.roomTypeId);
                  const otherAllocated = getAllocatedOnOtherActiveChannels(
                    mapping.roomTypeId,
                    editingChannel?.id
                  );
                  const maxPossible = Math.max(0, physical - otherAllocated);
                  const isOver = mapping.allocatedRooms > maxPossible;

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm space-y-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Mã loại phòng bên kênh */}
                        <div className="md:col-span-4">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Mã loại phòng bên kênh OTA
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 text-xs font-mono border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                            placeholder="Vd: DELUXE_DBL"
                            value={mapping.externalRoomTypeCode}
                            onChange={(e) =>
                              handleUpdateMappingRow(
                                idx,
                                'externalRoomTypeCode',
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>

                        {/* Loại phòng trong hệ thống */}
                        <div className="md:col-span-5">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Loại phòng trong hệ thống
                          </label>
                          <select
                            className="w-full px-3 py-1.5 text-xs border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={mapping.roomTypeId}
                            onChange={(e) =>
                              handleUpdateMappingRow(
                                idx,
                                'roomTypeId',
                                Number(e.target.value)
                              )
                            }
                            required
                          >
                            {roomTypes.map((rt) => (
                              <option key={rt.id} value={rt.id}>
                                {rt.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Số phòng phân bổ */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Phân bổ
                          </label>
                          <input
                            type="number"
                            min={1}
                            className={`w-full px-3 py-1.5 text-xs font-bold border rounded-lg focus:outline-none focus:ring-2 ${
                              isOver
                                ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500'
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            value={mapping.allocatedRooms}
                            onChange={(e) =>
                              handleUpdateMappingRow(
                                idx,
                                'allocatedRooms',
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            required
                          />
                        </div>

                        {/* Xóa dòng */}
                        <div className="md:col-span-1 flex justify-center pb-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveMappingRow(idx)}
                            disabled={form.mappings && form.mappings.length <= 1}
                            title="Xóa dòng ánh xạ này"
                            className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors disabled:opacity-30"
                          >
                            <IoTrashOutline size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Thông tin quota phòng */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 text-gray-500 border-t border-gray-100">
                        <div className="flex space-x-3">
                          <span>
                            Thực có:{' '}
                            <strong className="text-gray-800">
                              {physical} phòng
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Kênh khác đang chiếm:{' '}
                            <strong className="text-indigo-600">
                              {otherAllocated} phòng
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Còn có thể phân bổ:{' '}
                            <strong
                              className={
                                maxPossible > 0
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }
                            >
                              {maxPossible} phòng
                            </strong>
                          </span>
                        </div>

                        {isOver && (
                          <span className="text-rose-600 font-semibold flex items-center space-x-1">
                            <IoAlertCircleOutline size={14} />
                            <span>
                              Vượt quá số phòng thực có! Hệ thống sẽ chặn lưu.
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center space-x-2">
                <IoWarningOutline size={18} className="flex-shrink-0" />
                <span>
                  Kênh chưa có loại phòng ánh xạ nào. <strong>Kênh chưa ánh xạ đủ loại phòng thì không được bật đồng bộ.</strong>
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving
                ? 'Đang lưu...'
                : editingChannel
                ? 'Lưu thay đổi'
                : 'Tạo kênh & Sinh lịch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Xác nhận Làm mới Token */}
      <Modal
        isOpen={Boolean(refreshTokenModal)}
        onClose={() => setRefreshTokenModal(null)}
        title="Làm Mới Liên Kết Lịch iCal (Đổi Token)"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <IoWarningOutline
              className="flex-shrink-0 text-amber-600 mt-0.5"
              size={22}
            />
            <div>
              <div className="font-semibold text-amber-900">
                Cảnh báo bảo mật quan trọng:
              </div>
              <p className="mt-1 leading-relaxed">
                Khi làm mới liên kết,{' '}
                <strong>đường dẫn tệp lịch cũ sẽ bị vô hiệu hóa ngay lập tức</strong>.
                Bất kỳ nền tảng OTA nào đang kết nối bằng link cũ sẽ không thể đồng
                bộ cho đến khi bạn dán liên kết mới vào.
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn làm mới liên kết cho kênh{' '}
            <strong>"{refreshTokenModal?.name}"</strong>?
          </p>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setRefreshTokenModal(null)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleRefreshTokenConfirm}
              disabled={refreshingToken}
            >
              {refreshingToken ? 'Đang tạo mới...' : 'Xác nhận đổi liên kết'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Xác nhận Xóa Kênh */}
      <Modal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="Xóa Kênh Phân Phối"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            <IoAlertCircleOutline
              className="flex-shrink-0 text-rose-600 mt-0.5"
              size={22}
            />
            <div>
              <div className="font-semibold text-rose-900">Hành động không thể hoàn tác:</div>
              <p className="mt-1 leading-relaxed">
                Toàn bộ ánh xạ loại phòng, liên kết tệp lịch iCal và nhật ký đồng bộ của kênh{' '}
                <strong>"{deleteConfirm?.name}"</strong> sẽ bị xóa vĩnh viễn.
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn xóa kênh này?
          </p>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Lịch Sử Nhật Ký Sinh Tệp Của Kênh */}
      <Modal
        isOpen={Boolean(logsModalChannel)}
        onClose={() => setLogsModalChannel(null)}
        title={`Lịch Sử Sinh Tệp Lịch - ${logsModalChannel?.name}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {loadingLogs ? (
            <div className="py-8 text-center text-gray-500">
              Đang tải nhật ký...
            </div>
          ) : channelLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Chưa có bản ghi nhật ký sinh tệp nào cho kênh này.
            </div>
          ) : (
            <div className="space-y-3">
              {channelLogs.map((log) => {
                const trigger = TRIGGER_LABELS[log.triggeredBy] || {
                  label: log.triggeredBy,
                  color: 'text-gray-600 bg-gray-50 border-gray-200',
                };

                return (
                  <div
                    key={log.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-medium border ${trigger.color}`}
                      >
                        {trigger.label}
                      </span>
                      <span className="text-gray-400 font-mono">
                        {formatDateTime(log.syncedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-gray-600">
                        Loại phòng: <strong>{log.roomTypeName}</strong>
                      </span>
                      <span className="font-semibold">
                        Số khoảng đã chặn:{' '}
                        {log.blockedPeriodsCount > 0 ? (
                          <span className="text-rose-600 font-bold">
                            {log.blockedPeriodsCount}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </span>
                    </div>

                    {log.blockedSummary && (
                      <div className="text-gray-500 bg-white p-2 rounded border border-gray-200 font-mono text-[11px] break-all">
                        {log.blockedSummary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setLogsModalChannel(null)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Kiểm Tra Tình Trạng Phòng Trống Kênh OTA */}
      <Modal
        isOpen={checkerModalOpen}
        onClose={() => setCheckerModalOpen(false)}
        title="Kiểm Tra Loại Phòng Trống Theo Kênh Đặt Phòng"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <form
            onSubmit={handleRunCheckAvailability}
            className="space-y-4 bg-gray-50/75 p-4 rounded-xl border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kênh đặt phòng */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kênh đặt phòng (Channel)
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={checkerChannelId}
                  onChange={(e) => {
                    const chId = Number(e.target.value);
                    setCheckerChannelId(chId);
                    const ch = channels.find((c) => c.id === chId);
                    const firstRtId =
                      ch?.mappings && ch.mappings.length > 0
                        ? ch.mappings[0].roomTypeId
                        : ch?.roomTypeId || (roomTypes[0]?.id || 0);
                    setCheckerRoomTypeId(firstRtId);
                    setAvailabilityResult(null);
                  }}
                  required
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.channelCode}) {c.isActive ? '' : '⚠️ [Tạm ngưng]'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loại phòng */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Loại phòng khách muốn đặt
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={checkerRoomTypeId}
                  onChange={(e) => {
                    setCheckerRoomTypeId(Number(e.target.value));
                    setAvailabilityResult(null);
                  }}
                  required
                >
                  {(() => {
                    const selectedChannel = channels.find(
                      (c) => c.id === checkerChannelId
                    );
                    const mappedRts =
                      selectedChannel?.mappings &&
                      selectedChannel.mappings.length > 0
                        ? selectedChannel.mappings
                        : selectedChannel?.roomTypeId
                        ? [
                            {
                              roomTypeId: selectedChannel.roomTypeId,
                              roomTypeName: selectedChannel.roomTypeName,
                              externalRoomTypeCode: selectedChannel.channelCode,
                              allocatedRooms: selectedChannel.allocatedRooms || 1,
                            },
                          ]
                        : [];

                    if (mappedRts.length > 0) {
                      return mappedRts.map((m, idx) => (
                        <option key={idx} value={m.roomTypeId}>
                          {m.roomTypeName || 'Loại phòng'} (Mã kênh:{' '}
                          {m.externalRoomTypeCode} - Phân bổ:{' '}
                          {m.allocatedRooms} phòng)
                        </option>
                      ));
                    }
                    return roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ngày nhận */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ngày nhận phòng (Check-in)
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={checkerCheckIn}
                  onChange={(e) => {
                    setCheckerCheckIn(e.target.value);
                    setAvailabilityResult(null);
                  }}
                  required
                />
              </div>

              {/* Ngày trả */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ngày trả phòng (Check-out)
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-sm border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={checkerCheckOut}
                  onChange={(e) => {
                    setCheckerCheckOut(e.target.value);
                    setAvailabilityResult(null);
                  }}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="primary"
                type="submit"
                icon={IoSearchOutline}
                disabled={checkingAvailability}
              >
                {checkingAvailability
                  ? 'Đang kiểm tra...'
                  : 'Kiểm tra tình trạng phòng'}
              </Button>
            </div>
          </form>

          {/* Kết quả kiểm tra */}
          {availabilityResult && (
            <div className="space-y-4 pt-2">
              {/* Banner trạng thái */}
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3.5 ${
                  availabilityResult.isAvailable
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                {availabilityResult.isAvailable ? (
                  <IoCheckmarkCircleOutline
                    className="text-emerald-600 flex-shrink-0 mt-0.5"
                    size={28}
                  />
                ) : (
                  <IoAlertCircleOutline
                    className="text-rose-600 flex-shrink-0 mt-0.5"
                    size={28}
                  />
                )}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                        availabilityResult.isAvailable
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {availabilityResult.isAvailable
                        ? 'CÒN PHÒNG ĐỂ ĐẶT'
                        : 'ĐÃ HẾT PHÒNG'}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      (Kỳ lưu trú: {availabilityResult.totalNights} đêm)
                    </span>
                  </div>

                  <p className="text-sm font-semibold leading-relaxed">
                    {availabilityResult.message}
                  </p>

                  <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <span>
                      Loại phòng:{' '}
                      <strong>{availabilityResult.roomTypeName}</strong>
                    </span>
                    {availabilityResult.externalRoomTypeCode && (
                      <span>
                        Mã kênh:{' '}
                        <strong>
                          {availabilityResult.externalRoomTypeCode}
                        </strong>
                      </span>
                    )}
                    <span>
                      Phân bổ cho kênh:{' '}
                      <strong>{availabilityResult.allocatedRooms} phòng</strong>
                    </span>
                    <span>
                      Tối đa còn bán được:{' '}
                      <strong
                        className={
                          availabilityResult.isAvailable
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }
                      >
                        {availabilityResult.availableRooms} phòng
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết theo từng đêm */}
              {availabilityResult.dailyDetails &&
                availabilityResult.dailyDetails.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Chi Tiết Tình Trạng Từng Đêm Trong Kỳ Lưu Trú
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-gray-600 border-collapse">
                        <thead className="bg-gray-50/50 text-[11px] font-semibold text-gray-500 border-b border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">Ngày (Đêm)</th>
                            <th className="py-2.5 px-3 text-center">Phân bổ</th>
                            <th className="py-2.5 px-3 text-center">
                              Đang đặt / ở
                            </th>
                            <th className="py-2.5 px-3 text-center">Bảo trì</th>
                            <th className="py-2.5 px-3 text-center">
                              Tổng chiếm
                            </th>
                            <th className="py-2.5 px-3 text-center">
                              Còn bán được
                            </th>
                            <th className="py-2.5 px-3 text-center">
                              Trạng thái
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {availabilityResult.dailyDetails.map((day, dIdx) => (
                            <tr
                              key={dIdx}
                              className={
                                day.isSoldOut
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                  : 'hover:bg-gray-50'
                              }
                            >
                              <td className="py-2 px-3 font-mono font-medium text-gray-900">
                                {day.date} ({day.dayOfWeek})
                              </td>
                              <td className="py-2 px-3 text-center font-semibold text-gray-700">
                                {day.allocatedRooms}
                              </td>
                              <td className="py-2 px-3 text-center text-amber-700 font-medium">
                                {day.bookingOccupied}
                              </td>
                              <td className="py-2 px-3 text-center text-orange-700 font-medium">
                                {day.maintenanceOccupied}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold text-gray-900">
                                {day.totalOccupied}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                <span
                                  className={
                                    day.availableRooms > 0
                                      ? 'text-emerald-700'
                                      : 'text-rose-600'
                                  }
                                >
                                  {day.availableRooms} phòng
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {day.isSoldOut ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Hết chỗ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Còn phòng
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setCheckerModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChannelCalendarPage;
