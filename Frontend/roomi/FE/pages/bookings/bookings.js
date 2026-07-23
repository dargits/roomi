/**
 * bookings.js - Quản lý đặt phòng (Đã sửa full 100%)
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. STATE & DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════

let bookings = [];
let roomTypes = [];
let currentEditId = null;
let currentDetailsId = null; // ID đặt phòng đang xem chi tiết
let allSurchargeServices = []; // Danh sách dịch vụ phụ thu

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

// Details modal elements
const bookingDetailsModal = document.getElementById("bookingDetailsModal");
const detailsModalMessage = document.getElementById("detailsModalMessage");
const detGuestName = document.getElementById("detGuestName");
const detGuestPhone = document.getElementById("detGuestPhone");
const detGuestId = document.getElementById("detGuestId");
const detGuestEmail = document.getElementById("detGuestEmail");
const detRoomType = document.getElementById("detRoomType");
const detRoomNumber = document.getElementById("detRoomNumber");
const detDates = document.getElementById("detDates");
const detNights = document.getElementById("detNights");
const detSource = document.getElementById("detSource");
const detNote = document.getElementById("detNote");
const detStatus = document.getElementById("detStatus");
const statusActionsBlock = document.getElementById("statusActionsBlock");
const surchargeTableBody = document.getElementById("surchargeTableBody");
const surchargeEmpty = document.getElementById("surchargeEmpty");
const sumRoomCharge = document.getElementById("sumRoomCharge");
const sumServiceCharge = document.getElementById("sumServiceCharge");
const sumDiscount = document.getElementById("sumDiscount");
const sumTotalAmount = document.getElementById("sumTotalAmount");

// Add service usage modal elements
const addServiceUsageModal = document.getElementById("addServiceUsageModal");
const serviceUsageModalMessage = document.getElementById("serviceUsageModalMessage");
const inputUsageServiceId = document.getElementById("inputUsageServiceId");
const inputUsageQuantity = document.getElementById("inputUsageQuantity");
const inputUsageNote = document.getElementById("inputUsageNote");

// Assign room modal elements
const assignRoomModal = document.getElementById("assignRoomModal");
const assignRoomModalMessage = document.getElementById("assignRoomModalMessage");
const inputAssignRoom = document.getElementById("inputAssignRoom");

// Invoice modal elements
const invoiceModal = document.getElementById("invoiceModal");
const invoiceReceiptArea = document.getElementById("invoiceReceiptArea");
const invId = document.getElementById("invId");
const invBookingId = document.getElementById("invBookingId");
const invGuestName = document.getElementById("invGuestName");
const invRoomNumber = document.getElementById("invRoomNumber");
const invRoomType = document.getElementById("invRoomType");
const invDates = document.getElementById("invDates");
const invNights = document.getElementById("invNights");
const invPrintDate = document.getElementById("invPrintDate");
const invoiceReceiptTableBody = document.getElementById("invoiceReceiptTableBody");
const invRoomCharge = document.getElementById("invRoomCharge");
const invServiceCharge = document.getElementById("invServiceCharge");
const invDiscount = document.getElementById("invDiscount");
const invTotalAmount = document.getElementById("invTotalAmount");
const printInvoiceBtn = document.getElementById("printInvoiceBtn");

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

  attachEventListeners();
  await loadRoomTypes();

  // Set default dates
  setDefaultDates();

  // Load all bookings automatically
  await loadAllBookings();
});

// ═══════════════════════════════════════════════════════════════════════
// 4. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════

function attachEventListeners() {
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

  // Details Modal Event Listeners
  document.getElementById("closeDetailsModalBtn")?.addEventListener("click", closeDetailsModal);
  document.getElementById("closeDetailsBottomBtn")?.addEventListener("click", closeDetailsModal);
  document.getElementById("openAddServiceBtn")?.addEventListener("click", openAddServiceUsageModal);
  document.getElementById("viewFullInvoiceBtn")?.addEventListener("click", () => viewFullInvoice(false));

  // Add Service Usage Modal
  document.getElementById("closeServiceUsageModalBtn")?.addEventListener("click", closeServiceUsageModal);
  document.getElementById("cancelServiceUsageModalBtn")?.addEventListener("click", closeServiceUsageModal);
  document.getElementById("saveServiceUsageBtn")?.addEventListener("click", saveServiceUsage);

  // Assign Room Modal
  document.getElementById("closeAssignRoomModalBtn")?.addEventListener("click", closeAssignRoomModal);
  document.getElementById("cancelAssignRoomModalBtn")?.addEventListener("click", closeAssignRoomModal);
  document.getElementById("saveAssignRoomBtn")?.addEventListener("click", saveAssignRoom);

  // Invoice Modal
  document.getElementById("closeInvoiceModalBtn")?.addEventListener("click", closeInvoiceModal);
  document.getElementById("closeInvoiceBottomBtn")?.addEventListener("click", closeInvoiceModal);
  printInvoiceBtn?.addEventListener("click", printInvoiceReceipt);

  // Overlay clicks for details, service, room, and invoice modals
  bookingDetailsModal?.addEventListener("click", (e) => {
    if (e.target === bookingDetailsModal) closeDetailsModal();
  });
  addServiceUsageModal?.addEventListener("click", (e) => {
    if (e.target === addServiceUsageModal) closeServiceUsageModal();
  });
  assignRoomModal?.addEventListener("click", (e) => {
    if (e.target === assignRoomModal) closeAssignRoomModal();
  });
  invoiceModal?.addEventListener("click", (e) => {
    if (e.target === invoiceModal) closeInvoiceModal();
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

async function loadAllBookings() {
  tableLoading.style.display = "flex";
  tableEmpty.style.display = "none";
  bookingsTableBody.innerHTML = "";

  try {
    const response = await API.getAllBookings();
    console.log("[Bookings] Load all response:", response);

    if (response?.ok && response.data?.data) {
      bookings = response.data.data;
      console.log("[Bookings] Loaded bookings count:", bookings.length);
      renderBookings();
    } else {
      const errorMsg =
        response?.data?.mess || response?.data?.error || "Không thể tải danh sách đặt phòng";
      showMessage(pageMessage, errorMsg, "error");
      bookings = [];
      renderBookings();
    }
  } catch (error) {
    console.error("[Bookings] Error loading all bookings:", error);
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

async function performSearch() {
  const guestName = searchGuestName.value.trim();
  const phone = searchPhone.value.trim();
  const idNumber = searchIdNumber.value.trim();
  const roomTypeId = searchRoomType.value;
  const fromDate = searchFromDate.value;
  const toDate = searchToDate.value;

  if (!guestName && !phone && !idNumber && !roomTypeId && !fromDate && !toDate) {
    await loadAllBookings();
    return;
  }

  tableLoading.style.display = "flex";
  tableEmpty.style.display = "none";
  bookingsTableBody.innerHTML = "";

  const params = {
    guestName: guestName || undefined,
    phone: phone || undefined,
    idNumber: idNumber || undefined,
    roomTypeId: roomTypeId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

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
  clearMessage(pageMessage);
  loadAllBookings();
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
        <button class="btn-icon btn-view-details" data-id="${booking.id}" title="Xem chi tiết" style="background-color: #11998e; color: white; border: none;">
          <i class="fa fa-eye"></i>
        </button>
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
  document.querySelectorAll(".btn-view-details").forEach((btn) => {
    btn.addEventListener("click", () =>
      openBookingDetails(parseInt(btn.dataset.id)),
    );
  });
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

  inputFullName.value = booking.guestName || booking.guestFullName || "";
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
      await loadAllBookings();
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
      await loadAllBookings();
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

// ═══════════════════════════════════════════════════════════════════════
// 11. DETAILS, STATUS ACTIONS, ASSIGN ROOM, SERVICES & INVOICE LOGIC
// ═══════════════════════════════════════════════════════════════════════

let activeBookingDetails = null; // Thông tin chi tiết booking hiện tại đang mở

/** Mở chi tiết đặt phòng */
async function openBookingDetails(id) {
  currentDetailsId = id;
  clearMessage(detailsModalMessage);
  
  try {
    const response = await API.getBookingById(id);
    console.log("[Bookings] Detail response:", response);

    if (response?.ok && response.data?.data) {
      activeBookingDetails = response.data.data;
      fillDetailsData(activeBookingDetails);
      renderStatusActions(activeBookingDetails.status, activeBookingDetails.roomId);
      
      // Tải danh sách dịch vụ và hóa đơn
      await loadDetailsServiceUsages();
      await loadDetailsInvoice();
      
      bookingDetailsModal.classList.add("show");
    } else {
      const errorMsg = response?.data?.mess || "Không thể tải chi tiết đặt phòng";
      showMessage(pageMessage, errorMsg, "error");
    }
  } catch (error) {
    console.error("[Bookings] Error opening details:", error);
    showMessage(pageMessage, "Lỗi kết nối server khi tải chi tiết đặt phòng.", "error");
  }
}

