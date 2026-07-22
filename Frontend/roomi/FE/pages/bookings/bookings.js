/**
 * bookings.js - Quản lý đặt phòng (Đã sửa full 100%)
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. STATE & DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════

let bookings = [];
let roomTypes = [];
let currentEditId = null;

// DOM elements
const bookingsTableBody = document.getElementById("bookingsTableBody");
const tableEmpty = document.getElementById("tableEmpty");
const tableLoading = document.getElementById("tableLoading");
const totalLabel = document.getElementById("totalLabel");
const pageMessage = document.getElementById("pageMessage");

// Search elements
const searchGuestName = document.getElementById("searchGuestName");
const searchPhone = document.getElementById("searchPhone");
const searchIdNumber = document.getElementById("searchIdNumber");
const searchRoomType = document.getElementById("searchRoomType");
const searchFromDate = document.getElementById("searchFromDate");
const searchToDate = document.getElementById("searchToDate");

// Modal elements
const bookingModal = document.getElementById("bookingModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const inputFullName = document.getElementById("inputFullName");
const inputPhone = document.getElementById("inputPhone");
const inputIdNumber = document.getElementById("inputIdNumber");
const inputEmail = document.getElementById("inputEmail");
const inputRoomType = document.getElementById("inputRoomType");
const inputCheckInDate = document.getElementById("inputCheckInDate");
const inputCheckOutDate = document.getElementById("inputCheckOutDate");
const inputSource = document.getElementById("inputSource");
const inputNote = document.getElementById("inputNote");
const pricePreview = document.getElementById("pricePreview");
const priceAmount = document.getElementById("priceAmount");
const nightCount = document.getElementById("nightCount");

// Confirm modal
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
let deleteTargetId = null;

// ═══════════════════════════════════════════════════════════════════════
// 2. INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");

  if (!Auth.isLoggedIn()) {
    Auth.redirectToLogin();
    return;
  }

  renderSidebar();
  attachEventListeners();
  await loadRoomTypes();

  // Set default dates
  setDefaultDates();

  console.log("[Bookings] Page loaded. Click 'Tìm kiếm' to load data.");
});

// ═══════════════════════════════════════════════════════════════════════
// 3. SIDEBAR
// ═══════════════════════════════════════════════════════════════════════

function renderSidebar() {
  const userInfo = Auth.getUserInfo();
  if (!userInfo) return;

  const sidebarUsername = document.getElementById("sidebarUsername");
  const sidebarRoleBadge = document.getElementById("sidebarRoleBadge");

  if (sidebarUsername) {
    sidebarUsername.textContent = Auth.getDisplayName(userInfo);
  }

  if (sidebarRoleBadge) {
    const roleLabels = {
      ADMIN: "Quản trị viên",
      OWNER: "Chủ nhà trọ",
      RECEPTIONIST: "Lễ tân",
      HOUSEKEEPER: "Nhân viên phòng",
      ACCOUNTANT: "Kế toán",
      NONE: "Chưa phân quyền",
    };
    sidebarRoleBadge.textContent = roleLabels[userInfo.role] || userInfo.role;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 4. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════

function attachEventListeners() {
  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await API.logout();
    Auth.clearAuth();
    window.location.href = "../auth/login.html";
  });

  // Open create modal
  document
    .getElementById("openCreateModalBtn")
    ?.addEventListener("click", () => {
      openCreateModal();
    });

  // Close modals
  document
    .getElementById("closeModalBtn")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("cancelModalBtn")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("closeConfirmBtn")
    ?.addEventListener("click", closeConfirmModal);
  document
    .getElementById("cancelConfirmBtn")
    ?.addEventListener("click", closeConfirmModal);

  // Save booking
  document
    .getElementById("saveBookingBtn")
    ?.addEventListener("click", saveBooking);

  // Confirm delete
  document
    .getElementById("confirmActionBtn")
    ?.addEventListener("click", confirmDelete);

  // Search
  document
    .getElementById("searchBtn")
    ?.addEventListener("click", performSearch);
  document
    .getElementById("clearSearchBtn")
    ?.addEventListener("click", clearSearch);

  // Refresh
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    clearSearch();
  });

  // Price calculation triggers
  inputRoomType?.addEventListener("change", calculatePrice);
  inputCheckInDate?.addEventListener("change", calculatePrice);
  inputCheckOutDate?.addEventListener("change", calculatePrice);

  // Close modal on overlay click
  bookingModal?.addEventListener("click", (e) => {
    if (e.target === bookingModal) closeModal();
  });
  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });

  // Phone number validation
  inputPhone?.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9+]/g, "");
  });

  // ID number validation
  inputIdNumber?.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 5. LOAD DATA
// ═══════════════════════════════════════════════════════════════════════

async function loadRoomTypes() {
  try {
    const response = await API.getAllRoomTypes();
    if (response?.ok && response.data?.data) {
      roomTypes = response.data.data;
      populateRoomTypeSelects();
    }
  } catch (error) {
    console.error("Error loading room types:", error);
  }
}

function populateRoomTypeSelects() {
  // Populate modal select
  inputRoomType.innerHTML = '<option value="">-- Chọn loại phòng --</option>';
  roomTypes.forEach((rt) => {
    const option = document.createElement("option");
    option.value = rt.id;
    option.textContent = `${rt.name} (${formatCurrency(rt.basePrice)})`;
    inputRoomType.appendChild(option);
  });

  // Populate search select
  searchRoomType.innerHTML = '<option value="">Tất cả</option>';
  roomTypes.forEach((rt) => {
    const option = document.createElement("option");
    option.value = rt.id;
    option.textContent = rt.name;
    searchRoomType.appendChild(option);
  });
}

async function performSearch() {
  tableLoading.style.display = "flex";
  tableEmpty.style.display = "none";
  bookingsTableBody.innerHTML = "";

  const params = {
    guestName: searchGuestName.value.trim() || undefined,
    phone: searchPhone.value.trim() || undefined,
    idNumber: searchIdNumber.value.trim() || undefined,
    roomTypeId: searchRoomType.value || undefined,
    fromDate: searchFromDate.value || undefined,
    toDate: searchToDate.value || undefined,
  };

  // Loại bỏ các params undefined để không gửi lên server
  Object.keys(params).forEach(
    (key) => params[key] === undefined && delete params[key],
  );

  console.log("[Bookings] Searching with params:", params);

  try {
    const response = await API.searchBookings(params);
    console.log("[Bookings] Search response:", response);

    if (response?.ok && response.data?.data) {
      bookings = response.data.data;
      console.log("[Bookings] Found bookings:", bookings.length);
      renderBookings();
    } else {
      const errorMsg =
        response?.data?.mess || response?.data?.error || "Không thể tìm kiếm";
      showMessage(pageMessage, errorMsg, "error");
      console.error("[Bookings] Search failed:", response);
      bookings = [];
      renderBookings();
    }
  } catch (error) {
    console.error("[Bookings] Error searching bookings:", error);
    showMessage(
      pageMessage,
      "Lỗi kết nối backend. Vui lòng kiểm tra backend có đang chạy không.",
      "error",
    );
    bookings = [];
    renderBookings();
  } finally {
    tableLoading.style.display = "none";
  }
}

function clearSearch() {
  searchGuestName.value = "";
  searchPhone.value = "";
  searchIdNumber.value = "";
  searchRoomType.value = "";
  searchFromDate.value = "";
  searchToDate.value = "";
  bookings = [];
  renderBookings();
  clearMessage(pageMessage);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. RENDER
// ═══════════════════════════════════════════════════════════════════════

function renderBookings() {
  bookingsTableBody.innerHTML = "";

  if (bookings.length === 0) {
    tableEmpty.style.display = "flex";
    totalLabel.textContent = "0 đơn đặt phòng";
    return;
  }

  tableEmpty.style.display = "none";
  totalLabel.textContent = `${bookings.length} đơn đặt phòng`;

  bookings.forEach((booking, index) => {
    const guestName =
      booking.guestFullName || booking.guestName || "Khách vô danh";
    const guestPhone = booking.guestPhone || "N/A";
    const guestIdNumber = booking.guestIdNumber || "N/A";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <strong>${guestName}</strong><br>
        <small style="color: #666;">
          <i class="fa fa-phone"></i> ${guestPhone}<br>
          <i class="fa fa-id-card"></i> ${guestIdNumber}
        </small>
      </td>
      <td>${booking.roomTypeName || "N/A"}</td>
      <td>
        <div class="date-info">
          <div><span class="date-label">Nhận:</span> ${formatDate(booking.checkInDate)}</div>
          <div><span class="date-label">Trả:</span> ${formatDate(booking.checkOutDate)}</div>
        </div>
      </td>
      <td>
        <strong>${formatCurrency(booking.expectedPrice)}</strong>
      </td>
      <td>
        <span class="booking-status status-${booking.status}">
          ${getStatusText(booking.status)}
        </span>
      </td>
      <td>
        <button class="btn-icon btn-edit" data-id="${booking.id}" title="Chỉnh sửa">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn-icon btn-delete" data-id="${booking.id}" title="Xóa">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;
    bookingsTableBody.appendChild(row);
  });

  // Attach action buttons
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () =>
      openEditModal(parseInt(btn.dataset.id)),
    );
  });
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () =>
      openDeleteConfirm(parseInt(btn.dataset.id)),
    );
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 7. MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function openCreateModal() {
  currentEditId = null;
  modalTitle.innerHTML = '<i class="fa fa-plus"></i> Tạo đặt phòng mới';
  document.getElementById("saveBookingBtnText").textContent = "Tạo đặt phòng";
  clearForm();
  setDefaultDates();
  clearMessage(modalMessage);
  pricePreview.classList.remove("show");
  bookingModal.classList.add("show");
}

function openEditModal(id) {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return;

  currentEditId = id;
  modalTitle.innerHTML = '<i class="fa fa-edit"></i> Chỉnh sửa đặt phòng';
  document.getElementById("saveBookingBtnText").textContent = "Cập nhật";

  inputFullName.value = booking.guestFullName || booking.guestName || "";
  inputPhone.value = booking.guestPhone || "";
  inputIdNumber.value = booking.guestIdNumber || "";
  inputEmail.value = booking.guestEmail || "";
  inputRoomType.value = booking.roomTypeId || "";
  inputCheckInDate.value = booking.checkInDate || "";
  inputCheckOutDate.value = booking.checkOutDate || "";
  inputSource.value = booking.source || "WALK_IN";
  inputNote.value = booking.note || "";

  clearMessage(modalMessage);
  calculatePrice();
  bookingModal.classList.add("show");
}

function closeModal() {
  bookingModal.classList.remove("show");
  clearForm();
}

function clearForm() {
  inputFullName.value = "";
  inputPhone.value = "";
  inputIdNumber.value = "";
  inputEmail.value = "";
  inputRoomType.value = "";
  inputCheckInDate.value = "";
  inputCheckOutDate.value = "";
  inputSource.value = "WALK_IN";
  inputNote.value = "";
  pricePreview.classList.remove("show");
}

function setDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (!inputCheckInDate.value) {
    inputCheckInDate.value = formatDateForInput(today);
  }
  if (!inputCheckOutDate.value) {
    inputCheckOutDate.value = formatDateForInput(tomorrow);
  }
}

function openDeleteConfirm(id) {
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return;

  deleteTargetId = id;
  const guestName =
    booking.guestFullName || booking.guestName || "khách hàng này";
  confirmMessage.textContent = `Bạn có chắc chắn muốn xóa đơn đặt phòng của "${guestName}"?`;
  confirmModal.classList.add("show");
}

function closeConfirmModal() {
  confirmModal.classList.remove("show");
  deleteTargetId = null;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. PRICE CALCULATION
// ═══════════════════════════════════════════════════════════════════════

async function calculatePrice() {
  const roomTypeId = inputRoomType.value;
  const checkIn = inputCheckInDate.value;
  const checkOut = inputCheckOutDate.value;

  if (!roomTypeId || !checkIn || !checkOut) {
    pricePreview.classList.remove("show");
    return;
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate >= checkOutDate) {
    pricePreview.classList.remove("show");
    return;
  }

  // Calculate number of nights
  const nights = Math.ceil(
    (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
  );
  nightCount.textContent = nights;

  // Get base price from room type
  const roomType = roomTypes.find((rt) => rt.id === parseInt(roomTypeId));
  if (!roomType) {
    pricePreview.classList.remove("show");
    return;
  }

  const totalPrice = roomType.basePrice * nights;
  priceAmount.textContent = formatCurrency(totalPrice);
  pricePreview.classList.add("show");
}

// ═══════════════════════════════════════════════════════════════════════
// 9. CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

async function saveBooking() {
  clearMessage(modalMessage);

  // Validation
  const fullName = inputFullName.value.trim();
  const phone = inputPhone.value.trim();
  const idNumber = inputIdNumber.value.trim();
  const email = inputEmail.value.trim();
  const roomTypeId = inputRoomType.value;
  const checkInDate = inputCheckInDate.value;
  const checkOutDate = inputCheckOutDate.value;
  const source = inputSource.value;
  const note = inputNote.value.trim();

  if (!fullName) {
    showMessage(modalMessage, "Vui lòng nhập họ tên khách hàng", "error");
    inputFullName.focus();
    return;
  }

  if (!phone) {
    showMessage(modalMessage, "Vui lòng nhập số điện thoại", "error");
    inputPhone.focus();
    return;
  }

  if (phone.length < 10) {
    showMessage(modalMessage, "Số điện thoại không hợp lệ", "error");
    inputPhone.focus();
    return;
  }

  if (!idNumber) {
    showMessage(modalMessage, "Vui lòng nhập CMND/CCCD", "error");
    inputIdNumber.focus();
    return;
  }

  if (idNumber.length < 9) {
    showMessage(modalMessage, "Số CMND/CCCD không hợp lệ", "error");
    inputIdNumber.focus();
    return;
  }

  if (email && !isValidEmail(email)) {
    showMessage(modalMessage, "Email không hợp lệ", "error");
    inputEmail.focus();
    return;
  }

  if (!roomTypeId) {
    showMessage(modalMessage, "Vui lòng chọn loại phòng", "error");
    return;
  }

  if (!checkInDate) {
    showMessage(modalMessage, "Vui lòng chọn ngày nhận phòng", "error");
    return;
  }

  if (!checkOutDate) {
    showMessage(modalMessage, "Vui lòng chọn ngày trả phòng", "error");
    return;
  }

  if (checkInDate >= checkOutDate) {
    showMessage(
      modalMessage,
      "Ngày trả phòng phải sau ngày nhận phòng",
      "error",
    );
    return;
  }

  const todayStr = formatDateForInput(new Date());
  if (checkInDate < todayStr && !currentEditId) {
    showMessage(modalMessage, "Ngày nhận phòng không thể là quá khứ", "error");
    return;
  }

  const data = {
    roomTypeId: parseInt(roomTypeId),
    fullName,
    phone,
    idNumber,
    email: email || null,
    checkInDate,
    checkOutDate,
    source: source || "WALK_IN",
    note: note || null,
  };

  console.log(
    "[Bookings] Creating/Updating booking:",
    currentEditId ? "Edit" : "Create",
    data,
  );

  const saveBtn = document.getElementById("saveBookingBtn");
  const saveBtnText = document.getElementById("saveBookingBtnText");
  const originalText = saveBtnText.textContent;
  saveBtn.disabled = true;
  saveBtnText.textContent = "Đang xử lý...";

  try {
    let response;
    if (currentEditId) {
      response = await API.updateBooking(currentEditId, data);
    } else {
      response = await API.createBooking(data);
    }

    console.log("[Bookings] API Response:", response);

    if (response?.ok) {
      const message = response.data?.mess || "Lưu thành công";
      showMessage(pageMessage, message, "success");
      closeModal();
      await performSearch();
    } else {
      let errorMsg = "Có lỗi xảy ra";
      if (response?.data?.mess) {
        errorMsg = response.data.mess;
      } else if (response?.data?.error) {
        errorMsg = response.data.error;
      } else if (response?.data?.message) {
        errorMsg = response.data.message;
      } else if (response?.status === 500) {
        errorMsg = "Lỗi server (500). Vui lòng kiểm tra backend logs.";
      } else if (response?.status === 403) {
        errorMsg = "Bạn không có quyền thực hiện thao tác này.";
      } else if (response?.status === 400) {
        errorMsg = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại form.";
      }

      showMessage(modalMessage, errorMsg, "error");
    }
  } catch (error) {
    console.error("[Bookings] Error saving booking:", error);
    showMessage(modalMessage, "Lỗi kết nối: " + error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtnText.textContent = originalText;
  }
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  try {
    const response = await API.deleteBooking(deleteTargetId);
    if (response?.ok) {
      showMessage(
        pageMessage,
        response.data?.mess || "Xóa thành công",
        "success",
      );
      closeConfirmModal();
      await performSearch();
    } else {
      showMessage(
        pageMessage,
        response?.data?.mess || "Không thể xóa",
        "error",
      );
      closeConfirmModal();
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    showMessage(pageMessage, "Lỗi khi xóa dữ liệu", "error");
    closeConfirmModal();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 10. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function formatCurrency(amount) {
  if (!amount) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatusText(status) {
  const statusMap = {
    NEW: "Mới tạo",
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    CHECKED_IN: "Đã nhận phòng",
    CHECKED_OUT: "Đã trả phòng",
    CANCELLED: "Đã hủy",
    NO_SHOW: "Vắng mặt",
  };
  return statusMap[status] || status;
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showMessage(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.className = `message-box ${type}`;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.style.display = "none";
}
