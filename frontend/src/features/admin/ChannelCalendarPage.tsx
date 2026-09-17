import React, { useState, useEffect, useMemo } from 'react';
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
  IoCloseCircleOutline,
  IoFilterOutline,
  IoEyeOutline,
  IoPauseCircleOutline,
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
  ChannelWarningSummary,
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
  MANUAL_SYNC_ALL: { label: 'Đồng bộ hàng loạt', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  CONNECTION_TEST: { label: 'Kiểm tra kết nối', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  TOKEN_REGENERATED: { label: 'Làm mới liên kết', color: 'text-teal-600 bg-teal-50 border-teal-200' },
  FEED_ACCESS: { label: 'Bot truy cập lần đầu', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const ChannelCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const { success, error, warning } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [warningSummary, setWarningSummary] = useState<ChannelWarningSummary | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'channels' | 'all-logs'>('channels');
  const [channelFilterStatus, setChannelFilterStatus] = useState<string>('ALL');

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

  // Error Detail Modal
  const [selectedErrorChannel, setSelectedErrorChannel] = useState<Channel | null>(null);

  // Logs Modal (single channel)
  const [logsModalChannel, setLogsModalChannel] = useState<Channel | null>(null);
  const [channelLogs, setChannelLogs] = useState<ChannelCalendarSyncLog[]>([]);
  const [allLogs, setAllLogs] = useState<ChannelCalendarSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Log Filters for All Logs tab
  const [logFilterChannel, setLogFilterChannel] = useState<string>('ALL');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [logFilterTrigger, setLogFilterTrigger] = useState<string>('ALL');
  const [logSearchText, setLogSearchText] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ChannelCalendarSyncLog | null>(null);

  // Actions tracking
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedExternalId, setCopiedExternalId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [testingConnectionId, setTestingConnectionId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
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
      const [channelsData, warningSummaryData, roomTypesData, roomsData] = await Promise.all([
        channelApi.getAll(),
        channelApi.getWarningSummary().catch(() => null),
        roomTypeApi.getAllRoomTypes(),
        roomApi.getAllRooms(),
      ]);
      setChannels(channelsData || []);
      setWarningSummary(warningSummaryData);
      setRoomTypes(roomTypesData || []);
      setRooms(roomsData || []);
    } catch {
      error('Không thể tải danh sách kênh phân phối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarningSummary = async () => {
    try {
      const summary = await channelApi.getWarningSummary();
      setWarningSummary(summary);
    } catch {
      // ignore
    }
  };

  const fetchAllLogs = async () => {
    setLoadingLogs(true);
    try {
      const params: { channelId?: number; status?: string; triggeredBy?: string } = {};
      if (logFilterChannel !== 'ALL') {
        params.channelId = Number(logFilterChannel);
      }
      if (logFilterStatus !== 'ALL') {
        params.status = logFilterStatus;
      }
      if (logFilterTrigger !== 'ALL') {
        params.triggeredBy = logFilterTrigger;
      }

      const logs = await channelApi.getLogsWithFilter(params);
      setAllLogs(logs || []);
    } catch {
      error('Không thể tải nhật ký đồng bộ.');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all-logs') {
      fetchAllLogs();
    }
  }, [activeTab, logFilterChannel, logFilterStatus, logFilterTrigger]);

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
      fetchWarningSummary();
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
      fetchWarningSummary();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Không thể thay đổi trạng thái kênh.';
      error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (channel: Channel) => {
    setTestingConnectionId(channel.id);
    try {
      const updated = await channelApi.testConnection(channel.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      if (updated.connectionStatus === 'HEALTHY') {
        success(`Kết nối tới kênh "${updated.name}" ổn định và đã đồng bộ dữ liệu mới nhất!`);
      } else if (updated.connectionStatus === 'DISCONNECTED') {
        error(`Cảnh báo: Kênh "${updated.name}" mất kết nối! ${updated.lastSyncErrorMessage || ''}`);
      } else {
        warning(`Kênh "${updated.name}": ${updated.connectionStatusMessage}`);
      }
      fetchWarningSummary();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kiểm tra kết nối thất bại.';
      error(msg);
    } finally {
      setTestingConnectionId(null);
    }
  };

  const handleSyncChannel = async (channel: Channel) => {
    setSyncingId(channel.id);
    try {
      const updated = await channelApi.syncChannel(channel.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      success(`Đã đồng bộ tệp lịch cho kênh "${updated.name}" thành công!`);
      fetchWarningSummary();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đồng bộ thất bại.';
      error(msg);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const updatedList = await channelApi.syncAll('MANUAL_USER_REQUEST');
      setChannels(updatedList || []);
      success('Đã kích hoạt đồng bộ lại toàn bộ các kênh phân phối!');
      fetchWarningSummary();
    } catch (err: any) {
      error(err.response?.data?.message || 'Đồng bộ hàng loạt thất bại.');
    } finally {
      setSyncingAll(false);
    }
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
        `Đã tạo token bảo mật mới cho kênh "${updated.name}". Vui lòng sao chép lại liên kết mới!`
      );
      setRefreshTokenModal(null);
      fetchWarningSummary();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể làm mới token.';
      error(msg);
    } finally {
      setRefreshingToken(false);
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
      fetchWarningSummary();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa kênh phân phối.';
      error(msg);
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
      error('Không thể tải lịch sử nhật ký của kênh này.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCopyUrl = (channel: Channel) => {
    if (!channel.feedUrl) return;
    navigator.clipboard.writeText(channel.feedUrl);
    setCopiedId(channel.id);
    success('Đã sao chép đường dẫn tệp lịch iCal vào clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyExternalUrl = (channel: Channel) => {
    if (!channel.externalCalendarUrl) return;
    navigator.clipboard.writeText(channel.externalCalendarUrl);
    setCopiedExternalId(channel.id);
    success('Đã sao chép đường dẫn lịch phía kênh vào clipboard!');
    setTimeout(() => setCopiedExternalId(null), 2500);
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
    if (checkerCheckIn >= checkerCheckOut) {
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kiểm tra phòng trống thất bại.';
      error(msg);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const getPlatformInfo = (code: string) => {
    return (
      CHANNEL_PLATFORMS.find((p) => p.value === code) || {
        value: code,
        label: code,
        color: '#4B5563',
        bg: '#F3F4F6',
      }
    );
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Chưa đồng bộ';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Render Status Badge
  const renderConnectionBadge = (channel: Channel) => {
    const status = channel.connectionStatus || (channel.isActive ? 'HEALTHY' : 'PAUSED');

    if (status === 'PAUSED' || !channel.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
          <IoPauseCircleOutline className="mr-1 text-gray-500" size={14} />
          Tạm ngưng
        </span>
      );
    }

    if (status === 'DISCONNECTED') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <IoAlertCircleOutline className="mr-1 text-rose-600" size={15} />
            Mất kết nối
          </span>
          <button
            type="button"
            onClick={() => setSelectedErrorChannel(channel)}
            className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline flex items-center"
          >
            <IoEyeOutline className="mr-0.5" size={13} />
            Xem lỗi chi tiết
          </button>
        </div>
      );
    }

    if (status === 'STALE') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <IoWarningOutline className="mr-1 text-amber-600" size={14} />
            Ngừng cập nhật / Trễ
          </span>
          <span className="text-[10px] text-amber-700 font-medium max-w-[140px] truncate" title="Quá hạn đồng bộ - Nguy cơ trùng phòng">
            Nguy cơ trùng phòng
          </span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <IoCheckmarkCircleOutline className="mr-1 text-emerald-600" size={14} />
        Kết nối tốt
      </span>
    );
  };

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    if (channelFilterStatus === 'ALL') return channels;
    if (channelFilterStatus === 'WARNINGS') {
      return channels.filter(
        (c) => c.connectionStatus === 'DISCONNECTED' || c.connectionStatus === 'STALE'
      );
    }
    if (channelFilterStatus === 'ACTIVE') return channels.filter((c) => c.isActive);
    if (channelFilterStatus === 'HEALTHY') return channels.filter((c) => c.connectionStatus === 'HEALTHY');
    if (channelFilterStatus === 'PAUSED') return channels.filter((c) => !c.isActive || c.connectionStatus === 'PAUSED');
    return channels;
  }, [channels, channelFilterStatus]);

  // Filtered All Logs (search text)
  const filteredAllLogs = useMemo(() => {
    if (!logSearchText.trim()) return allLogs;
    const q = logSearchText.toLowerCase();
    return allLogs.filter(
      (l) =>
        l.channelName.toLowerCase().includes(q) ||
        l.roomTypeName.toLowerCase().includes(q) ||
        (l.blockedSummary && l.blockedSummary.toLowerCase().includes(q)) ||
        (l.errorMessage && l.errorMessage.toLowerCase().includes(q)) ||
        l.triggeredBy.toLowerCase().includes(q)
    );
  }, [allLogs, logSearchText]);

  const activeChannelsCount = channels.filter((c) => c.isActive).length;
  const healthyChannelsCount = channels.filter((c) => c.isActive && c.connectionStatus === 'HEALTHY').length;
  const warningChannelsCount = channels.filter(
    (c) => c.isActive && (c.connectionStatus === 'DISCONNECTED' || c.connectionStatus === 'STALE')
  ).length;

  const totalAllocatedRooms = channels.reduce((sum, c) => {
    if (!c.isActive) return sum;
    if (c.mappings && c.mappings.length > 0) {
      return sum + c.mappings.reduce((mSum, m) => mSum + m.allocatedRooms, 0);
    }
    return sum + (c.allocatedRooms || 0);
  }, 0);

  if (loading) {
    return <LoadingScreen message="Đang tải cấu hình kênh phân phối & kiểm tra tình trạng kết nối..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Quản Lý Kênh Phân Phối & Nhật Ký Đồng Bộ Lịch (OTA Calendar)"
        subtitle="Theo dõi tình trạng kết nối, cảnh báo mất kết nối tránh trùng phòng và kiểm tra lịch sử đồng bộ đa kênh RFC 5545"
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
              <>
                <Button
                  variant="outline"
                  onClick={handleSyncAll}
                  disabled={syncingAll}
                  icon={IoSyncOutline}
                >
                  {syncingAll ? 'Đang đồng bộ...' : 'Đồng Bộ Tất Cả'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleOpenCreate}
                  icon={IoAddCircleOutline}
                >
                  Thêm Kênh Phân Phối
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Warning Alert Banner (CẢNH BÁO MẤT KẾT NỐI NỔI BẬT) */}
      {(warningSummary?.hasWarning || warningChannelsCount > 0) && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 p-5 rounded-2xl border-2 border-rose-300 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm animate-bounce mt-0.5">
                <IoAlertCircleOutline size={28} />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-bold text-rose-900">
                    CẢNH BÁO: PHÁT HIỆN KÊNH OTA MẤT KẾT NỐI HOẶC NGỪNG CẬP NHẬT!
                  </h3>
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white text-xs font-bold rounded-full">
                    {warningSummary?.warningChannels?.length || warningChannelsCount} kênh cần xử lý
                  </span>
                </div>
                <p className="text-sm text-rose-800 mt-1 leading-relaxed">
                  Một hoặc nhiều kênh phân phối đã ngừng cập nhật dữ liệu lịch hoặc gặp sự cố kết nối. Dữ liệu phòng trống trên các sàn OTA có nguy cơ không khớp với thực tế, có thể gây ra <strong>TRÙNG PHÒNG (OVERBOOKING)</strong>!
                </p>

                {/* Danh sách kênh cảnh báo nhanh */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(warningSummary?.warningChannels || channels.filter(c => c.connectionStatus === 'DISCONNECTED' || c.connectionStatus === 'STALE')).map((wc) => (
                    <div
                      key={wc.id}
                      className="inline-flex items-center px-3 py-1 bg-white/90 border border-rose-300 rounded-lg text-xs font-medium text-rose-900 shadow-xs"
                    >
                      <span className="font-bold mr-1.5">{wc.name}</span>
                      <span className="text-rose-600 mr-2">
                        ({wc.connectionStatus === 'DISCONNECTED' ? 'Lỗi kết nối' : 'Quá hạn cập nhật'})
                      </span>
                      <button
                        onClick={() => handleTestConnection(wc)}
                        className="text-blue-700 hover:text-blue-900 underline font-semibold ml-1"
                      >
                        Thử lại
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                variant="danger"
                size="sm"
                onClick={handleSyncAll}
                disabled={syncingAll}
                icon={IoRefreshOutline}
              >
                {syncingAll ? 'Đang xử lý...' : 'Đồng bộ lại tất cả'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChannelFilterStatus('WARNINGS')}
              >
                Lọc kênh gặp sự cố
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng kênh */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <IoLayersOutline size={26} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số kênh</div>
            <div className="text-2xl font-bold text-gray-900">
              {channels.length}{' '}
              <span className="text-xs font-normal text-gray-500">
                ({activeChannelsCount} đang bật)
              </span>
            </div>
          </div>
        </div>

        {/* Thẻ 2: Kết nối tốt */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <IoCheckmarkCircleOutline size={26} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kết nối ổn định</div>
            <div className="text-2xl font-bold text-emerald-600">
              {healthyChannelsCount}{' '}
              <span className="text-xs font-normal text-emerald-700">kênh</span>
            </div>
          </div>
        </div>

        {/* Thẻ 3: Mất kết nối / Cảnh báo */}
        <div className={`p-5 rounded-xl border shadow-sm flex items-center space-x-4 transition-colors ${
          warningChannelsCount > 0
            ? 'bg-rose-50/70 border-rose-300'
            : 'bg-white border-gray-200'
        }`}>
          <div className={`p-3 rounded-xl ${
            warningChannelsCount > 0 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <IoAlertCircleOutline size={26} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cảnh báo / Mất kết nối</div>
            <div className={`text-2xl font-bold ${
              warningChannelsCount > 0 ? 'text-rose-600' : 'text-gray-900'
            }`}>
              {warningChannelsCount}{' '}
              <span className="text-xs font-normal text-gray-500">kênh</span>
            </div>
          </div>
        </div>

        {/* Thẻ 4: Tỷ lệ đồng bộ 24h */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <IoSyncOutline size={26} />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ đồng bộ 24h</div>
            <div className="text-2xl font-bold text-indigo-600">
              {warningSummary?.syncSuccessRate24h !== undefined ? `${warningSummary.syncSuccessRate24h}%` : '100%'}
              <span className="text-xs font-normal text-gray-500 ml-1.5">
                ({warningSummary?.totalSyncs24h || 0} lượt)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-2">
        <div className="flex space-x-2">
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
            }}
            className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors flex items-center space-x-2 ${
              activeTab === 'all-logs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <IoDocumentTextOutline size={16} />
            <span>Nhật Ký Đồng Bộ & Lịch Sử Lỗi</span>
          </button>
        </div>

        {activeTab === 'channels' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500 font-medium">Lọc kênh:</span>
            <select
              value={channelFilterStatus}
              onChange={(e) => setChannelFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả trạng thái ({channels.length})</option>
              <option value="WARNINGS">Cần chú ý / Sự cố ({warningChannelsCount})</option>
              <option value="HEALTHY">Kết nối ổn định ({healthyChannelsCount})</option>
              <option value="ACTIVE">Đang bật ({activeChannelsCount})</option>
              <option value="PAUSED">Tạm ngưng ({channels.length - activeChannelsCount})</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Channels List */}
      {activeTab === 'channels' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <IoCalendarOutline size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-base font-medium">
                {channelFilterStatus === 'ALL'
                  ? 'Chưa có kênh phân phối nào được cấu hình'
                  : 'Không có kênh nào phù hợp với bộ lọc'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Bấm "Thêm kênh phân phối" để khai báo kênh và thiết lập ánh xạ loại phòng.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Kênh & Nền tảng</th>
                    <th className="py-3.5 px-4">Sức khỏe kết nối</th>
                    <th className="py-3.5 px-4">Đường dẫn lịch 2 chiều</th>
                    <th className="py-3.5 px-4">Ánh xạ loại phòng</th>
                    <th className="py-3.5 px-4 text-center">Tổng phân bổ</th>
                    <th className="py-3.5 px-4 text-center">Chu kỳ</th>
                    <th className="py-3.5 px-4 text-center">Khoảng chặn</th>
                    <th className="py-3.5 px-4">Lần đồng bộ cuối</th>
                    <th className="py-3.5 px-4 text-center">Bật/Tắt</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredChannels.map((channel) => {
                    const platform = getPlatformInfo(channel.channelCode);
                    const isCopied = copiedId === channel.id;
                    const isCopiedExternal = copiedExternalId === channel.id;
                    const isSyncing = syncingId === channel.id;
                    const isTesting = testingConnectionId === channel.id;
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
                        className={`hover:bg-gray-50/75 transition-colors ${
                          channel.connectionStatus === 'DISCONNECTED'
                            ? 'bg-rose-50/30'
                            : channel.connectionStatus === 'STALE'
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
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

                        {/* Sức khỏe kết nối */}
                        <td className="py-4 px-4 min-w-[150px]">
                          {renderConnectionBadge(channel)}
                        </td>

                        {/* Đường dẫn lịch 2 chiều */}
                        <td className="py-4 px-4 text-xs space-y-1.5 min-w-[190px]">
                          {/* Phía cơ sở xuất */}
                          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/80 px-2 py-1 rounded">
                            <span className="text-blue-700 font-medium truncate max-w-[130px]" title={channel.feedUrl}>
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
                              <span className="text-gray-600 truncate max-w-[130px]" title={channel.externalCalendarUrl}>
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
                          <div className="flex flex-col items-center gap-1">
                            {channel.lastBlockedPeriodsCount &&
                            channel.lastBlockedPeriodsCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800" title="Khoảng thời gian hết phòng cơ sở xuất sang kênh">
                                Xuất: {channel.lastBlockedPeriodsCount} chặn
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                Xuất: Mở bán
                              </span>
                            )}
                            {channel.activeBlocksCount !== undefined && channel.activeBlocksCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs" title="Lượt phòng kênh đang giữ trên sơ đồ">
                                Kênh giữ: {channel.activeBlocksCount} phòng
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">0 lượt giữ</span>
                            )}
                          </div>
                        </td>

                        {/* Lần đồng bộ cuối */}
                        <td className="py-4 px-4 text-xs text-gray-500 whitespace-nowrap">
                          <div>{formatDateTime(channel.lastSyncedAt)}</div>
                          {channel.lastSyncStatus === 'ERROR' && (
                            <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                              Thất bại ({channel.consecutiveFailures || 1} lần)
                            </div>
                          )}
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
                            {/* Kiểm tra kết nối & Đồng bộ ngay */}
                            {channel.isActive && (
                              <button
                                onClick={() => handleTestConnection(channel)}
                                disabled={isTesting}
                                title="Kiểm tra kết nối và cập nhật tệp lịch ngay"
                                className="p-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                              >
                                <IoShieldCheckmarkOutline
                                  size={16}
                                  className={isTesting ? 'animate-spin' : ''}
                                />
                              </button>
                            )}

                            {/* Đồng bộ thủ công */}
                            {channel.isActive && (
                              <button
                                onClick={() => handleSyncChannel(channel)}
                                disabled={isSyncing}
                                title="Đồng bộ thủ công"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                              >
                                <IoSyncOutline
                                  size={16}
                                  className={isSyncing ? 'animate-spin' : ''}
                                />
                              </button>
                            )}

                            {/* Xem nhật ký kênh */}
                            <button
                              onClick={() => handleViewLogs(channel)}
                              title="Xem lịch sử sinh tệp của kênh này"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                            >
                              <IoDocumentTextOutline size={16} />
                            </button>

                            {/* Sửa kênh */}
                            {isOwner && (
                              <button
                                onClick={() => handleOpenEdit(channel)}
                                title="Chỉnh sửa cấu hình & ánh xạ loại phòng"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-amber-600 transition-colors"
                              >
                                <IoPencilOutline size={16} />
                              </button>
                            )}

                            {/* Làm mới token */}
                            {isOwner && (
                              <button
                                onClick={() => setRefreshTokenModal(channel)}
                                title="Làm mới token đường dẫn lịch (khi nghi ngờ bị lộ)"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-teal-600 transition-colors"
                              >
                                <IoRefreshOutline size={16} />
                              </button>
                            )}

                            {/* Xóa kênh */}
                            {isOwner && (
                              <button
                                onClick={() => setDeleteConfirm(channel)}
                                title="Xóa kênh phân phối này"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
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

      {/* Tab 2: Enhanced All System Sync Logs */}
      {activeTab === 'all-logs' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            {/* Lọc kênh */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kênh phân phối
              </label>
              <select
                value={logFilterChannel}
                onChange={(e) => setLogFilterChannel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border rounded-lg border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả kênh</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Trạng thái
              </label>
              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border rounded-lg border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUCCESS">Thành công (SUCCESS)</option>
                <option value="ERROR">Lỗi / Thất bại (ERROR)</option>
              </select>
            </div>

            {/* Lọc nguyên nhân */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nguyên nhân kích hoạt
              </label>
              <select
                value={logFilterTrigger}
                onChange={(e) => setLogFilterTrigger(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border rounded-lg border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả nguyên nhân</option>
                <option value="SCHEDULED_CYCLE">Quét định kỳ</option>
                <option value="BOOKING_CREATED">Đặt phòng mới</option>
                <option value="BOOKING_CANCELLED">Hủy đặt phòng</option>
                <option value="BOOKING_RESCHEDULED">Dời ngày / Gia hạn</option>
                <option value="ROOM_MAINTENANCE">Khóa / Mở bảo trì</option>
                <option value="CONNECTION_TEST">Kiểm tra kết nối</option>
                <option value="MANUAL_REFRESH">Đồng bộ thủ công</option>
              </select>
            </div>

            {/* Tìm kiếm từ khóa */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tìm kiếm từ khóa
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kênh, lỗi, ngày chặn..."
                  value={logSearchText}
                  onChange={(e) => setLogSearchText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
                <IoSearchOutline className="absolute left-2.5 top-2 text-gray-400" size={14} />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center text-xs text-gray-500 px-1">
            <div>
              Hiển thị <strong>{filteredAllLogs.length}</strong> bản ghi nhật ký đồng bộ
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
            <div className="py-12 text-center text-gray-500">Đang tải nhật ký...</div>
          ) : filteredAllLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Không có bản ghi nhật ký nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Kênh phân phối</th>
                    <th className="py-3 px-4">Loại phòng</th>
                    <th className="py-3 px-4">Nguyên nhân kích hoạt</th>
                    <th className="py-3 px-4 text-center">Số khoảng chặn</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4">Chi tiết / Thông điệp</th>
                    <th className="py-3 px-4 text-right">Xem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAllLogs.map((log) => {
                    const trigger = TRIGGER_LABELS[log.triggeredBy] || {
                      label: log.triggeredBy,
                      color: 'text-gray-600 bg-gray-50 border-gray-200',
                    };

                    const isSuccess = log.status === 'SUCCESS';

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-gray-50/75 ${
                          !isSuccess ? 'bg-rose-50/40' : ''
                        }`}
                      >
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
                        <td className="py-3 px-4 text-center">
                          {isSuccess ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Thành công
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              Thất bại
                            </span>
                          )}
                        </td>
                        <td
                          className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate"
                          title={isSuccess ? log.blockedSummary : log.errorMessage}
                        >
                          {isSuccess
                            ? log.blockedSummary || 'Không có khoảng chặn'
                            : (
                                <span className="text-rose-600 font-medium">
                                  {log.errorMessage || 'Lỗi đồng bộ'}
                                </span>
                              )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedLogDetail(log)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs underline"
                          >
                            Chi tiết
                          </button>
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

      {/* Modal: Chi Tiết Lỗi Mất Kết Nối (Error Details Modal) */}
      <Modal
        isOpen={Boolean(selectedErrorChannel)}
        onClose={() => setSelectedErrorChannel(null)}
        title={`Chi Tiết Sự Cố Kênh - ${selectedErrorChannel?.name}`}
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
              <IoAlertCircleOutline size={20} className="text-rose-600" />
              <span>Kênh đang ở trạng thái MẤT KẾT NỐI (DISCONNECTED)</span>
            </div>
            <div className="text-xs text-rose-700 leading-relaxed font-mono bg-white p-3 rounded-lg border border-rose-200 break-words">
              {selectedErrorChannel?.lastSyncErrorMessage || 'Không thể đồng bộ dữ liệu với kênh OTA.'}
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Số lần thất bại liên tiếp:</span>
              <strong className="text-rose-600">
                {selectedErrorChannel?.consecutiveFailures || 1} lần
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Lần đồng bộ gần nhất:</span>
              <span className="font-mono">{formatDateTime(selectedErrorChannel?.lastSyncedAt)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Lần đồng bộ thành công cuối:</span>
              <span className="font-mono">{formatDateTime(selectedErrorChannel?.lastSuccessSyncedAt)}</span>
            </div>
            {selectedErrorChannel?.externalCalendarUrl && (
              <div className="py-1">
                <span className="text-gray-500 block mb-1">Đường dẫn iCal kênh cấp:</span>
                <span className="font-mono text-[11px] bg-gray-50 p-2 rounded block break-all text-gray-800 border">
                  {selectedErrorChannel.externalCalendarUrl}
                </span>
              </div>
            )}
          </div>

          {/* Hướng dẫn khắc phục */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center space-x-1.5">
              <IoInformationCircleOutline size={16} className="text-blue-600" />
              <span>Các bước khắc phục khuyến nghị:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-blue-800">
              <li>Kiểm tra lại đường dẫn <code>externalCalendarUrl</code> do OTA cung cấp có còn hoạt động không.</li>
              <li>Bấm <strong>"Kiểm tra & Thử lại ngay"</strong> bên dưới để hệ thống thực hiện ping lại.</li>
              <li>Nếu link bị lộ hoặc hỏng, sử dụng nút <strong>"Làm mới token"</strong> để tạo liên kết mới.</li>
            </ol>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setSelectedErrorChannel(null)}
            >
              Đóng
            </Button>
            {selectedErrorChannel && (
              <Button
                variant="primary"
                onClick={async () => {
                  const ch = selectedErrorChannel;
                  setSelectedErrorChannel(null);
                  await handleTestConnection(ch);
                }}
              >
                Kiểm tra & Thử lại ngay
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Xem Chi Tiết 1 Bản Ghi Nhật Ký */}
      <Modal
        isOpen={Boolean(selectedLogDetail)}
        onClose={() => setSelectedLogDetail(null)}
        title={`Chi Tiết Nhật Ký Đồng Bộ #${selectedLogDetail?.id}`}
      >
        {selectedLogDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <span className="text-gray-500 block">Kênh phân phối:</span>
                <strong className="text-gray-900 text-sm">{selectedLogDetail.channelName}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Thời gian thực thi:</span>
                <span className="font-mono text-gray-800">{formatDateTime(selectedLogDetail.syncedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Loại phòng:</span>
                <strong className="text-gray-800">{selectedLogDetail.roomTypeName}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Trạng thái:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                  selectedLogDetail.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedLogDetail.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-gray-700 font-semibold block mb-1">
                {selectedLogDetail.status === 'SUCCESS' ? 'Chi tiết các khoảng thời gian bị chặn:' : 'Thông báo lỗi:'}
              </span>
              <div className={`p-3 rounded-lg border font-mono text-[11px] leading-relaxed break-all ${
                selectedLogDetail.status === 'SUCCESS'
                  ? 'bg-gray-50 border-gray-200 text-gray-700'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {selectedLogDetail.status === 'SUCCESS'
                  ? selectedLogDetail.blockedSummary || 'Không có khoảng thời gian nào bị chặn (còn phòng toàn bộ).'
                  : selectedLogDetail.errorMessage || 'Lỗi không xác định.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedLogDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
              <div className="font-mono text-gray-700 break-all bg-white p-2 rounded border border-blue-100 select-all">
                {editingChannel.feedUrl}
              </div>
            </div>
          )}

          {/* Chu kỳ cập nhật */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Chu kỳ quét định kỳ"
              value={String(form.syncIntervalMinutes || 15)}
              onChange={(e) =>
                setForm({
                  ...form,
                  syncIntervalMinutes: Number(e.target.value),
                })
              }
              options={[
                { value: '5', label: '5 phút / lần (Cập nhật cực nhanh)' },
                { value: '15', label: '15 phút / lần (Khuyến nghị)' },
                { value: '30', label: '30 phút / lần' },
                { value: '60', label: '60 phút / lần' },
              ]}
            />

            <div className="flex items-center space-x-3 pt-6">
              <label className="flex items-center cursor-pointer space-x-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Bật đồng bộ ngay sau khi lưu
                </span>
              </label>
            </div>
          </div>

          {/* BẢNG ÁNH XẠ LOẠI PHÒNG */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
                  <IoLayersOutline className="text-blue-600" size={18} />
                  <span>Bảng Ánh Xạ Loại Phòng (Room Mappings)</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Thiết lập mã phòng bên kênh và số phòng phân bổ tương ứng cho từng loại phòng.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMappingRow}
                icon={IoAddOutline}
              >
                Thêm loại phòng
              </Button>
            </div>

            {form.mappings && form.mappings.length > 0 ? (
              <div className="space-y-3">
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
                      className={`p-3.5 rounded-xl border space-y-3 transition-colors ${
                        isOver
                          ? 'border-rose-300 bg-rose-50/50'
                          : 'border-gray-200 bg-gray-50/60'
                      }`}
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

                const isSuccess = log.status === 'SUCCESS';

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      isSuccess ? 'bg-gray-50 border-gray-200' : 'bg-rose-50 border-rose-200'
                    }`}
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
                        Trạng thái:{' '}
                        {isSuccess ? (
                          <span className="text-emerald-600 font-bold">Thành công</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Lỗi</span>
                        )}
                      </span>
                    </div>

                    {isSuccess && log.blockedSummary && (
                      <div className="text-gray-500 bg-white p-2 rounded border border-gray-200 font-mono text-[11px] break-all">
                        {log.blockedSummary}
                      </div>
                    )}

                    {!isSuccess && log.errorMessage && (
                      <div className="text-rose-700 bg-white p-2 rounded border border-rose-200 font-mono text-[11px] break-all">
                        {log.errorMessage}
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

      {/* Modal: Kiểm Tra Tình Trạng Phòng Trống Trực Tiếp */}
      <Modal
        isOpen={checkerModalOpen}
        onClose={() => setCheckerModalOpen(false)}
        title="Kiểm Tra Khả Năng Nhận Phòng Trên Kênh OTA"
      >
        <form onSubmit={handleRunCheckAvailability} className="space-y-4">
          <p className="text-xs text-gray-500">
            Kiểm tra xem loại phòng trên kênh phân phối đã hết chỗ hay chưa theo thời gian nhận / trả phòng.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Kênh phân phối"
              value={String(checkerChannelId)}
              onChange={(e) => {
                const cId = Number(e.target.value);
                setCheckerChannelId(cId);
                const target = channels.find((c) => c.id === cId);
                if (target && target.mappings && target.mappings.length > 0) {
                  setCheckerRoomTypeId(target.mappings[0].roomTypeId);
                }
              }}
              options={channels.map((c) => ({
                value: String(c.id),
                label: `${c.name} (${c.channelCode})`,
              }))}
              required
            />

            <Select
              label="Loại phòng muốn kiểm tra"
              value={String(checkerRoomTypeId)}
              onChange={(e) => setCheckerRoomTypeId(Number(e.target.value))}
              options={roomTypes.map((rt) => ({
                value: String(rt.id),
                label: rt.name,
              }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Ngày nhận phòng (Check-in)"
              value={checkerCheckIn}
              onChange={(e) => setCheckerCheckIn(e.target.value)}
              required
            />

            <Input
              type="date"
              label="Ngày trả phòng (Check-out)"
              value={checkerCheckOut}
              onChange={(e) => setCheckerCheckOut(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckerModalOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={checkingAvailability}
              icon={IoSearchOutline}
            >
              {checkingAvailability ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}
            </Button>
          </div>

          {/* Availability Result Display */}
          {availabilityResult && (
            <div
              className={`mt-4 p-4 rounded-xl border text-xs space-y-3 ${
                availabilityResult.isAvailable
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-rose-50/70 border-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {availabilityResult.isAvailable ? (
                  <IoCheckmarkCircleOutline className="text-emerald-600" size={22} />
                ) : (
                  <IoCloseCircleOutline className="text-rose-600" size={22} />
                )}
                <div className="font-bold text-sm">
                  {availabilityResult.isAvailable ? (
                    <span className="text-emerald-900">
                      CÒN PHÒNG ({availabilityResult.availableRooms} phòng khả dụng)
                    </span>
                  ) : (
                    <span className="text-rose-900">
                      HẾT PHÒNG / KHÔNG KHẢ DỤNG
                    </span>
                  )}
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed font-medium">
                {availabilityResult.message}
              </p>

              {/* Chi tiết từng đêm */}
              {availabilityResult.dailyDetails &&
                availabilityResult.dailyDetails.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="font-semibold text-gray-800 mb-2">
                      Chi tiết tình trạng từng đêm lưu trú ({availabilityResult.totalNights} đêm):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {availabilityResult.dailyDetails.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          className={`p-2 rounded border text-[11px] ${
                            day.isSoldOut
                              ? 'bg-rose-100/70 border-rose-300 text-rose-900 font-bold'
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          <div className="font-semibold">{day.date}</div>
                          <div className="text-[10px] text-gray-500">
                            Phân bổ: {day.allocatedRooms} • Chiếm: {day.totalOccupied}
                          </div>
                          <div className="mt-0.5">
                            {day.isSoldOut ? (
                              <span className="text-rose-600">Hết chỗ</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">
                                Còn {day.availableRooms} phòng
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default ChannelCalendarPage;
