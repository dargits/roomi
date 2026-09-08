import React, { useState, useEffect, useMemo } from 'react';
import { 
  IoCheckmarkOutline, 
  IoBedOutline, 
  IoAlertCircleOutline, 
  IoSwapHorizontalOutline, 
  IoPersonOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { roomApi } from '../../services/roomApi';
import bookingApi from '../../services/bookingApi';
import { useToast } from '../../context/ToastContext';

const ITEMS_PER_PAGE = 5;

const AssignRoomModal = ({
  isOpen,
  onClose,
  booking,
  bookingId: propBookingId,
  roomTypeId: propRoomTypeId,
  checkInDate: propCheckInDate,
  checkOutDate: propCheckOutDate,
  onAssigned,
  onSuccess
}) => {
  const { toastSuccess, toastError } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const effectiveBookingId = propBookingId || booking?.id || booking?.bookingId;
  const effectiveRoomTypeId = propRoomTypeId || booking?.roomTypeId || booking?.roomType?.id;
  const effectiveCheckInDate = propCheckInDate || booking?.checkInDate;
  const effectiveCheckOutDate = propCheckOutDate || booking?.checkOutDate;
  const currentRoomNumber = booking?.roomNumber || booking?.room?.roomNumber;
  const isChangingRoom = Boolean(currentRoomNumber);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen, effectiveRoomTypeId, effectiveCheckInDate, effectiveCheckOutDate]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      let availableRooms = [];
      if (effectiveRoomTypeId && effectiveCheckInDate && effectiveCheckOutDate) {
        // Lấy phòng trống không trùng lịch cho khoảng ngày
        availableRooms = await roomApi.getAvailableRooms(
          effectiveRoomTypeId,
          effectiveCheckInDate,
          effectiveCheckOutDate
        );
      } else {
        // Fallback: lấy toàn bộ phòng AVAILABLE
        const allRooms = await roomApi.getAllRooms('AVAILABLE');
        availableRooms = (effectiveRoomTypeId && Array.isArray(allRooms))
          ? allRooms.filter(r => Number(r.roomTypeId) === Number(effectiveRoomTypeId))
          : (Array.isArray(allRooms) ? allRooms : []);
      }

      setRooms(availableRooms || []);
      if (availableRooms && availableRooms.length > 0) {
        setSelectedRoomId(String(availableRooms[0].id));
      } else {
        setSelectedRoomId('');
      }
      setSearchQuery('');
      setCurrentPage(1);
    } catch (error) {
      console.error("Lỗi lấy danh sách phòng trống", error);
      toastError("Không thể tải danh sách phòng khả dụng");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoomId || !effectiveBookingId) return;
    setProcessing(true);
    try {
      await bookingApi.assignRoom(effectiveBookingId, selectedRoomId);
      toastSuccess(isChangingRoom ? "Đổi phòng thành công!" : "Xếp phòng thành công!");
      if (onAssigned) onAssigned();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toastError(error.response?.data?.message || "Lỗi xếp phòng");
    } finally {
      setProcessing(false);
    }
  };

  // Hàm chuẩn hóa chuỗi loại bỏ dấu tiếng Việt và chuyển chữ thường
  const normalizeStr = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .trim();
  };

  // Lọc phòng thông minh: tìm được "106", "Phòng 106", "phong 106", "P.106", "Tầng 1", "Tiêu chuẩn", v.v.
  const filteredRooms = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return rooms;
    
    const normalizedQuery = normalizeStr(rawQuery);
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return rooms.filter(room => {
      const num = String(room.roomNumber || '');
      const floor = String(room.floor || '');
      const type = String(room.roomTypeName || '');
      
      // Tạo chuỗi thông tin đầy đủ của phòng: "phòng 106 phong 106 p.106 p106 106 tầng 1 tang 1 tiêu chuẩn..."
      const searchableText = `phòng ${num} phong ${num} p.${num} p${num} ${num} tầng ${floor} tang ${floor} ${floor} ${type}`;
      const normalizedSearchableText = normalizeStr(searchableText);

      // Khớp trực tiếp cả cụm từ tìm kiếm
      if (normalizedSearchableText.includes(normalizedQuery)) return true;

      // Khớp khi tất cả các từ trong từ khóa tìm kiếm đều có trong thông tin phòng (ví dụ: "phòng 106", "106 tầng 1")
      return queryWords.every(word => normalizedSearchableText.includes(word));
    });
  }, [rooms, searchQuery]);

  // Tính tổng số trang (mỗi trang hiển thị 5 phòng)
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ITEMS_PER_PAGE));

  // Giữ currentPage luôn hợp lệ
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Cắt danh sách 5 phòng cho trang hiện tại
  const paginatedRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRooms.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRooms, currentPage]);

  const selectedRoom = useMemo(() => {
    return rooms.find(r => String(r.id) === String(selectedRoomId));
  }, [rooms, selectedRoomId]);

  // Tạo danh sách các số trang hiển thị (hỗ trợ hiển thị 1 2 3 4 5 6 ... theo mẫu)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 6, '...', totalPages];
    }
    if (currentPage >= totalPages - 4) {
      return [1, '...', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, '...', totalPages];
  };

  // Chuẩn hóa tên tầng tránh bị lặp "TẦNG TẦNG 1"
  const formatFloor = (floor) => {
    if (!floor) return 'TẦNG —';
    const str = String(floor).trim();
    if (str.toLowerCase().startsWith('tầng')) {
      return str.toUpperCase();
    }
    return `TẦNG ${str.toUpperCase()}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isChangingRoom ? "Đổi phòng khách sạn" : "Xếp phòng khách sạn"}
      maxWidth="max-w-xl"
    >
      <div className="p-1 space-y-4">
        {isChangingRoom && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
            <IoSwapHorizontalOutline className="text-amber-700 shrink-0" size={18} />
            <div>
              Phòng hiện tại: <strong className="text-amber-950 font-bold">P.{currentRoomNumber}</strong>
              <div className="text-[11px] text-amber-700">Chọn một phòng trống bên dưới để chuyển sang phòng mới:</div>
            </div>
          </div>
        )}

        <p className="text-body-md text-on-surface-variant text-xs leading-relaxed">
          {isChangingRoom
            ? "Danh sách phòng trống khả dụng (không bị trùng lịch trong thời gian lưu trú):"
            : "Chọn một phòng trống khả dụng để gán cho đơn đặt phòng này:"}
        </p>

        {/* Ô tìm kiếm phòng */}
        {!loading && rooms.length > 0 && (
          <div className="relative">
            <IoSearchOutline 
              size={18} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none" 
            />
            <input
              type="text"
              placeholder="Tìm kiếm theo số phòng, tầng, hạng phòng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-border-grey bg-surface text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <IoCloseOutline size={16} />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[332px] space-y-3">
            <span className="w-8 h-8 border-3 border-primary border-t-transparent border-l-transparent animate-square-spin" />
            <p className="text-xs uppercase font-bold tracking-wider text-on-surface">Đang tải danh sách phòng trống...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="h-[332px] flex flex-col items-center justify-center p-5 text-center bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
            <IoAlertCircleOutline size={28} className="text-red-500 mx-auto" />
            <p className="text-xs font-semibold text-red-800">
              Không có phòng trống nào phù hợp trong thời gian này!
            </p>
            <p className="text-[11px] text-red-600">
              Tất cả phòng thuộc hạng phòng này đã được đặt hoặc có khách ở trong thời gian nhận/trả phòng.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs min-h-[24px]">
              <label className="font-label-md text-on-surface font-medium">
                Danh sách phòng trống khả dụng {searchQuery ? `(Tìm thấy ${filteredRooms.length}/${rooms.length} phòng)` : `(${rooms.length} phòng)`}
              </label>
              {selectedRoom && (
                <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded font-medium">
                  Đang chọn: Phòng {selectedRoom.roomNumber}
                </span>
              )}
            </div>

            {filteredRooms.length === 0 ? (
              <div className="h-[332px] flex flex-col items-center justify-center py-8 text-center bg-surface-container-lowest border border-dashed border-border-grey rounded-xl space-y-2">
                <IoSearchOutline size={28} className="text-on-surface-variant/40 mx-auto" />
                <p className="text-xs font-semibold text-on-surface">
                  Không tìm thấy phòng nào phù hợp với "{searchQuery}"
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Vui lòng thử tìm với số phòng, tầng hoặc từ khóa khác
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-primary font-medium hover:underline inline-block pt-1 cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              <>
                {/* Chiều cao cố định 332px cho đúng 5 hàng phòng -> khi sang trang 2 ít phòng hơn form hoàn toàn không bị co lại */}
                <div className="grid grid-cols-1 gap-2 h-[332px] content-start">
                  {paginatedRooms.map(room => {
                    const isSelected = String(selectedRoomId) === String(room.id);
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(String(room.id))}
                        className={`w-full h-[60px] flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-border-grey bg-white hover:bg-surface-container-low hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'}`}>
                            <IoBedOutline size={16} />
                          </div>
                          <div className="min-w-0 truncate">
                            <p className={`font-semibold text-xs ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                              PHÒNG {room.roomNumber}
                            </p>
                            <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                              <span>{formatFloor(room.floor)}</span>
                              <span>•</span>
                              <span>{(room.roomTypeName || 'PHÒNG TIÊU CHUẨN').toUpperCase()}</span>
                              {room.maxCapacity && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <IoPersonOutline size={10} /> {room.maxCapacity} NGƯỜI
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 ml-2">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Phân trang hình tròn theo đúng mẫu ảnh: < (1) (2) (3) (4) (5) (6) ... (>) */}
                {filteredRooms.length > 5 && (
                  <div className="flex items-center justify-center gap-2 pt-3 pb-1 border-t border-border-grey/60 mt-3 h-[46px]">
                    {/* Nút lùi trang < */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer'
                      }`}
                      title="Trang trước"
                    >
                      <IoChevronBackOutline size={15} />
                    </button>

                    {/* Danh sách các nút số trang tròn */}
                    <div className="flex items-center gap-2">
                      {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                          return (
                            <span 
                              key={`ellipsis-${index}`} 
                              className="px-1 text-sm text-gray-400 select-none font-medium"
                            >
                              ...
                            </span>
                          );
                        }
                        const isActive = page === currentPage;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#48bb78] text-white shadow-xs font-semibold'
                                : 'border border-gray-200 bg-white text-gray-600 hover:border-[#48bb78] hover:text-[#48bb78]'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    {/* Nút tiến trang > */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer'
                      }`}
                      title="Trang sau"
                    >
                      <IoChevronForwardOutline size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border-grey">
          <Button variant="ghost" onClick={onClose} disabled={processing} size="sm">
            Hủy
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={rooms.length === 0 || !selectedRoomId || processing} 
            isLoading={processing}
            icon={IoCheckmarkOutline}
            size="sm"
          >
            {isChangingRoom ? "Xác nhận đổi phòng" : "Xác nhận xếp phòng"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignRoomModal;


