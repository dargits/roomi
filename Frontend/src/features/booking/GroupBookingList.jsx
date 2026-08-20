import React, { useEffect, useState } from 'react';
import { IoBedOutline, IoCallOutline, IoPeopleOutline, IoRefreshOutline } from 'react-icons/io5';
import groupBookingApi from '../../services/groupBookingApi';
import { formatDate } from '../../utils/formatDate';

const STATUS_STYLES = {
  NEW: 'bg-amber-100 text-amber-800',
  PARTIALLY_ASSIGNED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  NEW: 'Mới tạo', PARTIALLY_ASSIGNED: 'Đang xếp phòng', CONFIRMED: 'Đã xếp đủ',
  CHECKED_IN: 'Đang ở', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy',
};

const GroupBookingList = ({ refreshKey }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = async () => {
    setLoading(true);
    try {
      setGroups(await groupBookingApi.getAll());
    } catch (error) {
      console.error('Không thể tải hồ sơ đoàn', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, [refreshKey]);

  if (loading) return <div className="p-10 text-center text-on-surface-variant"><IoRefreshOutline className="animate-spin mx-auto mb-2" size={24} />Đang tải hồ sơ đoàn...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead><tr className="bg-surface-container-low border-b-2 border-border-grey text-xs uppercase text-on-surface-variant"><th className="p-4">Mã đoàn</th><th className="p-4">Người đại diện</th><th className="p-4">Thời gian</th><th className="p-4">Phòng</th><th className="p-4">Dự kiến</th><th className="p-4 text-center">Trạng thái</th></tr></thead>
        <tbody>
          {groups.length === 0 ? <tr><td colSpan="6" className="p-10 text-center text-on-surface-variant">Chưa có hồ sơ đặt phòng đoàn.</td></tr> : groups.map((group) => (
            <tr key={group.id} className="border-b border-border-grey hover:bg-surface-container-low/60">
              <td className="p-4 font-semibold text-primary">ĐOÀN-{String(group.id).padStart(5, '0')}</td>
              <td className="p-4"><div className="font-semibold text-on-surface flex items-center gap-1.5"><IoPeopleOutline size={16} className="text-primary" />{group.representativeName}</div><div className="text-xs text-on-surface-variant flex items-center gap-1 mt-1"><IoCallOutline size={13} />{group.representativePhone || 'Chưa có SĐT'}</div></td>
              <td className="p-4 text-sm text-on-surface-variant">{formatDate(group.checkInDate)} - {formatDate(group.checkOutDate)}</td>
              <td className="p-4"><div className="font-semibold text-on-surface flex items-center gap-1.5"><IoBedOutline size={16} className="text-primary" />{group.assignedRooms}/{group.totalRooms} đã xếp</div></td>
              <td className="p-4 font-semibold text-on-surface">{Number(group.expectedTotal || 0).toLocaleString('vi-VN')} đ</td>
              <td className="p-4 text-center"><span className={`px-2 py-1 rounded-md text-xs font-semibold ${STATUS_STYLES[group.status] || 'bg-gray-100 text-gray-800'}`}>{STATUS_LABELS[group.status] || group.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GroupBookingList;