/** Đóng chi tiết đặt phòng */
function closeDetailsModal() {
  bookingDetailsModal.classList.remove("show");
  currentDetailsId = null;
  activeBookingDetails = null;
  clearMessage(detailsModalMessage);
}

/** Đổ dữ liệu vào giao diện chi tiết */
function fillDetailsData(booking) {
  const guestName = booking.guestFullName || booking.guestName || "Khách vô danh";
  detGuestName.textContent = guestName;
  detGuestPhone.textContent = booking.guestPhone || "N/A";
  detGuestId.textContent = booking.guestIdNumber || "N/A";
  detGuestEmail.textContent = booking.guestEmail || "N/A";
  detRoomType.textContent = booking.roomTypeName || "N/A";
  
  if (booking.roomNumber) {
    detRoomNumber.textContent = `Phòng ${booking.roomNumber}`;
    detRoomNumber.style.color = "#11998e";
  } else {
    detRoomNumber.textContent = "Chưa gán phòng";
    detRoomNumber.style.color = "#dc3545";
  }
  
  detDates.innerHTML = `
    Nhận: <strong>${formatDate(booking.checkInDate)}</strong><br>
    Trả: <strong>${formatDate(booking.checkOutDate)}</strong>
  `;
  detNights.textContent = `${booking.nights || 0} đêm`;
  
  const sourceLabels = {
    WALK_IN: "Trực tiếp (Walk-in)",
    PHONE: "Điện thoại",
    EXTERNAL_CHANNEL: "Kênh bên ngoài",
    BOOKING_PORTAL: "Cổng đặt phòng"
  };
  detSource.textContent = sourceLabels[booking.source] || booking.source || "N/A";
  detNote.textContent = booking.note || "Không có";
  
  // Trạng thái badge
  detStatus.textContent = getStatusText(booking.status);
  detStatus.className = `booking-status status-${booking.status}`;
}

