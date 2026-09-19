import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary'
import './index.css'

// ─── Tự động reload khi chunk cũ bị 404 sau khi deploy version mới ───────────
// Khi user mở tab lâu và deploy bản mới, Vite sẽ tạo chunk mới với hash khác.
// Các chunk cũ bị xóa → lazy import thất bại → lỗi "Failed to fetch dynamically..."
// Listener này bắt lỗi đó và reload lại trang để tải bundle mới nhất.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

// ─── Bắt thêm lỗi chunk import bị 404 theo cách thủ công (fallback) ──────────
window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS')
  ) {
    window.location.reload();
  }
});

// ─── Mount ứng dụng ───────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </React.StrictMode>,
  )
}
