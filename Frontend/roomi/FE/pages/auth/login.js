/**
 * login.js - Logic trang đăng nhập & đăng ký
 * Phụ thuộc vào: js/constants/config.js, js/utils/auth.js, js/api/api.js
 */

// ─── KHỞI ĐỘNG: Nếu đã đăng nhập thì chuyển thẳng đến dashboard ─────────────
document.addEventListener("DOMContentLoaded", () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  if (Auth.isLoggedIn()) {
    window.location.href = "../dashboard/dashboard.html";
  }
});

// ─── ĐIỀU HƯỚNG CHUYỂN ĐỔI FORM (Login ↔ Register) ──────────────────────────
const signUpButton = document.getElementById("signUpBtn");
const signInButton = document.getElementById("signInBtn");
const container = document.getElementById("container");

signUpButton.addEventListener("click", () => {
  container.classList.add("right-panel-active");
  clearMessages();
  resetPasswordFields();
});

signInButton.addEventListener("click", () => {
  container.classList.remove("right-panel-active");
  clearMessages();
  resetPasswordFields();
});

// ─── ẨN/HIỆN MẬT KHẨU ────────────────────────────────────────────────────────
function togglePasswordVisibility(inputId, iconElement) {
  const passwordInput = document.getElementById(inputId);
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  iconElement.classList.toggle("fa-eye-slash", !isHidden);
  iconElement.classList.toggle("fa-eye", isHidden);
}

function resetPasswordFields() {
  ["regPassword", "regConfirmPassword", "loginPassword"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.type = "password";
  });
  document.querySelectorAll(".toggle-password").forEach((icon) => {
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  });
}

// ─── THÔNG BÁO ────────────────────────────────────────────────────────────────
function showMessage(elementId, text, type) {
  const msgBox = document.getElementById(elementId);
  if (!msgBox) return;
  msgBox.innerText = text;
  msgBox.className = `message-box ${type}`;
  setTimeout(() => {
    msgBox.className = "message-box";
    msgBox.innerText = "";
  }, CONFIG.TOKEN_TIMEOUT_MS);
}

function clearMessages() {
  ["registerMessage", "loginMessage"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = "message-box";
      el.innerText = "";
    }
  });
}

// ─── XỬ LÝ ĐĂNG KÝ (Sign Up) ─────────────────────────────────────────────────
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userData = {
    username: document.getElementById("regUsername").value.trim(),
    fullName: document.getElementById("regFullName").value.trim(),
    phone: document.getElementById("regPhone").value.trim() || null,
    password: document.getElementById("regPassword").value,
  };
  const confirmPassword = document.getElementById("regConfirmPassword").value;

  // Validate cơ bản
  if (!userData.username || !userData.fullName || !userData.password || !confirmPassword) {
    showMessage("registerMessage", "Vui lòng điền đầy đủ thông tin bắt buộc!", "error");
    return;
  }

  if (userData.password.length < 6) {
    showMessage("registerMessage", "Mật khẩu phải có ít nhất 6 ký tự!", "error");
    return;
  }

  if (userData.password !== confirmPassword) {
    showMessage("registerMessage", "Mật khẩu nhập lại không trùng khớp!", "error");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.textContent = "Đang xử lý...";
  submitBtn.disabled = true;

  try {
    const result = await API.register(userData);

    if (result && result.ok) {
      // Backend trả về RegisterResponse: { mess, token }
      showMessage("registerMessage", result.data?.mess || "Đăng ký thành công! Vui lòng đăng nhập.", "success");
      document.getElementById("registerForm").reset();
      resetPasswordFields();

      // Chuyển sang form đăng nhập sau 1.5 giây
      setTimeout(() => {
        container.classList.remove("right-panel-active");
        clearMessages();
      }, 1500);
    } else {
      const errMsg = result?.data?.mess || "Thông tin không hợp lệ!";
      showMessage("registerMessage", `Đăng ký thất bại: ${errMsg}`, "error");
      document.getElementById("regPassword").value = "";
      document.getElementById("regConfirmPassword").value = "";
    }
  } catch (error) {
    showMessage("registerMessage", "Không thể kết nối đến máy chủ!", "error");
  } finally {
    submitBtn.textContent = "Đăng ký";
    submitBtn.disabled = false;
  }
});

// ─── XỬ LÝ ĐĂNG NHẬP (Sign In) ───────────────────────────────────────────────
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) {
    showMessage("loginMessage", "Vui lòng nhập tên đăng nhập và mật khẩu!", "error");
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Đang xử lý...";
  submitBtn.disabled = true;

  try {
    const result = await API.login(username, password);

    if (!result) return; // 401 đã xử lý trong apiCall

    if (result.ok) {
      // Backend trả về LoginResponse: { mess, token, role }
      const token = result.data?.token;
      const role = result.data?.role;
      
      if (!token) {
        showMessage("loginMessage", "Không nhận được token từ server!", "error");
        return;
      }

      // Xóa dữ liệu cũ trước khi lưu mới (role có thể đã thay đổi)
      Auth.clearAuth();
      Auth.setToken(token);

      // Lấy thông tin profile người dùng — bắt buộc để có role mới nhất
      try {
        const profileResult = await API.getProfile();
        if (profileResult && profileResult.ok) {
          // Backend trả về BaseResponse<UserResponse>: { mess, data: { id, fullName, role, ... } }
          const userData = profileResult.data?.data || profileResult.data;
          if (userData && userData.id) {
            Auth.setUserInfo(userData);
          }
        }
      } catch (_) {
        // Network lỗi — vẫn cho vào dashboard, sẽ fetch lại khi cần
      }

      showMessage("loginMessage", result.data?.mess || "Đăng nhập thành công!", "success");
      setTimeout(() => {
        window.location.href = "../dashboard/dashboard.html";
      }, 1000);
    } else {
      const errMsg = result.data?.mess || "Tài khoản hoặc mật khẩu không đúng!";
      showMessage("loginMessage", `Đăng nhập thất bại: ${errMsg}`, "error");
      document.getElementById("loginPassword").value = "";
    }
  } catch (error) {
    showMessage("loginMessage", "Không thể kết nối đến máy chủ!", "error");
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});
