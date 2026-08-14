import React, { useState, useEffect } from 'react';
import { User, Phone, CheckCircle, XCircle, ArrowRight, Home } from 'lucide-react';
import { bookingRequestApi } from '../../services/bookingRequestApi';

const BookingRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await bookingRequestApi.getAllBookingRequests();
      // sort PENDING first, then by date descending
      const sorted = data.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setRequests(sorted);
    } catch (error) {
      console.error("Failed to fetch booking requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType, id) => {
    try {
      if (actionType === 'APPROVE') {
        if (!window.confirm("Bạn có chắc chắn duyệt yêu cầu này? Yêu cầu sẽ được tạo thành Đặt phòng chính thức.")) return;
        await bookingRequestApi.approveRequest(id);
      } else if (actionType === 'REJECT') {
        const reason = window.prompt("Vui lòng nhập lý do từ chối:");
        if (reason === null) return;
        await bookingRequestApi.rejectRequest(id, reason);
      }
      fetchRequests();
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.message || "Không thể thực hiện thao tác"));
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PENDING': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium text-xs">Chờ duyệt</span>;
      case 'APPROVED': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md font-medium text-xs">Đã duyệt</span>;
      case 'REJECTED': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md font-medium text-xs">Đã từ chối</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md font-medium text-xs">{status}</span>;
    }
  };

  return (
    <div className="overflow-x-auto p-0">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low border-b-2 border-border-grey font-label-md text-on-surface-variant uppercase tracking-wider">
            <th className="p-4 font-semibold">Khách Hàng</th>
            <th className="p-4 font-semibold">Yêu cầu Phòng</th>
            <th className="p-4 font-semibold">Thời gian</th>
            <th className="p-4 font-semibold text-center">Trạng thái</th>
            <th className="p-4 font-semibold text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="5" className="p-8 text-center text-on-surface-variant">Đang tải yêu cầu...</td></tr>
          ) : requests.length === 0 ? (
            <tr><td colSpan="5" className="p-8 text-center text-on-surface-variant">Chưa có yêu cầu đặt phòng nào từ Web.</td></tr>
          ) : (
            requests.map(req => (
              <tr key={req.id} className="border-b border-border-grey hover:bg-surface-container-low transition-colors group">
                <td className="p-4">
                  <div className="font-title-sm text-on-surface flex items-center gap-2">
                    <User size={16} className="text-on-surface-variant" />
                    {req.guestName}
                  </div>
                  <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
                    <Phone size={14} /> {req.phone}
                  </div>
                  {req.note && (
                    <div className="text-xs text-on-surface-variant mt-2 italic bg-surface p-2 rounded border border-border-grey">
                      "{req.note}"
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-title-sm text-on-surface flex items-center gap-2">
                    <Home size={16} className="text-on-surface-variant" />
                    {req.roomTypeName}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2">
                    <ArrowRight size={14} className="text-green-600" /> Nhận: {req.checkInDate}
                  </div>
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
                    <ArrowRight size={14} className="text-red-500 transform rotate-180" /> Trả: {req.checkOutDate}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {getStatusBadge(req.status)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-wrap justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    {req.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleAction('APPROVE', req.id)} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors border border-green-200 flex items-center gap-1">
                          <CheckCircle size={14} /> Duyệt
                        </button>
                        <button onClick={() => handleAction('REJECT', req.id)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors border border-red-200 flex items-center gap-1">
                          <XCircle size={14} /> Từ chối
                        </button>
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
  );
};

export default BookingRequestList;
