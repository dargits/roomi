import React, { useState, useEffect } from 'react';
import { 
  IoArrowForwardOutline, 
  IoCallOutline, 
  IoCheckmarkCircleOutline, 
  IoCloseCircleOutline, 
  IoHomeOutline, 
  IoPersonOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';
import { bookingRequestApi } from '../../services/bookingRequestApi';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const BookingRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho Modal xác nhận Duyệt / Từ chối
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'APPROVE' | 'REJECT'
    request: null,
    reason: ''
  });
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await bookingRequestApi.getAllBookingRequests();
      // sort PENDING first, then by date descending
      const sorted = (data || []).sort((a, b) => {
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

  const openApproveModal = (req) => {
    setErrorMsg('');
    setModalState({
      isOpen: true,
      type: 'APPROVE',
      request: req,
      reason: ''
    });
  };

  const openRejectModal = (req) => {
    setErrorMsg('');
    setModalState({
      isOpen: true,
      type: 'REJECT',
      request: req,
      reason: ''
    });
  };

  const closeModal = () => {
    if (processing) return;
    setModalState({
      isOpen: false,
      type: null,
      request: null,
      reason: ''
    });
    setErrorMsg('');
  };

  const handleConfirmAction = async () => {
    const { type, request, reason } = modalState;
    if (!request) return;

    setProcessing(true);
    setErrorMsg('');
    try {
      if (type === 'APPROVE') {
        await bookingRequestApi.approveRequest(request.id);
      } else if (type === 'REJECT') {
        await bookingRequestApi.rejectRequest(request.id, reason);
      }
      closeModal();
      await fetchRequests();
    } catch (error) {
      console.error("Action error:", error);
      setErrorMsg(error.response?.data?.message || "Không thể thực hiện thao tác. Vui lòng thử lại.");
    } finally {
      setProcessing(false);
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
                  <div className="font-title-sm text-on-surface flex items-center gap-2 font-medium">
                    <IoPersonOutline size={16} className="text-on-surface-variant" />
                    {req.guestName}
                  </div>
                  <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
                    <IoCallOutline size={14} /> {req.phone}
                  </div>
                  {req.note && (
                    <div className="text-xs text-on-surface-variant mt-2 italic bg-surface p-2 rounded border border-border-grey">
                      "{req.note}"
                    </div>
                  )}
                  {req.rejectReason && (
                    <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-200">
                      Lý do từ chối: {req.rejectReason}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-title-sm text-on-surface flex items-center gap-2">
                    <IoHomeOutline size={16} className="text-on-surface-variant" />
                    {req.roomTypeName}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2">
                    <IoArrowForwardOutline size={14} className="text-green-600" /> Nhận: {req.checkInDate}
                  </div>
                  <div className="font-body-sm text-on-surface-variant flex items-center gap-2 mt-1">
                    <IoArrowForwardOutline size={14} className="text-red-500 transform rotate-180" /> Trả: {req.checkOutDate}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {getStatusBadge(req.status)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    {req.status === 'PENDING' && (
                      <>
                        <button 
                          type="button"
                          onClick={() => openApproveModal(req)} 
                          className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-semibold transition-colors border border-green-300 flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <IoCheckmarkCircleOutline size={15} /> Duyệt
                        </button>
                        <button 
                          type="button"
                          onClick={() => openRejectModal(req)} 
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-semibold transition-colors border border-red-300 flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <IoCloseCircleOutline size={15} /> Từ chối
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

      {/* Modal xác nhận Duyệt / Từ chối */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.type === 'APPROVE' ? 'Duyệt yêu cầu đặt phòng' : 'Từ chối yêu cầu đặt phòng'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <IoAlertCircleOutline size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {modalState.request && (
            <div className="bg-surface-container-low p-4 rounded-lg space-y-2 text-sm border border-border-grey">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Khách hàng:</span>
                <span className="font-semibold text-on-surface">{modalState.request.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Số điện thoại:</span>
                <span className="font-semibold text-on-surface">{modalState.request.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Loại phòng:</span>
                <span className="font-semibold text-on-surface">{modalState.request.roomTypeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Thời gian:</span>
                <span className="font-semibold text-on-surface">
                  {modalState.request.checkInDate} → {modalState.request.checkOutDate}
                </span>
              </div>
              {modalState.request.note && (
                <div className="pt-2 border-t border-border-grey text-xs text-on-surface-variant italic">
                  Ghi chú: "{modalState.request.note}"
                </div>
              )}
            </div>
          )}

          {modalState.type === 'APPROVE' ? (
            <p className="text-sm text-on-surface">
              Yêu cầu đặt phòng này sẽ được chuyển thành <strong>Đặt phòng chính thức (CONFIRMED)</strong>. Bạn có chắc chắn muốn duyệt?
            </p>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">
                Lý do từ chối:
              </label>
              <textarea
                rows={3}
                className="w-full p-2.5 border border-border-grey rounded-lg text-sm bg-surface focus:outline-none focus:border-primary"
                placeholder="Nhập lý do từ chối (vd: Hết phòng vào ngày yêu cầu, không liên lạc được với khách...)"
                value={modalState.reason}
                onChange={(e) => setModalState(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-grey">
            <button
              type="button"
              onClick={closeModal}
              disabled={processing}
              className="px-4 py-2 text-sm rounded-lg border border-border-grey text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
            <Button
              type="button"
              variant={modalState.type === 'APPROVE' ? 'primary' : 'danger'}
              onClick={handleConfirmAction}
              disabled={processing}
              icon={modalState.type === 'APPROVE' ? IoCheckmarkCircleOutline : IoCloseCircleOutline}
            >
              {processing ? 'Đang xử lý...' : (modalState.type === 'APPROVE' ? 'Xác nhận Duyệt' : 'Xác nhận Từ chối')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingRequestList;
