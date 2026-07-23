/**
 * seasonal-rates.js - Quản lý giá theo mùa
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. STATE & DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════

let seasonalRates = [];
let roomTypes = [];
let filteredSeasonalRates = [];
let currentEditId = null;

// DOM elements
const seasonalRatesTableBody = document.getElementById(
  "seasonalRatesTableBody",
);
const tableEmpty = document.getElementById("tableEmpty");
const tableLoading = document.getElementById("tableLoading");
const totalLabel = document.getElementById("totalLabel");
const searchInput = document.getElementById("searchInput");
const roomTypeFilter = document.getElementById("roomTypeFilter");
const pageMessage = document.getElementById("pageMessage");

// Modal elements
const seasonalRateModal = document.getElementById("seasonalRateModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const inputRoomType = document.getElementById("inputRoomType");
const inputStartDate = document.getElementById("inputStartDate");
const inputEndDate = document.getElementById("inputEndDate");
const inputPrice = document.getElementById("inputPrice");

// Confirm modal
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
let deleteTargetId = null;

// ═══════════════════════════════════════════════════════════════════════
// 2. INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════

function canManageSeasonalRates() {
  const userInfo = Auth.getUserInfo();
  return userInfo && (userInfo.role === "ADMIN" || userInfo.role === "OWNER");
}

document.addEventListener("DOMContentLoaded", async () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");

  if (!Auth.isLoggedIn()) {
    Auth.redirectToLogin();
    return;
  }

  // Khóa quyền CUD nếu không phải là ADMIN hoặc OWNER
  if (!canManageSeasonalRates()) {
    const createBtn = document.getElementById("openCreateModalBtn");
    if (createBtn) createBtn.style.display = "none";

    const actionHeader = document.getElementById("actionColumnHeader");
    if (actionHeader) actionHeader.style.display = "none";
  }

  attachEventListeners();
  await loadRoomTypes();
  await loadSeasonalRates();
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

  // Save seasonal rate
  document
    .getElementById("saveSeasonalRateBtn")
    ?.addEventListener("click", saveSeasonalRate);

  // Confirm delete
  document
    .getElementById("confirmActionBtn")
    ?.addEventListener("click", confirmDelete);

  // Search
  searchInput?.addEventListener("input", handleSearch);

  // Filter
  roomTypeFilter?.addEventListener("change", handleFilter);

  // Refresh
  document.getElementById("refreshBtn")?.addEventListener("click", async () => {
    await loadSeasonalRates();
    showMessage(pageMessage, "Đã tải lại dữ liệu", "success");
  });

  // Close modal on overlay click
  seasonalRateModal?.addEventListener("click", (e) => {
    if (e.target === seasonalRateModal) closeModal();
  });
  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
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
    option.textContent = rt.name;
    inputRoomType.appendChild(option);
  });

  // Populate filter select
  roomTypeFilter.innerHTML = '<option value="">Tất cả loại phòng</option>';
  roomTypes.forEach((rt) => {
    const option = document.createElement("option");
    option.value = rt.id;
    option.textContent = rt.name;
    roomTypeFilter.appendChild(option);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 5. LOAD DATA
// ═══════════════════════════════════════════════════════════════════════

// ... (Giữ nguyên hàm loadRoomTypes và populateRoomTypeSelects)

async function loadSeasonalRates() {
  tableLoading.style.display = "flex";
  tableEmpty.style.display = "none";

  try {
    const response = await API.getAllSeasonalRates();
    if (response?.ok && response.data?.data) {
      // FIX: Tiền xử lý dữ liệu để đồng bộ cả ID và Tên loại phòng
      seasonalRates = response.data.data.map((rate) => {
        let typeId = rate.roomTypeId;
        let typeName = rate.roomTypeName;

        // Trích xuất từ object lồng nhau nếu có
        if (rate.roomType) {
          if (!typeId && rate.roomType.id) typeId = rate.roomType.id;
          if (!typeName && rate.roomType.name) typeName = rate.roomType.name;
        }

        // Dò tìm tên phòng dựa vào danh sách roomTypes đã lấy về
        if (!typeName && typeId) {
          const matchedRoomType = roomTypes.find(
            (rt) => String(rt.id) === String(typeId),
          );
          if (matchedRoomType) {
            typeName = matchedRoomType.name;
          }
        }

        // Trả về object đã được vá đầy đủ dữ liệu
        return { ...rate, roomTypeId: typeId, roomTypeName: typeName };
      });

      filteredSeasonalRates = [...seasonalRates];
      renderSeasonalRates();
    } else {
      const errorMsg = response?.data?.mess || "Không thể tải dữ liệu";
      const errorCode = response?.data?.code ? ` (${response.data.code})` : "";
      showMessage(pageMessage, errorMsg + errorCode, "error");
    }
  } catch (error) {
    console.error("Error loading seasonal rates:", error);
    showMessage(pageMessage, "Lỗi khi tải dữ liệu", "error");
  } finally {
    tableLoading.style.display = "none";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 6. RENDER
// ═══════════════════════════════════════════════════════════════════════

function renderSeasonalRates() {
  seasonalRatesTableBody.innerHTML = "";

  if (filteredSeasonalRates.length === 0) {
    tableEmpty.style.display = "flex";
    totalLabel.textContent = "0 giá theo mùa";
    return;
  }

  tableEmpty.style.display = "none";
  totalLabel.textContent = `${filteredSeasonalRates.length} giá theo mùa`;

  const hasPermission = canManageSeasonalRates();

  filteredSeasonalRates.forEach((rate, index) => {
    const row = document.createElement("tr");

    // Khối render button tùy thuộc quyền
    const actionHtml = hasPermission
      ? `
      <td>
        <button class="btn-icon btn-edit" data-id="${rate.id}" title="Chỉnh sửa">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn-icon btn-delete" data-id="${rate.id}" title="Xóa">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `
      : "";

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <strong>${rate.roomTypeName || "N/A"}</strong>
      </td>
      <td>
        <div class="date-range">
          <i class="fa fa-calendar"></i>
          <span>${formatDate(rate.startDate)} → ${formatDate(rate.endDate)}</span>
        </div>
      </td>
      <td>
        <span class="price-amount">${formatCurrency(rate.price)}</span>
      </td>
      ${actionHtml}
    `;
    seasonalRatesTableBody.appendChild(row);
  });

  // Attach action buttons (nếu có quyền)
  if (hasPermission) {
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
}

// ═══════════════════════════════════════════════════════════════════════
// 7. MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function openCreateModal() {
  currentEditId = null;
  modalTitle.innerHTML = '<i class="fa fa-plus"></i> Thêm giá theo mùa';
  document.getElementById("saveSeasonalRateBtnText").textContent = "Thêm";
  clearForm();
  clearMessage(modalMessage);
  seasonalRateModal.classList.add("show");
}

function openEditModal(id) {
  const rate = seasonalRates.find((r) => r.id === id);
  if (!rate) return;

  currentEditId = id;
  modalTitle.innerHTML = '<i class="fa fa-edit"></i> Chỉnh sửa giá theo mùa';
  document.getElementById("saveSeasonalRateBtnText").textContent = "Cập nhật";

  inputRoomType.value = rate.roomTypeId;
  inputStartDate.value = rate.startDate;
  inputEndDate.value = rate.endDate;
  inputPrice.value = rate.price;

  clearMessage(modalMessage);
  seasonalRateModal.classList.add("show");
}

function closeModal() {
  seasonalRateModal.classList.remove("show");
  clearForm();
}

function clearForm() {
  inputRoomType.value = "";
  inputStartDate.value = "";
  inputEndDate.value = "";
  inputPrice.value = "";
}

function openDeleteConfirm(id) {
  const rate = seasonalRates.find((r) => r.id === id);
  if (!rate) return;

  deleteTargetId = id;
  confirmMessage.textContent = `Bạn có chắc chắn muốn xóa giá theo mùa của "${rate.roomTypeName}" từ ${formatDate(rate.startDate)} đến ${formatDate(rate.endDate)}?`;
  confirmModal.classList.add("show");
}

function closeConfirmModal() {
  confirmModal.classList.remove("show");
  deleteTargetId = null;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

async function saveSeasonalRate() {
  clearMessage(modalMessage);

  // Validation
  const roomTypeId = inputRoomType.value.trim();
  const startDate = inputStartDate.value.trim();
  const endDate = inputEndDate.value.trim();
  const price = inputPrice.value.trim();

  if (!roomTypeId) {
    showMessage(modalMessage, "Vui lòng chọn loại phòng", "error");
    return;
  }
  if (!startDate) {
    showMessage(modalMessage, "Vui lòng chọn ngày bắt đầu", "error");
    return;
  }
  if (!endDate) {
    showMessage(modalMessage, "Vui lòng chọn ngày kết thúc", "error");
    return;
  }
  // Đã sửa lại lỗi ngày kết thúc phải CHUẨN XÁC sau ngày bắt đầu, không được bằng.
  if (new Date(startDate) >= new Date(endDate)) {
    showMessage(modalMessage, "Ngày kết thúc phải sau ngày bắt đầu", "error");
    return;
  }
  if (!price || parseFloat(price) <= 0) {
    showMessage(modalMessage, "Vui lòng nhập giá hợp lệ", "error");
    return;
  }

  const data = {
    roomTypeId: parseInt(roomTypeId),
    startDate,
    endDate,
    price: parseFloat(price),
  };

  try {
    let response;
    if (currentEditId) {
      response = await API.updateSeasonalRate(currentEditId, data);
    } else {
      response = await API.createSeasonalRate(data);
    }

    if (response?.ok) {
      showMessage(
        pageMessage,
        response.data?.mess || "Lưu thành công",
        "success",
      );
      closeModal();
      await loadSeasonalRates();
    } else {
      // Bổ sung đọc code mã lỗi nếu có (VD: RATE_003)
      const errorMsg = response?.data?.mess || "Có lỗi xảy ra";
      const errorCode = response?.data?.code ? ` (${response.data.code})` : "";
      showMessage(modalMessage, errorMsg + errorCode, "error");
    }
  } catch (error) {
    console.error("Error saving seasonal rate:", error);
    showMessage(modalMessage, "Lỗi khi lưu dữ liệu", "error");
  }
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  try {
    const response = await API.deleteSeasonalRate(deleteTargetId);
    if (response?.ok) {
      showMessage(
        pageMessage,
        response.data?.mess || "Xóa thành công",
        "success",
      );
      closeConfirmModal();
      await loadSeasonalRates();
    } else {
      const errorMsg = response?.data?.mess || "Không thể xóa";
      const errorCode = response?.data?.code ? ` (${response.data.code})` : "";
      showMessage(pageMessage, errorMsg + errorCode, "error");
      closeConfirmModal();
    }
  } catch (error) {
    console.error("Error deleting seasonal rate:", error);
    showMessage(pageMessage, "Lỗi khi xóa dữ liệu", "error");
    closeConfirmModal();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 9. SEARCH & FILTER
// ═══════════════════════════════════════════════════════════════════════

function handleSearch() {
  const query = searchInput.value.toLowerCase().trim();
  applyFilters(query, roomTypeFilter.value);
}

function handleFilter() {
  const query = searchInput.value.toLowerCase().trim();
  applyFilters(query, roomTypeFilter.value);
}

function applyFilters(searchQuery, roomTypeId) {
  filteredSeasonalRates = seasonalRates.filter((rate) => {
    const matchSearch =
      !searchQuery || rate.roomTypeName?.toLowerCase().includes(searchQuery);
    const matchRoomType =
      !roomTypeId || rate.roomTypeId === parseInt(roomTypeId);
    return matchSearch && matchRoomType;
  });
  renderSeasonalRates();
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
