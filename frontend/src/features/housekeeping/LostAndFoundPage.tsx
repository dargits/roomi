import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { lostItemApi } from '../../services/lostItemApi';
import { roomApi } from '../../services/roomApi';
import { extractErrorMessage } from '../../services/api';
import {
  LostItem,
  LostItemStatus,
  LostItemSummary,
} from '../../types';
import Button from '../../components/ui/Button';
import LostItemCreateModal from './LostItemCreateModal';
import LostItemDetailModal from './LostItemDetailModal';
import LostItemReturnModal from './LostItemReturnModal';
import LostItemDisposeModal from './LostItemDisposeModal';
import {
  IoCubeOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoAddOutline,
  IoRefreshOutline,
  IoCheckmarkDoneOutline,
  IoChatboxEllipsesOutline,
  IoWarningOutline,
  IoTrashOutline,
  IoCallOutline,
  IoEyeOutline,
  IoCalendarOutline,
  IoBedOutline,
  IoShieldCheckmarkOutline,
  IoChevronForwardOutline,
  IoChevronBackOutline,
} from 'react-icons/io5';

const STATUS_TABS: { label: string; value: LostItemStatus | 'ALL' }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang lưu giữ', value: 'HOLDING' },
  { label: 'Đã liên hệ', value: 'CONTACTED' },
  { label: 'Đã trả khách', value: 'RETURNED' },
  { label: 'Đã xử lý quá hạn', value: 'DISPOSED' },
];

