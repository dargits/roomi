/**
 * config.js - Cấu hình toàn cục của ứng dụng
 * Tất cả constants dùng chung được định nghĩa ở đây
 */

const CONFIG = {
  API_BASE_URL: "http://localhost:8080/api/v1",
  TOKEN_KEY: "session_token",
  USER_INFO_KEY: "user_info",
  TOKEN_TIMEOUT_MS: 4000,  // Thời gian hiển thị thông báo (ms)
};

// Export cho môi trường module (nếu dùng sau này)
// export default CONFIG;
