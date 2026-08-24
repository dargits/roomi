import React, { useState, useEffect, useMemo } from 'react';
import { roomApi } from '../../services/roomApi';
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
  IoDocumentTextOutline
} from 'react-icons/io5';

/**
 * Danh sách phòng cần dọn dẹp cho nhân viên buồng phòng.
 * Hiển thị phòng DIRTY + hỗ trợ lọc/tìm kiếm + nút "Đã dọn xong".
 */
const CleaningTaskList = ({ onRoomCleaned }) => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [dirtyRooms, setDirtyRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');

  const canMarkClean = ['OWNER', 'HOUSEKEEPER', 'ADMIN'].includes(user?.role);

  const fetchDirtyRooms = async () => {
    setLoading(true);
    try {
      const data = await roomApi.getAllRooms('DIRTY');
      setDirtyRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch dirty rooms error:', err);
      toast.error(err.response?.data?.message || 'Không thể tải danh sách phòng cần dọn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirtyRooms();
  }, []);

  const handleMarkClean = async (room) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận dọn phòng',
      message: `Xác nhận đánh dấu Phòng ${room.roomNumber} đã được dọn sạch và sẵn sàng đón khách?`,
      confirmText: 'Hoàn thành dọn phòng',
      type: 'info'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.markRoomClean(room.id);
      toast.success(`Đã cập nhật Phòng ${room.roomNumber} sang trạng thái Sạch sẽ!`);
      setDirtyRooms((prev) => prev.filter((r) => r.id !== room.id));
      if (onRoomCleaned) onRoomCleaned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCleanAll = async () => {
    if (filteredRooms.length === 0) return;
    const isConfirmed = await confirm({
      title: 'Xác nhận dọn tất cả',
      message: `Bạn có chắc muốn đánh dấu tất cả ${filteredRooms.length} phòng đang hiển thị là đã dọn xong?`,
      confirmText: 'Dọn tất cả',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setLoading(true);
    let successCount = 0;
    for (const room of filteredRooms) {
      try {
        await roomApi.markRoomClean(room.id);
        successCount++;
      } catch (err) {
        console.error(`Lỗi dọn phòng ${room.roomNumber}:`, err);
      }
    }
    toast.success(`Đã đánh dấu hoàn tất dọn dẹp ${successCount} phòng!`);
    await fetchDirtyRooms();
    if (onRoomCleaned) onRoomCleaned();
    setLoading(false);
  };

  // Danh sách các tầng có phòng cần dọn
  const floors = useMemo(() => {
    const floorSet = new Set(dirtyRooms.map(r => r.floor).filter(Boolean));
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [dirtyRooms]);

  // Lọc theo tìm kiếm và tầng
  const filteredRooms = useMemo(() => {
    return dirtyRooms.filter(room => {
      const matchSearch = !searchTerm || 
        room.roomNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchFloor = !selectedFloor || room.floor?.toString() === selectedFloor.toString();

      return matchSearch && matchFloor;
    });
  }, [dirtyRooms, searchTerm, selectedFloor]);

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-50/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shadow-inner">
            <IoBrushOutline size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-title-lg text-on-surface font-semibold text-lg">Phòng cần dọn dẹp</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
                {dirtyRooms.length}
              </span>
            </div>
            <p className="font-body-md text-on-surface-variant text-xs mt-0.5">
              {loading ? 'Đang tải danh sách...' : `${dirtyRooms.length} phòng đang chờ dọn vệ sinh`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirtyRooms.length > 1 && canMarkClean && (
            <button
              onClick={handleCleanAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-label-md text-xs font-medium transition-colors"
            >
              <IoSparklesOutline size={15} />
              Dọn tất cả ({filteredRooms.length})
            </button>
          )}
          <button
            onClick={fetchDirtyRooms}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-grey bg-white hover:bg-surface-container-low transition-colors font-body-md text-on-surface-variant text-xs font-medium shadow-sm"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-surface-container-low/40 border-b border-border-grey flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" size={16} />
          <input
            type="text"
            placeholder="Tìm theo số phòng, loại phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-border-grey rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {floors.length > 0 && (
          <div className="flex items-center gap-1.5">
            <IoFilterOutline size={15} className="text-on-surface-variant" />
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-border-grey rounded-xl text-on-surface focus:outline-none focus:border-primary shadow-sm"
            >
              <option value="">Tất cả tầng ({dirtyRooms.length})</option>
              {floors.map(floor => (
                <option key={floor} value={floor}>Tầng {floor}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {loading && dirtyRooms.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-surface-container-low rounded-2xl animate-pulse border border-border-grey" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-inner">
              <IoCheckmarkCircleOutline size={34} />
            </div>
            <h3 className="font-title-lg text-on-surface font-semibold text-base mb-1">
              {dirtyRooms.length === 0 ? 'Tất cả phòng đã sạch!' : 'Không tìm thấy phòng phù hợp'}
            </h3>
            <p className="font-body-md text-on-surface-variant text-xs max-w-sm mx-auto">
              {dirtyRooms.length === 0 
                ? 'Tuyệt vời! Hiện tại không có phòng nào trong danh sách cần dọn dẹp.'
                : 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc tầng.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col bg-white rounded-2xl border border-orange-200 overflow-hidden hover:shadow-md hover:border-orange-300 transition-all duration-200"
              >
                {/* Room card top */}
                <div className="p-4 bg-orange-50/60 border-b border-orange-100 flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-orange-600 tracking-wide uppercase">Phòng</span>
                    <h3 className="font-headline-sm text-on-surface font-bold text-xl leading-tight">
                      {room.roomNumber}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                      {room.roomTypeName || 'Tiêu chuẩn'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                    Chưa dọn
                  </span>
                </div>

                {/* Room card body */}
                <div className="p-4 flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <IoLayersOutline size={14} className="text-on-surface-variant/70" /> Tầng
                    </span>
                    <span className="font-semibold text-on-surface">{room.floor || '—'}</span>
                  </div>

                  {room.notes && (
                    <div className="pt-2 border-t border-dashed border-border-grey flex items-start gap-1.5 text-on-surface-variant">
                      <IoDocumentTextOutline size={14} className="text-orange-500 shrink-0 mt-0.5" />
                      <span className="italic line-clamp-2" title={room.notes}>{room.notes}</span>
                    </div>
                  )}
                </div>

                {/* Room card action */}
                <div className="p-4 pt-0">
                  {canMarkClean && (
                    <button
                      onClick={() => handleMarkClean(room)}
                      disabled={processingId === room.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white rounded-xl font-label-md text-xs font-semibold shadow-sm transition-colors"
                    >
                      {processingId === room.id ? (
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <IoCheckmarkCircleOutline size={16} />
                      )}
                      Đã dọn xong
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CleaningTaskList;