export const LostAndFoundPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [items, setItems] = useState<LostItem[]>([]);
  const [summary, setSummary] = useState<LostItemSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<LostItemStatus | 'ALL'>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isExpiredOnly, setIsExpiredOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<number | null>(null);
  const [returnItem, setReturnItem] = useState<LostItem | null>(null);
  const [disposeItem, setDisposeItem] = useState<LostItem | null>(null);

  const isFrontDeskOrAdmin =
    user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        size: pageSize,
      };

      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedRoomId) params.roomId = Number(selectedRoomId);
      if (keyword.trim()) params.keyword = keyword.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (isExpiredOnly) params.isExpired = true;

      const [res, sumRes] = await Promise.all([
        lostItemApi.getAll(params),
        lostItemApi.getSummary(),
      ]);

      setItems(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
      setSummary(sumRes);
    } catch (err: any) {
      toastError(extractErrorMessage(err, 'Không thể tải danh sách đồ để quên.'));
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus, selectedRoomId, keyword, fromDate, toDate, isExpiredOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Load room list for filter
    roomApi.getAllRooms().then((data) => setRooms(data || [])).catch(() => {});
  }, []);

  const handleResetFilters = () => {
    setSelectedStatus('ALL');
    setSelectedRoomId('');
    setKeyword('');
    setFromDate('');
    setToDate('');
    setIsExpiredOnly(false);
    setPage(0);
  };

  const renderStatusBadge = (status: LostItemStatus, isExpired?: boolean) => {
    switch (status) {
      case 'HOLDING':
        if (isExpired) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300">
              <IoWarningOutline className="w-3.5 h-3.5" /> Quá hạn lưu giữ
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300">
            <IoCubeOutline className="w-3.5 h-3.5" /> Đang lưu giữ
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300">
            <IoChatboxEllipsesOutline className="w-3.5 h-3.5" /> Đã liên hệ
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
            <IoCheckmarkDoneOutline className="w-3.5 h-3.5" /> Đã trả cho khách
          </span>
        );
      case 'DISPOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300">
            <IoTrashOutline className="w-3.5 h-3.5" /> Đã xử lý quá hạn
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <IoCubeOutline className="w-6 h-6" />
            </div>
            Quản lý đồ khách để quên (Lost & Found)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ghi nhận đồ để quên khi dọn phòng, tự động liên kết khách hàng lưu trú và theo dõi quy trình bàn giao
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={fetchData}
            isLoading={loading}
            className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <IoRefreshOutline className="w-4 h-4 mr-1.5" />
            Làm mới
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 font-semibold"
          >
            <IoAddOutline className="w-5 h-5 mr-1.5" />
            Ghi nhận đồ để quên
          </Button>
        </div>
      </div>

      {/* 4 Thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => {
            setSelectedStatus('HOLDING');
            setIsExpiredOnly(false);
            setPage(0);
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/50 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Đang lưu giữ
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IoCubeOutline className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-2">
            {summary?.totalHolding ?? 0}
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-400 mt-0.5">
            Lưu tại kho / quầy lễ tân
          </div>
        </div>

        <div
          onClick={() => {
            setSelectedStatus('CONTACTED');
            setIsExpiredOnly(false);
            setPage(0);
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/50 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Đã liên hệ khách
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IoChatboxEllipsesOutline className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-2">
            {summary?.totalContacted ?? 0}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400 mt-0.5">
            Chờ khách đến nhận lại
          </div>
        </div>

        <div
          onClick={() => {
            setSelectedStatus('HOLDING');
            setIsExpiredOnly(true);
            setPage(0);
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/50 dark:from-rose-950/40 dark:to-pink-950/20 border border-rose-200/80 dark:border-rose-800/50 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Quá hạn lưu giữ
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <IoWarningOutline className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-2">
            {summary?.totalExpiredHolding ?? 0}
          </div>
          <div className="text-[11px] text-rose-600/80 dark:text-rose-400 mt-0.5">
            Cần xử lý theo quy định cơ sở
          </div>
        </div>

        <div
          onClick={() => {
            setSelectedStatus('RETURNED');
            setIsExpiredOnly(false);
            setPage(0);
          }}
          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Đã trả cho khách
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IoCheckmarkDoneOutline className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-2">
            {summary?.totalReturned ?? 0}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
            Đã bàn giao an toàn & lưu vết
          </div>
        </div>
      </div>

      {/* Toolbar lọc và tìm kiếm */}
      <div className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedStatus === tab.value
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {isExpiredOnly && (
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <IoWarningOutline className="w-3.5 h-3.5" /> Đang lọc: Quá hạn lưu giữ
            </span>
          )}
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Ô tìm kiếm keyword */}
          <div className="lg:col-span-2 relative">
            <IoSearchOutline className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm theo tên đồ, phòng, tên khách, SĐT..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Chọn phòng */}
          <div>
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">-- Tất cả phòng --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Phòng {r.roomNumber} ({r.roomTypeName || 'Tiêu chuẩn'})
                </option>
              ))}
            </select>
          </div>

          {/* Khoảng ngày tìm thấy */}
          <div>
            <input
              type="date"
              placeholder="Từ ngày"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <input
              type="date"
              placeholder="Đến ngày"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
        </div>

        {(keyword || selectedRoomId || fromDate || toDate || isExpiredOnly) && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/70 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Món đồ & Vị trí</th>
                <th className="py-3 px-3">Phòng</th>
                <th className="py-3 px-3">Khách hàng liên quan</th>
                <th className="py-3 px-3">Ngày phát hiện</th>
                <th className="py-3 px-3">Hạn lưu giữ</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Đang tải danh sách đồ để quên...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy món đồ để quên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Tên & Vị trí */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.itemName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <IoCubeOutline className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                            {item.itemName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>Vị trí: <strong>{item.foundLocation}</strong></span>
                          </div>
                          {item.storageLocation && (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400">
                              Lưu trữ: {item.storageLocation}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phòng */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        P.{item.roomNumber}
                      </span>
                    </td>

                    {/* Khách hàng liên quan */}
                    <td className="py-3.5 px-3">
                      {item.guestName ? (
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.guestName}
                          </div>
                          {item.guestPhone && (
                            <a
                              href={`tel:${item.guestPhone}`}
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <IoCallOutline className="w-3 h-3" />
                              {item.guestPhone}
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Chưa xác định</span>
                      )}
                    </td>

                    {/* Ngày phát hiện */}
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {item.foundDate}
                      </div>
                      {item.foundTime && (
                        <div className="text-[11px] text-slate-400">{item.foundTime}</div>
                      )}
                    </td>

                    {/* Hạn lưu giữ */}
                    <td className="py-3.5 px-3">
                      <div
                        className={`font-semibold ${
                          item.isExpired
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.retentionExpiryDate || '30 ngày'}
                      </div>
                      {item.status === 'HOLDING' && item.isExpired && (
                        <span className="text-[10px] text-rose-500 font-bold">Đã quá hạn!</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-3">
                      {renderStatusBadge(item.status, item.isExpired)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailItemId(item.id)}
                          title="Xem chi tiết & Nhật ký"
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                        >
                          <IoEyeOutline className="w-4 h-4" />
                        </button>

                        {isFrontDeskOrAdmin && item.status !== 'RETURNED' && item.status !== 'DISPOSED' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setReturnItem(item)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 px-2"
                            >
                              <IoCheckmarkDoneOutline className="w-3.5 h-3.5 mr-1" />
                              Trả đồ
                            </Button>

                            {(item.isExpired || item.status === 'CONTACTED') && (
                              <button
                                type="button"
                                onClick={() => setDisposeItem(item)}
                                title="Xử lý quá hạn"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800 transition"
                              >
                                <IoTrashOutline className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Hiển thị <strong>{items.length}</strong> / <strong>{totalElements}</strong> món đồ
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <IoChevronBackOutline className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <IoChevronForwardOutline className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <LostItemCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchData()}
      />

      <LostItemDetailModal
        isOpen={detailItemId !== null}
        onClose={() => setDetailItemId(null)}
        itemId={detailItemId}
        onOpenReturn={(item) => {
          setDetailItemId(null);
          setReturnItem(item);
        }}
        onOpenDispose={(item) => {
          setDetailItemId(null);
          setDisposeItem(item);
        }}
        onItemUpdated={() => fetchData()}
      />

      <LostItemReturnModal
        isOpen={returnItem !== null}
        onClose={() => setReturnItem(null)}
        item={returnItem}
        onSuccess={() => {
          fetchData();
        }}
      />

      <LostItemDisposeModal
        isOpen={disposeItem !== null}
        onClose={() => setDisposeItem(null)}
        item={disposeItem}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};

export default LostAndFoundPage;
