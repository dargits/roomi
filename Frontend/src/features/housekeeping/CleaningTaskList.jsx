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
  IoLayersOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoSendOutline,
  IoCheckmarkDoneOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoFlameOutline,
  IoFlashOutline,
  IoCheckmarkOutline,
  IoPersonRemoveOutline,
  IoSwapHorizontalOutline,
  IoInformationCircleOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';

/**
 * NCL-06-CN-004: Phân công phòng cần dọn cho nhân viên buồng phòng
 * - Lễ tân / Chủ cơ sở / Quản trị viên phân công từng phòng cho nhân viên buồng phòng
 * - Hiển thị mức ưu tiên dọn dẹp theo ngày/giờ đón khách kế tiếp
 * - Nhân viên buồng phòng chỉ thấy việc của mình và phòng chưa ai nhận
 * - Thanh tổng hợp cân bằng khối lượng công việc giữa các nhân viên
 * - Quy tắc không gán chồng: gỡ người cũ trước khi chuyển giao người mới
 * - Luồng gửi duyệt và nghiệm thu 2 bước (DIRTY -> submitInspection -> INSPECTING -> approveClean -> AVAILABLE)
 */
const CleaningTaskList = ({ onRoomCleaned }) => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [dirtyRooms, setDirtyRooms] = useState([]);
  const [inspectingRooms, setInspectingRooms] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('DIRTY'); // 'DIRTY' | 'INSPECTING'
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | housekeeperId
  const [sortBy, setSortBy] = useState('PRIORITY'); // 'PRIORITY' | 'ROOM_NUMBER' | 'FLOOR'
  const [housekeeperTaskFilter, setHousekeeperTaskFilter] = useState('ALL'); // 'ALL' | 'MY_TASKS' | 'UNASSIGNED'

  const isSupervisor = ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(user?.role);
  const isHousekeeper = user?.role === 'HOUSEKEEPER';

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
              u => (u.role === 'HOUSEKEEPER' || u.role === 'STAFF' || u.role === 'OWNER' || u.role === 'ADMIN') && u.active !== false
            );
            setHousekeepers(hkList);
          } catch (e2) {
            console.error('Failed to fetch housekeepers:', e2);
          }
        }
      }
    } catch (err) {
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
  const handleSubmitInspection = async (room) => {
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi gửi kiểm tra phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // Supervisor duyệt phòng sạch -> AVAILABLE
  const handleApproveClean = async (room) => {
    const isConfirmed = await confirm({
      title: 'Duyệt phòng sạch',
      message: `Xác nhận phòng ${room.roomNumber} đã đạt tiêu chuẩn vệ sinh và sẵn sàng đón khách?`,
      confirmText: 'Duyệt sạch (Sẵn sàng)',
      type: 'success'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.approveClean(room.id);
      toast.success(`Phòng ${room.roomNumber} đã được duyệt sạch thành công!`);
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi duyệt phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // Supervisor đánh dấu phòng đã sạch trực tiếp (DIRTY -> AVAILABLE)
  const handleMarkClean = async (room) => {
    const isConfirmed = await confirm({
      title: 'Đánh dấu phòng đã sạch',
      message: `Xác nhận phòng ${room.roomNumber} đã dọn dẹp xong và sẵn sàng đón khách?`,
      confirmText: 'Đánh dấu sạch',
      type: 'success'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.markRoomClean(room.id);
      toast.success(`Phòng ${room.roomNumber} đã được đánh dấu sạch!`);
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật phòng.');
    } finally {
      setProcessingId(null);
    }
  };
  // Supervisor yêu cầu dọn lại -> DIRTY
  const handleRejectClean = async (room) => {
    const isConfirmed = await confirm({
      title: 'Yêu cầu dọn lại',
      message: `Phòng ${room.roomNumber} chưa đạt yêu cầu? Chuyển lại về trạng thái Cần dọn dẹp?`,
      confirmText: 'Yêu cầu dọn lại',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.markRoomDirty(room.id);
      toast.info(`Phòng ${room.roomNumber} đã được chuyển lại về danh sách Cần dọn dẹp.`);
      await fetchRoomsAndStaff();
      if (onRoomCleaned) onRoomCleaned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi chuyển trạng thái phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // Gán hoặc chuyển giao nhân viên dọn phòng
  const handleAssignCleaner = async (room, newHousekeeperId) => {
    if (!newHousekeeperId) {
      // Chọn "Chưa phân công" → gỡ phân công
      handleUnassignCleaner(room);
      return;
    }

    const targetStaff = housekeepers.find(h => String(h.id) === String(newHousekeeperId));
    const targetStaffName = targetStaff?.name || 'Nhân viên mới';

    // Nếu phòng đang có người phụ trách khác → Cảnh báo chuyển giao
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
      // Backend hỗ trợ reassign trực tiếp (gán đè người mới lên người cũ)
      await roomApi.assignCleaner(room.id, Number(newHousekeeperId));
      toast.success(`Đã phân công ${targetStaffName} dọn phòng ${room.roomNumber}!`);
      fetchRoomsAndStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi phân công nhân viên');
    } finally {
      setProcessingId(null);
    }
  };

  // Gỡ phân công
  const handleUnassignCleaner = async (room) => {
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
    } catch (err) {
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

    return {
      unassignedCount,
      staffCounts,
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
    return Array.from(floorSet).sort((a, b) => a - b);
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
        const priorityWeight = { URGENT: 3, HIGH: 2, NORMAL: 1 };
        const weightA = priorityWeight[a.priorityLevel] || 1;
        const weightB = priorityWeight[b.priorityLevel] || 1;
        if (weightA !== weightB) return weightB - weightA;
        return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      }
      if (sortBy === 'ROOM_NUMBER') {
        return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      }
      if (sortBy === 'FLOOR') {
        return (Number(a.floor) || 0) - (Number(b.floor) || 0);
      }
      return 0;
    });
  }, [roleFilteredList, searchTerm, selectedFloor, selectedStaffFilter, housekeeperTaskFilter, sortBy, isSupervisor, isHousekeeper, user?.id]);

  return (
    <div className="space-y-4">
      {/* 1. THANH TỔNG HỢP CÂN BẰNG KHỐI LƯỢNG CÔNG VIỆC (Dành cho Lễ tân / Chủ cơ sở) */}
      {isSupervisor && (
        <div className="bg-surface-container-lowest border border-border-grey p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <IoPersonOutline className="text-primary" size={18} />
              <h3 className="font-title-md text-on-surface font-bold text-sm">
                Phân bổ {activeSubTab === 'DIRTY' ? 'phòng cần dọn' : 'phòng chờ duyệt'} ({workloadStats.totalCount} phòng)
              </h3>
            </div>
            <span className="text-[11px] text-on-surface-variant italic">
              Nhấp vào nhân viên để lọc riêng danh sách phòng của từng người
            </span>
          </div>

          {/* Workload Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chip Tất cả */}
            <button
              onClick={() => setSelectedStaffFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                selectedStaffFilter === 'ALL'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-surface border-border-grey text-on-surface hover:border-primary'
              }`}
            >
              Tất cả ({workloadStats.totalCount})
            </button>

            {/* Chip Chưa phân công */}
            <button
              onClick={() => setSelectedStaffFilter(prev => prev === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                selectedStaffFilter === 'UNASSIGNED'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : workloadStats.unassignedCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-surface border-border-grey text-on-surface-variant hover:border-primary'
              }`}
            >
              <IoAlertCircleOutline size={14} className={workloadStats.unassignedCount > 0 ? 'text-amber-600' : ''} />
              Chưa phân công ({workloadStats.unassignedCount})
            </button>

            {/* Chips từng nhân viên buồng phòng */}
            {workloadStats.staffCounts.map(st => {
              const isSelected = selectedStaffFilter === String(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStaffFilter(prev => prev === String(st.id) ? 'ALL' : String(st.id))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : st.assignedCount > 0
                      ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                      : 'bg-surface border-border-grey text-on-surface-variant hover:border-primary'
                  }`}
                  title={isSelected ? 'Bấm để hủy lọc' : `Lọc phòng của ${st.name}`}
                >
                  <IoPersonOutline size={13} />
                  <span>{st.name}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : st.assignedCount > 0
                      ? 'bg-blue-200 text-blue-900'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {st.assignedCount} phòng
                  </span>
                </button>
              );
            })}
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
      <div className="bg-surface-container-lowest border border-border-grey overflow-hidden shadow-sm">
        {/* Header toolbar */}
        <div className="p-4 border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low/30">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center border ${
              activeSubTab === 'DIRTY' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-purple-50 text-purple-600 border-purple-200'
            }`}>
              {activeSubTab === 'DIRTY' ? <IoBrushOutline size={20} /> : <IoSparklesOutline size={20} />}
            </div>
            <div>
              <h2 className="font-title-lg text-on-surface font-bold text-base">
                {activeSubTab === 'DIRTY' ? 'Danh sách phòng cần dọn dẹp' : 'Phòng chờ kiểm tra & duyệt sạch'}
              </h2>
              <p className="text-on-surface-variant text-xs">
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
            <div className="flex bg-surface-container-low p-1 border border-border-grey">
              <button
                onClick={() => { setActiveSubTab('DIRTY'); setSelectedFloor(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'DIRTY'
                    ? 'bg-white text-orange-600 font-bold border border-orange-200'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <IoBrushOutline size={14} /> Cần dọn ({tabCounts.dirty})
              </button>
              <button
                onClick={() => { setActiveSubTab('INSPECTING'); setSelectedFloor(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'INSPECTING'
                    ? 'bg-white text-purple-600 font-bold border border-purple-200'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <IoSparklesOutline size={14} /> Chờ duyệt ({tabCounts.inspecting})
              </button>
            </div>

            <button
              onClick={fetchRoomsAndStaff}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-border-grey bg-white hover:bg-surface-container-low transition-colors text-on-surface-variant text-xs font-semibold shadow-xs cursor-pointer"
            >
              <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Active Filter Notification (Khi đang lọc theo nhân viên) */}
        {selectedStaffLabel && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/80 border-b border-blue-200 text-xs text-blue-950">
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
        <div className="p-4 bg-surface-container-low/40 border-b border-border-grey flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" size={16} />
            <input
              type="text"
              placeholder="Tìm theo số phòng, loại phòng, nhân viên, khách..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-border-grey text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary shadow-xs"
            />
          </div>

          {/* Floor filter */}
          {floors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <IoFilterOutline size={15} className="text-on-surface-variant" />
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-border-grey text-on-surface focus:outline-none focus:border-primary shadow-xs"
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
              className="px-3 py-2 text-xs bg-white border border-border-grey text-on-surface focus:outline-none focus:border-primary shadow-xs"
            >
              <option value="PRIORITY">Độ ưu tiên đón khách</option>
              <option value="ROOM_NUMBER">Số phòng (A-Z)</option>
              <option value="FLOOR">Tầng (Thấp → Cao)</option>
            </select>
          </div>
        </div>

        {/* Room Cards Grid */}
        <div className="p-4">
          {loading && filteredAndSortedRooms.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 bg-surface-container-low animate-pulse border border-border-grey" />
              ))}
            </div>
          ) : filteredAndSortedRooms.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-green-100 flex items-center justify-center mx-auto mb-3 text-green-600 border border-green-200">
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
                    className={`flex flex-col bg-white border transition-all duration-200 ${
                      isUrgent
                        ? 'border-red-400 shadow-sm ring-1 ring-red-400/30'
                        : isDirty 
                        ? 'border-orange-200 hover:border-orange-300' 
                        : 'border-purple-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Top Accent Stripe based on Priority & Status */}
                    <div className={`h-1 w-full ${
                      isUrgent ? 'bg-red-500' : isHigh ? 'bg-amber-500' : isDirty ? 'bg-orange-400' : 'bg-purple-500'
                    }`} />

                    {/* Room card top */}
                    <div className={`p-3.5 border-b flex items-start justify-between ${
                      isUrgent ? 'bg-red-50/40 border-red-100' : isDirty ? 'bg-orange-50/40 border-orange-100' : 'bg-purple-50/40 border-purple-100'
                    }`}>
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
                          Phòng
                        </span>
                        <h3 className="font-headline-sm text-on-surface font-extrabold text-2xl leading-none mt-0.5">
                          {room.roomNumber}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium mt-1">
                          {room.roomTypeName || 'Tiêu chuẩn'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          isDirty 
                            ? 'bg-orange-100 text-orange-900 border-orange-300' 
                            : 'bg-purple-100 text-purple-900 border-purple-300'
                        }`}>
                          {isDirty ? 'Cần dọn' : 'Chờ duyệt'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-semibold">
                          Tầng {room.floor || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Room card body */}
                    <div className="p-3.5 flex-1 space-y-2.5 text-xs">
                      {/* Priority Badge */}
                      <div>
                        {isUrgent ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100/80 border border-red-300 text-red-800 font-bold text-[11px]">
                            <IoFlameOutline size={15} className="text-red-600 animate-pulse" />
                            <span>🔥 Khách nhận hôm nay ({room.nextCheckInDate})</span>
                          </div>
                        ) : isHigh ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100/80 border border-amber-300 text-amber-900 font-bold text-[11px]">
                            <IoFlashOutline size={15} className="text-amber-600" />
                            <span>⚡ Khách nhận ngày mai ({room.nextCheckInDate})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-surface-container-low border border-border-grey text-on-surface-variant text-[11px]">
                            <IoTimeOutline size={13} />
                            <span>Ưu tiên: Tiêu chuẩn</span>
                          </div>
                        )}
                        {room.nextGuestName && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5 italic">
                            Khách sắp tới: <strong>{room.nextGuestName}</strong>
                          </p>
                        )}
                      </div>

                      {/* Phân công nhân viên */}
                      <div className="pt-2 border-t border-border-grey/60 space-y-1.5">
                        <div className="flex items-center justify-between text-on-surface-variant">
                          <span className="flex items-center gap-1 font-semibold">
                            <IoPersonOutline size={13} className="text-primary" /> Phụ trách:
                          </span>
                          
                          {/* Nút gỡ phân công cho Supervisor */}
                          {isSupervisor && isAssigned && (
                            <button
                              type="button"
                              onClick={() => handleUnassignCleaner(room)}
                              disabled={processingId === room.id}
                              className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-0.5 hover:underline cursor-pointer"
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
                              className={`w-full px-2.5 py-1.5 text-xs border font-medium focus:outline-none focus:border-primary ${
                                isAssigned 
                                  ? 'bg-blue-50/50 border-blue-300 text-blue-950 font-bold' 
                                  : 'bg-amber-50/40 border-amber-300 text-amber-900'
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
                          <div className={`p-1.5 border text-xs font-semibold ${
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
                        <div className="pt-1.5 border-t border-dashed border-border-grey flex items-start gap-1.5 text-on-surface-variant text-[11px]">
                          <IoDocumentTextOutline size={13} className="text-orange-500 shrink-0 mt-0.5" />
                          <span className="italic line-clamp-2" title={room.notes}>{room.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Room card actions */}
                    <div className="p-3.5 pt-0 space-y-2 mt-auto">
                      {isDirty ? (
                        <>
                          {/* Housekeeper: Gửi kiểm tra sau khi dọn xong */}
                          {isHousekeeper && (
                            <button
                              onClick={() => handleSubmitInspection(room)}
                              disabled={processingId === room.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 disabled:bg-purple-400 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              {processingId === room.id ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent" />
                              ) : (
                                <IoSendOutline size={14} />
                              )}
                              Dọn xong, gửi duyệt
                            </button>
                          )}

                          {/* Supervisor: Lễ tân / Quản lý duyệt sạch ngay */}
                          {isSupervisor && (
                            <button
                              onClick={() => handleMarkClean(room)}
                              disabled={processingId === room.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              {processingId === room.id ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent" />
                              ) : (
                                <IoCheckmarkDoneOutline size={15} />
                              )}
                              Đánh dấu phòng đã sạch
                            </button>
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
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                {processingId === room.id ? (
                                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent" />
                                ) : (
                                  <IoCheckmarkDoneOutline size={15} />
                                )}
                                Duyệt sạch (Sẵn sàng)
                              </button>

                              <button
                                onClick={() => handleRejectClean(room)}
                                disabled={processingId === room.id}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <IoCloseCircleOutline size={14} /> Yêu cầu dọn lại
                              </button>
                            </>
                          ) : (
                            <div className="p-2 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold text-center">
                              ⏳ Đang chờ quản lý nghiệm thu
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CleaningTaskList;
