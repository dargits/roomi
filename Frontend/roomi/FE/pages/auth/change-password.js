/**
 * change-password.js - Logic trang đổi mật khẩu
 * Phụ thuộc vào: js/constants/config.js, js/utils/auth.js, js/api/api.js
 */

// ─── KHỞI ĐỘNG ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  // Kiểm tra đăng nhập
  if (!Auth.isLoggedIn()) {
    window.location.href = "../auth/login.html";
    return;
  }

  // Hiển thị tên người dùng trong subtitle
  const userInfo = Auth.getUserInfo();
  if (userInfo) {
    const displayName = Auth.getDisplayName(userInfo);
    const subtitle = document.querySelector(".subtitle");
    if (subtitle) {
      subtitle.innerHTML = `Xin chào <strong>${displayName}</strong>, vui lòng nhập mật khẩu mới`;
    }
  }
});

// ─── ẨN/HIỆN MẬT KHẨU ────────────────────────────────────────────────────────
function togglePasswordVisibility(inputId, iconElement) {
  const passwordInput = document.getElementById(inputId);
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  iconElement.classList.toggle("fa-eye-slash", !isHidden);
  iconElement.classList.toggle("fa-eye", isHidden);
}

// ─── THÔNG BÁO ────────────────────────────────────────────────────────────────
function showMessage(text, type) {
  const msgBox = document.getElementById("messageBox");
  if (!msgBox) return;
  msgBox.innerText = text;
  msgBox.className = `message-box ${type}`;
  setTimeout(() => {
    msgBox.className = "message-box";
    msgBox.innerText = "";
  }, CONFIG.TOKEN_TIMEOUT_MS);
}

// ─── XỬ LÝ ĐỔI MẬT KHẨU ─────────────────────────────────────────────────────
document
  .getElementById("changePasswordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    // Validate
    if (!newPassword) {
      showMessage("Vui lòng nhập mật khẩu mới!", "error");
      return;
    }
    if (newPassword.length < 6) {
      showMessage("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage("Mật khẩu xác nhận không khớp!", "error");
      return;
    }

    // Kiểm tra lại trạng thái đăng nhập trước khi gửi
    if (!Auth.isLoggedIn()) {
      showMessage(
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!",
        "error",
      );
      setTimeout(() => {
        window.location.href = "../auth/login.html";
      }, 2000);
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Đang xử lý...";
    submitBtn.disabled = true;

    try {
      const result = await API.changePassword(newPassword);

      if (!result) return; // 401 đã xử lý trong apiCall

      // Backend trả về BaseResponse: { mess, data }
      if (result.ok) {
        showMessage(
          result.data?.mess || "Đổi mật khẩu thành công! Đang chuyển hướng...",
          "success",
        );
        setTimeout(() => {
          document.getElementById("changePasswordForm").reset();
          window.location.href = "../dashboard/dashboard.html";
        }, 2000);
      } else {
        const errMsg = result?.data?.mess || "Đổi mật khẩu thất bại!";
        showMessage(errMsg, "error");
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
      }
    } catch (error) {
      showMessage("Không thể kết nối đến máy chủ!", "error");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
