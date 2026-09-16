import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { lostItemApi } from '../../services/lostItemApi';
import { roomApi } from '../../services/roomApi';
import { useToast } from '../../context/ToastContext';
import { extractErrorMessage } from '../../services/api';
import {
  IoSearchOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoLocationOutline,
  IoCubeOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoImageOutline,
  IoDocumentTextOutline,
  IoBedOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';

interface LostItemCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoom?: any;
  onSuccess?: (item?: any) => void;
}

const COMMON_ITEMS = [
  'Củ sạc / Dây sạc điện thoại',
  'Tai nghe / AirPods',
  'Đồng hồ đeo tay',
  'Ví tiền / Bóp / Giấy tờ',
  'Quần áo / Áo khoác',
  'Trang sức / Dây chuyền / Nhẫn',
  'Kính mắt / Kính râm',
  'Mỹ phẩm / Đồ dùng cá nhân',
  'Gấu bông / Đồ chơi trẻ em',
];

const COMMON_LOCATIONS = [
  'Dưới gầm giường',
  'Tủ đầu giường (Tab đầu giường)',
  'Trong tủ quần áo / Móc treo',
  'Bàn trang điểm / Bàn làm việc',
  'Nhà tắm / Kệ Lavabo',
  'Kệ TV / Ngăn kéo',
  'Ban công / Cửa sổ',
  'Ghế sofa / Đệm ghế',
];

const LostItemCreateModal: React.FC<LostItemCreateModalProps> = ({
  isOpen,
  onClose,
  initialRoom,
  onSuccess,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [roomId, setRoomId] = useState<number | string>(initialRoom?.id || '');
  const [roomNumber, setRoomNumber] = useState(initialRoom?.roomNumber || '');
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [itemName, setItemName] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDate, setFoundDate] = useState(new Date().toISOString().split('T')[0]);
  const [foundTime, setFoundTime] = useState(
    new Date().toTimeString().split(' ')[0].substring(0, 5)
  );
  const [storageLocation, setStorageLocation] = useState('Tủ Lost & Found (Quầy lễ tân)');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialRoom) {
        setRoomId(initialRoom.id);
        setRoomNumber(initialRoom.roomNumber);
      } else {
        fetchRooms();
      }
      setFoundDate(new Date().toISOString().split('T')[0]);
      setFoundTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    }
  }, [isOpen, initialRoom]);

  const fetchRooms = async () => {
    try {
      const data = await roomApi.getAllRooms();
      setRooms(data || []);
      if (!roomId && data && data.length > 0) {
        setRoomId(data[0].id);
        setRoomNumber(data[0].roomNumber);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phòng:', err);
    }
  };

  const handleRoomSelect = (r: any) => {
    setRoomId(r.id);
    setRoomNumber(r.roomNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      toastError('Vui lòng chọn phòng phát hiện đồ để quên');
      return;
    }
    if (!itemName.trim()) {
      toastError('Vui lòng nhập tên hoặc mô tả món đồ');
      return;
    }
    if (!foundLocation.trim()) {
      toastError('Vui lòng nhập vị trí tìm thấy');
      return;
    }

    try {
      setSubmitting(true);
      const res = await lostItemApi.create({
        roomId: Number(roomId),
        itemName: itemName.trim(),
        foundLocation: foundLocation.trim(),
        foundDate,
        foundTime: foundTime ? `${foundTime}:00` : undefined,
        storageLocation: storageLocation.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toastSuccess(
        `Đã ghi nhận món đồ "${res.itemName}" tại phòng ${res.roomNumber || roomNumber}. ${
          res.guestName ? `Đã gắn với khách: ${res.guestName}` : ''
        }`
      );
      if (onSuccess) onSuccess(res);
      handleReset();
      onClose();
    } catch (err: any) {
      toastError(extractErrorMessage(err, 'Không thể ghi nhận đồ để quên. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setItemName('');
    setFoundLocation('');
    setNotes('');
    setImageUrl('');
    setStorageLocation('Tủ Lost & Found (Quầy lễ tân)');
  };

  const filteredRooms = rooms.filter((r) => {
    if (!roomSearch.trim()) return true;
    const q = roomSearch.trim().toLowerCase();
    return (
      (r.roomNumber && String(r.roomNumber).toLowerCase().includes(q)) ||
      (r.roomTypeName && r.roomTypeName.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ghi nhận đồ khách để quên (Lost & Found)"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner thông tin nghiệp vụ */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex items-start gap-3">
          <IoShieldCheckmarkOutline className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            Hệ thống sẽ <strong className="font-semibold">tự động gắn món đồ</strong> với lần lưu
            trú/khách hàng vừa checkout gần nhất của phòng này để lễ tân dễ dàng liên hệ và bàn
            giao.
          </div>
        </div>

        {/* Chọn phòng */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
            Phòng phát hiện <span className="text-rose-500">*</span>
          </label>
          {initialRoom ? (
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold">
              <IoBedOutline className="w-5 h-5 text-emerald-600" />
              <span>
                Phòng {initialRoom.roomNumber} ({initialRoom.roomTypeName || 'Tiêu chuẩn'})
              </span>
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <IoSearchOutline className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tìm phòng theo số phòng..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="max-h-28 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-1.5 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                {filteredRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoomSelect(r)}
                    className={`px-2 py-1.5 rounded text-xs font-medium border text-center transition-all ${
                      roomId === r.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    P.{r.roomNumber}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tên / Mô tả món đồ */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
            Tên / Mô tả món đồ <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <IoCubeOutline className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              required
              placeholder="VD: Củ sạc iPhone màu trắng, Đồng hồ Apple Watch, Áo khoác đen..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
          {/* Gợi ý nhanh món đồ */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {COMMON_ITEMS.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setItemName(item)}
                className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 transition"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>

        {/* Vị trí tìm thấy */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
            Vị trí tìm thấy trong phòng <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <IoLocationOutline className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              required
              placeholder="VD: Dưới gầm giường gần cửa sổ, Trong tủ quần áo..."
              value={foundLocation}
              onChange={(e) => setFoundLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {/* Gợi ý nhanh vị trí */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {COMMON_LOCATIONS.slice(0, 5).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setFoundLocation(loc)}
                className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 transition"
              >
                + {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Thời điểm & Nơi cất giữ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Ngày phát hiện
            </label>
            <div className="relative">
              <IoCalendarOutline className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="date"
                required
                value={foundDate}
                onChange={(e) => setFoundDate(e.target.value)}
                className="w-full pl-9 pr-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Giờ phát hiện
            </label>
            <div className="relative">
              <IoTimeOutline className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="time"
                value={foundTime}
                onChange={(e) => setFoundTime(e.target.value)}
                className="w-full pl-9 pr-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nơi lưu trữ hiện tại
            </label>
            <input
              type="text"
              placeholder="VD: Quầy lễ tân, Tủ Lost&Found..."
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Link ảnh & Ghi chú */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Đường dẫn hình ảnh chụp món đồ (nếu có)
            </label>
            <div className="relative">
              <IoImageOutline className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả thêm tình trạng món đồ (mới, trầy xước, đặc điểm nhận dạng...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <IoCheckmarkCircleOutline className="w-4 h-4 mr-1.5" />
            Lưu hồ sơ đồ để quên
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LostItemCreateModal;
