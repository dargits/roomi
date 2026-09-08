import React, { useState, useMemo } from 'react';
import {
  IoBedOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoLayersOutline,
  IoSparklesOutline,
  IoWarningOutline,
  IoPersonOutline
} from 'react-icons/io5';
import Button from '../../components/ui/Button';

const GroupRoomAssignmentGrid = ({
  group,
  suggestion,
  selections,
  onUpdateSelection,
  onApplyAllSuggested,
  onClose,
  onSubmit,
  isSubmitting,
  errorMsg
}) => {
  const [activeBookingId, setActiveBookingId] = useState(
    suggestion?.assignments?.[0]?.bookingId || null
  );

  // Lấy danh sách booking dòng phòng
  const assignments = suggestion?.assignments || [];
  const activeAssignment = assignments.find(a => a.bookingId === activeBookingId) || assignments[0];

  // Thu thập tất cả các phòng xuất hiện trong suggestion để gom theo tầng
  const allAvailableRoomsMap = useMemo(() => {
    const map = new Map();
    assignments.forEach(a => {
      a.availableRooms?.forEach(r => {
        if (!map.has(r.id)) {
          map.set(r.id, r);
        }
      });
    });
    return Array.from(map.values());
  }, [assignments]);

  // Gom phòng theo Tầng
  const roomsByFloor = useMemo(() => {
    const groups = {};
    allAvailableRoomsMap.forEach(room => {
      const floor = room.floor ? `Tầng ${room.floor}` : 'Tầng trệt / Khác';
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(room);
    });
    return groups;
  }, [allAvailableRoomsMap]);

  // Các phòng đã được chọn cho các booking khác
  const selectedRoomIds = useMemo(() => {
    const set = new Set();
    Object.entries(selections).forEach(([bId, rId]) => {
      if (rId) set.add(Number(rId));
    });
    return set;
  }, [selections]);

  const handleRoomClick = (room) => {
    if (!activeAssignment) return;
    // Kiểm tra xem phòng có phù hợp với roomType của activeAssignment không
    const isMatchingType = activeAssignment.availableRooms?.some(r => r.id === room.id);
    if (!isMatchingType) return;

    onUpdateSelection(activeAssignment.bookingId, String(room.id));

    // Tự động nhảy sang booking tiếp theo chưa chọn phòng
    const currentIndex = assignments.findIndex(a => a.bookingId === activeAssignment.bookingId);
    const nextUnassigned = assignments.find(
      (a, idx) => idx > currentIndex && !selections[a.bookingId]
    ) || assignments.find(a => !selections[a.bookingId] && a.bookingId !== activeAssignment.bookingId);

    if (nextUnassigned) {
      setActiveBookingId(nextUnassigned.bookingId);
    }
  };

  const assignedCount = Object.values(selections).filter(Boolean).length;
  const isAllAssigned = assignments.length > 0 && assignedCount === assignments.length;

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <IoWarningOutline size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Thanh công cụ & Gợi ý tự động */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl border border-border-grey">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-on-surface">
            Tiến độ xếp phòng:
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${isAllAssigned ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {assignedCount} / {assignments.length} phòng đã chọn
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          icon={IoSparklesOutline}
          onClick={onApplyAllSuggested}
          className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
        >
          Áp dụng gợi ý tối ưu của hệ thống
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Bên trái: Danh sách dòng booking trong đoàn (4 cols) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            Danh sách phòng cần xếp
          </div>
          {assignments.map((line, idx) => {
            const isSelectedForThis = Boolean(selections[line.bookingId]);
            const selectedRoomObj = allAvailableRoomsMap.find(
              r => String(r.id) === String(selections[line.bookingId])
            );
            const isActive = line.bookingId === activeBookingId;

            return (
              <div
                key={line.bookingId}
                onClick={() => setActiveBookingId(line.bookingId)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                    : isSelectedForThis
                    ? 'border-green-300 bg-green-50/40 hover:bg-green-50'
                    : 'border-border-grey bg-surface hover:bg-surface-container-low'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm text-on-surface flex items-center gap-1.5">
                      <IoBedOutline className={isActive ? 'text-primary' : 'text-on-surface-variant'} size={16} />
                      Phòng #{idx + 1}: {line.roomTypeName}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5">
                      Mã booking: #{line.bookingId}
                    </div>
                  </div>

                  {selectedRoomObj ? (
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-green-600 text-white shadow-2xs">
                      P.{selectedRoomObj.roomNumber}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                      Chưa chọn
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bên phải: Sơ đồ phòng trực quan gom theo tầng (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-4 rounded-xl border border-border-grey space-y-4 max-h-[420px] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-grey pb-2">
            <div>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Sơ đồ phòng trống cho:
              </span>
              <strong className="text-sm text-primary">
                Phòng #{assignments.findIndex(a => a.bookingId === activeBookingId) + 1} ({activeAssignment?.roomTypeName})
              </strong>
            </div>
            {/* Chú thích màu */}
            <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Khả dụng
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-400 ring-2 ring-amber-500 inline-block"></span> Đang chọn
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gray-200 inline-block"></span> Không khả dụng
              </span>
            </div>
          </div>

          {Object.keys(roomsByFloor).length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Không tìm thấy phòng trống nào phù hợp cho loại phòng này.
            </div>
          ) : (
            Object.entries(roomsByFloor).map(([floorName, floorRooms]) => (
              <div key={floorName} className="space-y-2">
                <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <IoLayersOutline className="text-primary" size={14} /> {floorName}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {floorRooms.map(room => {
                    const isMatchingType = activeAssignment?.availableRooms?.some(r => r.id === room.id);
                    const isSelectedForActive = String(selections[activeAssignment?.bookingId]) === String(room.id);
                    const isSelectedForOther = selectedRoomIds.has(room.id) && !isSelectedForActive;
                    const isSuggestedForActive = activeAssignment?.suggestedRoomId === room.id;

                    let cardClass = '';
                    let statusLabel = '';

                    if (isSelectedForActive) {
                      cardClass = 'bg-amber-100 border-2 border-amber-500 text-amber-900 shadow-sm';
                      statusLabel = 'Đang chọn';
                    } else if (isSelectedForOther) {
                      cardClass = 'bg-blue-50 border border-blue-300 text-blue-800 opacity-80';
                      statusLabel = 'Đã gán phòng khác';
                    } else if (isMatchingType) {
                      if (isSuggestedForActive) {
                        cardClass = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 hover:bg-emerald-100 cursor-pointer';
                        statusLabel = 'Gợi ý';
                      } else {
                        cardClass = 'bg-emerald-50/70 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer';
                        statusLabel = 'Trống';
                      }
                    } else {
                      cardClass = 'bg-gray-100 border border-gray-200 text-gray-400 opacity-50 cursor-not-allowed';
                      statusLabel = 'Khác loại';
                    }

                    return (
                      <button
                        key={room.id}
                        type="button"
                        disabled={!isMatchingType || isSelectedForOther}
                        onClick={() => handleRoomClick(room)}
                        className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all ${cardClass}`}
                      >
                        <span className="font-bold text-base leading-tight">
                          P.{room.roomNumber}
                        </span>
                        {room.maxCapacity && (
                          <span className="text-[10px] mt-0.5 flex items-center gap-0.5 font-medium opacity-80">
                            <IoPersonOutline size={10} /> {room.maxCapacity} người
                          </span>
                        )}
                        <span className="text-[10px] mt-0.5 line-clamp-1 font-medium">
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting} icon={IoCloseOutline}>
          Hủy
        </Button>
        <Button
          variant="primary"
          icon={IoCheckmarkCircleOutline}
          onClick={onSubmit}
          isLoading={isSubmitting}
          disabled={!isAllAssigned || isSubmitting}
        >
          Xác nhận gán {assignedCount} phòng
        </Button>
      </div>
    </div>
  );
};

export default GroupRoomAssignmentGrid;
