/**
 * guests.js - Logic trang Quản lý Khách hàng
 * Phụ thuộc vào: js/constants/config.js, js/utils/auth.js, js/api/api.js
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");

  // Kiểm tra đăng nhập
  if (!Auth.isLoggedIn()) {
    window.location.href = "../auth/login.html";
    return;
  }

  // Hiển thị ngày tháng
  renderDate();

  // Hiển thị user sidebar
  let userInfo = Auth.getUserInfo();
  if (!userInfo || !userInfo.id || !userInfo.role) {
    userInfo = await fetchUserProfile();
  }
  renderUserInfo(userInfo);

  // Đăng xuất
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "../auth/logout.html";
  });

  // Tải danh sách khách hàng ban đầu
  loadGuestList();

  // Gắn sự kiện các chức năng
  setupEventListeners();
});

// ─── LẤY VÀ HIỂN THỊ DANH SÁCH KHÁCH HÀNG ─────────────────────────────────────
async function loadGuestList() {
  const tbody = document.getElementById("guestTableBody");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>`;

  try {
    // Gọi API lấy toàn bộ danh sách khách hàng
    const res = await API.getAllGuests();
    if (res && res.ok && res.data) {
      const guests = res.data.data || res.data || [];
      renderGuestTable(guests);
    } else {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">Không thể lấy danh sách khách hàng.</td></tr>`;
    }
  } catch (err) {
    console.error("Lỗi khi tải danh sách khách hàng:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Đã có lỗi xảy ra.</td></tr>`;
  }
}

function renderGuestTable(guests) {
  const tbody = document.getElementById("guestTableBody");
  if (!guests || guests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Không có dữ liệu khách hàng.</td></tr>`;
    return;
  }

  tbody.innerHTML = guests
    .map(
      (guest) => `
    <tr>
      <td>${guest.id || ""}</td>
      <td><strong>${guest.fullName || ""}</strong></td>
      <td>${guest.phone || "—"}</td>
      <td>${guest.idNumber || "—"}</td>
      <td>${guest.email || "—"}</td>
      <td><span class="badge-loyalty">${guest.loyaltyPoints ?? 0} pt</span></td>
      <td>${guest.note || "—"}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action-icon btn-edit" title="Sửa" onclick="openEditModal(${guest.id})">
            <i class="fa fa-edit"></i>
          </button>
          <button class="btn-action-icon btn-delete" title="Xóa" onclick="deleteGuest(${guest.id})">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ─── TÌM KIẾM ─────────────────────────────────────────────────────────────────
function setupEventListeners() {
  // Tìm kiếm theo Tên (Search by name - contains ignore case)
  const searchNameInput = document.getElementById("searchNameInput");
  let debounceTimeout;
  searchNameInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();
    debounceTimeout = setTimeout(async () => {
      if (!query) {
        loadGuestList();
        return;
      }
      try {
        const res = await API.searchGuestsByName(query);
        if (res && res.ok) {
          renderGuestTable(res.data?.data || res.data || []);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm tên:", err);
      }
    }, 300);
  });

  // Tìm nhanh theo SĐT (dành cho Lễ tân check-in)
  document
    .getElementById("btnQuickPhoneSearch")
    .addEventListener("click", async () => {
      const phone = document.getElementById("searchPhoneInput").value.trim();
      if (!phone) {
        loadGuestList();
        return;
      }
      try {
        const res = await API.getGuestByPhone(phone);
        if (res && res.ok && res.data) {
          const guest = res.data.data || res.data;
          renderGuestTable(guest ? [guest] : []);
        } else {
          alert("Không tìm thấy khách hàng với số điện thoại này!");
        }
      } catch (err) {
        alert("Không tìm thấy khách hàng với số điện thoại: " + phone);
      }
    });

  // Modal handlers
  const modal = document.getElementById("guestModal");
  document
    .getElementById("btnOpenCreateModal")
    .addEventListener("click", () => {
      resetModalForm();
      document.getElementById("modalTitle").textContent = "Thêm mới khách hàng";
      modal.classList.add("active");
    });

  document
    .getElementById("btnCloseModal")
    .addEventListener("click", closeModal);
  document
    .getElementById("btnCancelModal")
    .addEventListener("click", closeModal);

  // Submit Form (Tạo mới hoặc Cập nhật)
  document.getElementById("guestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const guestId = document.getElementById("guestId").value;
    const requestData = {
      fullName: document.getElementById("fullName").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      idNumber: document.getElementById("idNumber").value.trim(),
      email: document.getElementById("email").value.trim(),
      note: document.getElementById("note").value.trim(),
    };

    try {
      let res;
      if (guestId) {
        // Cập nhật khách hàng
        res = await API.updateGuest(guestId, requestData);
      } else {
        // Tạo mới khách hàng
        res = await API.createGuest(requestData);
      }

      if (res && res.ok) {
        alert(
          guestId
            ? "Cập nhật khách hàng thành công!"
            : "Tạo khách hàng thành công!",
        );
        closeModal();
        loadGuestList();
      } else {
        alert(res?.message || "Có lỗi xảy ra, vui lòng kiểm tra lại.");
      }
    } catch (err) {
      console.error("Lỗi khi lưu dữ liệu:", err);
      alert("Lưu thông tin thất bại!");
    }
  });
}

// ─── MỞ MODAL SỬA KHÁCH HÀNG ───────────────────────────────────────────────────
window.openEditModal = async function (id) {
  try {
    const res = await API.getGuestById(id);
    if (res && res.ok && res.data) {
      const guest = res.data.data || res.data;
      document.getElementById("guestId").value = guest.id;
      document.getElementById("fullName").value = guest.fullName || "";
      document.getElementById("phone").value = guest.phone || "";
      document.getElementById("idNumber").value = guest.idNumber || "";
      document.getElementById("email").value = guest.email || "";
      document.getElementById("note").value = guest.note || "";

      document.getElementById("modalTitle").textContent =
        "Cập nhật thông tin khách hàng";
      document.getElementById("guestModal").classList.add("active");
    }
  } catch (err) {
    alert("Không thể lấy thông tin chi tiết khách hàng!");
  }
};

// ─── XÓA KHÁCH HÀNG ────────────────────────────────────────────────────────────
window.deleteGuest = async function (id) {
  if (!confirm("Bạn có chắc chắn muốn xóa khách hàng này không?")) return;

  try {
    const res = await API.deleteGuest(id);
    if (res && res.ok) {
      alert("Xóa khách hàng thành công!");
      loadGuestList();
    } else {
      alert("Không thể xóa khách hàng!");
    }
  } catch (err) {
    console.error("Lỗi khi xóa khách hàng:", err);
    alert("Xóa thất bại!");
  }
};

// ─── THỦ TỤC CHUNG (Đồng bộ dashboard) ─────────────────────────────────────────
function closeModal() {
  document.getElementById("guestModal").classList.remove("active");
}

function resetModalForm() {
  document.getElementById("guestId").value = "";
  document.getElementById("guestForm").reset();
}

function renderDate() {
  const el = document.getElementById("headerDate");
  if (!el) return;
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  el.textContent = now.toLocaleDateString("vi-VN", options);
}

function renderUserInfo(userInfo) {
  const sidebarUsername = document.getElementById("sidebarUsername");
  const roleBadge = document.getElementById("sidebarRoleBadge");
  const navUsersMenuItem = document.getElementById("navUsersMenuItem");

  if (!userInfo) return;

  const displayName = Auth.getDisplayName(userInfo);
  sidebarUsername.textContent = displayName;

  if (roleBadge && userInfo.role && userInfo.role !== "NONE") {
    roleBadge.textContent = ROLE_LABELS[userInfo.role] || userInfo.role;
    roleBadge.style.display = "inline-block";
  }

  if (userInfo.role === "ADMIN" && navUsersMenuItem) {
    navUsersMenuItem.style.display = "block";
  }
}

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

const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  OWNER: "Chủ nhà trọ",
  RECEPTIONIST: "Lễ tân",
  HOUSEKEEPER: "Nhân viên phòng",
  ACCOUNTANT: "Kế toán",
  NONE: "Chưa phân quyền",
};
