/**
 * auth.js - Các tiện ích xác thực (Authentication Utilities)
 * Quản lý token và thông tin người dùng trong localStorage
 */

const Auth = {
  /**
   * Lấy token từ localStorage
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY);
  },

  /**
   * Kiểm tra xem người dùng đã đăng nhập chưa
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  /**
   * Lấy thông tin người dùng từ localStorage.
   * Tự động xử lý nếu dữ liệu cũ lưu ở dạng BaseResponse wrapper.
   * KHÔNG bao giờ xóa token — chỉ xóa user_info nếu rác.
   * @returns {Object|null}
   */
  getUserInfo() {
    try {
      const raw = localStorage.getItem(CONFIG.USER_INFO_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        localStorage.removeItem(CONFIG.USER_INFO_KEY);
        return null;
      }

      // Dữ liệu đúng chuẩn: có id trực tiếp
      if (parsed.id) return parsed;

      // Dữ liệu cũ sai cấu trúc: BaseResponse wrapper { mess, data: { id, ... } }
      if (parsed.data && typeof parsed.data === "object" && parsed.data.id) {
        const unwrapped = parsed.data;
        localStorage.setItem(CONFIG.USER_INFO_KEY, JSON.stringify(unwrapped));
        return unwrapped;
      }

      // Rác hoàn toàn — xóa user_info nhưng GIỮ token
      localStorage.removeItem(CONFIG.USER_INFO_KEY);
      return null;
    } catch (e) {
      localStorage.removeItem(CONFIG.USER_INFO_KEY);
      return null;
    }
  },

  /**
   * Lưu token vào localStorage
   * @param {string} token
   */
  setToken(token) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
  },

  /**
   * Lưu thông tin user vào localStorage.
   * Tự động unwrap BaseResponse wrapper trước khi lưu.
   * @param {Object} userInfo
   */
  setUserInfo(userInfo) {
    if (!userInfo || typeof userInfo !== "object") return;
    // Nếu vô tình truyền vào BaseResponse { mess, data: UserResponse }
    const toStore = userInfo.id
      ? userInfo
      : (userInfo.data && userInfo.data.id ? userInfo.data : userInfo);
    localStorage.setItem(CONFIG.USER_INFO_KEY, JSON.stringify(toStore));
  },

  /**
   * Xóa toàn bộ dữ liệu phiên đăng nhập
   */
  clearAuth() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_INFO_KEY);
  },

  /**
   * Lấy tên hiển thị của người dùng
   * @param {Object|null} userInfo
   * @returns {string}
   */
  getDisplayName(userInfo) {
    if (!userInfo) return "Người dùng";
    return userInfo.fullName || userInfo.username || "Người dùng";
  },

  /**
   * Chuyển hướng về trang đăng nhập
   */
  redirectToLogin() {
    window.location.href = "../auth/login.html";
  },
};