/** Render các nút chuyển đổi trạng thái */
function renderStatusActions(status, roomId) {
  statusActionsBlock.innerHTML = "";
  
  if (status === "PENDING" || status === "NEW") {
    // Nút Xác nhận đặt phòng
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn-primary";
    confirmBtn.innerHTML = '<i class="fa fa-check"></i> Xác nhận đặt phòng';
    confirmBtn.onclick = confirmBookingAction;
    statusActionsBlock.appendChild(confirmBtn);
    
    // Nút Gán phòng
    const assignBtn = document.createElement("button");
    assignBtn.className = "btn-outline";
    assignBtn.innerHTML = roomId ? '<i class="fa fa-exchange-alt"></i> Đổi gán phòng' : '<i class="fa fa-door-open"></i> Gán phòng trống';
    assignBtn.onclick = openAssignRoomModal;
    statusActionsBlock.appendChild(assignBtn);
    
    // Nút Hủy đặt phòng
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-danger";
    cancelBtn.innerHTML = '<i class="fa fa-times"></i> Hủy đặt phòng';
    cancelBtn.onclick = cancelBookingAction;
    statusActionsBlock.appendChild(cancelBtn);
    
  } else if (status === "CONFIRMED") {
    // Nếu đã gán phòng -> cho phép Check-in
    if (roomId) {
      const checkInBtn = document.createElement("button");
      checkInBtn.className = "btn-primary";
      checkInBtn.style.background = "linear-gradient(to right, #00c6ff, #0072ff)";
      checkInBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Nhận phòng (Check-in)';
      checkInBtn.onclick = checkInBookingAction;
      statusActionsBlock.appendChild(checkInBtn);
    } else {
      const alertMsg = document.createElement("p");
      alertMsg.style.color = "#dc3545";
      alertMsg.style.fontSize = "12px";
      alertMsg.style.fontWeight = "600";
      alertMsg.innerHTML = '<i class="fa fa-info-circle"></i> Cần gán phòng trước khi làm Check-in';
      statusActionsBlock.appendChild(alertMsg);
    }
    
    // Nút Gán phòng/Đổi phòng
    const assignBtn = document.createElement("button");
    assignBtn.className = "btn-outline";
    assignBtn.innerHTML = roomId ? '<i class="fa fa-exchange-alt"></i> Đổi gán phòng' : '<i class="fa fa-door-open"></i> Gán phòng trống';
    assignBtn.onclick = openAssignRoomModal;
    statusActionsBlock.appendChild(assignBtn);
    
    // Nút Hủy đặt phòng
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-danger";
    cancelBtn.innerHTML = '<i class="fa fa-times"></i> Hủy đặt phòng';
    cancelBtn.onclick = cancelBookingAction;
    statusActionsBlock.appendChild(cancelBtn);
    
  } else if (status === "CHECKED_IN") {
    // Nút Trả phòng (Check-out)
    const checkOutBtn = document.createElement("button");
    checkOutBtn.className = "btn-danger";
    checkOutBtn.style.background = "#dc3545";
    checkOutBtn.innerHTML = '<i class="fa fa-sign-out-alt"></i> Trả phòng (Check-out)';
    checkOutBtn.onclick = checkOutBookingAction;
    statusActionsBlock.appendChild(checkOutBtn);

    // Nút Đổi phòng
    const changeRoomBtn = document.createElement("button");
    changeRoomBtn.className = "btn-outline";
    changeRoomBtn.innerHTML = '<i class="fa fa-exchange-alt"></i> Đổi phòng';
    changeRoomBtn.onclick = openAssignRoomModal;
    statusActionsBlock.appendChild(changeRoomBtn);
    
  } else if (status === "CHECKED_OUT") {
    const completeMsg = document.createElement("p");
    completeMsg.style.color = "#28a745";
    completeMsg.style.fontWeight = "600";
    completeMsg.style.fontSize = "13px";
    completeMsg.innerHTML = '<i class="fa fa-check-double"></i> Đơn đã hoàn tất thủ tục trả phòng.';
    statusActionsBlock.appendChild(completeMsg);
    
  } else if (status === "CANCELLED") {
    const cancelMsg = document.createElement("p");
    cancelMsg.style.color = "#6c757d";
    cancelMsg.style.fontWeight = "600";
    cancelMsg.style.fontSize = "13px";
    cancelMsg.innerHTML = '<i class="fa fa-ban"></i> Đơn đặt phòng này đã bị hủy.';
    statusActionsBlock.appendChild(cancelMsg);
  }
}

