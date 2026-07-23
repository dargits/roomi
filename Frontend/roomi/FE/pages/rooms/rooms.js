/**
 * rooms.js - Logic cho trang Quản lý phòng
 */

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let allRooms = [];
let allRoomTypes = [];
let filteredRooms = [];
let editingRoomId = null;

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  // Kiểm tra đăng nhập
  if (!Auth.isLoggedIn()) {
    Auth.redirectToLogin();
    return;
  }

  // Tải dữ liệu
  loadRoomTypes();
  loadRooms();

  // Gắn sự kiện
  attachEventListeners();
});

// ═══════════════════════════════════════════════════════════
//  USER INFO
// ═══════════════════════════════════════════════════════════


function getRoleLabel(role) {
  const roles = {
    ADMIN: "Quản trị viên",
    OWNER: "Chủ nhà trọ",
    RECEPTIONIST: "Lễ tân",
    HOUSEKEEPER: "Nhân viên phòng",
    ACCOUNTANT: "Kế toán",
    NONE: "Chưa phân quyền",
  };
  return roles[role] || role;
}

// ═══════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════
function attachEventListeners() {

  // Refresh
  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadRooms();
  });

  // Search
  document.getElementById("searchInput").addEventListener("input", applyFilters);

  // Filters
  document.getElementById("filterRoomType").addEventListener("change", applyFilters);
  document.getElementById("filterStatus").addEventListener("change", applyFilters);

  // Modal create
  document.getElementById("openCreateModalBtn").addEventListener("click", openCreateModal);
  document.getElementById("closeModalBtn").addEventListener("click", closeRoomModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeRoomModal);

  // Modal confirm
  document.getElementById("closeConfirmBtn").addEventListener("click", closeConfirmModal);
  document.getElementById("cancelConfirmBtn").addEventListener("click", closeConfirmModal);

  // Save room
  document.getElementById("saveRoomBtn").addEventListener("click", handleSaveRoom);

  // Close modal khi click ngoài
  document.getElementById("roomModal").addEventListener("click", (e) => {
    if (e.target.id === "roomModal") closeRoomModal();
  });

  document.getElementById("confirmModal").addEventListener("click", (e) => {
    if (e.target.id === "confirmModal") closeConfirmModal();
  });
}

// ═══════════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════════
async function loadRoomTypes() {
  try {
    console.log("Đang tải danh sách loại phòng...");
    const response = await API.getAllRoomTypes();
    console.log("Response loadRoomTypes:", response);
    
    if (!response) {
      console.error("Response null - Phiên đăng nhập hết hạn");
      showMessage("pageMessage", "Phiên đăng nhập hết hạn", "error");
      return;
    }

    if (!response.ok) {
      console.error("Response not ok:", response);
      showMessage("pageMessage", `Không thể tải danh sách loại phòng: ${response.data?.mess || 'Lỗi không xác định'}`, "error");
      return;
    }

    console.log("Response data:", response.data);
    allRoomTypes = response.data.data || [];
    console.log("All room types:", allRoomTypes);
    
    if (allRoomTypes.length === 0) {
      console.warn("Không có loại phòng nào trong hệ thống");
      showMessage("pageMessage", "Chưa có loại phòng nào. Vui lòng thêm loại phòng trước!", "error");
    }
    
    populateRoomTypeSelects();
  } catch (error) {
    console.error("Lỗi khi tải loại phòng (catch):", error);
    console.error("Error details:", error.message, error.stack);
    showMessage("pageMessage", `Lỗi kết nối đến server: ${error.message}`, "error");
  }
}

function populateRoomTypeSelects() {
  // Populate select trong filter
  const filterSelect = document.getElementById("filterRoomType");
  filterSelect.innerHTML = '<option value="">Tất cả loại phòng</option>';
  allRoomTypes.forEach((rt) => {
    const option = document.createElement("option");
    option.value = rt.id;
    option.textContent = rt.name;
    filterSelect.appendChild(option);
  });

  // Populate select trong form
  const formSelect = document.getElementById("inputRoomType");
  if (allRoomTypes.length === 0) {
    formSelect.innerHTML = '<option value="">-- Chưa có loại phòng --</option>';
    formSelect.disabled = true;
  } else {
    formSelect.innerHTML = '<option value="">-- Chọn loại phòng --</option>';
    allRoomTypes.forEach((rt) => {
      const option = document.createElement("option");
      option.value = rt.id;
      option.textContent = `${rt.name} (${formatCurrency(rt.basePrice)}/đêm - Sức chứa: ${rt.capacity} người)`;
      formSelect.appendChild(option);
    });
    formSelect.disabled = false;
  }
}

