/**
 * api.js - Module gọi API tập trung
 * Tất cả các lời gọi đến backend đi qua đây
 * Phụ thuộc vào: js/constants/config.js, js/utils/auth.js
 */

/**
 * Hàm gọi API với token tự động
 * @param {string} endpoint - Đường dẫn API (e.g. "/auth/login")
 * @param {Object} options - Tùy chọn fetch
 * @returns {Promise<{ok: boolean, status: number, data: any}|null>}
 */
async function apiCall(endpoint, options = {}) {
  const token = Auth.getToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Thêm Authorization header nếu có token
  if (token) {
    headers["Authorization"] = token;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);

    // Xử lý các loại response khác nhau
    let data;
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // Không phải JSON, có thể là lỗi HTML
      const text = await response.text();
      console.error("[API] Non-JSON response:", text.substring(0, 500));
      data = {
        mess: "Lỗi server trả về dữ liệu không đúng định dạng",
        error: text.substring(0, 200),
      };
    }

    // 401: token hết hạn / không hợp lệ → xóa auth và về login
    if (response.status === 401) {
      Auth.clearAuth();
      window.location.href = "../auth/login.html";
      return null;
    }

    // 400 với session error code → cũng về login
    if (
      response.status === 400 &&
      data?.code &&
      ["SESSION_EXPIRED", "SESSION_INVALID", "AUTH_004", "AUTH_005"].includes(
        data.code,
      )
    ) {
      Auth.clearAuth();
      window.location.href = "../auth/login.html";
      return null;
    }

    // 500: Internal Server Error - log chi tiết
    if (response.status === 500) {
      console.error("[API] Server Error 500:", endpoint, data);
    }

    // 403: không đủ quyền → trả về để caller xử lý, không redirect
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Object API tập trung - tất cả endpoint calls
 */
