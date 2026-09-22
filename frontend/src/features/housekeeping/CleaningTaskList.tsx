import React, { useState, useEffect, useMemo } from 'react';
import { roomApi } from '../../services/roomApi';
import userApi from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { 
  IoBrushOutline, 
  IoCheckmarkCircleOutline, 
  IoRefreshOutline, 
  IoSearchOutline, 
  IoFilterOutline,
  IoSparklesOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoSendOutline,
  IoCheckmarkDoneOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoFlameOutline,
  IoFlame,
  IoFlashOutline,
  IoPersonRemoveOutline,
  IoInformationCircleOutline,
  IoAlertCircleOutline,
  IoWarningOutline,
  IoCubeOutline,
  IoCallOutline,
  IoBedOutline
} from 'react-icons/io5';
import RoomIncidentModal from './RoomIncidentModal';
import LostItemCreateModal from './LostItemCreateModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

interface CleaningTaskListProps {
  onRoomCleaned?: () => void;
}

const CleaningTaskList: React.FC<CleaningTaskListProps> = ({ onRoomCleaned }) => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [dirtyRooms, setDirtyRooms] = useState<any[]>([]);
  const [inspectingRooms, setInspectingRooms] = useState<any[]>([]);
  const [housekeepers, setHousekeepers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | string | null>(null);
  const [incidentRoom, setIncidentRoom] = useState<any | null>(null);
  const [lostItemRoom, setLostItemRoom] = useState<any | null>(null);
  const [scanningPeriodic, setScanningPeriodic] = useState(false);

  // feature/time-standard: Timer & Modals
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [interruptionRoom, setInterruptionRoom] = useState<any | null>(null);
  const [interruptionReason, setInterruptionReason] = useState<string>('Thiếu đồ vải, khăn hoặc chăn ga');
  const [customInterruption, setCustomInterruption] = useState<string>('');

  const [rejectionRoom, setRejectionRoom] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Khu vực vệ sinh chưa đạt yêu cầu');
  const [customRejection, setCustomRejection] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'DIRTY' | 'INSPECTING'>('DIRTY');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('PRIORITY');
  const [housekeeperTaskFilter, setHousekeeperTaskFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'URGENT' | 'UNASSIGNED' | 'PERIODIC'>('ALL');

  const isSupervisor = ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(user?.role || '');
  const isHousekeeper = user?.role === 'HOUSEKEEPER';

  const handleScanPeriodicCleaning = async () => {
    setScanningPeriodic(true);
    try {
      const res = await roomApi.scanPeriodicCleaning();
      toast.success(res.message || 'Đã quét phòng trống định kỳ thành công!');
      fetchRoomsAndStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi quét phòng trống.');
    } finally {
      setScanningPeriodic(false);
    }
  };

  const fetchRoomsAndStaff = async () => {
    setLoading(true);
    try {
      const [dirtyData, inspectingData] = await Promise.all([
        roomApi.getAllRooms('DIRTY'),
        roomApi.getAllRooms('INSPECTING')
      ]);
      setDirtyRooms(Array.isArray(dirtyData) ? dirtyData : []);
      setInspectingRooms(Array.isArray(inspectingData) ? inspectingData : []);

      // Load housekeepers if supervisor
      if (isSupervisor) {
        try {
          const hkList = await userApi.getHousekeepers();
          setHousekeepers(Array.isArray(hkList) ? hkList : []);
        } catch (e) {
          try {
            const allUsers = await userApi.getAllUsers();
            const hkList = (Array.isArray(allUsers) ? allUsers : []).filter(
              (u: any) => (u.role === 'HOUSEKEEPER' || u.role === 'STAFF' || u.role === 'OWNER' || u.role === 'ADMIN') && u.active !== false
            );
            setHousekeepers(hkList);
          } catch (e2) {
            console.error('Failed to fetch housekeepers:', e2);
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch rooms error:', err);
      toast.error(err.response?.data?.message || 'Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsAndStaff();
  }, []);

  // Housekeeper gửi kiểm tra
  const handleSubmitInspection = async (room: any) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận hoàn thành dọn dẹp',
      message: `Gửi thông báo phòng ${room.roomNumber} đã được dọn xong để quản lý kiểm tra và duyệt sạch?`,
      confirmText: 'Gửi kiểm tra',
      type: 'info'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.submitInspection(room.id);
      toast.success(`Phòng ${room.roomNumber} đã được chuyển sang trạng thái "Chờ kiểm tra & duyệt sạch"!`);
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi kiểm tra phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // Supervisor duyệt phòng sạch -> AVAILABLE
  const handleApproveClean = async (room: any) => {
    const isConfirmed = await confirm({
      title: 'Duyệt phòng sạch',
      message: `Xác nhận phòng ${room.roomNumber} đã đạt tiêu chuẩn vệ sinh và sẵn sàng đón khách?`,
      confirmText: 'Duyệt sạch (Sẵn sàng)',
      type: 'info'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.approveClean(room.id);
      toast.success(`Phòng ${room.roomNumber} đã được duyệt sạch thành công!`);
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // Supervisor đánh dấu phòng đã sạch trực tiếp (DIRTY -> AVAILABLE)
  const handleMarkClean = async (room: any) => {
    const isConfirmed = await confirm({
      title: 'Đánh dấu phòng đã sạch',
      message: `Xác nhận phòng ${room.roomNumber} đã dọn dẹp xong và sẵn sàng đón khách?`,
      confirmText: 'Đánh dấu sạch',
      type: 'info'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.markRoomClean(room.id);
      toast.success(`Phòng ${room.roomNumber} đã được đánh dấu sạch!`);
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // feature/time-standard: Nhân viên bấm bắt đầu dọn phòng (bấm giờ)
  const handleStartCleaning = async (room: any) => {
    setProcessingId(room.id);
    try {
      await roomApi.startCleaning(room.id);
      toast.success(`Đã bắt đầu tính giờ dọn phòng ${room.roomNumber}!`);
      await fetchRoomsAndStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi bắt đầu dọn phòng');
    } finally {
      setProcessingId(null);
    }
  };

  // feature/time-standard: Xác nhận đánh dấu gián đoạn
  const handleConfirmInterruption = async () => {
    if (!interruptionRoom) return;
    const finalReason = interruptionReason === 'OTHER' ? (customInterruption.trim() || 'Gián đoạn khác') : interruptionReason;
    setProcessingId(interruptionRoom.id);
    try {
      await roomApi.interruptCleaning(interruptionRoom.id, finalReason);
      toast.info(`Đã ghi nhận gián đoạn cho phòng ${interruptionRoom.roomNumber}. Lượt dọn này sẽ không tính vào thời gian trung bình.`);
      setInterruptionRoom(null);
      setCustomInterruption('');
      await fetchRoomsAndStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi đánh dấu gián đoạn');
    } finally {
      setProcessingId(null);
    }
  };

  // Supervisor yêu cầu dọn lại -> Mở modal nhập lý do
  const handleOpenRejectModal = (room: any) => {
    setRejectionRoom(room);
    setRejectionReason('Khu vực vệ sinh chưa đạt yêu cầu');
    setCustomRejection('');
  };

  const handleConfirmRejection = async () => {
    if (!rejectionRoom) return;
    const finalReason = rejectionReason === 'OTHER' ? (customRejection.trim() || 'Chưa đạt yêu cầu vệ sinh') : rejectionReason;
    setProcessingId(rejectionRoom.id);
    try {
      await roomApi.rejectClean(rejectionRoom.id, finalReason);
      toast.info(`Phòng ${rejectionRoom.roomNumber} đã được chuyển lại về Cần dọn kèm ghi chú kiểm tra không đạt.`);
      setRejectionRoom(null);
      setCustomRejection('');
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi yêu cầu dọn lại.');
    } finally {
      setProcessingId(null);
    }
  };

  // Gán hoặc chuyển giao nhân viên dọn phòng
  const handleAssignCleaner = async (room: any, newHousekeeperId: string) => {
    if (!newHousekeeperId) {
      handleUnassignCleaner(room);
      return;
    }

    const targetStaff = housekeepers.find(h => String(h.id) === String(newHousekeeperId));
    const targetStaffName = targetStaff?.name || 'Nhân viên mới';

    if (room.assignedHousekeeperId && String(room.assignedHousekeeperId) !== String(newHousekeeperId)) {
      const isConfirmed = await confirm({
        title: 'Chuyển giao phòng cần dọn',
        message: `Phòng ${room.roomNumber} hiện đang do "${room.assignedHousekeeperName}" phụ trách. Bạn có chắc chắn muốn chuyển giao sang "${targetStaffName}"?`,
        confirmText: 'Xác nhận chuyển giao',
        type: 'warning'
      });
      if (!isConfirmed) return;
    }

    setProcessingId(room.id);
    try {
      await roomApi.assignCleaner(room.id, Number(newHousekeeperId));
      toast.success(`Đã phân công ${targetStaffName} dọn phòng ${room.roomNumber}!`);
      fetchRoomsAndStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi phân công nhân viên');
    } finally {
      setProcessingId(null);
    }
  };

  // Gỡ phân công
  const handleUnassignCleaner = async (room: any) => {
    const isConfirmed = await confirm({
      title: 'Hủy phân công dọn phòng',
      message: `Hủy phân công nhân viên phụ trách phòng ${room.roomNumber}?`,
      confirmText: 'Xác nhận hủy',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.unassignCleaner(room.id);
      toast.info(`Đã hủy phân công nhân viên cho phòng ${room.roomNumber}`);
      fetchRoomsAndStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi hủy phân công');
    } finally {
      setProcessingId(null);
    }
  };

  // Lấy danh sách thô theo tab hiện tại (DIRTY hoặc INSPECTING)
  const rawList = activeSubTab === 'DIRTY' ? dirtyRooms : inspectingRooms;

  // QTN-09: Phân quyền xem theo vai trò (Housekeeper chỉ thấy việc của mình & chưa ai nhận)
  const roleFilteredList = useMemo(() => {
    if (!isHousekeeper) return rawList;
    return rawList.filter(room => {
      const isAssignedToMe = Boolean(room.assignedHousekeeperId && user?.id && String(room.assignedHousekeeperId) === String(user.id));
      const isUnassigned = !room.assignedHousekeeperId;
      return isAssignedToMe || isUnassigned;
    });
  }, [rawList, isHousekeeper, user?.id]);

  // Thống kê khối lượng công việc theo tab đang chọn (Cần dọn hoặc Chờ duyệt)
  const workloadStats = useMemo(() => {
    const currentTabRooms = activeSubTab === 'DIRTY' ? dirtyRooms : inspectingRooms;
    const unassignedCount = currentTabRooms.filter(r => !r.assignedHousekeeperId).length;

    const staffCounts = housekeepers.map(hk => {
      const assignedCount = currentTabRooms.filter(r => String(r.assignedHousekeeperId) === String(hk.id)).length;
      return {
        id: hk.id,
        name: hk.name,
        phone: hk.phone,
        assignedCount
      };
    });

    const urgentCount = currentTabRooms.filter(r => r.priorityLevel === 'URGENT').length;

    return {
      unassignedCount,
      staffCounts,
      urgentCount,
      totalCount: currentTabRooms.length,
      totalPendingAcrossTabs: dirtyRooms.length + inspectingRooms.length
    };
  }, [dirtyRooms, inspectingRooms, housekeepers, activeSubTab]);

  // Thông tin nhân viên đang được lọc
  const selectedStaffObj = useMemo(() => {
    if (selectedStaffFilter === 'ALL' || selectedStaffFilter === 'UNASSIGNED') return null;
    return housekeepers.find(hk => String(hk.id) === String(selectedStaffFilter));
  }, [housekeepers, selectedStaffFilter]);

  const selectedStaffLabel = selectedStaffFilter === 'UNASSIGNED'
    ? 'Chưa phân công'
    : (selectedStaffObj ? selectedStaffObj.name : null);

  // Số lượng phòng động theo từng tab ứng với bộ lọc nhân viên đang chọn
  const tabCounts = useMemo(() => {
    let dirtyList = dirtyRooms;
    let inspectingList = inspectingRooms;

    if (isSupervisor) {
      if (selectedStaffFilter === 'UNASSIGNED') {
        dirtyList = dirtyRooms.filter(r => !r.assignedHousekeeperId);
        inspectingList = inspectingRooms.filter(r => !r.assignedHousekeeperId);
      } else if (selectedStaffFilter !== 'ALL') {
        dirtyList = dirtyRooms.filter(r => String(r.assignedHousekeeperId) === String(selectedStaffFilter));
        inspectingList = inspectingRooms.filter(r => String(r.assignedHousekeeperId) === String(selectedStaffFilter));
      }
    } else if (isHousekeeper) {
      if (housekeeperTaskFilter === 'MY_TASKS') {
        dirtyList = dirtyRooms.filter(r => Boolean(r.assignedHousekeeperId && user?.id && String(r.assignedHousekeeperId) === String(user.id)));
        inspectingList = inspectingRooms.filter(r => Boolean(r.assignedHousekeeperId && user?.id && String(r.assignedHousekeeperId) === String(user.id)));
      } else if (housekeeperTaskFilter === 'UNASSIGNED') {
        dirtyList = dirtyRooms.filter(r => !r.assignedHousekeeperId);
        inspectingList = inspectingRooms.filter(r => !r.assignedHousekeeperId);
      }
    }

    return {
      dirty: dirtyList.length,
      inspecting: inspectingList.length,
      totalDirty: dirtyRooms.length,
      totalInspecting: inspectingRooms.length
    };
  }, [dirtyRooms, inspectingRooms, isSupervisor, selectedStaffFilter, isHousekeeper, housekeeperTaskFilter, user?.id]);

  // Danh sách các tầng
  const floors = useMemo(() => {
    const floorSet = new Set(roleFilteredList.map(r => r.floor).filter(Boolean));
    return Array.from(floorSet).sort((a, b) => Number(a) - Number(b));
  }, [roleFilteredList]);

  // Lọc và sắp xếp phòng hiển thị
  const filteredAndSortedRooms = useMemo(() => {
    let result = roleFilteredList.filter(room => {
      // Tìm kiếm từ khóa
      const matchSearch = !searchTerm || 
        room.roomNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.assignedHousekeeperName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.nextGuestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Lọc tầng
      const matchFloor = !selectedFloor || room.floor?.toString() === selectedFloor.toString();

      // Quick filter
      if (quickFilter === 'URGENT' && room.priorityLevel !== 'URGENT') return false;
      if (quickFilter === 'UNASSIGNED' && room.assignedHousekeeperId) return false;
      if (quickFilter === 'PERIODIC' && room.cleaningReason !== 'PERIODIC_VACANT') return false;

      // Lọc nhân viên phụ trách (dành cho Supervisor)
      let matchStaff = true;
      if (isSupervisor) {
        if (selectedStaffFilter === 'UNASSIGNED') {
          matchStaff = !room.assignedHousekeeperId;
        } else if (selectedStaffFilter !== 'ALL') {
          matchStaff = String(room.assignedHousekeeperId) === String(selectedStaffFilter);
        }
      }

      // Lọc việc cho Housekeeper
      let matchHkFilter = true;
      if (isHousekeeper) {
        if (housekeeperTaskFilter === 'MY_TASKS') {
          matchHkFilter = Boolean(room.assignedHousekeeperId && user?.id && String(room.assignedHousekeeperId) === String(user.id));
        } else if (housekeeperTaskFilter === 'UNASSIGNED') {
          matchHkFilter = !room.assignedHousekeeperId;
        }
      }

      return matchSearch && matchFloor && matchStaff && matchHkFilter;
    });

    // Sắp xếp
    return result.sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        const priorityWeight: Record<string, number> = { URGENT: 3, HIGH: 2, NORMAL: 1 };
        const weightA = priorityWeight[a.priorityLevel] || 1;
        const weightB = priorityWeight[b.priorityLevel] || 1;
        if (weightA !== weightB) return weightB - weightA;
        return (a.roomNumber || '').localeCompare(b.roomNumber || '', undefined, { numeric: true });
      }
      if (sortBy === 'ROOM_NUMBER') {
        return (a.roomNumber || '').localeCompare(b.roomNumber || '', undefined, { numeric: true });
      }
      if (sortBy === 'FLOOR') {
        return (Number(a.floor) || 0) - (Number(b.floor) || 0);
      }
      return 0;
    });
  }, [roleFilteredList, searchTerm, selectedFloor, selectedStaffFilter, housekeeperTaskFilter, quickFilter, sortBy, isSupervisor, isHousekeeper, user?.id]);

  return (
    <div className="space-y-5">
      {/* 1. THANH TỔNG HỢP CÂN BẰNG KHỐI LƯỢNG CÔNG VIỆC (Dành cho Lễ tân / Quản lý) */}
      {isSupervisor && (
        <div className="space-y-3">
          {/* 4 Thẻ KPI Tác vụ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div 
              onClick={() => { setActiveSubTab('DIRTY'); setSelectedStaffFilter('ALL'); setQuickFilter('ALL'); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeSubTab === 'DIRTY' && quickFilter === 'ALL'
                  ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-400/20 shadow-xs'
                  : 'bg-white border-border-grey hover:border-orange-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-950">Phòng cần dọn</span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                  <IoBrushOutline size={16} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-on-surface">{dirtyRooms.length}</span>
                <span className="text-[11px] text-orange-700 font-medium">chờ vệ sinh</span>
              </div>
            </div>

            <div 
              onClick={() => { setActiveSubTab('INSPECTING'); setSelectedStaffFilter('ALL'); setQuickFilter('ALL'); }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeSubTab === 'INSPECTING' && quickFilter === 'ALL'
                  ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/20 shadow-xs'
                  : 'bg-white border-border-grey hover:border-purple-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-950">Chờ nghiệm thu</span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <IoSparklesOutline size={16} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-on-surface">{inspectingRooms.length}</span>
                <span className="text-[11px] text-purple-700 font-medium">chờ duyệt sạch</span>
              </div>
            </div>

            <div 
              onClick={() => setQuickFilter(prev => prev === 'URGENT' ? 'ALL' : 'URGENT')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                quickFilter === 'URGENT'
                  ? 'bg-red-50/80 border-red-300 ring-2 ring-red-400/20 shadow-xs'
                  : 'bg-white border-border-grey hover:border-red-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-950">Khách nhận hôm nay</span>
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <IoFlame size={16} className="animate-pulse" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-700">{workloadStats.urgentCount}</span>
                <span className="text-[11px] text-red-600 font-medium">ưu tiên đón khách</span>
              </div>
            </div>

            <div 
              onClick={() => setSelectedStaffFilter(prev => prev === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedStaffFilter === 'UNASSIGNED'
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                  : 'bg-white border-border-grey hover:border-amber-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-950">Chưa phân công</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <IoAlertCircleOutline size={16} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-800">{workloadStats.unassignedCount}</span>
                <span className="text-[11px] text-amber-700 font-medium">cần điều phối</span>
              </div>
            </div>
          </div>

          {/* Thanh phân bổ nhân sự */}
          <div className="bg-white rounded-2xl border border-border-grey p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <IoPersonOutline className="text-[#626F47]" size={17} />
                <h3 className="font-bold text-on-surface text-xs tracking-normal">
                  Khối lượng công việc nhân viên buồng phòng ({workloadStats.totalCount} phòng {activeSubTab === 'DIRTY' ? 'cần dọn' : 'chờ duyệt'})
                </h3>
              </div>
              <span className="text-[11px] text-on-surface-variant">
                Bấm vào nhân viên để lọc nhanh danh sách phòng phụ trách
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Nút tất cả */}
              <button
                onClick={() => setSelectedStaffFilter('ALL')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  selectedStaffFilter === 'ALL'
                    ? 'bg-[#626F47] text-white border-[#626F47] shadow-xs'
                    : 'bg-white border-border-grey text-on-surface hover:border-[#626F47]'
                }`}
              >
                Tất cả ({workloadStats.totalCount})
              </button>

              {/* Nút Chưa gán */}
              <button
                onClick={() => setSelectedStaffFilter(prev => prev === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  selectedStaffFilter === 'UNASSIGNED'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : workloadStats.unassignedCount > 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-white border-border-grey text-on-surface-variant hover:border-[#626F47]'
                }`}
              >
                <IoAlertCircleOutline size={14} className={workloadStats.unassignedCount > 0 ? 'text-amber-600' : ''} />
                <span>Chưa phân công ({workloadStats.unassignedCount})</span>
              </button>

              {/* Chips từng nhân viên buồng phòng */}
              {workloadStats.staffCounts.map(st => {
                const isSelected = selectedStaffFilter === String(st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStaffFilter(prev => prev === String(st.id) ? 'ALL' : String(st.id))}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A2411] text-white border-[#1A2411] shadow-xs font-bold'
                        : st.assignedCount > 0
                        ? 'bg-blue-50/70 text-blue-950 border-blue-200 hover:bg-blue-100 font-medium'
                        : 'bg-white border-border-grey text-on-surface-variant hover:border-[#626F47]'
                    }`}
                    title={isSelected ? 'Bấm để hủy lọc' : `Lọc phòng của ${st.name}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-900'
                    }`}>
                      {st.name?.slice(0, 1) || 'N'}
                    </div>
                    <span>{st.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : st.assignedCount > 0
                        ? 'bg-blue-200 text-blue-900'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {st.assignedCount} phòng
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. THÔNG BÁO QUYỀN XEM DÀNH CHO HOUSEKEEPER */}
      {isHousekeeper && (
        <div className="bg-blue-50 border border-blue-200 p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
          <IoInformationCircleOutline size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">Không gian làm việc Buồng phòng của bạn</p>
            <p className="text-blue-800/80">
              Hệ thống chỉ hiển thị các phòng <strong>được phân công cho bạn</strong> hoặc <strong>chưa ai nhận dọn</strong>.
            </p>
          </div>

          {/* Filter con cho Housekeeper */}
          <div className="flex items-center gap-1 bg-white p-0.5 border border-blue-200">
            <button
              onClick={() => setHousekeeperTaskFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                housekeeperTaskFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-blue-900 hover:bg-blue-50'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setHousekeeperTaskFilter('MY_TASKS')}
              className={`px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                housekeeperTaskFilter === 'MY_TASKS' ? 'bg-blue-600 text-white' : 'text-blue-900 hover:bg-blue-50'
              }`}
            >
              Của tôi
            </button>
            <button
              onClick={() => setHousekeeperTaskFilter('UNASSIGNED')}
              className={`px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                housekeeperTaskFilter === 'UNASSIGNED' ? 'bg-blue-600 text-white' : 'text-blue-900 hover:bg-blue-50'
              }`}
            >
              Chưa nhận
            </button>
          </div>
        </div>
      )}

      {/* 3. KHU VỰC DANH SÁCH PHÒNG CHÍNH */}
      <div className="bg-white rounded-2xl border border-border-grey overflow-hidden shadow-2xs">
        {/* Header toolbar */}
        <div className="p-5 border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FBFDF9]">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
              activeSubTab === 'DIRTY' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-purple-50 text-purple-600 border-purple-200'
            }`}>
              {activeSubTab === 'DIRTY' ? <IoBrushOutline size={22} /> : <IoSparklesOutline size={22} />}
            </div>
            <div>
              <h2 className="font-title-lg text-on-surface font-bold text-base">
                {activeSubTab === 'DIRTY' ? 'Danh sách phòng cần dọn dẹp' : 'Phòng chờ kiểm tra & duyệt sạch'}
              </h2>
              <p className="text-on-surface-variant text-xs mt-0.5">
                {selectedStaffLabel ? (
                  <span>
                    Đang lọc: <strong className="text-on-surface">{selectedStaffLabel}</strong> — {filteredAndSortedRooms.length} phòng {activeSubTab === 'DIRTY' ? 'cần dọn' : 'chờ duyệt'}
                  </span>
                ) : (
                  activeSubTab === 'DIRTY' 
                    ? `${dirtyRooms.length} phòng cần vệ sinh sạch sẽ`
                    : `${inspectingRooms.length} phòng đã dọn xong, chờ quản lý nghiệm thu`
                )}
              </p>
            </div>
          </div>

          {/* SubTab switcher & Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-[#F4F6F0] p-1 rounded-xl border border-border-grey">
              <button
                onClick={() => { setActiveSubTab('DIRTY'); setSelectedFloor(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'DIRTY'
                    ? 'bg-white text-orange-600 font-bold border border-orange-200 shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <IoBrushOutline size={14} /> Cần dọn ({tabCounts.dirty})
              </button>
              <button
                onClick={() => { setActiveSubTab('INSPECTING'); setSelectedFloor(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'INSPECTING'
                    ? 'bg-white text-purple-600 font-bold border border-purple-200 shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <IoSparklesOutline size={14} /> Chờ duyệt ({tabCounts.inspecting})
              </button>
            </div>

            {user?.role === 'OWNER' && (
              <button
                onClick={handleScanPeriodicCleaning}
                disabled={scanningPeriodic || loading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 transition-colors text-teal-900 text-xs font-semibold shadow-xs cursor-pointer"
                title="Quét các phòng trống quá chu kỳ để tự động đưa vào danh sách cần dọn"
              >
                <IoSparklesOutline size={14} className={scanningPeriodic ? 'animate-spin text-teal-600' : 'text-teal-600'} />
                <span>Quét dọn định kỳ</span>
              </button>
            )}

            <button
              onClick={fetchRoomsAndStaff}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-grey bg-white hover:bg-surface-container-low transition-colors text-on-surface-variant text-xs font-semibold shadow-xs cursor-pointer"
            >
              <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Active Filter Notification */}
        {selectedStaffLabel && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-blue-50/80 border-b border-blue-200 text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <IoPersonOutline className="text-blue-600" size={14} />
              <span>
                Đang hiển thị danh sách phòng của: <strong>{selectedStaffLabel}</strong> ({filteredAndSortedRooms.length} phòng {activeSubTab === 'DIRTY' ? 'cần dọn' : 'chờ duyệt'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStaffFilter('ALL')}
              className="text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
            >
              ✕ Hiển thị tất cả nhân viên
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 bg-[#FBFDF9] border-b border-border-grey space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <IoSearchOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70" size={16} />
              <input
                type="text"
                placeholder="Tìm theo số phòng, loại phòng, nhân viên, khách..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-white border border-border-grey text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary shadow-xs"
              />
            </div>

            {/* Floor filter */}
            {floors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <IoFilterOutline size={15} className="text-on-surface-variant" />
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-white border border-border-grey text-on-surface focus:outline-none focus:border-primary shadow-xs"
                >
                  <option value="">Tất cả tầng ({filteredAndSortedRooms.length})</option>
                  {floors.map(floor => (
                    <option key={floor} value={floor}>Tầng {floor}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort By */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-on-surface-variant">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white border border-border-grey text-on-surface focus:outline-none focus:border-primary shadow-xs"
              >
                <option value="PRIORITY">Độ ưu tiên đón khách</option>
                <option value="ROOM_NUMBER">Số phòng (A-Z)</option>
                <option value="FLOOR">Tầng (Thấp → Cao)</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 mr-1">
              Lọc nhanh:
            </span>
            <button
              type="button"
              onClick={() => setQuickFilter('ALL')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap text-xs font-semibold ${
                quickFilter === 'ALL'
                  ? 'bg-[#1A2411] text-white border-[#1A2411] shadow-xs'
                  : 'bg-white border-border-grey text-on-surface hover:border-[#626F47]'
              }`}
            >
              Tất cả ({roleFilteredList.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter(prev => prev === 'URGENT' ? 'ALL' : 'URGENT')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap text-xs font-semibold flex items-center gap-1 ${
                quickFilter === 'URGENT'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              <IoFlame size={13} className={quickFilter === 'URGENT' ? '' : 'text-red-500'} />
              <span>Khách nhận hôm nay ({roleFilteredList.filter(r => r.priorityLevel === 'URGENT').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter(prev => prev === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap text-xs font-semibold flex items-center gap-1 ${
                quickFilter === 'UNASSIGNED'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <IoAlertCircleOutline size={13} className={quickFilter === 'UNASSIGNED' ? '' : 'text-amber-600'} />
              <span>Chưa phân công ({roleFilteredList.filter(r => !r.assignedHousekeeperId).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter(prev => prev === 'PERIODIC' ? 'ALL' : 'PERIODIC')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer whitespace-nowrap text-xs font-semibold flex items-center gap-1 ${
                quickFilter === 'PERIODIC'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
              }`}
            >
              <IoSparklesOutline size={13} className={quickFilter === 'PERIODIC' ? '' : 'text-teal-600'} />
              <span>Định kỳ ({roleFilteredList.filter(r => r.cleaningReason === 'PERIODIC_VACANT').length})</span>
            </button>
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="p-5">
          {loading && filteredAndSortedRooms.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-surface-container-low animate-pulse rounded-2xl border border-border-grey" />
              ))}
            </div>
          ) : filteredAndSortedRooms.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600 border border-green-200">
                <IoCheckmarkCircleOutline size={30} />
              </div>
              <h3 className="font-title-lg text-on-surface font-bold text-base mb-1">
                {activeSubTab === 'DIRTY'
                  ? (dirtyRooms.length === 0 ? 'Tuyệt vời! Không còn phòng cần dọn.' : 'Không tìm thấy phòng phù hợp.')
                  : (inspectingRooms.length === 0 ? 'Hiện không có phòng nào chờ kiểm tra duyệt sạch.' : 'Không tìm thấy phòng phù hợp.')}
              </h3>
              <p className="text-on-surface-variant text-xs max-w-sm mx-auto">
                {roleFilteredList.length === 0 
                  ? 'Tất cả các phòng đã sẵn sàng hoặc đang phục vụ khách lưu trú.'
                  : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc nhân viên/tầng.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAndSortedRooms.map((room) => {
                const isDirty = room.status === 'DIRTY';
                const isUrgent = room.priorityLevel === 'URGENT';
                const isHigh = room.priorityLevel === 'HIGH';
                const isAssigned = Boolean(room.assignedHousekeeperId);

                return (
                  <div
                    key={room.id}
                    className={`flex flex-col bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 ${
                      isUrgent
                        ? 'border-red-400 ring-1 ring-red-400/30'
                        : isDirty 
                        ? 'border-orange-200 hover:border-orange-300' 
                        : 'border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Top Accent Stripe based on Priority & Status */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${
                      isUrgent ? 'from-red-500 to-rose-400' : isHigh ? 'from-amber-500 to-orange-400' : isDirty ? 'from-[#E28E3A] to-amber-400' : 'from-purple-600 to-indigo-500'
                    }`} />

                    {/* Room card top */}
                    <div className="p-4 border-b border-border-grey/70 bg-[#FDFEFA] flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant/80">
                          PHÒNG
                        </span>
                        <h3 className="font-extrabold text-2xl text-on-surface leading-tight mt-0.5 tracking-normal">
                          {room.roomNumber}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          {room.roomTypeName || 'Phòng Tiêu Chuẩn'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {room.cleaningReason === 'PERIODIC_VACANT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-teal-50 text-teal-800 border-teal-200 flex items-center gap-1">
                              <IoSparklesOutline size={11} className="text-teal-600" />
                              Định kỳ
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-2xs ${
                            isDirty 
                              ? 'bg-orange-50 text-orange-800 border-orange-200' 
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isDirty ? 'bg-orange-500' : 'bg-purple-500'}`} />
                            {isDirty ? 'Cần dọn' : 'Chờ duyệt'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#F4F6F0] text-on-surface-variant font-semibold border border-border-grey/60">
                          Tầng {room.floor || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Room card body */}
                    <div className="p-4 flex-1 space-y-3 text-xs">
                      {/* Specs chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#F4F6F0] text-on-surface-variant text-[11px] font-medium border border-border-grey/60 flex items-center gap-1">
                          <IoTimeOutline size={12} /> ~{room.standardCleaningMinutes || 45} phút
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#F4F6F0] text-on-surface-variant text-[11px] font-medium border border-border-grey/60 flex items-center gap-1">
                          <IoBrushOutline size={11} /> {room.cleaningReason === 'PERIODIC_VACANT' ? 'Dọn định kỳ' : 'Dọn sau trả phòng'}
                        </span>
                      </div>

                      {/* Live timer badge khi phòng đang trong phiên dọn */}
                      {isDirty && room.cleaningStartedAt && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                          Math.floor((nowTime - new Date(room.cleaningStartedAt).getTime()) / 60000) > (room.standardCleaningMinutes || 45)
                            ? 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <IoTimeOutline size={15} className="animate-spin" />
                            <span>Đang dọn: {Math.max(0, Math.floor((nowTime - new Date(room.cleaningStartedAt).getTime()) / 60000))} phút</span>
                          </div>
                          <span className="text-[10px] font-normal opacity-85">
                            Định mức: {room.standardCleaningMinutes || 45}p
                          </span>
                        </div>
                      )}

                      {/* Priority & Guest Info Banner */}
                      <div>
                        {room.cleaningReason === 'PERIODIC_VACANT' ? (
                          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-semibold text-[11px] flex items-start gap-2">
                            <IoSparklesOutline size={15} className="text-teal-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Phòng trống {room.vacantDays ? `${room.vacantDays} ngày` : 'lâu ngày'}</p>
                              <p className="text-teal-800 text-[10px] font-normal">Cần khử khuẩn và kiểm tra trang thiết bị</p>
                            </div>
                          </div>
                        ) : isUrgent ? (
                          <div className="p-2.5 rounded-xl bg-red-50/90 border border-red-200 text-red-950 text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold text-red-700">
                              <IoFlame size={15} className="animate-pulse text-red-600" />
                              <span>Khách nhận hôm nay ({room.nextCheckInDate || 'Hôm nay'})</span>
                            </div>
                            {room.nextGuestName && (
                              <p className="text-[11px] text-red-900/90 mt-1">
                                Khách đặt: <strong className="font-bold">{room.nextGuestName}</strong>
                              </p>
                            )}
                          </div>
                        ) : isHigh ? (
                          <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800">
                              <IoFlashOutline size={15} className="text-amber-600" />
                              <span>Khách nhận ngày mai ({room.nextCheckInDate})</span>
                            </div>
                            {room.nextGuestName && (
                              <p className="text-[11px] text-amber-900/90 mt-1">
                                Khách đặt: <strong>{room.nextGuestName}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-[#F4F6F0]/70 border border-border-grey/70 text-on-surface-variant text-[11px] flex items-center gap-1.5">
                            <IoTimeOutline size={13} className="text-on-surface-variant/70" />
                            <span>Ưu tiên: Tiêu chuẩn</span>
                          </div>
                        )}
                      </div>

                      {/* Phân công nhân viên */}
                      <div className="pt-2 border-t border-border-grey/60 space-y-1.5">
                        <div className="flex items-center justify-between text-on-surface-variant">
                          <span className="flex items-center gap-1 font-semibold text-[11px]">
                            <IoPersonOutline size={13} className="text-[#626F47]" /> Phụ trách:
                          </span>
                          
                          {/* Nút gỡ phân công cho Supervisor */}
                          {isSupervisor && isAssigned && (
                            <button
                              type="button"
                              onClick={() => handleUnassignCleaner(room)}
                              disabled={processingId === room.id}
                              className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-0.5 hover:underline cursor-pointer font-medium"
                              title="Hủy phân công"
                            >
                              <IoPersonRemoveOutline size={12} /> Gỡ
                            </button>
                          )}
                        </div>

                        {/* Giao diện cho Supervisor: Dropdown phân công */}
                        {isSupervisor ? (
                          <div className="relative">
                            <select
                              value={room.assignedHousekeeperId || ''}
                              onChange={(e) => handleAssignCleaner(room, e.target.value)}
                              disabled={processingId === room.id}
                              className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none focus:border-[#626F47] transition-colors cursor-pointer ${
                                isAssigned 
                                  ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-semibold' 
                                  : 'bg-amber-50/50 border-amber-300 text-amber-900'
                              }`}
                            >
                              <option value="">— Chưa phân công —</option>
                              {housekeepers.length === 0 ? (
                                <option value="" disabled>⚠️ Không tìm thấy nhân viên buồng phòng hoạt động</option>
                              ) : (
                                housekeepers.map(hk => (
                                  <option key={hk.id} value={hk.id}>
                                    {hk.name} ({hk.phone || 'NV Buồng phòng'})
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        ) : (
                          /* Giao diện cho Housekeeper: Chỉ hiển thị tên */
                          <div className={`p-2 rounded-xl border text-xs font-semibold ${
                            room.assignedHousekeeperId && user?.id && String(room.assignedHousekeeperId) === String(user.id)
                              ? 'bg-green-50 border-green-300 text-green-900'
                              : 'bg-surface-container-low border-border-grey text-on-surface-variant'
                          }`}>
                            {room.assignedHousekeeperName 
                              ? ((room.assignedHousekeeperId && user?.id && String(room.assignedHousekeeperId) === String(user.id)) ? '⭐ Bạn đang phụ trách' : room.assignedHousekeeperName)
                              : 'Chưa có người nhận'}
                          </div>
                        )}
                      </div>

                      {/* Ghi chú */}
                      {room.notes && (
                        <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-1.5 text-amber-950 text-[11px]">
                          <IoDocumentTextOutline size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <span className="italic line-clamp-2" title={room.notes}>{room.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Room card actions */}
                    <div className="p-4 pt-0 space-y-2 mt-auto">
                      {isDirty ? (
                        <>
                          {/* Housekeeper Actions */}
                          {isHousekeeper && (
                            !room.cleaningStartedAt ? (
                              <button
                                onClick={() => handleStartCleaning(room)}
                                disabled={processingId === room.id}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                {processingId === room.id ? (
                                  <span className="inline-block animate-square-spin w-3.5 h-3.5 border-2 border-white border-t-transparent border-l-transparent" />
                                ) : (
                                  <IoTimeOutline size={15} />
                                )}
                                Bắt đầu dọn (Bấm giờ)
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setInterruptionRoom(room)}
                                  disabled={processingId === room.id}
                                  className="flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                                  title="Đánh dấu nếu bị gián đoạn vì lý do khách quan"
                                >
                                  <IoWarningOutline size={14} className="text-amber-600 shrink-0" />
                                  <span>Bị gián đoạn</span>
                                </button>
                                <button
                                  onClick={() => handleSubmitInspection(room)}
                                  disabled={processingId === room.id}
                                  className="flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 disabled:bg-purple-400 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  {processingId === room.id ? (
                                    <span className="inline-block animate-square-spin w-3.5 h-3.5 border-2 border-white border-t-transparent border-l-transparent" />
                                  ) : (
                                    <IoSendOutline size={14} />
                                  )}
                                  <span>Báo dọn xong</span>
                                </button>
                              </div>
                            )
                          )}

                          {/* Supervisor: Lễ tân / Quản lý duyệt sạch ngay */}
                          {isSupervisor && (
                            <div className="space-y-1.5">
                              {!room.cleaningStartedAt && (
                                <button
                                  onClick={() => handleStartCleaning(room)}
                                  disabled={processingId === room.id}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <IoTimeOutline size={14} className="text-blue-600" />
                                  Bắt đầu tính giờ dọn
                                </button>
                              )}
                              <button
                                onClick={() => handleMarkClean(room)}
                                disabled={processingId === room.id}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#626F47] hover:bg-[#525E3B] active:bg-[#434E2E] disabled:bg-[#626F47]/50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                {processingId === room.id ? (
                                  <span className="inline-block animate-square-spin w-3.5 h-3.5 border-2 border-white border-t-transparent border-l-transparent" />
                                ) : (
                                  <IoCheckmarkDoneOutline size={15} />
                                )}
                                Đánh dấu phòng đã sạch
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        /* INSPECTING: Chờ duyệt sạch */
                        <div className="space-y-2">
                          {isSupervisor ? (
                            <>
                              <button
                                onClick={() => handleApproveClean(room)}
                                disabled={processingId === room.id}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#626F47] hover:bg-[#525E3B] active:bg-[#434E2E] disabled:bg-[#626F47]/50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                {processingId === room.id ? (
                                  <span className="inline-block animate-square-spin w-3.5 h-3.5 border-2 border-white border-t-transparent border-l-transparent" />
                                ) : (
                                  <IoCheckmarkDoneOutline size={15} />
                                )}
                                Duyệt sạch (Sẵn sàng)
                              </button>

                              <button
                                onClick={() => handleOpenRejectModal(room)}
                                disabled={processingId === room.id}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <IoCloseCircleOutline size={14} /> Yêu cầu dọn lại
                              </button>
                            </>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold text-center">
                              ⏳ Đang chờ quản lý nghiệm thu
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nút báo sự cố phòng khi dọn */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIncidentRoom(room)}
                          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <IoWarningOutline size={14} className="text-amber-600 shrink-0" />
                          <span>Sự cố</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLostItemRoom(room)}
                          className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <IoCubeOutline size={14} className="text-blue-600 shrink-0" />
                          <span>Đồ để quên</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Báo sự cố phòng */}
      {incidentRoom && (
        <RoomIncidentModal
          isOpen={!!incidentRoom}
          onClose={() => setIncidentRoom(null)}
          initialRoom={incidentRoom}
          onIncidentReported={() => {
            fetchRoomsAndStaff();
            if (onRoomCleaned) onRoomCleaned();
          }}
        />
      )}

      {/* Modal Ghi nhận đồ để quên khi dọn */}
      {lostItemRoom && (
        <LostItemCreateModal
          isOpen={!!lostItemRoom}
          onClose={() => setLostItemRoom(null)}
          initialRoom={lostItemRoom}
          onSuccess={() => {
            fetchRoomsAndStaff();
          }}
        />
      )}
      {/* Modal Đánh dấu gián đoạn phiên dọn */}
      {interruptionRoom && (
        <Modal
          isOpen={!!interruptionRoom}
          onClose={() => setInterruptionRoom(null)}
          title={`Đánh dấu gián đoạn dọn phòng ${interruptionRoom.roomNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <IoInformationCircleOutline size={16} className="text-amber-700" />
                <span>Quy định tính toán công bằng</span>
              </div>
              Phòng bị gián đoạn khách quan sẽ được gắn cờ và <strong>không tính vào thời gian dọn trung bình</strong>, giúp phản ánh đúng năng suất thực tế.
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-on-surface">Lý do gián đoạn:</label>
              <div className="space-y-1.5">
                {[
                  'Thiếu đồ vải, khăn hoặc chăn ga',
                  'Chờ xử lý đồ đạc/hành lý của khách cũ',
                  'Phát hiện sự cố phòng / chờ kỹ thuật bảo trì',
                  'Khách cũ quay lại lấy đồ hoặc bị điều động gấp',
                  'OTHER'
                ].map((reasonKey) => (
                  <label
                    key={reasonKey}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      interruptionReason === reasonKey
                        ? 'bg-[#1A2411]/5 border-[#626F47] text-on-surface font-semibold'
                        : 'border-border-grey hover:bg-[#F4F6F0] text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="radio"
                      name="interruptionReason"
                      value={reasonKey}
                      checked={interruptionReason === reasonKey}
                      onChange={(e) => setInterruptionReason(e.target.value)}
                      className="accent-[#626F47]"
                    />
                    <span>{reasonKey === 'OTHER' ? 'Lý do khác...' : reasonKey}</span>
                  </label>
                ))}
              </div>

              {interruptionReason === 'OTHER' && (
                <textarea
                  value={customInterruption}
                  onChange={(e) => setCustomInterruption(e.target.value)}
                  placeholder="Nhập lý do gián đoạn cụ thể..."
                  className="w-full mt-2 p-2.5 border border-border-grey rounded-xl text-xs focus:outline-none focus:border-primary"
                  rows={3}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInterruptionRoom(null)}
                disabled={processingId === interruptionRoom.id}
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmInterruption}
                disabled={processingId === interruptionRoom.id}
              >
                {processingId === interruptionRoom.id ? 'Đang lưu...' : 'Xác nhận gián đoạn'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Yêu cầu dọn lại (Kiểm tra chưa đạt) */}
      {rejectionRoom && (
        <Modal
          isOpen={!!rejectionRoom}
          onClose={() => setRejectionRoom(null)}
          title={`Yêu cầu dọn lại phòng ${rejectionRoom.roomNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <IoAlertCircleOutline size={16} className="text-red-700" />
                <span>Nghiệm thu vệ sinh chưa đạt</span>
              </div>
              Phòng sẽ được chuyển lại danh sách <strong>Cần dọn</strong> kèm lý do để nhân viên phụ trách biết và khắc phục.
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-on-surface">Vấn đề cần khắc phục:</label>
              <div className="space-y-1.5">
                {[
                  'Khu vực vệ sinh chưa đạt yêu cầu',
                  'Chưa thay ga giường / vỏ gối hoặc chưa phẳng phiu',
                  'Chưa bổ sung đầy đủ đồ amenities / nước uống',
                  'Còn mùi hôi hoặc sàn chưa hút bụi / lau sạch',
                  'OTHER'
                ].map((reasonKey) => (
                  <label
                    key={reasonKey}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      rejectionReason === reasonKey
                        ? 'bg-red-50 border-red-300 text-red-950 font-semibold'
                        : 'border-border-grey hover:bg-[#F4F6F0] text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reasonKey}
                      checked={rejectionReason === reasonKey}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="accent-red-600"
                    />
                    <span>{reasonKey === 'OTHER' ? 'Lý do khác...' : reasonKey}</span>
                  </label>
                ))}
              </div>

              {rejectionReason === 'OTHER' && (
                <textarea
                  value={customRejection}
                  onChange={(e) => setCustomRejection(e.target.value)}
                  placeholder="Ghi chú chi tiết điểm chưa đạt..."
                  className="w-full mt-2 p-2.5 border border-border-grey rounded-xl text-xs focus:outline-none focus:border-red-500"
                  rows={3}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-grey">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectionRoom(null)}
                disabled={processingId === rejectionRoom.id}
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmRejection}
                disabled={processingId === rejectionRoom.id}
              >
                {processingId === rejectionRoom.id ? 'Đang gửi...' : 'Xác nhận yêu cầu dọn lại'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CleaningTaskList;