async function loadRooms() {
  showLoading(true);
  hideMessage("pageMessage");

  try {
    console.log("Đang tải danh sách phòng...");
    const response = await API.getAllRooms();
    console.log("Response loadRooms:", response);

    if (!response) {
      console.error("Response null - Phiên đăng nhập hết hạn");
      showMessage("pageMessage", "Phiên đăng nhập hết hạn", "error");
      showLoading(false);
      return;
    }

    if (!response.ok) {
      console.error("Response not ok:", response);
      const errorMsg = response.data?.mess || "Không thể tải danh sách phòng";
      showMessage("pageMessage", errorMsg, "error");
      showLoading(false);
      return;
    }

    console.log("Response data:", response.data);
    allRooms = response.data.data || [];
    console.log("All rooms:", allRooms);
    filteredRooms = [...allRooms];
    renderRoomsTable();
  } catch (error) {
    console.error("Lỗi khi tải phòng (catch):", error);
    console.error("Error details:", error.message, error.stack);
    showMessage("pageMessage", `Lỗi kết nối đến server: ${error.message}. Vui lòng kiểm tra Backend đã chạy chưa!`, "error");
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function renderRoomsTable() {
  const tbody = document.getElementById("roomsTableBody");
  const emptyDiv = document.getElementById("tableEmpty");

  if (filteredRooms.length === 0) {
    tbody.innerHTML = "";
    emptyDiv.style.display = "block";
    updateTotalLabel(0);
    return;
  }

  emptyDiv.style.display = "none";
  tbody.innerHTML = filteredRooms
    .map(
      (room, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(room.roomNumber)}</strong></td>
      <td>${escapeHtml(room.roomType?.name || "—")}</td>
      <td>${escapeHtml(room.floor || "—")}</td>
      <td>${renderStatusBadge(room.status)}</td>
      <td>${escapeHtml(room.note || "—")}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditModal(${room.id})">
            <i class="fa fa-edit"></i> Sửa
          </button>
          <button class="btn-delete" onclick="confirmDeleteRoom(${room.id}, '${escapeHtml(room.roomNumber)}')">
            <i class="fa fa-trash"></i> Xóa
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  updateTotalLabel(filteredRooms.length);
}

function renderStatusBadge(status) {
  const statusMap = {
    AVAILABLE: { label: "Còn trống", class: "available" },
    OCCUPIED: { label: "Đang sử dụng", class: "occupied" },
    NEEDS_CLEANING: { label: "Cần dọn dẹp", class: "needs-cleaning" },
    MAINTENANCE: { label: "Bảo trì", class: "maintenance" },
  };

  const s = statusMap[status] || { label: status, class: "" };
  return `<span class="status-badge ${s.class}">${s.label}</span>`;
}

function updateTotalLabel(count) {
  document.getElementById("totalLabel").textContent = `${count} phòng`;
}

// ═══════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════
function applyFilters() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const roomTypeFilter = document.getElementById("filterRoomType").value;
  const statusFilter = document.getElementById("filterStatus").value;

  filteredRooms = allRooms.filter((room) => {
    // Search
    const matchSearch =
      !searchTerm ||
      room.roomNumber.toLowerCase().includes(searchTerm) ||
      (room.floor && room.floor.toLowerCase().includes(searchTerm)) ||
      (room.roomType?.name && room.roomType.name.toLowerCase().includes(searchTerm));

    // Room type filter
    const matchRoomType = !roomTypeFilter || room.roomType?.id == roomTypeFilter;

    // Status filter
    const matchStatus = !statusFilter || room.status === statusFilter;

    return matchSearch && matchRoomType && matchStatus;
  });

  renderRoomsTable();
}

// ═══════════════════════════════════════════════════════════
//  MODAL: CREATE / EDIT
// ═══════════════════════════════════════════════════════════
function openCreateModal() {
  editingRoomId = null;
  
  // Cập nhật tiêu đề và text button
  document.getElementById("modalTitle").innerHTML = '<i class="fa fa-plus"></i> Thêm phòng mới';
  document.getElementById("saveRoomBtnText").textContent = "Thêm phòng";

  // Reset form
  document.getElementById("inputRoomNumber").value = "";
  document.getElementById("inputRoomType").value = "";
  document.getElementById("inputFloor").value = "";
  document.getElementById("inputStatus").value = "AVAILABLE";
  document.getElementById("inputNote").value = "";

  // Clear messages và reset button
  hideMessage("modalMessage");
  const saveBtn = document.getElementById("saveRoomBtn");
  saveBtn.disabled = false;
  
  // Show modal
  showModal("roomModal");
}

function openEditModal(roomId) {
  const room = allRooms.find((r) => r.id === roomId);
  if (!room) return;

  editingRoomId = roomId;
  
  // Cập nhật tiêu đề và text button
  document.getElementById("modalTitle").innerHTML = '<i class="fa fa-edit"></i> Sửa thông tin phòng';
  document.getElementById("saveRoomBtnText").textContent = "Cập nhật";

  // Populate form
  document.getElementById("inputRoomNumber").value = room.roomNumber;
  document.getElementById("inputRoomType").value = room.roomType?.id || "";
  document.getElementById("inputFloor").value = room.floor || "";
  document.getElementById("inputStatus").value = room.status;
  document.getElementById("inputNote").value = room.note || "";

  // Clear messages và reset button
  hideMessage("modalMessage");
  const saveBtn = document.getElementById("saveRoomBtn");
  saveBtn.disabled = false;
  
  // Show modal
  showModal("roomModal");
}

function closeRoomModal() {
  console.log("Closing room modal...");
  
  const modal = document.getElementById("roomModal");
  if (!modal) {
    console.error("Room modal not found!");
    return;
  }
  
  // Remove show class
  modal.classList.remove("show");
  
  // Reset state
  editingRoomId = null;
  
  // Clear form
  document.getElementById("inputRoomNumber").value = "";
  document.getElementById("inputRoomType").value = "";
  document.getElementById("inputFloor").value = "";
  document.getElementById("inputStatus").value = "AVAILABLE";
  document.getElementById("inputNote").value = "";
  
  // Reset button
  const saveBtn = document.getElementById("saveRoomBtn");
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa fa-save"></i> <span id="saveRoomBtnText">Thêm phòng</span>';
  }
  
  // Clear messages
  hideMessage("modalMessage");
  
  console.log("Room modal closed successfully");
}

// ═══════════════════════════════════════════════════════════
//  SAVE ROOM
// ═══════════════════════════════════════════════════════════
async function handleSaveRoom() {
  hideMessage("modalMessage");

  const roomNumber = document.getElementById("inputRoomNumber").value.trim();
  const roomTypeId = document.getElementById("inputRoomType").value;
  const floor = document.getElementById("inputFloor").value.trim();
  const status = document.getElementById("inputStatus").value;
  const note = document.getElementById("inputNote").value.trim();

  // Validate
  if (!roomNumber) {
    showMessage("modalMessage", "Vui lòng nhập số phòng", "error");
    return;
  }

  if (!roomTypeId) {
    showMessage("modalMessage", "Vui lòng chọn loại phòng", "error");
    return;
  }

  // Kiểm tra xem có loại phòng trong hệ thống không
  if (allRoomTypes.length === 0) {
    showMessage("modalMessage", "Chưa có loại phòng nào. Vui lòng thêm loại phòng trước!", "error");
    return;
  }

  const payload = {
    roomTypeId: parseInt(roomTypeId),
    roomNumber,
    floor: floor || null,
    status,
    note: note || null,
  };

  const saveBtn = document.getElementById("saveRoomBtn");
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';

  try {
    const response = editingRoomId
      ? await API.updateRoom(editingRoomId, payload)
      : await API.createRoom(payload);

    if (!response) {
      showMessage("modalMessage", "Phiên đăng nhập hết hạn", "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
      return;
    }

    if (!response.ok) {
      const errorMsg = response.data?.mess || "Không thể lưu phòng";
      showMessage("modalMessage", errorMsg, "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
      return;
    }

    // Success
    const successMsg = editingRoomId ? "Cập nhật phòng thành công" : "Thêm phòng thành công";
    
    // Đóng modal ngay lập tức
    closeRoomModal();
    
    // Hiển thị thông báo
    showMessage("pageMessage", successMsg, "success");
    
    // Tải lại dữ liệu
    await loadRooms();
    
  } catch (error) {
    console.error("Lỗi khi lưu phòng:", error);
    showMessage("modalMessage", "Lỗi kết nối đến server. Vui lòng kiểm tra Backend!", "error");
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// ═══════════════════════════════════════════════════════════
//  DELETE ROOM
// ═══════════════════════════════════════════════════════════
let deletingRoomId = null;

function confirmDeleteRoom(roomId, roomNumber) {
  deletingRoomId = roomId;

  document.getElementById("confirmTitle").innerHTML =
    '<i class="fa fa-exclamation-triangle"></i> Xác nhận xóa';
  document.getElementById("confirmMessage").textContent = `Bạn có chắc chắn muốn xóa phòng "${roomNumber}"?`;

  const confirmBtn = document.getElementById("confirmActionBtn");
  confirmBtn.innerHTML = '<i class="fa fa-trash"></i> Xóa';
  confirmBtn.onclick = handleDeleteRoom;

  showModal("confirmModal");
}

async function handleDeleteRoom() {
  if (!deletingRoomId) return;

  const confirmBtn = document.getElementById("confirmActionBtn");
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xóa...';

  try {
    const response = await API.deleteRoom(deletingRoomId);

    if (!response) {
      showMessage("pageMessage", "Phiên đăng nhập hết hạn", "error");
      closeConfirmModal();
      return;
    }

    if (!response.ok) {
      const errorMsg = response.data?.mess || "Không thể xóa phòng";
      showMessage("pageMessage", errorMsg, "error");
      closeConfirmModal();
      return;
    }

    // Success
    showMessage("pageMessage", "Xóa phòng thành công", "success");
    closeConfirmModal();
    loadRooms();
  } catch (error) {
    console.error("Lỗi khi xóa phòng:", error);
    showMessage("pageMessage", "Lỗi kết nối đến server. Vui lòng kiểm tra Backend!", "error");
    closeConfirmModal();
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fa fa-trash"></i> Xóa';
    deletingRoomId = null;
  }
}

function closeConfirmModal() {
  console.log("Closing confirm modal...");
  
  const modal = document.getElementById("confirmModal");
  if (!modal) {
    console.error("Confirm modal not found!");
    return;
  }
  
  // Remove show class
  modal.classList.remove("show");
  
  // Reset state
  deletingRoomId = null;
  
  // Reset button
  const confirmBtn = document.getElementById("confirmActionBtn");
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fa fa-trash"></i> Xóa';
  }
  
  console.log("Confirm modal closed successfully");
}



// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════
function showModal(modalId) {
  console.log(`Showing modal: ${modalId}`);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
  } else {
    console.error(`Modal ${modalId} not found!`);
  }
}

function hideModal(modalId) {
  console.log(`Hiding modal: ${modalId}`);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
  } else {
    console.error(`Modal ${modalId} not found!`);
  }
}

function showMessage(elementId, message, type = "success") {
  const msgBox = document.getElementById(elementId);
  msgBox.textContent = message;
  msgBox.className = `message-box ${type} show`;

  setTimeout(() => {
    hideMessage(elementId);
  }, CONFIG.TOKEN_TIMEOUT_MS || 4000);
}

function hideMessage(elementId) {
  const msgBox = document.getElementById(elementId);
  msgBox.classList.remove("show");
}

function showLoading(show) {
  const loading = document.getElementById("tableLoading");
  loading.style.display = show ? "block" : "none";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatCurrency(amount) {
  if (!amount) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}
