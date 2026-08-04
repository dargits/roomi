import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
import { 
  Search, 
  RefreshCw, 
  Clipboard, 
  DollarSign, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  FileText,
  Percent
} from 'lucide-react';

function Invoices({ user, showNotification }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & filter states
  const [searchParams, setSearchParams] = useState({
    guestName: '',
    phone: '',
    idNumber: '',
    roomNumber: '',
    status: 'ALL' // 'ALL' | 'PENDING' | 'PAID'
  });

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Payment recording sub-modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInput, setPaymentInput] = useState({ amount: '', method: 'CASH' });

  // Direct edit invoice discount sub-modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState({ discount: '' });

  // Adjustment invoice sub-modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustInput, setAdjustInput] = useState({
    roomChargeAdjustment: '0',
    serviceChargeAdjustment: '0',
    discountAdjustment: '0',
    adjustmentReason: ''
  });

  // Fetch bookings data to serve as invoices list
  const fetchInvoicesList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings');
      if (res.data && res.data.data) {
        // Enriched list from bookings
        setBookings(res.data.data);
      }
    } catch (err) {
      showNotification(err.message || 'Lỗi tải danh sách hóa đơn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesList();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.get('/bookings/search', {
        params: {
          guestName: searchParams.guestName || null,
          phone: searchParams.phone || null,
          idNumber: searchParams.idNumber || null
        }
      });
      if (res.data && res.data.data) {
        setBookings(res.data.data);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setSearchParams({
      guestName: '',
      phone: '',
      idNumber: '',
      roomNumber: '',
      status: 'ALL'
    });
    fetchInvoicesList();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN');
    } catch (e) {
      return dateStr;
    }
  };

  // Open Detailed Invoice Auditing Modal
  const openInvoiceDetails = async (booking) => {
    setSelectedBooking(booking);
    setLoadingInvoice(true);
    try {
      const res = await api.get(`/bookings/${booking.id}/invoice`);
      if (res.data && res.data.data) {
        setActiveInvoice(res.data.data);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      showNotification(err.message || 'Không thể lấy thông tin chi tiết hóa đơn', 'error');
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Payment recording submission
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      await api.post(`/bookings/${selectedBooking.id}/payments`, {
        amount: parseFloat(paymentInput.amount),
        method: paymentInput.method
      });
      showNotification('Ghi nhận thanh toán hóa đơn thành công!');
      setShowPaymentModal(false);
      
      // Reload details and list
      openInvoiceDetails(selectedBooking);
      fetchInvoicesList();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Edit discount directly (for unpaid/PENDING invoices)
  const handleUpdateDiscount = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      await api.put(`/bookings/${selectedBooking.id}/invoice`, {
        discount: parseFloat(discountInput.discount)
      });
      showNotification('Cập nhật chiết khấu hóa đơn thành công!');
      setShowDiscountModal(false);
      
      // Reload details and list
      openInvoiceDetails(selectedBooking);
      fetchInvoicesList();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Create adjustment invoice (for paid/PAID invoices)
  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!adjustInput.adjustmentReason.trim()) {
      showNotification('Vui lòng nhập lý do điều chỉnh hóa đơn', 'error');
      return;
    }
    try {
      await api.post(`/bookings/${selectedBooking.id}/invoice/adjust`, {
        roomChargeAdjustment: parseFloat(adjustInput.roomChargeAdjustment || 0),
        serviceChargeAdjustment: parseFloat(adjustInput.serviceChargeAdjustment || 0),
        discountAdjustment: parseFloat(adjustInput.discountAdjustment || 0),
        adjustmentReason: adjustInput.adjustmentReason
      });
      showNotification('Lập hóa đơn điều chỉnh thành công!');
      setShowAdjustModal(false);
      setAdjustInput({
        roomChargeAdjustment: '0',
        serviceChargeAdjustment: '0',
        discountAdjustment: '0',
        adjustmentReason: ''
      });

      // Reload details and list
      openInvoiceDetails(selectedBooking);
      fetchInvoicesList();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Filter list by room number & invoice payment status locally
  const filteredBookings = bookings.filter(b => {
    // Filter by room number if provided
    if (searchParams.roomNumber && b.roomNumber) {
      if (!b.roomNumber.toLowerCase().includes(searchParams.roomNumber.toLowerCase())) {
        return false;
      }
    }
    // Filter by payment status (PAID/PENDING)
    if (searchParams.status !== 'ALL') {
      const isPaid = b.status === 'CHECKED_OUT'; // simple mapping or map with booking status
      if (searchParams.status === 'PAID' && !isPaid && b.status !== 'CHECKED_OUT') return false;
      if (searchParams.status === 'PENDING' && (isPaid || b.status === 'CHECKED_OUT')) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hóa đơn & Thanh toán</h1>
          <p className="page-subtitle">Đối soát hóa đơn lưu trú, ghi nhận thanh toán và lập hóa đơn điều chỉnh (Kế toán)</p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div>
            <label>Tên khách hàng</label>
            <input 
              type="text" 
              placeholder="VD: Nguyễn Văn A"
              value={searchParams.guestName}
              onChange={(e) => setSearchParams(prev => ({ ...prev, guestName: e.target.value }))}
            />
          </div>
          <div>
            <label>Số điện thoại</label>
            <input 
              type="text" 
              placeholder="VD: 0901234567"
              value={searchParams.phone}
              onChange={(e) => setSearchParams(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <label>Số phòng</label>
            <input 
              type="text" 
              placeholder="VD: 101"
              value={searchParams.roomNumber}
              onChange={(e) => setSearchParams(prev => ({ ...prev, roomNumber: e.target.value }))}
            />
          </div>
          <div>
            <label>Trạng thái</label>
            <select
              value={searchParams.status}
              onChange={(e) => setSearchParams(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="ALL">Tất cả hóa đơn</option>
              <option value="PENDING">Chưa thanh toán</option>
              <option value="PAID">Đã thanh toán (Trả phòng)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={handleResetSearch} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Reset
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={14} /> Tìm kiếm
          </button>
        </div>
      </form>

      {/* Invoices List Table */}
      {loading ? (
        <PageLoader />
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Không tìm thấy hóa đơn nào phù hợp với bộ lọc tìm kiếm.
        </div>
      ) : (
        <div className="table-container card">
          <table>
            <thead>
              <tr>
                <th>Mã phòng đặt</th>
                <th>Khách hàng</th>
                <th>Phòng</th>
                <th>Khoảng thời gian</th>
                <th>Tổng dự kiến</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(b => (
                <tr key={b.id}>
                  <td><strong>#{b.id}</strong></td>
                  <td>
                    <div><strong>{b.guestName || b.guestFullName}</strong></div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.guestPhone}</span>
                  </td>
                  <td>
                    {b.roomNumber ? (
                      <span className="badge badge-confirmed" style={{ fontWeight: 'bold' }}>Phòng {b.roomNumber}</span>
                    ) : (
                      <span className="badge badge-maintenance">Chưa gán phòng</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px' }}>
                      {b.checkInDate} → {b.checkOutDate} ({b.nights} đêm)
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>
                      {(b.totalAmount || b.expectedPrice)?.toLocaleString('vi-VN')} VND
                    </strong>
                  </td>
                  <td>
                    {b.status === 'CHECKED_OUT' ? (
                      <span className="badge badge-confirmed">Đã thanh toán</span>
                    ) : b.status === 'CANCELLED' ? (
                      <span className="badge badge-maintenance">Đã hủy</span>
                    ) : b.status === 'CHECKED_IN' ? (
                      <span className="badge badge-pending">Đang ở (Chưa trả phòng)</span>
                    ) : (
                      <span className="badge badge-pending">Chưa thanh toán</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => openInvoiceDetails(b)} 
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <Clipboard size={12} style={{ marginRight: '4px' }} />
                      Xem & Đối soát
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BILLING / INVOICE VIEW MODAL */}
      {showInvoiceModal && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: 'calc(100vh - 110px)' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clipboard size={18} color="var(--primary)" />
                Chi tiết Hóa đơn thanh toán (#{activeInvoice.id})
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <div>
                  <p><strong>Khách hàng:</strong> {activeInvoice.guestFullName || selectedBooking?.guestName}</p>
                  <p><strong>Số điện thoại:</strong> {selectedBooking?.guestPhone || 'Không có'}</p>
                  <p><strong>CCCD / ID:</strong> {selectedBooking?.guestIdNumber || 'Không có'}</p>
                  <p><strong>Phòng đặt:</strong> {selectedBooking?.roomNumber ? `Phòng ${selectedBooking.roomNumber}` : 'Chưa gán'} ({selectedBooking?.roomTypeName || ''})</p>
                </div>
                <div>
                  <p><strong>Số đêm:</strong> {activeInvoice.nights || selectedBooking?.nights || 1} đêm</p>
                  <p><strong>Trạng thái hóa đơn:</strong> <span className={`badge badge-${activeInvoice.status?.toLowerCase() || 'pending'}`}>{activeInvoice.status || 'PENDING'}</span></p>
                </div>
              </div>

              <h3 style={{ fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phí thuê phòng</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '14px' }}>
                <span>Tiền phòng ({activeInvoice.nights} đêm)</span>
                <strong>{activeInvoice.roomCharge?.toLocaleString('vi-VN')} VND</strong>
              </div>

              {/* Service usages list */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Dịch vụ phụ thu</h3>
              </div>

              <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '20px' }}>
                <table style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th>Đơn giá</th>
                      <th>SL</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.serviceUsages && activeInvoice.serviceUsages.length > 0 ? (
                      activeInvoice.serviceUsages.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div><strong>{u.serviceName}</strong></div>
                            {u.note && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.note}</div>}
                          </td>
                          <td>{u.unitPrice?.toLocaleString('vi-VN')}</td>
                          <td>{u.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{u.lineTotal?.toLocaleString('vi-VN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>Không có dịch vụ phát sinh.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Invoice breakdown & Payment status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Tiền thuê phòng:</span>
                  <span>{activeInvoice.roomCharge?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Tiền dịch vụ phụ thu:</span>
                  <span>{activeInvoice.serviceCharge?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-maintenance)' }}>
                  <span>Giảm giá (Discount):</span>
                  <span>- {activeInvoice.discount?.toLocaleString('vi-VN') || 0} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', color: 'var(--primary)' }}>
                  <span>Tổng tiền hóa đơn:</span>
                  <span>{activeInvoice.totalAmount?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#10b981', fontWeight: '600' }}>
                  <span>Đã thanh toán:</span>
                  <span>{(activeInvoice.totalPaid || (activeInvoice.status === 'PAID' ? activeInvoice.totalAmount : 0))?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: activeInvoice.remainingAmount > 0 ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                  <span>Còn lại:</span>
                  <span>{(activeInvoice.remainingAmount !== undefined ? activeInvoice.remainingAmount : (activeInvoice.status === 'PAID' ? 0 : activeInvoice.totalAmount))?.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>

              {/* Payment history list */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Lịch sử thanh toán</h3>
                  {activeInvoice.status !== 'PAID' && selectedBooking?.status !== 'CANCELLED' && (activeInvoice.remainingAmount === undefined || activeInvoice.remainingAmount > 0) && (user.role === 'RECEPTIONIST' || user.role === 'ACCOUNTANT' || user.role === 'ADMIN') && (
                    <button
                      onClick={() => {
                        setPaymentInput({ amount: activeInvoice.remainingAmount, method: 'CASH' });
                        setShowPaymentModal(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      <DollarSign size={12} /> Ghi nhận thanh toán
                    </button>
                  )}
                </div>
                {activeInvoice.payments && activeInvoice.payments.length > 0 ? (
                  <div className="table-container">
                    <table style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Phương thức</th>
                          <th>Người thu</th>
                          <th style={{ textAlign: 'right' }}>Số tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInvoice.payments.map(p => (
                          <tr key={p.id}>
                            <td>{formatDateTime(p.paidAt)}</td>
                            <td><span className="badge badge-confirmed">{p.method === 'CASH' ? '💵 Tiền mặt' : '💳 Chuyển khoản'}</span></td>
                            <td>{p.receivedByName || 'Nhân viên'}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600', color: '#10b981' }}>{p.amount?.toLocaleString('vi-VN')} VND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 0' }}>Chưa có lần thanh toán nào.</div>
                )}
              </div>

            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary btn-sm">Đóng</button>
              
              {/* Nếu hóa đơn CHƯA thanh toán: Cho phép sửa trực tiếp */}
              {activeInvoice.status !== 'PAID' && selectedBooking?.status !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    setDiscountInput({ discount: activeInvoice.discount || '0' });
                    setShowDiscountModal(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#eab308', color: '#eab308' }}
                >
                  <Percent size={14} /> Sửa Chiết khấu
                </button>
              )}

              {/* Nếu hóa đơn ĐÃ thanh toán: KHÔNG cho sửa trực tiếp, chỉ cho lập hóa đơn điều chỉnh */}
              {activeInvoice.status === 'PAID' && selectedBooking?.status !== 'CANCELLED' && user.role !== 'RECEPTIONIST' && (
                <button
                  onClick={() => {
                    setShowAdjustModal(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#a855f7', color: '#a855f7' }}
                  title="Tạo hóa đơn điều chỉnh liên kết với hóa đơn gốc này"
                >
                  <FileText size={14} /> Lập hóa đơn điều chỉnh
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT SUB-MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} color="var(--primary)" />
                Ghi nhận giao dịch thanh toán
              </h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label>Số tiền thu (VND)</label>
                  <input 
                    type="number"
                    required
                    min="1000"
                    placeholder="VD: 500000"
                    value={paymentInput.amount}
                    onChange={(e) => setPaymentInput(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label>Phương thức thanh toán</label>
                  <select
                    value={paymentInput.method}
                    onChange={(e) => setPaymentInput(prev => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="TRANSFER">Chuyển khoản / Quẹt thẻ</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">Ghi nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DISCOUNT SUB-MODAL */}
      {showDiscountModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={16} color="#eab308" />
                Cập nhật chiết khấu hóa đơn
              </h2>
              <button onClick={() => setShowDiscountModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpdateDiscount}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label>Số tiền chiết khấu / giảm giá (VND)</label>
                  <input 
                    type="number"
                    required
                    min="0"
                    placeholder="VD: 50000"
                    value={discountInput.discount}
                    onChange={(e) => setDiscountInput(prev => ({ ...prev, discount: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'rgba(234,179,8,0.05)', borderRadius: '4px', border: '1px solid rgba(234,179,8,0.2)', fontSize: '12px', alignItems: 'center' }}>
                  <AlertCircle size={16} color="#eab308" />
                  <span style={{ color: 'var(--text-secondary)' }}>Mức chiết khấu sẽ được trừ trực tiếp vào tổng tiền hóa đơn.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowDiscountModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ backgroundColor: '#eab308', borderColor: '#eab308' }}>Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ADJUSTMENT INVOICE SUB-MODAL */}
      {showAdjustModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#a855f7" />
                Lập hóa đơn điều chỉnh
              </h2>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateAdjustment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'rgba(168,85,247,0.05)', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.2)', fontSize: '12px', alignItems: 'flex-start' }}>
                  <AlertCircle size={20} color="#a855f7" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Hóa đơn gốc đã thanh toán không được chỉnh sửa. Vui lòng nhập số tiền điều chỉnh (+/-) và lý do lập hóa đơn điều chỉnh này.
                  </span>
                </div>

                <div>
                  <label>Điều chỉnh tiền phòng (+/- VND)</label>
                  <input 
                    type="number"
                    required
                    placeholder="VD: -50000 hoặc 50000"
                    value={adjustInput.roomChargeAdjustment}
                    onChange={(e) => setAdjustInput(prev => ({ ...prev, roomChargeAdjustment: e.target.value }))}
                  />
                </div>

                <div>
                  <label>Điều chỉnh tiền dịch vụ (+/- VND)</label>
                  <input 
                    type="number"
                    required
                    placeholder="VD: 20000"
                    value={adjustInput.serviceChargeAdjustment}
                    onChange={(e) => setAdjustInput(prev => ({ ...prev, serviceChargeAdjustment: e.target.value }))}
                  />
                </div>

                <div>
                  <label>Điều chỉnh giảm giá (+/- VND)</label>
                  <input 
                    type="number"
                    required
                    placeholder="VD: 10000"
                    value={adjustInput.discountAdjustment}
                    onChange={(e) => setAdjustInput(prev => ({ ...prev, discountAdjustment: e.target.value }))}
                  />
                </div>

                <div>
                  <label>Lý do điều chỉnh (Bắt buộc)</label>
                  <textarea 
                    required
                    placeholder="Nhập lý do điều chỉnh..."
                    value={adjustInput.adjustmentReason}
                    onChange={(e) => setAdjustInput(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                    style={{ width: '100%', minHeight: '60px', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ backgroundColor: '#a855f7', borderColor: '#a855f7' }}>Lập hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Invoices;