/** Thao tác: Xác nhận đặt phòng */
async function confirmBookingAction() {
  if (!currentDetailsId) return;
  
  try {
    const response = await API.confirmBooking(currentDetailsId);
    if (response?.ok) {
      showMessage(detailsModalMessage, "Xác nhận đặt phòng thành công!", "success");
      await openBookingDetails(currentDetailsId);
      await loadAllBookings();
    } else {
      showMessage(detailsModalMessage, response?.data?.mess || "Xác nhận đặt phòng thất bại.", "error");
    }
  } catch (error) {
    console.error("Error confirming booking:", error);
    showMessage(detailsModalMessage, "Lỗi kết nối khi xác nhận.", "error");
  }
}

/** Thao tác: Hủy đặt phòng */
async function cancelBookingAction() {
  if (!currentDetailsId) return;
  
  if (!confirm("Bạn có chắc chắn muốn hủy đơn đặt phòng này? Trạng thái sẽ chuyển sang CANCELLED và phòng sẽ được giải phóng.")) return;
  
  try {
    const response = await API.cancelBooking(currentDetailsId);
    if (response?.ok) {
      showMessage(detailsModalMessage, "Hủy đặt phòng thành công!", "success");
      await openBookingDetails(currentDetailsId);
      await loadAllBookings();
    } else {
      showMessage(detailsModalMessage, response?.data?.mess || "Không thể hủy đơn đặt phòng.", "error");
    }
  } catch (error) {
    console.error("Error cancelling booking:", error);
    showMessage(detailsModalMessage, "Lỗi kết nối khi hủy.", "error");
  }
}

/** Thao tác: Check-in */
async function checkInBookingAction() {
  if (!currentDetailsId) return;
  
  try {
    const response = await API.checkIn(currentDetailsId);
    if (response?.ok) {
      showMessage(detailsModalMessage, "Đã làm thủ tục Check-in nhận phòng thành công!", "success");
      await openBookingDetails(currentDetailsId);
      await loadAllBookings();
    } else {
      showMessage(detailsModalMessage, response?.data?.mess || "Không thể Check-in phòng.", "error");
    }
  } catch (error) {
    console.error("Error check-in:", error);
    showMessage(detailsModalMessage, "Lỗi kết nối khi Check-in.", "error");
  }
}

/** Thao tác: Check-out */
function checkOutBookingAction() {
  // Hiển thị hóa đơn thanh toán cuối trước khi Checkout
  viewFullInvoice(true);
}

// ═══════════════════════════════════════════════════════════════════════
// ASSIGN ROOM LOGIC
// ═══════════════════════════════════════════════════════════════════════

