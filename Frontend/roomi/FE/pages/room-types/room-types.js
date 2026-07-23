/**
 * room-types.js - Logic cho trang Quản lý loại phòng
 */

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let allRoomTypes = [];
let filteredRoomTypes = [];
let editingRoomTypeId = null;

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // Ngăn nháy trắng
  document.body.classList.add("loaded");
  
  if (!Auth.isLoggedIn()) {
    Auth.redirectToLogin();
    return;
  }

  loadRoomTypes();
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

  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadRoomTypes();
  });

  document.getElementById("searchInput").addEventListener("input", applyFilters);

  document.getElementById("openCreateModalBtn").addEventListener("click", openCreateModal);
  document.getElementById("closeModalBtn").addEventListener("click", closeRoomTypeModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeRoomTypeModal);

  document.getElementById("closeConfirmBtn").addEventListener("click", closeConfirmModal);
  document.getElementById("cancelConfirmBtn").addEventListener("click", closeConfirmModal);

  document.getElementById("saveRoomTypeBtn").addEventListener("click", handleSaveRoomType);

  document.getElementById("roomTypeModal").addEventListener("click", (e) => {
    if (e.target.id === "roomTypeModal") closeRoomTypeModal();
  });

  document.getElementById("confirmModal").addEventListener("click", (e) => {
    if (e.target.id === "confirmModal") closeConfirmModal();
  });
}

// ═══════════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════════
async function loadRoomTypes() {
  showLoading(true);
  hideMessage("pageMessage");

  try {
    const response = await API.getAllRoomTypes();

    if (!response) {
      showMessage("pageMessage", "Phiên đăng nhập hết hạn", "error");
      showLoading(false);
      return;
    }

    if (!response.ok) {
      const errorMsg = response.data?.mess || "Không thể tải danh sách loại phòng";
      showMessage("pageMessage", errorMsg, "error");
      showLoading(false);
      return;
    }

    allRoomTypes = response.data.data || [];
    filteredRoomTypes = [...allRoomTypes];
    renderRoomTypesTable();
  } catch (error) {
    console.error("Lỗi khi tải loại phòng:", error);
    showMessage("pageMessage", "Lỗi kết nối đến server", "error");
  } finally {
    showLoading(false);
  }
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function renderRoomTypesTable() {
  const tbody = document.getElementById("roomTypesTableBody");
  const emptyDiv = document.getElementById("tableEmpty");

  if (filteredRoomTypes.length === 0) {
    tbody.innerHTML = "";
    emptyDiv.style.display = "block";
    updateTotalLabel(0);
    return;
  }

  emptyDiv.style.display = "none";
  tbody.innerHTML = filteredRoomTypes
    .map(
      (rt, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(rt.name)}</strong></td>
      <td>${rt.capacity} người</td>
      <td>${formatCurrency(rt.basePrice)}</td>
      <td>${escapeHtml(rt.amenities || "—")}</td>
      <td>
        <button class="btn-edit" onclick="openEditModal(${rt.id})">
          <i class="fa fa-edit"></i> Sửa
        </button>
        <button class="btn-delete" onclick="confirmDeleteRoomType(${rt.id}, '${escapeHtml(rt.name)}')">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  updateTotalLabel(filteredRoomTypes.length);
}

function updateTotalLabel(count) {
  document.getElementById("totalLabel").textContent = `${count} loại phòng`;
}

// ═══════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════
function applyFilters() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();

  filteredRoomTypes = allRoomTypes.filter((rt) => {
    return !searchTerm || rt.name.toLowerCase().includes(searchTerm);
  });

  renderRoomTypesTable();
}

// ═══════════════════════════════════════════════════════════
//  MODAL: CREATE / EDIT
// ═══════════════════════════════════════════════════════════
function openCreateModal() {
  editingRoomTypeId = null;
  
  // Cập nhật tiêu đề và text button
  document.getElementById("modalTitle").innerHTML = '<i class="fa fa-plus"></i> Thêm loại phòng mới';
  document.getElementById("saveRoomTypeBtnText").textContent = "Thêm loại phòng";

  // Clear form
  document.getElementById("inputName").value = "";
  document.getElementById("inputCapacity").value = "";
  document.getElementById("inputBasePrice").value = "";
  document.getElementById("inputAmenities").value = "";

  // Clear messages và reset button
  hideMessage("modalMessage");
  const saveBtn = document.getElementById("saveRoomTypeBtn");
  saveBtn.disabled = false;

  // Show modal
  showModal("roomTypeModal");
}

function openEditModal(roomTypeId) {
  const rt = allRoomTypes.find((r) => r.id === roomTypeId);
  if (!rt) return;

  editingRoomTypeId = roomTypeId;
  
  // Cập nhật tiêu đề và text button
  document.getElementById("modalTitle").innerHTML = '<i class="fa fa-edit"></i> Sửa thông tin loại phòng';
  document.getElementById("saveRoomTypeBtnText").textContent = "Cập nhật";

  // Populate form
  document.getElementById("inputName").value = rt.name;
  document.getElementById("inputCapacity").value = rt.capacity;
  document.getElementById("inputBasePrice").value = rt.basePrice;
  document.getElementById("inputAmenities").value = rt.amenities || "";

  // Clear messages và reset button
  hideMessage("modalMessage");
  const saveBtn = document.getElementById("saveRoomTypeBtn");
  saveBtn.disabled = false;
  
  // Show modal
  showModal("roomTypeModal");
}

function closeRoomTypeModal() {
  console.log("Closing room type modal...");
  
  const modal = document.getElementById("roomTypeModal");
  if (!modal) {
    console.error("Modal not found!");
    return;
  }
  
  // Remove show class
  modal.classList.remove("show");
  
  // Reset state
  editingRoomTypeId = null;
  
  // Clear form
  document.getElementById("inputName").value = "";
  document.getElementById("inputCapacity").value = "";
  document.getElementById("inputBasePrice").value = "";
  document.getElementById("inputAmenities").value = "";
  
  // Reset button
  const saveBtn = document.getElementById("saveRoomTypeBtn");
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa fa-save"></i> <span id="saveRoomTypeBtnText">Thêm loại phòng</span>';
  }
  
  // Clear messages
  hideMessage("modalMessage");
  
  console.log("Modal closed successfully");
}

