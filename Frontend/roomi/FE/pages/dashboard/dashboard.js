/**
 * dashboard.js - Logic trang Dashboard
 * Phụ thuộc vào: js/constants/config.js, js/utils/auth.js, js/api/api.js
 */

// ─── KHỞI ĐỘNG ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  if (!Auth.isLoggedIn()) {
    window.location.href = "../auth/login.html";
    return;
  }

  // Hiển thị ngày tháng
  renderDate();

  // Lấy thông tin user
  let userInfo = Auth.getUserInfo();
  // Nếu dữ liệu lưu sai cấu trúc (thiếu id hoặc role), fetch lại từ API
  if (!userInfo || !userInfo.id || !userInfo.role) {
    userInfo = await fetchUserProfile();
  }

  renderUserInfo(userInfo);

  // Nút tạo user nhanh (chỉ admin)
  const createUserQuickBtn = document.getElementById("createUserQuickBtn");
  if (createUserQuickBtn) {
    createUserQuickBtn.addEventListener("click", () => {
      window.location.href = "../users/users.html?action=create";
    });
  }
});

// ─── HIỂN THỊ NGÀY ────────────────────────────────────────────────────────────
function renderDate() {
  const el = document.getElementById("headerDate");
  if (!el) return;
  const now = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  el.textContent = now.toLocaleDateString("vi-VN", options);
}

// ─── HIỂN THỊ THÔNG TIN USER ──────────────────────────────────────────────────
function renderUserInfo(userInfo) {
  const welcomeMessage = document.getElementById("welcomeMessage");
  const userInfoText   = document.getElementById("userInfoText");
  const sidebarUsername = document.getElementById("sidebarUsername");
  const roleBadge = document.getElementById("sidebarRoleBadge");

  if (!userInfo) {
    welcomeMessage.textContent = "Chào mừng đến với Dashboard!";
    return;
  }

  const displayName = Auth.getDisplayName(userInfo);
  welcomeMessage.textContent = `Chào mừng trở lại, ${displayName}!`;
  sidebarUsername.textContent = displayName;

  // Role badge
  if (roleBadge && userInfo.role && userInfo.role !== "NONE") {
    roleBadge.textContent = ROLE_LABELS[userInfo.role] || userInfo.role;
    roleBadge.style.display = "inline-block";
  }

  // Thông tin phụ
  const infoParts = [];
  if (userInfo.phone)  infoParts.push(`SĐT: ${userInfo.phone}`);
  if (userInfo.role && userInfo.role !== "NONE") {
    infoParts.push(`Vai trò: ${ROLE_LABELS[userInfo.role] || userInfo.role}`);
  }
  userInfoText.textContent = infoParts.length > 0
    ? infoParts.join("  |  ")
    : "Quản lý thông tin và tài khoản của bạn tại đây.";

  // Admin-only sections
  if (userInfo.role === "ADMIN") {
    showAdminSections();
    loadAdminStats();
  }
}

// ─── ADMIN SECTIONS ───────────────────────────────────────────────────────────
function showAdminSections() {
  const navUsersMenuItem   = document.getElementById("navUsersMenuItem");
  const accountCard        = document.getElementById("accountManagementCard");
  const adminStatsRow      = document.getElementById("adminStatsRow");

  if (navUsersMenuItem)  navUsersMenuItem.style.display = "block";
  if (accountCard)       accountCard.style.display = "flex";
  if (adminStatsRow)     adminStatsRow.style.display = "grid";

  const manageUsersBtn = document.getElementById("manageUsersBtn");
  if (manageUsersBtn) {
    manageUsersBtn.addEventListener("click", () => {
      window.location.href = "../users/users.html";
    });
  }
}

// ─── THỐNG KÊ ADMIN ───────────────────────────────────────────────────────────
async function loadAdminStats() {
  try {
    const result = await API.getAllUsers();
    if (!result || !result.ok) return;

    const users = result.data?.data || result.data || [];
    const total   = users.length;
    const active  = users.filter(u => u.active).length;
    const locked  = users.filter(u => !u.active).length;
    const roles   = new Set(users.map(u => u.role).filter(r => r && r !== "NONE")).size;

    setStatValue("statTotalUsers",  total);
    setStatValue("statActiveUsers", active);
    setStatValue("statLockedUsers", locked);
    setStatValue("statRoles",       roles);
  } catch (err) {
    console.error("Không thể tải thống kê:", err);
  }
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ─── LẤY PROFILE TỪ API ───────────────────────────────────────────────────────
async function fetchUserProfile() {
  try {
    const result = await API.getProfile();
    if (result && result.ok && result.data) {
      const userData = result.data.data || result.data;
      if (userData) {
        Auth.setUserInfo(userData);
        return userData;
      }
    }
  } catch (error) {
    console.error("Không thể lấy thông tin profile:", error);
  }
  return null;
}

// ─── ROLE LABELS ──────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  ADMIN:        "Quản trị viên",
  OWNER:        "Chủ nhà trọ",
  RECEPTIONIST: "Lễ tân",
  HOUSEKEEPER:  "Nhân viên phòng",
  ACCOUNTANT:   "Kế toán",
  NONE:         "Chưa phân quyền",
};
