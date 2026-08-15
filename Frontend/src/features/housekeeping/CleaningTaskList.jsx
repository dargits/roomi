import React, { useState, useEffect } from 'react';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../context/AuthContext';
import { IoBrushOutline, IoCheckmarkCircleOutline, IoLogOutOutline, IoRefreshOutline, IoTimeOutline, IoWarningOutline } from 'react-icons/io5';

const getStatusColor = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'bg-green-100 text-green-800 border-green-300';
    case 'OCCUPIED': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'DIRTY': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MAINTENANCE': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'AVAILABLE': return 'Trống';
    case 'OCCUPIED': return 'Đang ở';
    case 'DIRTY': return 'Chưa dọn';
    case 'MAINTENANCE': return 'Bảo trì';
    default: return status;
  }
};

/**
 * Danh sách phòng cần dọn dẹp cho nhân viên buồng phòng.
 * Chỉ hiển thị phòng DIRTY + nút "Đánh dấu đã dọn".
 */
const CleaningTaskList = ({ onRoomCleaned }) => {
  const { user } = useAuth();
  const [dirtyRooms, setDirtyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchDirtyRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomApi.getAllRooms('DIRTY');
      setDirtyRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Không thể tải danh sách phòng. Vui lòng thử lại.');
      console.error('Fetch dirty rooms error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirtyRooms();
  }, []);

  const handleMarkClean = async (room) => {
    if (!window.confirm(`Xác nhận đánh dấu Phòng ${room.roomNumber} đã được dọn sạch?`)) return;
    setProcessingId(room.id);
    try {
      await roomApi.markRoomClean(room.id);
      setDirtyRooms((prev) => prev.filter((r) => r.id !== room.id));
      if (onRoomCleaned) onRoomCleaned();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border-grey flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <IoBrushOutline size={20} className="text-orange-600" />
          </div>
          <div>
            <h2 className="font-title-lg text-on-surface">Phòng cần dọn dẹp</h2>
            <p className="font-body-md text-on-surface-variant text-sm">
              {loading ? 'Đang tải...' : `${dirtyRooms.length} phòng chờ dọn dẹp`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDirtyRooms}
          className="flex items-center gap-2 px-3 py-2 rounded border border-border-grey bg-surface-container-lowest hover:bg-surface-container-low transition-colors font-body-md text-on-surface-variant text-sm"
        >
          <IoRefreshOutline size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-error rounded-md font-body-md text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-surface-container-low rounded-lg animate-pulse border border-border-grey" />
            ))}
          </div>
        ) : dirtyRooms.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IoCheckmarkCircleOutline size={32} className="text-green-600" />
            </div>
            <h3 className="font-title-lg text-on-surface mb-1">Tất cả phòng đã sạch!</h3>
            <p className="font-body-md text-on-surface-variant">Không có phòng nào cần dọn dẹp lúc này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dirtyRooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col bg-surface rounded-lg border-2 border-orange-300 overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Room header */}
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-title-lg text-on-surface">Phòng {room.roomNumber}</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{room.roomTypeName || 'N/A'}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-300">
                    Chưa dọn
                  </span>
                </div>

                {/* Room info */}
                <div className="px-4 py-3 flex-1">
                  <div className="flex justify-between items-center font-body-md text-on-surface-variant">
                    <span>Tầng:</span>
                    <span className="font-medium text-on-surface">{room.floor || '—'}</span>
                  </div>
                  {room.notes && (
                    <p className="mt-2 text-xs text-on-surface-variant italic truncate" title={room.notes}>
                      {room.notes}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleMarkClean(room)}
                    disabled={processingId === room.id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded font-label-md transition-colors"
                  >
                    {processingId === room.id ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <IoCheckmarkCircleOutline size={16} />
                    )}
                    Đã dọn xong
                  </button>
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
