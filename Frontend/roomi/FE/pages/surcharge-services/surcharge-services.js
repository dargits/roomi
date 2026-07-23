/**
 * surcharge-services.js - Quản lý dịch vụ & phụ thu
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. STATE & DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════

let services = [];
let currentEditId = null;
let confirmActionType = null; // 'delete' or 'deactivate'
let confirmTargetId = null;

// DOM elements
const servicesTableBody = document.getElementById("servicesTableBody");
const tableEmpty = document.getElementById("tableEmpty");
const tableLoading = document.getElementById("tableLoading");
const totalLabel = document.getElementById("totalLabel");
const pageMessage = document.getElementById("pageMessage");

// Filter
const filterActive = document.getElementById("filterActive");

// Modal Elements
const serviceModal = document.getElementById("serviceModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const serviceForm = document.getElementById("serviceForm");
const inputName = document.getElementById("inputName");
const inputUnitPrice = document.getElementById("inputUnitPrice");
const inputDescription = document.getElementById("inputDescription");
const inputActive = document.getElementById("inputActive");

// Confirm Modal
const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");

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
  await loadServices();
});

// ═══════════════════════════════════════════════════════════════════════
// 3. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════

function attachEventListeners() {
  // Open create modal
  document.getElementById("openCreateModalBtn")?.addEventListener("click", openCreateModal);

  // Close modals
  document.getElementById("closeModalBtn")?.addEventListener("click", closeModal);
  document.getElementById("cancelModalBtn")?.addEventListener("click", closeModal);
  document.getElementById("closeConfirmBtn")?.addEventListener("click", closeConfirmModal);
  document.getElementById("cancelConfirmBtn")?.addEventListener("click", closeConfirmModal);

  // Save service
  document.getElementById("saveServiceBtn")?.addEventListener("click", saveService);

  // Confirm action button
  document.getElementById("confirmActionBtn")?.addEventListener("click", handleConfirmAction);

  // Filter changed
  filterActive?.addEventListener("change", loadServices);

  // Refresh
  document.getElementById("refreshBtn")?.addEventListener("click", loadServices);

  // Close modal on overlay click
  serviceModal?.addEventListener("click", (e) => {
    if (e.target === serviceModal) closeModal();
  });
  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 4. LOAD & RENDER DATA
// ═══════════════════════════════════════════════════════════════════════

async function loadServices() {
  tableLoading.style.display = "flex";
  tableEmpty.style.display = "none";
  servicesTableBody.innerHTML = "";

  const activeOnly = filterActive.value === "true";

  try {
    const response = await API.getAllSurchargeServices(activeOnly);
    console.log("[SurchargeServices] Load response:", response);

    if (response?.ok && response.data?.data) {
      services = response.data.data;
      renderServices();
    } else {
      const errorMsg = response?.data?.mess || "Không thể tải danh sách dịch vụ";
      showMessage(pageMessage, errorMsg, "error");
      services = [];
      renderServices();
    }
  } catch (error) {
    console.error("[SurchargeServices] Error loading services:", error);
    showMessage(pageMessage, "Lỗi kết nối server. Vui lòng thử lại sau.", "error");
    services = [];
    renderServices();
  } finally {
    tableLoading.style.display = "none";
  }
}

function renderServices() {
  servicesTableBody.innerHTML = "";

  if (services.length === 0) {
    tableEmpty.style.display = "flex";
    totalLabel.textContent = "0 dịch vụ";
    return;
  }

  tableEmpty.style.display = "none";
  totalLabel.textContent = `${services.length} dịch vụ`;

  services.forEach((service, index) => {
    const row = document.createElement("tr");

    const statusBadge = service.active
      ? '<span class="status-badge active"><i class="fa fa-check-circle"></i> Đang chạy</span>'
      : '<span class="status-badge inactive"><i class="fa fa-times-circle"></i> Ngừng chạy</span>';

    // Xây dựng các nút thao tác
    let actionButtons = `
      <button class="btn-edit" data-id="${service.id}" title="Chỉnh sửa">
        <i class="fa fa-edit"></i> Sửa
      </button>
    `;

    if (service.active) {
      actionButtons += `
        <button class="btn-deactivate" data-id="${service.id}" title="Ngừng hoạt động">
          <i class="fa fa-ban"></i> Ngừng
        </button>
      `;
    } else {
      actionButtons += `
        <button class="btn-reactivate" data-id="${service.id}" title="Kích hoạt lại">
          <i class="fa fa-play"></i> Chạy
        </button>
      `;
    }

    actionButtons += `
      <button class="btn-delete" data-id="${service.id}" title="Xóa dịch vụ">
        <i class="fa fa-trash"></i> Xóa
      </button>
    `;

    row.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${service.name}</strong></td>
      <td><strong>${formatCurrency(service.unitPrice)}</strong></td>
      <td><span class="note-text" title="${service.description || ""}">${service.description || "N/A"}</span></td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-btns">
          ${actionButtons}
        </div>
      </td>
    `;
    servicesTableBody.appendChild(row);
  });

  // Gắn sự kiện cho các nút hành động
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(parseInt(btn.dataset.id)));
  });

  document.querySelectorAll(".btn-deactivate").forEach((btn) => {
    btn.addEventListener("click", () => openDeactivateConfirm(parseInt(btn.dataset.id)));
  });

  document.querySelectorAll(".btn-reactivate").forEach((btn) => {
    btn.addEventListener("click", () => openReactivateConfirm(parseInt(btn.dataset.id)));
  });

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteConfirm(parseInt(btn.dataset.id)));
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 5. MODAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

function openCreateModal() {
  currentEditId = null;
  modalTitle.innerHTML = '<i class="fa fa-plus"></i> Thêm dịch vụ mới';
  document.getElementById("saveServiceBtnText").textContent = "Lưu dịch vụ";
  clearForm();
  clearMessage(modalMessage);
  serviceModal.classList.add("show");
}

function openEditModal(id) {
  const service = services.find((s) => s.id === id);
  if (!service) return;

  currentEditId = id;
  modalTitle.innerHTML = '<i class="fa fa-edit"></i> Chỉnh sửa dịch vụ';
  document.getElementById("saveServiceBtnText").textContent = "Cập nhật";

  inputName.value = service.name || "";
  inputUnitPrice.value = service.unitPrice || "";
  inputDescription.value = service.description || "";
  inputActive.checked = service.active !== false;

  clearMessage(modalMessage);
  serviceModal.classList.add("show");
}

function closeModal() {
  serviceModal.classList.remove("show");
  clearForm();
}

function clearForm() {
  inputName.value = "";
  inputUnitPrice.value = "";
  inputDescription.value = "";
  inputActive.checked = true;
}

// Confirm Actions Modal
function openDeactivateConfirm(id) {
  const service = services.find((s) => s.id === id);
  if (!service) return;

  confirmTargetId = id;
  confirmActionType = "deactivate";
  confirmTitle.innerHTML = '<i class="fa fa-ban" style="color: #ffc107;"></i> Ngừng hoạt động dịch vụ';
  confirmMessage.textContent = `Bạn có chắc chắn muốn ngừng hoạt động dịch vụ "${service.name}"? Dịch vụ này sẽ không thể ghi nhận phát sinh mới cho phòng đặt.`;
  confirmModal.classList.add("show");
}

function openReactivateConfirm(id) {
  const service = services.find((s) => s.id === id);
  if (!service) return;

  confirmTargetId = id;
  confirmActionType = "reactivate";
  confirmTitle.innerHTML = '<i class="fa fa-play" style="color: #28a745;"></i> Kích hoạt lại dịch vụ';
  confirmMessage.textContent = `Bạn có chắc chắn muốn kích hoạt lại dịch vụ "${service.name}"? Dịch vụ này sẽ có thể tiếp tục ghi nhận phát sinh mới cho phòng đặt.`;
  confirmModal.classList.add("show");
}

function openDeleteConfirm(id) {
  const service = services.find((s) => s.id === id);
  if (!service) return;

  confirmTargetId = id;
  confirmActionType = "delete";
  confirmTitle.innerHTML = '<i class="fa fa-trash" style="color: #dc3545;"></i> Xóa dịch vụ';
  confirmMessage.textContent = `Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ "${service.name}"? Hành động này không thể hoàn tác nếu dịch vụ đã có dữ liệu sử dụng.`;
  confirmModal.classList.add("show");
}

function closeConfirmModal() {
  confirmModal.classList.remove("show");
  confirmTargetId = null;
  confirmActionType = null;
}

// ═══════════════════════════════════════════════════════════════════════
// 6. SAVE, UPDATE & DELETE
// ═══════════════════════════════════════════════════════════════════════

async function saveService() {
  clearMessage(modalMessage);

  const name = inputName.value.trim();
  const unitPrice = parseFloat(inputUnitPrice.value);
  const description = inputDescription.value.trim();
  const active = inputActive.checked;

  // Validate
  if (!name) {
    showMessage(modalMessage, "Vui lòng nhập tên dịch vụ", "error");
    inputName.focus();
    return;
  }

  if (isNaN(unitPrice) || unitPrice <= 0) {
    showMessage(modalMessage, "Đơn giá phải lớn hơn 0", "error");
    inputUnitPrice.focus();
    return;
  }

  const data = {
    name,
    unitPrice,
    description: description || null,
    active
  };

  const saveBtn = document.getElementById("saveServiceBtn");
  saveBtn.disabled = true;

  try {
    let response;
    if (currentEditId) {
      response = await API.updateSurchargeService(currentEditId, data);
    } else {
      response = await API.createSurchargeService(data);
    }

    console.log("[SurchargeServices] Save response:", response);

    if (response?.ok) {
      const msg = response.data?.mess || "Lưu dịch vụ thành công";
      showMessage(pageMessage, msg, "success");
      closeModal();
      await loadServices();
    } else {
      const errorMsg = response?.data?.mess || response?.data?.error || "Không thể lưu dịch vụ";
      showMessage(modalMessage, errorMsg, "error");
    }
  } catch (error) {
    console.error("[SurchargeServices] Save error:", error);
    showMessage(modalMessage, "Lỗi kết nối mạng: " + error.message, "error");
  } finally {
    saveBtn.disabled = false;
  }
}

async function handleConfirmAction() {
  if (!confirmTargetId || !confirmActionType) return;

  const actionBtn = document.getElementById("confirmActionBtn");
  actionBtn.disabled = true;

  try {
    let response;
    if (confirmActionType === "deactivate") {
      response = await API.deactivateSurchargeService(confirmTargetId);
    } else if (confirmActionType === "reactivate") {
      response = await API.reactivateSurchargeService(confirmTargetId);
    } else {
      response = await API.deleteSurchargeService(confirmTargetId);
    }

    console.log("[SurchargeServices] Action response:", response);

    if (response?.ok) {
      const msg = response.data?.mess || "Thao tác thành công";
      showMessage(pageMessage, msg, "success");
      closeConfirmModal();
      await loadServices();
    } else {
      const errorMsg = response?.data?.mess || response?.data?.error || "Thao tác thất bại";
      showMessage(pageMessage, errorMsg, "error");
      closeConfirmModal();
    }
  } catch (error) {
    console.error("[SurchargeServices] Action error:", error);
    showMessage(pageMessage, "Lỗi kết nối mạng.", "error");
    closeConfirmModal();
  } finally {
    actionBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 7. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function formatCurrency(amount) {
  if (!amount) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
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