// ═══════════════════════════════════════════════════════════
//  SAVE ROOM TYPE
// ═══════════════════════════════════════════════════════════
async function handleSaveRoomType() {
  hideMessage("modalMessage");

  const name = document.getElementById("inputName").value.trim();
  const capacity = parseInt(document.getElementById("inputCapacity").value);
  const basePrice = parseFloat(document.getElementById("inputBasePrice").value);
  const amenities = document.getElementById("inputAmenities").value.trim();

  if (!name) {
    showMessage("modalMessage", "Vui lòng nhập tên loại phòng", "error");
    return;
  }

  if (!capacity || capacity < 1) {
    showMessage("modalMessage", "Vui lòng nhập sức chứa hợp lệ", "error");
    return;
  }

  if (!basePrice || basePrice < 0) {
    showMessage("modalMessage", "Vui lòng nhập giá cơ bản hợp lệ", "error");
    return;
  }

  const payload = {
    name,
    capacity,
    basePrice,
    amenities: amenities || null,
  };

  const saveBtn = document.getElementById("saveRoomTypeBtn");
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang lưu...';

  try {
    const response = editingRoomTypeId
      ? await API.updateRoomType(editingRoomTypeId, payload)
      : await API.createRoomType(payload);

    if (!response) {
      showMessage("modalMessage", "Phiên đăng nhập hết hạn", "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
      return;
    }

    if (!response.ok) {
      const errorMsg = response.data?.mess || "Không thể lưu loại phòng";
      showMessage("modalMessage", errorMsg, "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
      return;
    }

    // Success
    const successMsg = editingRoomTypeId ? "Cập nhật loại phòng thành công" : "Thêm loại phòng thành công";
    
    // Đóng modal ngay lập tức
    closeRoomTypeModal();
    
    // Hiển thị thông báo
    showMessage("pageMessage", successMsg, "success");
    
    // Tải lại dữ liệu
    await loadRoomTypes();
    
  } catch (error) {
    console.error("Lỗi khi lưu loại phòng:", error);
    showMessage("modalMessage", "Lỗi kết nối đến server", "error");
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// ═══════════════════════════════════════════════════════════
//  DELETE ROOM TYPE
// ═══════════════════════════════════════════════════════════
let deletingRoomTypeId = null;

function confirmDeleteRoomType(roomTypeId, roomTypeName) {
  deletingRoomTypeId = roomTypeId;

  document.getElementById("confirmTitle").innerHTML =
    '<i class="fa fa-exclamation-triangle"></i> Xác nhận xóa';
  document.getElementById("confirmMessage").textContent = `Bạn có chắc chắn muốn xóa loại phòng "${roomTypeName}"?`;

  const confirmBtn = document.getElementById("confirmActionBtn");
  confirmBtn.innerHTML = '<i class="fa fa-trash"></i> Xóa';
  confirmBtn.onclick = handleDeleteRoomType;

  showModal("confirmModal");
}

async function handleDeleteRoomType() {
  if (!deletingRoomTypeId) return;

  const confirmBtn = document.getElementById("confirmActionBtn");
  const originalHtml = confirmBtn.innerHTML;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xóa...';

  try {
    console.log("Deleting room type ID:", deletingRoomTypeId);
    const response = await API.deleteRoomType(deletingRoomTypeId);
    console.log("Delete response:", response);

    if (!response) {
      showMessage("pageMessage", "Phiên đăng nhập hết hạn", "error");
      closeConfirmModal();
      return;
    }

    if (!response.ok) {
      const errorMsg = response.data?.mess || response.data?.message || "Không thể xóa loại phòng";
      console.error("Delete error:", errorMsg, response);
      
      // Kiểm tra lỗi cụ thể
      if (errorMsg.includes("đã có phòng") || errorMsg.includes("đang được sử dụng") || response.status === 409) {
        showMessage("pageMessage", "Không thể xóa loại phòng này vì đã có phòng đang sử dụng!", "error");
      } else {
        showMessage("pageMessage", errorMsg, "error");
      }
      
      closeConfirmModal();
      return;
    }

    // Success
    showMessage("pageMessage", "Xóa loại phòng thành công", "success");
    closeConfirmModal();
    await loadRoomTypes();
    
  } catch (error) {
    console.error("Lỗi khi xóa loại phòng (catch):", error);
    showMessage("pageMessage", `Lỗi kết nối đến server: ${error.message}`, "error");
    closeConfirmModal();
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalHtml;
    deletingRoomTypeId = null;
  }
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  modal.classList.remove("show");
  
  // Reset state
  deletingRoomTypeId = null;
  
  // Reset button
  const confirmBtn = document.getElementById("confirmActionBtn");
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = '<i class="fa fa-trash"></i> Xóa';
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