/** Mở modal gán phòng trống */
async function openAssignRoomModal() {
  if (!activeBookingDetails) return;
  
  clearMessage(assignRoomModalMessage);
  inputAssignRoom.innerHTML = '<option value="">-- Đang tải phòng trống... --</option>';
  
  // Cập nhật tiêu đề modal dựa trên trạng thái gán phòng
  const hasRoom = !!activeBookingDetails.roomId || !!activeBookingDetails.roomNumber;
  const modalHeaderTitle = assignRoomModal.querySelector(".modal-header h2");
  const saveBtn = document.getElementById("saveAssignRoomBtn");
  if (modalHeaderTitle && saveBtn) {
    if (hasRoom) {
      modalHeaderTitle.innerHTML = '<i class="fa fa-exchange-alt"></i> Đổi phòng đang gán';
      saveBtn.textContent = "Xác nhận đổi";
    } else {
      modalHeaderTitle.innerHTML = '<i class="fa fa-door-open"></i> Gán phòng trống';
      saveBtn.textContent = "Xác nhận gán";
    }
  }
  
  try {
    const roomTypeId = activeBookingDetails.roomTypeId;
    const checkIn = activeBookingDetails.checkInDate;
    const checkOut = activeBookingDetails.checkOutDate;
    
    const response = await API.getAvailableRooms(roomTypeId, checkIn, checkOut);
    console.log("[AssignRoom] Available rooms:", response);
    
    if (response?.ok && response.data?.data) {
      const rooms = response.data.data;
      inputAssignRoom.innerHTML = '<option value="">-- Chọn phòng trống --</option>';
      
      if (rooms.length === 0) {
        inputAssignRoom.innerHTML = '<option value="">-- Không có phòng trống thích hợp --</option>';
      } else {
        rooms.forEach((r) => {
          const option = document.createElement("option");
          option.value = r.roomId;
          option.textContent = `Phòng ${r.roomNumber} (${r.statusDescription || "Trống"})`;
          inputAssignRoom.appendChild(option);
        });
      }
      
      assignRoomModal.classList.add("show");
    } else {
      inputAssignRoom.innerHTML = '<option value="">-- Lỗi tải danh sách phòng trống --</option>';
      showMessage(assignRoomModalMessage, response?.data?.mess || "Lỗi tải phòng trống.", "error");
    }
  } catch (error) {
    console.error("Error loading available rooms:", error);
    inputAssignRoom.innerHTML = '<option value="">-- Lỗi kết nối mạng --</option>';
    showMessage(assignRoomModalMessage, "Lỗi kết nối mạng.", "error");
  }
}

/** Đóng modal gán phòng trống */
function closeAssignRoomModal() {
  assignRoomModal.classList.remove("show");
  clearMessage(assignRoomModalMessage);
}

