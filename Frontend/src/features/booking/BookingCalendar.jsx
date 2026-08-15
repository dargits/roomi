import React, { useState, useEffect } from 'react';
import bookingApi from '../../services/bookingApi';
import { IoCalendarOutline, IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';

const BookingCalendar = () => {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use today as default view start
  const today = new Date();
  const [viewStartDate, setViewStartDate] = useState(today);

  useEffect(() => {
    fetchCalendar();
  }, [viewStartDate]);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const from = viewStartDate.toISOString().split('T')[0];
      const endDate = new Date(viewStartDate);
      endDate.setDate(endDate.getDate() + 14); // 14 days view
      const to = endDate.toISOString().split('T')[0];

      // Assuming API returns a list of bookings in this range
      const data = await bookingApi.getBookingCalendar(from, to);
      setCalendarData(data);
    } catch (error) {
      console.error("Failed to fetch calendar", error);
    } finally {
      setLoading(false);
    }
  };

  const nextPeriod = () => {
    const next = new Date(viewStartDate);
    next.setDate(next.getDate() + 7);
    setViewStartDate(next);
  };

  const prevPeriod = () => {
    const prev = new Date(viewStartDate);
    prev.setDate(prev.getDate() - 7);
    setViewStartDate(prev);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-title-lg text-on-surface flex items-center gap-2">
          <IoCalendarOutline size={24} className="text-primary"/> 
          Lịch Đặt Phòng (14 Ngày)
        </h3>
        
        <div className="flex gap-2">
          <button onClick={prevPeriod} className="p-2 bg-surface-container-low border border-border-grey rounded-lg hover:bg-surface-blue-light transition-colors">
            <IoChevronBackOutline size={20} className="text-on-surface-variant" />
          </button>
          <div className="px-4 py-2 bg-surface-container-low border border-border-grey rounded-lg font-label-md text-on-surface">
            {viewStartDate.toLocaleDateString('vi-VN')}
          </div>
          <button onClick={nextPeriod} className="p-2 bg-surface-container-low border border-border-grey rounded-lg hover:bg-surface-blue-light transition-colors">
            <IoChevronForwardOutline size={20} className="text-on-surface-variant" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant">Đang tải lịch phòng...</div>
      ) : (
        <div className="border border-border-grey rounded-xl overflow-hidden bg-surface-container-lowest text-center p-8">
           <div className="font-title-md text-on-surface mb-2">Tính năng Lịch phòng (Dạng bảng) đang được hoàn thiện.</div>
           <p className="text-body-md text-on-surface-variant">API đã kết nối thành công và tải về {calendarData?.length || 0} bản ghi cho khoảng thời gian này.</p>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
