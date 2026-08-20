import React, { useEffect, useState } from 'react';
import { IoCallOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoPeopleOutline } from 'react-icons/io5';
import publicGroupBookingRequestApi from '../../services/publicGroupBookingRequestApi';
import { calculateNights, formatStayDateTime } from '../../utils/formatDate';

const statusStyle = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const PublicGroupBookingRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      setRequests(await publicGroupBookingRequestApi.getAll());
    } catch (error) {
      console.error('Không thể tải yêu cầu đặt đoàn', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const approve = async (request) => {
    if (!window.confirm(`Duyệt yêu cầu của ${request.representativeName}? Hệ thống sẽ kiểm tra số phòng và tạo hồ sơ đoàn.`)) return;
    setProcessingId(request.id);
    try {
      await publicGroupBookingRequestApi.approve(request.id);
      await loadRequests();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Không thể duyệt yêu cầu đoàn.');
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (request) => {
    const reason = window.prompt('Lý do từ chối yêu cầu đoàn:', '');
    if (reason === null) return;
    setProcessingId(request.id);
    try {
      await publicGroupBookingRequestApi.reject(request.id, reason);
      await loadRequests();
    } catch (error) {
      window.alert(error.response?.data?.message || 'Không thể từ chối yêu cầu đoàn.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="border-t-8 border-surface-container-low bg-surface-container-lowest p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-lg font-bold text-on-surface"><IoPeopleOutline className="text-primary" /> Yêu cầu đặt đoàn từ StayAway</h3><p className="mt-1 text-sm text-on-surface-variant">Duyệt yêu cầu để tạo hồ sơ đoàn và các booking chưa gán phòng.</p></div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-grey">
        <table className="w-full text-left"><thead><tr className="bg-surface-container-low text-xs uppercase text-on-surface-variant"><th className="p-3">Đại diện</th><th className="p-3">Nhu cầu phòng</th><th className="p-3">Thời gian</th><th className="p-3 text-center">Trạng thái</th><th className="p-3 text-center">Thao tác</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="5" className="p-6 text-center text-on-surface-variant">Đang tải yêu cầu đoàn...</td></tr> : requests.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-on-surface-variant">Chưa có yêu cầu đoàn từ StayAway.</td></tr> : requests.map((request) => <tr key={request.id} className="border-t border-border-grey align-top"><td className="p-3"><div className="font-semibold text-on-surface">{request.representativeName}</div><div className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant"><IoCallOutline size={14} />{request.phone}</div>{request.note && <div className="mt-2 text-xs italic text-on-surface-variant">{request.note}</div>}</td><td className="p-3 text-sm text-on-surface">{request.rooms.map((room) => <div key={room.roomTypeId}>{room.roomTypeName}: <strong>{room.quantity}</strong> phòng</div>)}</td><td className="p-3 text-sm text-on-surface">{formatStayDateTime(request.checkInDate, 'checkin')} - {formatStayDateTime(request.checkOutDate, 'checkout')}<div className="mt-1 text-xs text-on-surface-variant">{calculateNights(request.checkInDate, request.checkOutDate)} đêm</div></td><td className="p-3 text-center"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyle[request.status]}`}>{request.status === 'PENDING' ? 'Chờ duyệt' : request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}</span>{request.rejectReason && <div className="mt-2 text-xs text-red-600">{request.rejectReason}</div>}</td><td className="p-3 text-center">{request.status === 'PENDING' && <div className="flex justify-center gap-2"><button onClick={() => approve(request)} disabled={processingId === request.id} className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 disabled:opacity-50"><IoCheckmarkCircleOutline size={15} />Duyệt</button><button onClick={() => reject(request)} disabled={processingId === request.id} className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"><IoCloseCircleOutline size={15} />Từ chối</button></div>}{request.convertedGroupBookingId && <span className="text-xs text-primary">Đoàn #{request.convertedGroupBookingId}</span>}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
};

export default PublicGroupBookingRequestList;