/** Lưu gán phòng */
async function saveAssignRoom() {
  const roomId = inputAssignRoom.value;
  if (!roomId) {
    showMessage(assignRoomModalMessage, "Vui lòng chọn một phòng trống", "error");
    return;
  }
  
  const saveBtn = document.getElementById("saveAssignRoomBtn");
  saveBtn.disabled = true;
  
  try {
    const hasRoom = !!activeBookingDetails.roomId || !!activeBookingDetails.roomNumber;
    const response = hasRoom
      ? await API.changeRoom(currentDetailsId, parseInt(roomId), "Thay đổi từ sơ đồ quản lý")
      : await API.assignRoom(currentDetailsId, parseInt(roomId));
      
    if (response?.ok) {
      const successMsg = hasRoom ? "Đổi phòng thành công!" : "Gán phòng trọ thành công!";
      showMessage(detailsModalMessage, successMsg, "success");
      closeAssignRoomModal();
      await openBookingDetails(currentDetailsId);
      await loadAllBookings();
    } else {
      const errorMsg = response?.data?.mess || (hasRoom ? "Không thể đổi phòng." : "Không thể gán phòng.");
      showMessage(assignRoomModalMessage, errorMsg, "error");
    }
  } catch (error) {
    console.error("Error assigning/changing room:", error);
    showMessage(assignRoomModalMessage, "Lỗi kết nối mạng.", "error");
  } finally {
    saveBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SURCHARGE USAGES LOGIC
// ═══════════════════════════════════════════════════════════════════════

/** Tải các dịch vụ phát sinh của booking */
async function loadDetailsServiceUsages() {
  surchargeTableBody.innerHTML = "";
  surchargeEmpty.style.display = "none";
  
  try {
    const response = await API.getBookingServiceUsages(currentDetailsId);
    console.log("[SurchargeUsage] List usages response:", response);
    
    if (response?.ok && response.data?.data) {
      const usages = response.data.data;
      
      if (usages.length === 0) {
        surchargeEmpty.style.display = "block";
        return;
      }
      
      usages.forEach((u) => {
        const row = document.createElement("tr");
        const noteText = u.note ? `<br><small style="color: #888;">${u.note}</small>` : "";
        
        row.innerHTML = `
          <td>
            <strong>${u.serviceName}</strong>${noteText}
          </td>
          <td>${formatCurrency(u.unitPrice)}</td>
          <td style="text-align: center;">${u.quantity}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(u.lineTotal)}</td>
          <td style="text-align: center;">
            ${activeBookingDetails.status === "CHECKED_IN" ? `
              <button class="btn-delete-usage" data-id="${u.id}" style="background: none; border: none; color: #dc3545; cursor: pointer;">
                <i class="fa fa-trash-alt"></i>
              </button>
            ` : "-"}
          </td>
        `;
        surchargeTableBody.appendChild(row);
      });
      
      // Gắn sự kiện nút xóa
      document.querySelectorAll(".btn-delete-usage").forEach((btn) => {
        btn.addEventListener("click", () => deleteServiceUsage(parseInt(btn.dataset.id)));
      });
      
    } else {
      surchargeEmpty.style.display = "block";
      surchargeEmpty.textContent = "Lỗi khi tải danh sách dịch vụ đã dùng.";
    }
  } catch (error) {
    console.error("Error loading service usages:", error);
    surchargeEmpty.style.display = "block";
    surchargeEmpty.textContent = "Không kết nối được để tải dịch vụ.";
  }
}

/** Mở modal thêm dịch vụ sử dụng */
async function openAddServiceUsageModal() {
  if (!activeBookingDetails) return;
  
  clearMessage(serviceUsageModalMessage);
  inputUsageServiceId.innerHTML = '<option value="">-- Đang tải danh sách... --</option>';
  
  try {
    const response = await API.getAllSurchargeServices(true);
    console.log("[SurchargeUsage] Available surcharge services:", response);
    
    if (response?.ok && response.data?.data) {
      allSurchargeServices = response.data.data;
      inputUsageServiceId.innerHTML = '<option value="">-- Chọn dịch vụ --</option>';
      
      if (allSurchargeServices.length === 0) {
        inputUsageServiceId.innerHTML = '<option value="">-- Không có dịch vụ hoạt động --</option>';
      } else {
        allSurchargeServices.forEach((s) => {
          const option = document.createElement("option");
          option.value = s.id;
          option.textContent = `${s.name} (${formatCurrency(s.unitPrice)})`;
          inputUsageServiceId.appendChild(option);
        });
      }
      
      inputUsageQuantity.value = 1;
      inputUsageNote.value = "";
      addServiceUsageModal.classList.add("show");
    } else {
      inputUsageServiceId.innerHTML = '<option value="">-- Lỗi tải dịch vụ --</option>';
      showMessage(serviceUsageModalMessage, "Không thể tải danh sách dịch vụ phụ thu.", "error");
    }
  } catch (error) {
    console.error("Error fetching services:", error);
    inputUsageServiceId.innerHTML = '<option value="">-- Lỗi kết nối mạng --</option>';
  }
}

/** Đóng modal thêm dịch vụ sử dụng */
function closeServiceUsageModal() {
  addServiceUsageModal.classList.remove("show");
  clearMessage(serviceUsageModalMessage);
}

/** Lưu ghi nhận sử dụng dịch vụ */
async function saveServiceUsage() {
  const serviceId = inputUsageServiceId.value;
  const quantity = parseInt(inputUsageQuantity.value);
  const note = inputUsageNote.value.trim();
  
  if (!serviceId) {
    showMessage(serviceUsageModalMessage, "Vui lòng chọn một dịch vụ phụ thu", "error");
    return;
  }
  
  if (isNaN(quantity) || quantity <= 0) {
    showMessage(serviceUsageModalMessage, "Số lượng phải lớn hơn 0", "error");
    return;
  }
  
  const saveBtn = document.getElementById("saveServiceUsageBtn");
  saveBtn.disabled = true;
  
  try {
    const data = {
      surchargeServiceId: parseInt(serviceId),
      quantity,
      note: note || null
    };
    
    const response = await API.createBookingServiceUsage(currentDetailsId, data);
    console.log("[SurchargeUsage] Create usage response:", response);
    
    if (response?.ok) {
      showMessage(detailsModalMessage, "Ghi nhận sử dụng dịch vụ thành công!", "success");
      closeServiceUsageModal();
      await openBookingDetails(currentDetailsId);
    } else {
      showMessage(serviceUsageModalMessage, response?.data?.mess || "Lỗi khi ghi nhận dịch vụ.", "error");
    }
  } catch (error) {
    console.error("Error creating service usage:", error);
    showMessage(serviceUsageModalMessage, "Lỗi kết nối mạng.", "error");
  } finally {
    saveBtn.disabled = false;
  }
}

/** Xóa một ghi nhận dịch vụ sử dụng */
async function deleteServiceUsage(usageId) {
  if (!confirm("Bạn có chắc chắn muốn xóa phát sinh dịch vụ này khỏi phòng đặt?")) return;
  
  try {
    const response = await API.deleteBookingServiceUsage(currentDetailsId, usageId);
    if (response?.ok) {
      showMessage(detailsModalMessage, "Đã xóa phát sinh dịch vụ thành công!", "success");
      await openBookingDetails(currentDetailsId);
    } else {
      showMessage(detailsModalMessage, response?.data?.mess || "Xóa phát sinh dịch vụ thất bại.", "error");
    }
  } catch (error) {
    console.error("Error deleting service usage:", error);
    showMessage(detailsModalMessage, "Lỗi kết nối mạng.", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INVOICE & CHECKOUT LOGIC
// ═══════════════════════════════════════════════════════════════════════

/** Tải tóm tắt hóa đơn sơ bộ */
async function loadDetailsInvoice() {
  try {
    const response = await API.getBookingInvoice(currentDetailsId);
    console.log("[Invoice] Get details invoice response:", response);
    
    if (response?.ok && response.data?.data) {
      const inv = response.data.data;
      sumRoomCharge.textContent = formatCurrency(inv.roomCharge);
      sumServiceCharge.textContent = formatCurrency(inv.serviceCharge);
      sumDiscount.textContent = `-${formatCurrency(inv.discount)}`;
      sumTotalAmount.textContent = formatCurrency(inv.totalAmount);
    } else {
      sumRoomCharge.textContent = "0 ₫";
      sumServiceCharge.textContent = "0 ₫";
      sumDiscount.textContent = "-0 ₫";
      sumTotalAmount.textContent = "0 ₫";
    }
  } catch (error) {
    console.error("Error loading invoice summary:", error);
  }
}

let isInvoiceCheckOutFlow = false; // Phân biệt xem hóa đơn để In hay để Trả phòng

/** Mở modal hóa đơn chi tiết */
async function viewFullInvoice(isCheckOutFlow = false) {
  isInvoiceCheckOutFlow = isCheckOutFlow;
  
  // Tạm reset dữ liệu
  invId.textContent = "N/A";
  invBookingId.textContent = currentDetailsId;
  invGuestName.textContent = activeBookingDetails.guestFullName || activeBookingDetails.guestName;
  invRoomNumber.textContent = activeBookingDetails.roomNumber || "Chưa gán";
  invRoomType.textContent = activeBookingDetails.roomTypeName || "N/A";
  invDates.textContent = `${formatDate(activeBookingDetails.checkInDate)} - ${formatDate(activeBookingDetails.checkOutDate)}`;
  invNights.textContent = activeBookingDetails.nights || 0;
  invPrintDate.textContent = new Date().toLocaleString("vi-VN");
  
  invoiceReceiptTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Đang tải thông tin hóa đơn...</td></tr>';
  
  try {
    const response = await API.getBookingInvoice(currentDetailsId);
    console.log("[Invoice] Full invoice details:", response);
    
    if (response?.ok && response.data?.data) {
      const inv = response.data.data;
      
      invId.textContent = inv.id || "TEMP";
      invRoomCharge.textContent = formatCurrency(inv.roomCharge);
      invServiceCharge.textContent = formatCurrency(inv.serviceCharge);
      invDiscount.textContent = `-${formatCurrency(inv.discount)}`;
      invTotalAmount.textContent = formatCurrency(inv.totalAmount);
      
      // Xây dựng danh sách bảng hóa đơn
      invoiceReceiptTableBody.innerHTML = "";
      
      // 1. Dòng tiền phòng
      const nights = activeBookingDetails.nights || 0;
      const basePrice = nights > 0 ? (inv.roomCharge / nights) : 0;
      
      const roomRow = document.createElement("tr");
      roomRow.innerHTML = `
        <td>Tiền thuê phòng (${nights} đêm)</td>
        <td style="text-align: center;">${nights}</td>
        <td style="text-align: right;">${formatCurrency(basePrice)}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(inv.roomCharge)}</td>
      `;
      invoiceReceiptTableBody.appendChild(roomRow);
      
      // 2. Dòng các dịch vụ phụ thu
      if (inv.serviceUsages && inv.serviceUsages.length > 0) {
        inv.serviceUsages.forEach((u) => {
          const serviceRow = document.createElement("tr");
          serviceRow.innerHTML = `
            <td>Phụ thu: ${u.serviceName} ${u.note ? `<br><small style="color: #777;">(${u.note})</small>` : ""}</td>
            <td style="text-align: center;">${u.quantity}</td>
            <td style="text-align: right;">${formatCurrency(u.unitPrice)}</td>
            <td style="text-align: right; font-weight: bold;">${formatCurrency(u.lineTotal)}</td>
          `;
          invoiceReceiptTableBody.appendChild(serviceRow);
        });
      }
      
      // Thiết lập nút hành động của Modal Hóa đơn
      const closeBtn = document.getElementById("closeInvoiceBottomBtn");
      
      if (isInvoiceCheckOutFlow) {
        closeBtn.textContent = "Xác nhận Trả phòng & Thanh toán";
        closeBtn.className = "btn-primary btn-success";
        closeBtn.style.background = "#28a745";
        closeBtn.onclick = handleFinalCheckOut;
      } else {
        closeBtn.textContent = "Đóng";
        closeBtn.className = "btn-outline";
        closeBtn.style.background = "white";
        closeBtn.onclick = closeInvoiceModal;
      }
      
      invoiceModal.classList.add("show");
    } else {
      alert(response?.data?.mess || "Không thể lấy thông tin hóa đơn.");
    }
  } catch (error) {
    console.error("Error loading invoice receipt:", error);
    alert("Lỗi kết nối khi tải hóa đơn.");
  }
}

/** Đóng modal hóa đơn */
function closeInvoiceModal() {
  invoiceModal.classList.remove("show");
}

/** Xử lý nhấn "Xác nhận Trả phòng & Thanh toán" */
async function handleFinalCheckOut() {
  if (!currentDetailsId) return;
  
  const closeBtn = document.getElementById("closeInvoiceBottomBtn");
  closeBtn.disabled = true;
  closeBtn.textContent = "Đang trả phòng...";
  
  try {
    const response = await API.checkOut(currentDetailsId);
    console.log("[Invoice] Final check-out response:", response);
    
    if (response?.ok) {
      alert("Đã thanh toán hóa đơn và hoàn tất thủ tục Trả phòng (Check-out) thành công!");
      closeInvoiceModal();
      closeDetailsModal();
      await loadAllBookings();
    } else {
      alert(response?.data?.mess || "Không thể thực hiện trả phòng.");
    }
  } catch (error) {
    console.error("Error completing checkout:", error);
    alert("Lỗi kết nối khi thực hiện trả phòng.");
  } finally {
    closeBtn.disabled = false;
    closeBtn.textContent = "Xác nhận Trả phòng & Thanh toán";
  }
}

/** In hóa đơn bằng cửa sổ trình duyệt */
function printInvoiceReceipt() {
  const printContents = invoiceReceiptArea.innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>In hóa đơn - Roomi Dev</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #333; }
          .invoice-receipt-header { text-align: center; margin-bottom: 25px; border-bottom: 2px dashed #000; padding-bottom: 15px; }
          .invoice-receipt-header h2 { font-size: 22px; margin-bottom: 5px; }
          .invoice-receipt-header p { font-size: 12px; color: #666; }
          .invoice-receipt-details { font-size: 13px; margin-bottom: 20px; line-height: 1.6; }
          .invoice-receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .invoice-receipt-table th { border-bottom: 2px dashed #000; border-top: 2px dashed #000; padding: 8px 4px; font-size: 12px; font-weight: bold; text-align: left; }
          .invoice-receipt-table td { padding: 8px 4px; font-size: 12px; border-bottom: 1px dotted #ccc; }
          .invoice-receipt-summary { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; font-size: 13px; }
          .invoice-receipt-summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .invoice-receipt-summary-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px dashed #000; padding-top: 8px; margin-top: 4px; }
          .invoice-receipt-footer { text-align: center; margin-top: 30px; font-size: 12px; border-top: 1px dashed #ccc; padding-top: 15px; color: #666; }
        </style>
      </head>
      <body>
        ${printContents}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        <\/script>
      </body>
    </html>
  `);
  win.document.close();
}