const API = {
  // ─── AUTH ────────────────────────────────────────────────────────────────

  /** Đăng nhập */
  login: (username, password) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  /** Đăng ký */
  register: (userData) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  /** Đăng xuất */
  logout: () =>
    apiCall("/auth/logout", {
      method: "POST",
    }),

  /** Đổi mật khẩu */
  changePassword: (newPassword) =>
    apiCall("/auth/changepass", {
      method: "POST",
      body: JSON.stringify({ password: newPassword }),
    }),

  // ─── USER (PROFILE) ──────────────────────────────────────────────────────

  /** Lấy profile người dùng hiện tại */
  getProfile: () =>
    apiCall("/users/profile", {
      method: "GET",
    }),

  // ─── USER MANAGEMENT (ADMIN) ─────────────────────────────────────────────

  /** Lấy danh sách tất cả người dùng */
  getAllUsers: () =>
    apiCall("/users/", {
      method: "GET",
    }),

  /**
   * Thay đổi vai trò người dùng
   * @param {number} id
   * @param {string} role
   */
  changeUserRole: (id, role) =>
    apiCall(`/users/role/${id}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  /**
   * Khóa tài khoản người dùng
   * @param {number} id
   */
  lockUser: (id) =>
    apiCall(`/users/lock/${id}`, {
      method: "PUT",
    }),

  /**
   * Mở khóa tài khoản người dùng
   * @param {number} id
   */
  unlockUser: (id) =>
    apiCall(`/users/unlock/${id}`, {
      method: "PUT",
    }),

  // ─── GUESTS ──────────────────────────────────────────────────────────────

  /** Lấy danh sách tất cả khách hàng */
  getAllGuests: () =>
    apiCall("/guests", {
      method: "GET",
    }),

  /**
   * Lấy thông tin khách hàng theo ID
   * @param {number} id
   */
  getGuestById: (id) =>
    apiCall(`/guests/${id}`, {
      method: "GET",
    }),

  /**
   * Tìm khách hàng theo số điện thoại
   * @param {string} phone
   */
  getGuestByPhone: (phone) =>
    apiCall(`/guests/phone/${phone}`, {
      method: "GET",
    }),

  /**
   * Tìm kiếm khách hàng theo tên
   * @param {string} name
   */
  searchGuestsByName: (name) =>
    apiCall(`/guests/search?name=${encodeURIComponent(name)}`, {
      method: "GET",
    }),

  /**
   * Tạo mới khách hàng
   * @param {Object} guestData - { fullName, phone, email, idNumber, note }
   */
  createGuest: (guestData) =>
    apiCall("/guests", {
      method: "POST",
      body: JSON.stringify(guestData),
    }),

  /**
   * Cập nhật thông tin khách hàng
   * @param {number} id
   * @param {Object} guestData
   */
  updateGuest: (id, guestData) =>
    apiCall(`/guests/${id}`, {
      method: "PUT",
      body: JSON.stringify(guestData),
    }),

  /**
   * Xóa khách hàng
   * @param {number} id
   */
  deleteGuest: (id) =>
    apiCall(`/guests/${id}`, {
      method: "DELETE",
    }),

  // ─── ROOM TYPES ──────────────────────────────────────────────────────────

  /** Lấy danh sách tất cả loại phòng */
  getAllRoomTypes: () =>
    apiCall("/room-types", {
      method: "GET",
    }),

  /**
   * Lấy thông tin loại phòng theo ID
   * @param {number} id
   */
  getRoomTypeById: (id) =>
    apiCall(`/room-types/${id}`, {
      method: "GET",
    }),

  /**
   * Tạo loại phòng mới
   * @param {Object} roomTypeData
   */
  createRoomType: (roomTypeData) =>
    apiCall("/room-types", {
      method: "POST",
      body: JSON.stringify(roomTypeData),
    }),

  /**
   * Cập nhật loại phòng
   * @param {number} id
   * @param {Object} roomTypeData
   */
  updateRoomType: (id, roomTypeData) =>
    apiCall(`/room-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(roomTypeData),
    }),

  /**
   * Xóa loại phòng
   * @param {number} id
   */
  deleteRoomType: (id) =>
    apiCall(`/room-types/${id}`, {
      method: "DELETE",
    }),

  // ─── ROOMS ───────────────────────────────────────────────────────────────

  /** Lấy danh sách tất cả phòng */
  getAllRooms: () =>
    apiCall("/rooms", {
      method: "GET",
    }),

  /** Lấy trạng thái tất cả phòng trong một ngày cho màn hình lễ tân */
  getDailyRoomStatuses: (date) =>
    apiCall(`/calendar/daily-room-statuses?date=${encodeURIComponent(date)}`, {
      method: "GET",
    }),

  /**
   * Lấy thông tin phòng theo ID
   * @param {number} id
   */
  getRoomById: (id) =>
    apiCall(`/rooms/${id}`, {
      method: "GET",
    }),

  /**
   * Tạo phòng mới
   * @param {Object} roomData
   */
  createRoom: (roomData) =>
    apiCall("/rooms", {
      method: "POST",
      body: JSON.stringify(roomData),
    }),

  /**
   * Cập nhật phòng
   * @param {number} id
   * @param {Object} roomData
   */
  updateRoom: (id, roomData) =>
    apiCall(`/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(roomData),
    }),

  /**
   * Xóa phòng
   * @param {number} id
   */
  deleteRoom: (id) =>
    apiCall(`/rooms/${id}`, {
      method: "DELETE",
    }),

  // ─── SEASONAL RATES ──────────────────────────────────────────────────────

  /** Lấy danh sách tất cả giá theo mùa */
  getAllSeasonalRates: () =>
    apiCall("/seasonal-rates", {
      method: "GET",
    }),

  /**
   * Lấy giá theo mùa theo loại phòng
   * @param {number} roomTypeId
   */
  getSeasonalRatesByRoomType: (roomTypeId) =>
    apiCall(`/seasonal-rates/room-type/${roomTypeId}`, {
      method: "GET",
    }),

  /**
   * Lấy thông tin giá theo mùa theo ID
   * @param {number} id
   */
  getSeasonalRateById: (id) =>
    apiCall(`/seasonal-rates/${id}`, {
      method: "GET",
    }),

  /**
   * Tạo giá theo mùa mới
   * @param {Object} seasonalRateData - { roomTypeId, startDate, endDate, price }
   */
  createSeasonalRate: (seasonalRateData) =>
    apiCall("/seasonal-rates", {
      method: "POST",
      body: JSON.stringify(seasonalRateData),
    }),

  /**
   * Cập nhật giá theo mùa
   * @param {number} id
   * @param {Object} seasonalRateData
   */
  updateSeasonalRate: (id, seasonalRateData) =>
    apiCall(`/seasonal-rates/${id}`, {
      method: "PUT",
      body: JSON.stringify(seasonalRateData),
    }),

  /**
   * Xóa giá theo mùa
   * @param {number} id
   */
  deleteSeasonalRate: (id) =>
    apiCall(`/seasonal-rates/${id}`, {
      method: "DELETE",
    }),

  /**
   * Tra cứu giá theo ngày
   * @param {number} roomTypeId
   * @param {string} date - Format: YYYY-MM-DD
   */
  getPriceByDate: (roomTypeId, date) =>
    apiCall(
      `/seasonal-rates/price-lookup?roomTypeId=${roomTypeId}&date=${date}`,
      {
        method: "GET",
      },
    ),

  // ─── BOOKINGS ────────────────────────────────────────────────────────────

  /** Lấy danh sách tất cả đặt phòng */
  getAllBookings: () =>
    apiCall("/bookings", {
      method: "GET",
    }),

  /**
   * Tìm kiếm đặt phòng
   * @param {Object} params - { guestName, phone, idNumber, roomTypeId, fromDate, toDate }
   */
  searchBookings: (params) => {
    const queryParams = new URLSearchParams();
    if (params.guestName) queryParams.append("guestName", params.guestName);
    if (params.phone) queryParams.append("phone", params.phone);
    if (params.idNumber) queryParams.append("idNumber", params.idNumber);
    if (params.roomTypeId) queryParams.append("roomTypeId", params.roomTypeId);
    if (params.fromDate) queryParams.append("fromDate", params.fromDate);
    if (params.toDate) queryParams.append("toDate", params.toDate);

    return apiCall(`/bookings/search?${queryParams.toString()}`, {
      method: "GET",
    });
  },

  /**
   * Lấy thông tin đặt phòng theo ID
   * @param {number} id
   */
  getBookingById: (id) =>
    apiCall(`/bookings/${id}`, {
      method: "GET",
    }),

  /**
   * Tạo đặt phòng mới
   * @param {Object} bookingData
   */
  createBooking: (bookingData) =>
    apiCall("/bookings", {
      method: "POST",
      body: JSON.stringify(bookingData),
    }),

  /**
   * Cập nhật đặt phòng
   * @param {number} id
   * @param {Object} bookingData
   */
  updateBooking: (id, bookingData) =>
    apiCall(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(bookingData),
    }),

  /**
   * Xóa đặt phòng
   * @param {number} id
   */
  deleteBooking: (id) =>
    apiCall(`/bookings/${id}`, {
      method: "DELETE",
    }),

  /**
   * Gán phòng cho đặt phòng
   * @param {number} bookingId
   * @param {number} roomId
   */
  assignRoom: (bookingId, roomId) =>
    apiCall(`/bookings/${bookingId}/assign-room?roomId=${roomId}`, {
      method: "PATCH",
    }),

  getAvailableRooms: (roomTypeId, checkInDate, checkOutDate) =>
    apiCall(
      `/calendar/available-rooms?roomTypeId=${roomTypeId}&checkIn=${checkInDate}&checkOut=${checkOutDate}`,
      { method: "GET" },
    ),

  /**
   * Check-in
   * @param {number} bookingId
   */
  checkIn: (bookingId) =>
    apiCall(`/bookings/${bookingId}/check-in`, {
      method: "PUT",
    }),

  /**
   * Check-out
   * @param {number} bookingId
   */
  checkOut: (bookingId) =>
    apiCall(`/bookings/${bookingId}/check-out`, {
      method: "PUT",
    }),

  /**
   * Hủy đặt phòng
   * @param {number} bookingId
   */
  cancelBooking: (bookingId) =>
    apiCall(`/bookings/${bookingId}/cancel`, {
      method: "PUT",
    }),
};
