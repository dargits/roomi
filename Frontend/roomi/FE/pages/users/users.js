/**
 * users.js - Quản lý người dùng (ADMIN only)
 * Phụ thuộc: config.js, auth.js, api.js
 *
 * Quyền hạn:
 *  - Trang này chỉ cho phép ADMIN truy cập (guard ở DOMContentLoaded)
 *  - BE kiểm tra lại ở mọi endpoint /user/users/* (validateAdminAccess)
 *  - FE: dropdown phân quyền và nút khóa/mở khóa chỉ hiển thị cho ADMIN
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

const ROLE_OPTIONS = [
  { value: "NONE",         label: "— Chưa phân quyền —" },
  { value: "OWNER",        label: "Chủ nhà trọ" },
  { value: "RECEPTIONIST", label: "Lễ tân" },
  { value: "HOUSEKEEPER",  label: "Nhân viên phòng" },
  { value: "ACCOUNTANT",   label: "Kế toán" },
  { value: "ADMIN",        label: "Quản trị viên" },
];

// ─── STATE ────────────────────────────────────────────────────────────────────
let allUsers       = [];
let filteredUsers  = [];
let editingUserId  = null;
let currentUserId  = null;
let isAdmin        = false;   // ← quyết định toàn bộ UI phân quyền
let confirmCallback = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  if (!Auth.isLoggedIn()) {
    window.location.href = "../auth/login.html";
    return;
  }

  // Luôn fetch từ API để đảm bảo role là mới nhất từ BE
  // (tránh dùng cache cũ có thể có role sai sau khi admin đổi role)
  let userInfo = null;
  try {
    const res = await API.getProfile();
    if (res && res.ok) {
      const data = res.data?.data || res.data;
      if (data?.id) {
        userInfo = data;
        Auth.setUserInfo(data);
      }
    } else if (res && !res.ok) {
      // BE trả lỗi (400 = session expired/invalid từ GlobalExceptionHandler)
      // → xóa auth và về login
      const code = res.data?.code || "";
      if (["SESSION_EXPIRED", "SESSION_INVALID", "AUTH_004", "AUTH_005"].includes(code)) {
        Auth.clearAuth();
        window.location.href = "../auth/login.html";
        return;
      }
    }
  } catch (_) {
    // Network error: thử fallback từ localStorage
    userInfo = Auth.getUserInfo();
  }

  // ── ADMIN guard: FE từ chối truy cập nếu không phải ADMIN ──
  if (!userInfo || userInfo.role !== "ADMIN") {
    showAccessDenied();
    return;
  }

  isAdmin       = true;
  currentUserId = userInfo.id;
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  if (params.get("action") === "create") openCreateModal();

  await loadUsers();
});

// ─── ACCESS DENIED (không phải ADMIN) ────────────────────────────────────────
function showAccessDenied() {
  document.querySelector(".main-content").innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                height:100%;gap:16px;color:#888;padding:60px 20px;text-align:center;">
      <i class="fa fa-shield-halved" style="font-size:56px;color:#e0e0e0;"></i>
      <h2 style="color:#555;font-size:20px;">Không có quyền truy cập</h2>
      <p style="font-size:14px;">Trang này chỉ dành cho Quản trị viên (ADMIN).</p>
      <a href="../dashboard/dashboard.html"
         style="margin-top:8px;padding:10px 22px;background:linear-gradient(to right,#38ef7d,#11998e);
                color:#fff;border-radius:10px;font-weight:600;font-size:13px;text-decoration:none;">
        <i class="fa fa-arrow-left"></i> Về trang chủ
      </a>
    </div>`;
}

// ─── BIND EVENTS ──────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("filterRole").addEventListener("change", applyFilters);
  document.getElementById("filterStatus").addEventListener("change", applyFilters);
  document.getElementById("refreshBtn").addEventListener("click", loadUsers);
  document.getElementById("openCreateModalBtn").addEventListener("click", openCreateModal);

  document.getElementById("closeModalBtn").addEventListener("click", closeUserModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeUserModal);
  document.getElementById("saveUserBtn").addEventListener("click", saveUser);

  document.getElementById("closeConfirmBtn").addEventListener("click", closeConfirmModal);
  document.getElementById("cancelConfirmBtn").addEventListener("click", closeConfirmModal);
  document.getElementById("confirmActionBtn").addEventListener("click", () => {
    if (typeof confirmCallback === "function") confirmCallback();
    closeConfirmModal();
  });

  document.getElementById("userModal").addEventListener("click", (e) => {
    if (e.target.id === "userModal") closeUserModal();
  });
  document.getElementById("confirmModal").addEventListener("click", (e) => {
    if (e.target.id === "confirmModal") closeConfirmModal();
  });
}

// ─── LOAD USERS ───────────────────────────────────────────────────────────────
async function loadUsers() {
  showTableLoading(true);
  hidePageMessage();
  try {
    const result = await API.getAllUsers();
    if (!result) return;
    if (!result.ok) {
      // BE trả 403 → hiển thị lỗi rõ ràng thay vì crash
      const msg = result.data?.mess || result.data?.error || "Không có quyền tải danh sách người dùng.";
      showPageMessage(msg, "error");
      return;
    }
    allUsers = result.data?.data || result.data || [];
    applyFilters();
  } catch (err) {
    showPageMessage("Lỗi kết nối máy chủ. Vui lòng thử lại.", "error");
    console.error(err);
  } finally {
    showTableLoading(false);
  }
}

// ─── FILTER & SEARCH ──────────────────────────────────────────────────────────
function applyFilters() {
  const q      = document.getElementById("searchInput").value.trim().toLowerCase();
  const role   = document.getElementById("filterRole").value;
  const status = document.getElementById("filterStatus").value;

  filteredUsers = allUsers.filter((u) => {
    const matchSearch = !q
      || (u.fullName  || "").toLowerCase().includes(q)
      || (u.username  || "").toLowerCase().includes(q)
      || (u.phone     || "").toLowerCase().includes(q);
    const matchRole   = !role   || u.role === role;
    const matchStatus = !status
      || (status === "active" && u.active)
      || (status === "locked" && !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  renderTable();
}

// ─── RENDER TABLE ─────────────────────────────────────────────────────────────
function renderTable() {
  const tbody  = document.getElementById("usersTableBody");
  const empty  = document.getElementById("tableEmpty");
  const total  = document.getElementById("totalLabel");

  total.textContent = `${filteredUsers.length} người dùng`;

  if (filteredUsers.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = filteredUsers.map((u, i) => buildRow(u, i + 1)).join("");
}

function buildRow(u, index) {
  const initials  = getInitials(u.fullName || u.username || "?");
  const isSelf    = u.id === currentUserId;
  const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—";

  // ── Cột Phân quyền: inline role selector (chỉ ADMIN thấy) ──
  const roleCell = buildRoleCell(u, isSelf);

  // ── Trạng thái ──
  const statusHtml = u.active
    ? `<span class="status-badge status-active"><i class="fa fa-circle" style="font-size:7px"></i> Hoạt động</span>`
    : `<span class="status-badge status-locked"><i class="fa fa-lock" style="font-size:10px"></i> Đã khóa</span>`;

  // ── Nút khóa/mở khóa (chỉ ADMIN, không khóa được bản thân) ──
  const lockBtn = buildLockBtn(u, isSelf);

  return `
    <tr data-id="${u.id}">
      <td>${index}</td>
      <td>
        <div class="user-cell">
          <div class="user-avatar">${initials}</div>
          <div>
            <div class="user-name">${escHtml(u.fullName || "—")}</div>
            <div class="user-username">@${escHtml(u.username || "")}</div>
          </div>
        </div>
      </td>
      <td>${escHtml(u.username || "—")}</td>
      <td>${escHtml(u.phone || "—")}</td>
      <td>${roleCell}</td>
      <td>${statusHtml}</td>
      <td>${createdAt}</td>
      <td>
        <div class="action-btns">
          ${lockBtn}
        </div>
      </td>
    </tr>`;
}

// ─── INLINE ROLE CELL ────────────────────────────────────────────────────────
function buildRoleCell(u, isSelf) {
  // Nếu không phải ADMIN (không nên vào được trang, nhưng phòng thủ) → chỉ hiện badge
  if (!isAdmin) {
    const cls = `role-badge role-${u.role || "NONE"}`;
    return `<span class="${cls}">${ROLE_LABELS[u.role] || u.role || "—"}</span>`;
  }

  // ADMIN: hiển thị inline dropdown + nút lưu
  const opts = ROLE_OPTIONS.map(o =>
    `<option value="${o.value}" ${u.role === o.value ? "selected" : ""}>${o.label}</option>`
  ).join("");

  const disabledAttr = isSelf ? "disabled title=\"Không thể thay đổi quyền của chính mình\"" : "";

  return `
    <div class="inline-role-wrap">
      <select class="inline-role-select role-select-${u.role || "NONE"}"
              id="roleSelect_${u.id}"
              onchange="onRoleSelectChange(this, ${u.id})"
              ${disabledAttr}>
        ${opts}
      </select>
      <button class="inline-role-save" id="roleSaveBtn_${u.id}"
              onclick="saveInlineRole(${u.id})"
              style="display:none;"
              title="Lưu phân quyền">
        <i class="fa fa-check"></i>
      </button>
    </div>`;
}

// Khi dropdown role thay đổi → hiện nút lưu
function onRoleSelectChange(selectEl, userId) {
  const saveBtn = document.getElementById(`roleSaveBtn_${userId}`);
  const original = allUsers.find(u => u.id === userId)?.role || "NONE";
  if (saveBtn) {
    saveBtn.style.display = selectEl.value !== original ? "inline-flex" : "none";
  }
  // Cập nhật màu class của select để phản ánh role mới
  selectEl.className = `inline-role-select role-select-${selectEl.value}`;
}

// Lưu role ngay trên dòng
async function saveInlineRole(userId) {
  const selectEl = document.getElementById(`roleSelect_${userId}`);
  const saveBtn  = document.getElementById(`roleSaveBtn_${userId}`);
  if (!selectEl) return;

  const newRole = selectEl.value;
  const user    = allUsers.find(u => u.id === userId);
  if (!user) return;

  // Disable UI trong khi gọi API
  selectEl.disabled = true;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>'; }

  try {
    const result = await API.changeUserRole(userId, newRole);

    if (result && result.ok) {
      // Cập nhật state local
      user.role = newRole;
      showPageMessage(
        `Đã cập nhật vai trò của "${user.fullName || user.username}" thành ${ROLE_LABELS[newRole]}.`,
        "success"
      );
      // Re-render dòng đó để đồng bộ UI
      rerenderRow(user);
    } else {
      // BE từ chối (403 / lỗi) → rollback select về giá trị cũ
      const errMsg = result?.data?.mess || result?.data?.error || "Không có quyền thay đổi vai trò.";
      showPageMessage(errMsg, "error");
      selectEl.value     = user.role;
      selectEl.className = `inline-role-select role-select-${user.role}`;
      if (saveBtn) saveBtn.style.display = "none";
    }
  } catch (err) {
    showPageMessage("Lỗi kết nối máy chủ.", "error");
    selectEl.value = user.role;
    if (saveBtn) saveBtn.style.display = "none";
    console.error(err);
  } finally {
    selectEl.disabled = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fa fa-check"></i>'; }
  }
}

// Re-render một dòng sau khi cập nhật
function rerenderRow(user) {
  const tr = document.querySelector(`tr[data-id="${user.id}"]`);
  if (!tr) return;
  const isSelf = user.id === currentUserId;
  tr.querySelector("td:nth-child(5)").innerHTML = buildRoleCell(user, isSelf);
}

// ─── LOCK BUTTON ──────────────────────────────────────────────────────────────
function buildLockBtn(u, isSelf) {
  if (!isAdmin) return ""; // Không phải ADMIN → không có nút khóa

  console.log(`[buildLockBtn] User ${u.id} (${u.username}), isSelf=${isSelf}, currentUserId=${currentUserId}, role=${u.role}`);

  if (u.active) {
    return `<button class="action-btn action-btn-lock"
                    onclick="openLockConfirm(${u.id}, '${escHtml(u.fullName || u.username)}')"
                    ${isSelf ? "disabled title=\"Không thể khóa tài khoản của mình\"" : "title=\"Khóa tài khoản\""}
                    >
              <i class="fa fa-lock"></i>
            </button>`;
  } else {
    return `<button class="action-btn action-btn-unlock"
                    onclick="openUnlockConfirm(${u.id}, '${escHtml(u.fullName || u.username)}')"
                    title="Mở khóa tài khoản">
              <i class="fa fa-lock-open"></i>
            </button>`;
  }
}

// ─── CREATE MODAL ─────────────────────────────────────────────────────────────
function openCreateModal() {
  editingUserId = null;
  document.getElementById("modalTitle").innerHTML = '<i class="fa fa-user-plus"></i> Tạo tài khoản mới';
  document.getElementById("saveUserBtnText").textContent = "Tạo tài khoản";
  document.getElementById("inputUsername").disabled = false;
  document.getElementById("passwordRequired").style.display = "inline";
  document.getElementById("passwordOptionalHint").style.display = "none";
  document.getElementById("roleGroupCreate").style.display = "flex"; // hiện role khi tạo mới

  clearModalForm();
  hideModalMessage();
  openModal("userModal");
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function openEditModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  editingUserId = userId;
  document.getElementById("modalTitle").innerHTML = '<i class="fa fa-user-edit"></i> Sửa thông tin';
  document.getElementById("saveUserBtnText").textContent = "Lưu thay đổi";
  document.getElementById("inputUsername").disabled = true;
  document.getElementById("passwordRequired").style.display = "none";
  document.getElementById("passwordOptionalHint").style.display = "inline";
  document.getElementById("roleGroupCreate").style.display = "none"; // ẩn role khi sửa (dùng inline)

  document.getElementById("inputFullName").value = user.fullName || "";
  document.getElementById("inputUsername").value = user.username || "";
  document.getElementById("inputPhone").value    = user.phone    || "";
  document.getElementById("inputPassword").value = "";

  hideModalMessage();
  openModal("userModal");
}

// ─── SAVE USER (Tạo hoặc cập nhật thông tin cơ bản) ─────────────────────────
async function saveUser() {
  hideModalMessage();

  const fullName = document.getElementById("inputFullName").value.trim();
  const username = document.getElementById("inputUsername").value.trim();
  const phone    = document.getElementById("inputPhone").value.trim();
  const role     = document.getElementById("inputRole").value;   // chỉ dùng khi tạo mới
  const password = document.getElementById("inputPassword").value;

  if (!fullName) { showModalMessage("Vui lòng nhập họ và tên.", "error"); return; }
  if (!editingUserId && !username) { showModalMessage("Vui lòng nhập tên đăng nhập.", "error"); return; }
  if (!editingUserId && !password) { showModalMessage("Vui lòng nhập mật khẩu.", "error"); return; }
  if (password && password.length < 6) { showModalMessage("Mật khẩu phải có ít nhất 6 ký tự.", "error"); return; }

  const btn = document.getElementById("saveUserBtn");
  btn.disabled = true;
  const origText = document.getElementById("saveUserBtnText").textContent;
  document.getElementById("saveUserBtnText").textContent = "Đang xử lý...";

  try {
    // Backend chỉ hỗ trợ tạo user mới qua /auth/register, không có endpoint tạo/sửa user cho admin
    // Chức năng này cần backend bổ sung thêm endpoints
    if (editingUserId) {
      showModalMessage("Chức năng cập nhật người dùng chưa được hỗ trợ bởi backend.", "error");
      // TODO: Khi backend thêm endpoint PUT /users/{id} thì bỏ comment
      // const userData = { fullName, phone: phone || null, password: password || null };
      // result = await API.updateUser(editingUserId, userData);
    } else {
      showModalMessage("Chức năng tạo người dùng bởi admin chưa được hỗ trợ. Vui lòng dùng chức năng đăng ký.", "error");
      // TODO: Backend cần thêm POST /users/ để admin tạo user với role
      // Hiện tại chỉ có /auth/register tạo user với role mặc định
    }
  } catch (err) {
    showModalMessage("Lỗi kết nối máy chủ.", "error");
    console.error(err);
  } finally {
    btn.disabled = false;
    document.getElementById("saveUserBtnText").textContent = origText;
  }
}

// ─── LOCK / UNLOCK ────────────────────────────────────────────────────────────
function openLockConfirm(userId, userName) {
  document.getElementById("confirmTitle").innerHTML =
    '<i class="fa fa-lock" style="color:#e53935"></i> Khóa tài khoản';
  document.getElementById("confirmMessage").textContent =
    `Khóa tài khoản "${userName}"? Người dùng sẽ không thể đăng nhập.`;
  document.getElementById("confirmBtnText").textContent = "Khóa tài khoản";
  document.getElementById("confirmActionBtn").className = "btn-danger";

  confirmCallback = async () => {
    try {
      const result = await API.lockUser(userId);
      if (result && result.ok) {
        showPageMessage(`Đã khóa tài khoản "${userName}".`, "success");
        await loadUsers();
      } else {
        // BE từ chối (403 nếu không phải ADMIN hoặc tự khóa mình)
        showPageMessage(result?.data?.mess || result?.data?.error || "Không thể khóa tài khoản.", "error");
      }
    } catch (err) {
      showPageMessage("Lỗi kết nối máy chủ.", "error");
    }
  };
  openModal("confirmModal");
}

function openUnlockConfirm(userId, userName) {
  document.getElementById("confirmTitle").innerHTML =
    '<i class="fa fa-lock-open" style="color:#2e7d32"></i> Mở khóa tài khoản';
  document.getElementById("confirmMessage").textContent =
    `Mở khóa tài khoản "${userName}"?`;
  document.getElementById("confirmBtnText").textContent = "Mở khóa";
  document.getElementById("confirmActionBtn").className = "btn-primary";

  confirmCallback = async () => {
    try {
      const result = await API.unlockUser(userId);
      if (result && result.ok) {
        showPageMessage(`Đã mở khóa tài khoản "${userName}".`, "success");
        await loadUsers();
      } else {
        showPageMessage(result?.data?.mess || result?.data?.error || "Không thể mở khóa.", "error");
      }
    } catch (err) {
      showPageMessage("Lỗi kết nối máy chủ.", "error");
    }
  };
  openModal("confirmModal");
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}
function closeUserModal()    { closeModal("userModal"); }
function closeConfirmModal() { closeModal("confirmModal"); confirmCallback = null; }

function clearModalForm() {
  ["inputFullName","inputUsername","inputPhone","inputPassword"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const roleEl = document.getElementById("inputRole");
  if (roleEl) roleEl.value = "NONE";
  const passInput = document.getElementById("inputPassword");
  if (passInput) passInput.type = "password";
  const icon = document.getElementById("toggleModalPassword");
  if (icon) { icon.classList.remove("fa-eye"); icon.classList.add("fa-eye-slash"); }
}

function toggleModalPass() {
  const input = document.getElementById("inputPassword");
  const icon  = document.getElementById("toggleModalPassword");
  const hide  = input.type === "password";
  input.type = hide ? "text" : "password";
  icon.classList.toggle("fa-eye-slash", !hide);
  icon.classList.toggle("fa-eye",        hide);
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
function showPageMessage(text, type) {
  const el = document.getElementById("pageMessage");
  el.textContent = text;
  el.className = `message-box ${type}`;
  clearTimeout(showPageMessage._t);
  showPageMessage._t = setTimeout(() => hidePageMessage(), 5000);
}
function hidePageMessage() {
  const el = document.getElementById("pageMessage");
  el.className = "message-box"; el.textContent = "";
}
function showModalMessage(text, type) {
  const el = document.getElementById("modalMessage");
  el.textContent = text; el.className = `message-box ${type}`;
}
function hideModalMessage() {
  const el = document.getElementById("modalMessage");
  el.className = "message-box"; el.textContent = "";
}

// ─── TABLE STATE ──────────────────────────────────────────────────────────────
function showTableLoading(show) {
  document.getElementById("tableLoading").style.display = show ? "flex" : "none";
  document.getElementById("usersTableBody").style.display = show ? "none" : "";
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(-2)
    .map(w => w[0]).join("").toUpperCase().substring(0, 2);
}
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
