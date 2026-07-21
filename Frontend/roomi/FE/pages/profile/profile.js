/**
 * profile.js - Trang cấu hình tài khoản
 * Phụ thuộc: config.js, auth.js, api.js
 */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  ADMIN:        "Quản trị viên",
  OWNER:        "Chủ nhà trọ",
  RECEPTIONIST: "Lễ tân",
  HOUSEKEEPER:  "Nhân viên phòng",
  ACCOUNTANT:   "Kế toán",
  NONE:         "Chưa phân quyền",
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  // Bước 1: Kiểm tra token — nếu không có thì về login ngay
  if (!Auth.isLoggedIn()) {
    window.location.href = "../auth/login.html";
    return;
  }

  // Bước 2: Lấy userInfo từ localStorage, tự unwrap nếu sai cấu trúc
  let userInfo = Auth.getUserInfo();

  // Bước 3: Nếu localStorage không có / thiếu id/role thì thử fetch từ API
  if (!userInfo || !userInfo.id || !userInfo.role) {
    userInfo = await fetchProfile();
    if (!userInfo) {
      // fetchProfile trả null có 2 lý do:
      // 1. API trả 401 → apiCall đã redirect rồi, không làm gì thêm
      // 2. Network error → KHÔNG logout, chỉ báo lỗi nhẹ
      // Trường hợp thực sự không có gì: token tồn tại nhưng API liên tục lỗi
      // → Để trang render trống hơn là loop redirect
      console.warn("[profile] Không lấy được userInfo, hiển thị trang rỗng");
      // Không redirect, không clearAuth — người dùng vẫn còn token
    }
  }

  // Nếu hoàn toàn không có userInfo thì render với dữ liệu placeholder
  if (!userInfo) {
    userInfo = { username: "Người dùng", role: "NONE" };
  }

  // Bước 4: Render trang
  renderAll(userInfo);
  setupTabs();
  setupLogout();
  setupSaveInfo(userInfo);

  if (userInfo.role === "ADMIN") {
    showAdminSection();
    loadManageStats();
  } else {
    hideManageSection();
  }

  renderSessionInfo();
});

