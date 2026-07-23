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

  // Tải danh sách khách hàng ban đầu
  loadGuestList();

  // Gắn sự kiện các chức năng
  setupEventListeners();
});

// ─── LẤY VÀ HIỂN THỊ DANH SÁCH KHÁCH HÀNG ─────────────────────────────────────
async function loadGuestList() {
  const tbody = document.getElementById("guestTableBody");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>`;

  console.log("[Guests] Loading guest list...");
  try {
    // Gọi API lấy toàn bộ danh sách khách hàng
    const res = await API.getAllGuests();
    console.log("[Guests] API getAllGuests Response:", res);

    if (res && res.ok && res.data) {
      const guests = res.data.data || res.data || [];
      console.log("[Guests] Loaded guests count:", guests.length);
      renderGuestTable(guests);
    } else {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">Không thể lấy danh sách khách hàng.</td></tr>`;
    }
  } catch (err) {
    console.error("[Guests] Error loading guest list:", err);
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
      (guest, index) => `
    <tr>
      <td><strong>#${index + 1}</strong></td>
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
          <button class="btn-action-icon btn-delete" title="Xóa" onclick="openDeleteConfirm(${guest.id}, '${(guest.fullName || '').replace(/'/g, "\\'")}')">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ─── TOAST NOTIFICATION HELPERS ─────────────────────────────────────────────
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : "fa-info-circle";
  toast.innerHTML = `<i class="fa ${icon}"></i> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

// ─── TÌM KIẾM & XỬ LÝ SỰ KIỆN ────────────────────────────────────────────────
let deleteTargetId = null;

function setupEventListeners() {
  // Tìm kiếm theo Tên
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
      console.log("[Guests] Searching by name:", query);
      try {
        const res = await API.searchGuestsByName(query);
        console.log("[Guests] Search name response:", res);
        if (res && res.ok) {
          renderGuestTable(res.data?.data || res.data || []);
        }
      } catch (err) {
        console.error("[Guests] Error searching by name:", err);
      }
    }, 300);
  });

  // Tìm nhanh theo SĐT
  document
    .getElementById("btnQuickPhoneSearch")
    .addEventListener("click", async () => {
      const phone = document.getElementById("searchPhoneInput").value.trim();
      if (!phone) {
        loadGuestList();
        return;
      }
      console.log("[Guests] Searching by phone:", phone);
      try {
        const res = await API.getGuestByPhone(phone);
        console.log("[Guests] Search phone response:", res);
        if (res && res.ok && res.data) {
          const guest = res.data.data || res.data;
          renderGuestTable(guest ? [guest] : []);
        } else {
          showToast("Không tìm thấy khách hàng với số điện thoại này!", "error");
        }
      } catch (err) {
        showToast("Không tìm thấy khách hàng với số điện thoại: " + phone, "error");
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

  // Confirm delete modal handlers
  const confirmModal = document.getElementById("confirmModal");
  document
    .getElementById("btnCloseConfirmModal")
    ?.addEventListener("click", closeConfirmModal);
  document
    .getElementById("btnCancelConfirmModal")
    ?.addEventListener("click", closeConfirmModal);
  document
    .getElementById("btnDoDelete")
    ?.addEventListener("click", executeDeleteGuest);

  // Submit Form (Tạo mới hoặc Cập nhật)
  document.getElementById("guestForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const guestId = document.getElementById("guestId").value;
    const phoneVal = document.getElementById("phone").value.trim();
    const idNumberVal = document.getElementById("idNumber").value.trim();
    const emailVal = document.getElementById("email").value.trim();
    const noteVal = document.getElementById("note").value.trim();

    const requestData = {
      fullName: document.getElementById("fullName").value.trim(),
      phone: phoneVal || null,
      idNumber: idNumberVal || null,
      email: emailVal || null,
      note: noteVal || null,
    };

    console.log(
      "[Guests]",
      guestId ? `Updating guest ID: ${guestId}` : "Creating new guest:",
      requestData,
    );

    try {
      let res;
      if (guestId) {
        res = await API.updateGuest(guestId, requestData);
      } else {
        res = await API.createGuest(requestData);
      }

      console.log("[Guests] Save API Response:", res);

      if (res && res.ok) {
        showToast(
          guestId
            ? "Cập nhật thông tin khách hàng thành công!"
            : "Thêm mới khách hàng thành công!",
          "success",
        );
        closeModal();
        loadGuestList();
      } else {
        const errorMsg =
          res?.data?.mess ||
          res?.data?.message ||
          res?.data?.error ||
          "Có lỗi xảy ra, vui lòng kiểm tra lại.";
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error("[Guests] Error saving guest:", err);
      showToast("Lưu thông tin thất bại!", "error");
    }
  });
}

// ─── MỞ MODAL SỬA KHÁCH HÀNG ───────────────────────────────────────────────────
window.openEditModal = async function (id) {
  console.log("[Guests] Fetching details for guest ID:", id);
  try {
    const res = await API.getGuestById(id);
    console.log("[Guests] GetById API Response:", res);
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
    console.error("[Guests] Error getting guest by ID:", err);
    showToast("Không thể lấy thông tin chi tiết khách hàng!", "error");
  }
};

// ─── XÓA KHÁCH HÀNG ────────────────────────────────────────────────────────────
window.openDeleteConfirm = function (id, name) {
  deleteTargetId = id;
  const textEl = document.getElementById("confirmDeleteText");
  if (textEl) {
    textEl.textContent = `Bạn có chắc chắn muốn xóa khách hàng "${name || "này"}" không?`;
  }
  document.getElementById("confirmModal").classList.add("active");
};

function closeConfirmModal() {
  document.getElementById("confirmModal").classList.remove("active");
  deleteTargetId = null;
}

async function executeDeleteGuest() {
  if (!deleteTargetId) return;

  console.log("[Guests] Deleting guest ID:", deleteTargetId);
  try {
    const res = await API.deleteGuest(deleteTargetId);
    console.log("[Guests] Delete API Response:", res);
    if (res && res.ok) {
      showToast("Xóa khách hàng thành công!", "success");
      closeConfirmModal();
      loadGuestList();
    } else {
      showToast(res?.data?.mess || "Không thể xóa khách hàng!", "error");
      closeConfirmModal();
    }
  } catch (err) {
    console.error("[Guests] Error deleting guest:", err);
    showToast("Xóa thất bại!", "error");
    closeConfirmModal();
  }
}

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
