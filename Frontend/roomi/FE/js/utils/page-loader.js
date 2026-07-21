/**
 * page-loader.js - Ngăn hiện tượng nháy trắng khi chuyển trang
 * Load file này ở đầu mỗi trang để tạo hiệu ứng fade-in mượt mà
 */

// Thêm class 'loaded' vào body khi trang đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
  });
} else {
  // Document đã load xong trước khi script này chạy
  document.body.classList.add('loaded');
}