// ─── FETCH PROFILE (chỉ gọi khi localStorage thiếu dữ liệu) ─────────────────
async function fetchProfile() {
  try {
    const res = await API.getProfile();
    if (!res) return null; // 401 - apiCall đã redirect về login

    if (res.ok) {
      // Backend: BaseResponse<UserResponse> = { mess, data: { id, fullName, role... } }
      const data = res.data?.data || res.data;
      if (data && data.id) {
        Auth.setUserInfo(data);
        return data;
      }
    }
    return null;
  } catch (err) {
    // Network error: không thể kết nối backend
    // Trả về null — caller sẽ quyết định có redirect không
    console.warn("[profile] Không thể fetch profile:", err.message);
    return null;
  }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderAll(userInfo) {
  renderSidebar(userInfo);
  renderProfileCard(userInfo);
  renderEditForm(userInfo);
}

function renderSidebar(userInfo) {
  const nameEl  = document.getElementById("sidebarUsername");
  const badgeEl = document.getElementById("sidebarRoleBadge");
  if (nameEl)  nameEl.textContent = userInfo.fullName || userInfo.username || "Người dùng";
  if (badgeEl && userInfo.role) {
    badgeEl.textContent    = ROLE_LABELS[userInfo.role] || userInfo.role;
    badgeEl.style.display  = "inline-block";
  }

  const avatarEl = document.getElementById("sidebarAvatar");
  if (avatarEl) {
    avatarEl.textContent   = getInitials(userInfo.fullName || userInfo.username || "?");
    avatarEl.style.fontSize    = "14px";
    avatarEl.style.fontWeight  = "700";
  }
}

function renderProfileCard(userInfo) {
  const avatarEl = document.getElementById("profileAvatar");
  if (avatarEl) avatarEl.textContent = getInitials(userInfo.fullName || userInfo.username || "?");

  setText("profileName",     userInfo.fullName  || "—");
  setText("profileUsername", `@${userInfo.username || "—"}`);

  const roleBadge = document.getElementById("profileRoleBadge");
  if (roleBadge) {
    const roleKey = userInfo.role || "NONE";
    roleBadge.textContent = ROLE_LABELS[roleKey] || roleKey;
    roleBadge.className   = `profile-role-badge role-${roleKey}`;
  }

  if (userInfo.phone) {
    setText("profilePhone", userInfo.phone);
    const metaPhone = document.getElementById("metaPhone");
    if (metaPhone) metaPhone.style.display = "flex";
  }

  if (userInfo.createdAt) {
    setText("profileCreatedAt", `Tham gia: ${new Date(userInfo.createdAt).toLocaleDateString("vi-VN")}`);
  }

  const statusEl = document.getElementById("profileStatus");
  if (statusEl) {
    if (userInfo.active !== false) {
      statusEl.textContent = "Tài khoản đang hoạt động";
      statusEl.className   = "status-text status-active-text";
    } else {
      statusEl.textContent = "Tài khoản đã bị khóa";
      statusEl.className   = "status-text status-locked-text";
    }
  }
}

function renderEditForm(userInfo) {
  setVal("editFullName",        userInfo.fullName || "");
  setVal("editUsernameDisplay", userInfo.username || "");
  setVal("editPhone",           userInfo.phone    || "");
  setVal("editRoleDisplay",     ROLE_LABELS[userInfo.role] || userInfo.role || "—");
}

// ─── SAVE INFO ────────────────────────────────────────────────────────────────
function setupSaveInfo(userInfo) {
  const btn = document.getElementById("saveInfoBtn");
  if (!btn) return;

  // Giữ reference tới userInfo hiện tại (mutable để update sau save)
  let currentUser = { ...userInfo };

  btn.addEventListener("click", async () => {
    const fullName = document.getElementById("editFullName").value.trim();
    const phone    = document.getElementById("editPhone").value.trim();

    if (!fullName) {
      showMessage("infoMessage", "Họ và tên không được để trống.", "error");
      return;
    }

    if (!currentUser.id) {
      showMessage("infoMessage", "Không thể xác định tài khoản. Vui lòng tải lại trang.", "error");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';
    hideMessage("infoMessage");

    try {
      const result = await API.updateProfile({
        fullName,
        phone: phone || null,
      });
      
      if (result && result.ok) {
        const updated = result.data?.data || result.data;
        if (updated && updated.id) {
          currentUser = { ...currentUser, ...updated };
          Auth.setUserInfo(currentUser);
          renderProfileCard(currentUser);
          renderSidebar(currentUser);
        }
        showMessage("infoMessage", result.data?.mess || "Cập nhật thông tin thành công!", "success");
      } else {
        const errMsg = result?.data?.mess || "Cập nhật thất bại.";
        showMessage("infoMessage", errMsg, "error");
      }
    } catch (err) {
      showMessage("infoMessage", "Lỗi kết nối máy chủ.", "error");
      console.error(err);
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '<i class="fa fa-save"></i> Lưu thay đổi';
    }
  });
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add("active");
    });
  });
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function setupLogout() {
  ["logoutBtn", "logoutSecurityBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "../auth/logout.html";
      });
    }
  });
}

// ─── ADMIN SECTIONS ───────────────────────────────────────────────────────────
function showAdminSection() {
  const navItem = document.getElementById("navUsersMenuItem");
  if (navItem) navItem.style.display = "block";
  const tabManage = document.getElementById("tabManage");
  if (tabManage) tabManage.style.display = "flex";
  const noAccess = document.getElementById("noAccessNotice");
  if (noAccess) noAccess.style.display = "none";
  const grid = document.querySelector(".manage-grid");
  if (grid) grid.style.display = "grid";
}

function hideManageSection() {
  const tabManage = document.getElementById("tabManage");
  if (tabManage) tabManage.style.display = "none";
  const noAccess = document.getElementById("noAccessNotice");
  if (noAccess) noAccess.style.display = "flex";
  const grid = document.querySelector(".manage-grid");
  if (grid) grid.style.display = "none";
}

async function loadManageStats() {
  try {
    const result = await API.getAllUsers();
    if (!result || !result.ok) return;
    const users  = result.data?.data || result.data || [];
    setText("smTotal",  users.length);
    setText("smActive", users.filter(u => u.active).length);
    setText("smLocked", users.filter(u => !u.active).length);
  } catch (_) {}
}

// ─── SESSION INFO ─────────────────────────────────────────────────────────────
function renderSessionInfo() {
  const ua = navigator.userAgent;
  let browser = "Không xác định";
  if      (ua.includes("Edg"))     browser = "Microsoft Edge";
  else if (ua.includes("Chrome"))  browser = "Google Chrome";
  else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
  else if (ua.includes("Safari"))  browser = "Safari";
  setText("sessionBrowser", browser);
  setText("sessionTime", new Date().toLocaleString("vi-VN"));
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}
function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(-2)
    .map(w => w[0]).join("").toUpperCase().substring(0, 2);
}
function showMessage(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.className = `message-box ${type}`;
  if (type === "success") setTimeout(() => hideMessage(elId), 4000);
}
function hideMessage(elId) {
  const el = document.getElementById(elId);
  if (el) { el.className = "message-box"; el.textContent = ""; }
}
