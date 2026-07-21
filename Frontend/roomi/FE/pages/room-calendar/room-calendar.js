/**
 * room-calendar.js - Lịch gán phòng với kiểm tra trùng lặp
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. STATE & DOM ELEMENTS
// ═══════════════════════════════════════════════════════════════════════

let rooms = [];
let roomTypes = [];
let bookings = [];
let pendingBookings = [];
let currentWeekStart = new Date();
let selectedRoomId = null;
let selectedBookingId = null;

// Set to start of week (Monday)
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
currentWeekStart.setHours(0, 0, 0, 0);

// DOM elements
const calendarContainer = document.getElementById("calendarContainer");
const calendarLoading = document.getElementById("calendarLoading");
const currentPeriod = document.getElementById("currentPeriod");
const roomTypeFilter = document.getElementById("roomTypeFilter");
const pageMessage = document.getElementById("pageMessage");
const pendingBadge = document.getElementById("pendingBadge");

// Modals
const pendingBookingsModal = document.getElementById("pendingBookingsModal");
const assignRoomModal = document.getElementById("assignRoomModal");
const cellDetailModal = document.getElementById("cellDetailModal");

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
  await loadRooms();
  await loadBookings();
  renderCalendar();
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

  // Navigation
  document.getElementById("prevWeekBtn")?.addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
  });

  document.getElementById("nextWeekBtn")?.addEventListener("click", () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
  });

  document.getElementById("todayBtn")?.addEventListener("click", () => {
    const today = new Date();
    currentWeekStart = new Date(today);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
    currentWeekStart.setHours(0, 0, 0, 0);
    renderCalendar();
  });

  // Filter
  roomTypeFilter?.addEventListener("change", renderCalendar);

  // Refresh
  document.getElementById("refreshBtn")?.addEventListener("click", async () => {
    await loadRooms();
    await loadBookings();
    renderCalendar();
    showMessage(pageMessage, "Đã làm mới dữ liệu", "success");
  });

  // Pending bookings modal
  document.getElementById("showPendingBookingsBtn")?.addEventListener("click", () => {
    openPendingBookingsModal();
  });
  document.getElementById("closePendingModalBtn")?.addEventListener("click", closePendingBookingsModal);
  document.getElementById("closePendingBtn")?.addEventListener("click", closePendingBookingsModal);

  // Assign room modal
  document.getElementById("closeAssignModalBtn")?.addEventListener("click", closeAssignRoomModal);
  document.getElementById("cancelAssignBtn")?.addEventListener("click", closeAssignRoomModal);
  document.getElementById("confirmAssignBtn")?.addEventListener("click", confirmAssignRoom);

  // Cell detail modal
  document.getElementById("closeCellDetailBtn")?.addEventListener("click", closeCellDetailModal);
  document.getElementById("closeCellDetailCloseBtn")?.addEventListener("click", closeCellDetailModal);

  // Close modals on overlay click
  pendingBookingsModal?.addEventListener("click", (e) => {
    if (e.target === pendingBookingsModal) closePendingBookingsModal();
  });
  assignRoomModal?.addEventListener("click", (e) => {
    if (e.target === assignRoomModal) closeAssignRoomModal();
  });
  cellDetailModal?.addEventListener("click", (e) => {
    if (e.target === cellDetailModal) closeCellDetailModal();
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
      populateRoomTypeFilter();
    }
  } catch (error) {
    console.error("Error loading room types:", error);
  }
}

function populateRoomTypeFilter() {
  roomTypeFilter.innerHTML = '<option value="">Tất cả</option>';
  roomTypes.forEach((rt) => {
    const option = document.createElement("option");
    option.value = rt.id;
    option.textContent = rt.name;
    roomTypeFilter.appendChild(option);
  });
}

async function loadRooms() {
  try {
    const response = await API.getAllRooms();
    if (response?.ok && response.data?.data) {
      rooms = response.data.data;
    }
  } catch (error) {
    console.error("Error loading rooms:", error);
  }
}

async function loadBookings() {
  // Load all bookings for the current period
  const weekStart = formatDateForAPI(currentWeekStart);
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = formatDateForAPI(weekEnd);

  try {
    const response = await API.searchBookings({
      fromDate: weekStart,
      toDate: weekEndStr,
    });
    if (response?.ok && response.data?.data) {
      bookings = response.data.data;
      
      // Filter pending bookings (not assigned to rooms yet)
      pendingBookings = bookings.filter((b) => b.status === "PENDING");
      updatePendingBadge();
    }
  } catch (error) {
    console.error("Error loading bookings:", error);
  }
}

function updatePendingBadge() {
  pendingBadge.textContent = pendingBookings.length;
  if (pendingBookings.length > 0) {
    pendingBadge.style.display = "inline-block";
  } else {
    pendingBadge.style.display = "none";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 6. CALENDAR RENDERING
// ═══════════════════════════════════════════════════════════════════════

function renderCalendar() {
  calendarLoading.style.display = "none";
  
  // Filter rooms by room type
  const selectedRoomType = roomTypeFilter.value;
  let filteredRooms = rooms;
  if (selectedRoomType) {
    filteredRooms = rooms.filter((r) => r.roomType.id === parseInt(selectedRoomType));
  }

  if (filteredRooms.length === 0) {
    calendarContainer.innerHTML = '<div class="table-empty" style="display:flex;"><i class="fa fa-door-open"></i><p>Không có phòng nào.</p></div>';
    return;
  }

  // Generate 7 days (Mon-Sun)
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    weekDays.push(date);
  }

  // Update period label
  const weekEnd = weekDays[6];
  currentPeriod.textContent = `${formatDateShort(weekDays[0])} - ${formatDateShort(weekEnd)}`;

  // Build grid
  const gridHTML = buildCalendarGrid(filteredRooms, weekDays);
  calendarContainer.innerHTML = gridHTML;

  // Attach cell click handlers
  attachCellHandlers();
}

function buildCalendarGrid(filteredRooms, weekDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate grid columns (1 for room label + 7 for days)
  const gridColumns = `200px repeat(7, 1fr)`;

  let html = `<div class="calendar-grid" style="grid-template-columns: ${gridColumns};">`;

  // Header row
  html += '<div class="calendar-header">';
  html += '<div class="calendar-header-cell room-label">Phòng</div>';
  weekDays.forEach((date) => {
    const isToday = date.getTime() === today.getTime();
    const dayName = getDayName(date);
    const dateStr = formatDateShort(date);
    html += `<div class="calendar-header-cell ${isToday ? "today" : ""}">
      ${dayName}<br><span class="date-label">${dateStr}</span>
    </div>`;
  });
  html += '</div>';

  // Data rows
  filteredRooms.forEach((room) => {
    html += '<div class="calendar-row">';
    
    // Room label
    html += `<div class="calendar-cell room-label">
      <div>
        <div class="room-number">${room.roomNumber}</div>
        <div class="room-type-name">${room.roomType.name}</div>
      </div>
    </div>`;

    // Day cells
    weekDays.forEach((date) => {
      const cellData = getCellData(room.id, date);
      const isToday = date.getTime() === today.getTime();
      html += buildCalendarCell(room.id, date, cellData, isToday);
    });

    html += '</div>';
  });

  html += '</div>';
  return html;
}

function getCellData(roomId, date) {
  // Check if there's a booking for this room on this date
  // Note: In a real system, you'd need a room assignment table
  // For now, we'll simulate by checking if booking dates overlap
  
  const dateStr = formatDateForAPI(date);
  
  // Find bookings that overlap with this date
  const overlappingBookings = bookings.filter((booking) => {
    if (!booking.assignedRoomId || booking.assignedRoomId !== roomId) return false;
    
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const current = new Date(date);
    
    return current >= checkIn && current < checkOut;
  });

  if (overlappingBookings.length === 0) {
    return { status: "available" };
  }

  if (overlappingBookings.length === 1) {
    const booking = overlappingBookings[0];
    return {
      status: booking.status === "PENDING" ? "pending" : "occupied",
      booking: booking,
    };
  }

  // Multiple bookings = conflict
  return {
    status: "conflict",
    bookings: overlappingBookings,
  };
}

function buildCalendarCell(roomId, date, cellData, isToday) {
  const dateStr = formatDateForAPI(date);
  const classes = ["calendar-cell", cellData.status];
  if (isToday) classes.push("today");

  let content = "";
  if (cellData.booking) {
    const booking = cellData.booking;
    content = `<div class="booking-block ${cellData.status}">
      <div class="booking-guest-name">${booking.guestFullName}</div>
      <div class="booking-dates">${formatDateShort(new Date(booking.checkInDate))} - ${formatDateShort(new Date(booking.checkOutDate))}</div>
    </div>`;
  } else if (cellData.bookings) {
    content = `<div class="booking-block conflict">
      <div class="booking-guest-name">Trùng lặp!</div>
      <div class="booking-dates">${cellData.bookings.length} booking</div>
    </div>`;
  }

  return `<div class="${classes.join(" ")}" data-room-id="${roomId}" data-date="${dateStr}" data-status="${cellData.status}">
    ${content}
  </div>`;
}

function attachCellHandlers() {
  document.querySelectorAll(".calendar-cell:not(.room-label)").forEach((cell) => {
    cell.addEventListener("click", () => {
      const roomId = parseInt(cell.dataset.roomId);
      const date = cell.dataset.date;
      const status = cell.dataset.status;

      if (status === "occupied" || status === "conflict") {
        showCellDetail(roomId, date);
      } else {
        // Available cell - could show assign options
        console.log("Available cell clicked", roomId, date);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 7. PENDING BOOKINGS MODAL
// ═══════════════════════════════════════════════════════════════════════

function openPendingBookingsModal() {
  const tbody = document.getElementById("pendingBookingsTableBody");
  const empty = document.getElementById("pendingTableEmpty");

  tbody.innerHTML = "";

  if (pendingBookings.length === 0) {
    empty.style.display = "flex";
  } else {
    empty.style.display = "none";
    pendingBookings.forEach((booking, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <strong>${booking.guestFullName}</strong><br>
          <small style="color: #666;"><i class="fa fa-phone"></i> ${booking.guestPhone}</small>
        </td>
        <td>${booking.roomTypeName}</td>
        <td>
          <div style="font-size: 13px;">
            <div><strong>Nhận:</strong> ${formatDate(booking.checkInDate)}</div>
            <div><strong>Trả:</strong> ${formatDate(booking.checkOutDate)}</div>
          </div>
        </td>
        <td>
          <button class="btn-icon btn-primary" data-booking-id="${booking.id}" title="Gán phòng">
            <i class="fa fa-door-open"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Attach assign handlers
    document.querySelectorAll('[data-booking-id]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const bookingId = parseInt(btn.dataset.bookingId);
        openAssignRoomModal(bookingId);
      });
    });
  }

  pendingBookingsModal.classList.add("show");
}

function closePendingBookingsModal() {
  pendingBookingsModal.classList.remove("show");
}

// ═══════════════════════════════════════════════════════════════════════
// 8. ASSIGN ROOM MODAL
// ═══════════════════════════════════════════════════════════════════════

async function openAssignRoomModal(bookingId) {
  selectedBookingId = bookingId;
  selectedRoomId = null;

  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return;

  // Show booking info
  const bookingInfo = document.getElementById("bookingInfoContent");
  bookingInfo.innerHTML = `
    <div class="booking-info-row">
      <div class="booking-info-label">Khách hàng:</div>
      <div class="booking-info-value"><strong>${booking.guestFullName}</strong></div>
    </div>
    <div class="booking-info-row">
      <div class="booking-info-label">Số điện thoại:</div>
      <div class="booking-info-value">${booking.guestPhone}</div>
    </div>
    <div class="booking-info-row">
      <div class="booking-info-label">Loại phòng:</div>
      <div class="booking-info-value">${booking.roomTypeName}</div>
    </div>
    <div class="booking-info-row">
      <div class="booking-info-label">Nhận phòng:</div>
      <div class="booking-info-value">${formatDate(booking.checkInDate)}</div>
    </div>
    <div class="booking-info-row">
      <div class="booking-info-label">Trả phòng:</div>
      <div class="booking-info-value">${formatDate(booking.checkOutDate)}</div>
    </div>
  `;

  // Find available rooms
  const availableRooms = await findAvailableRooms(booking);
  renderAvailableRooms(availableRooms);

  document.getElementById("confirmAssignBtn").disabled = true;
  closePendingBookingsModal();
  assignRoomModal.classList.add("show");
}

async function findAvailableRooms(booking) {
  // Find rooms of the same type
  const matchingRooms = rooms.filter((r) => r.roomType.id === booking.roomTypeId);

  // Check which ones are available for the entire period
  const available = [];
  
  for (const room of matchingRooms) {
    const isAvailable = checkRoomAvailability(room.id, booking.checkInDate, booking.checkOutDate, booking.id);
    if (isAvailable) {
      available.push(room);
    }
  }

  return available;
}

function checkRoomAvailability(roomId, checkInDate, checkOutDate, excludeBookingId = null) {
  // Check if room is available for the entire period
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  const conflicts = bookings.filter((b) => {
    if (b.id === excludeBookingId) return false;
    if (!b.assignedRoomId || b.assignedRoomId !== roomId) return false;
    if (b.status === "CANCELLED") return false;

    const bCheckIn = new Date(b.checkInDate);
    const bCheckOut = new Date(b.checkOutDate);

    // Check for overlap
    return checkIn < bCheckOut && checkOut > bCheckIn;
  });

  return conflicts.length === 0;
}

function renderAvailableRooms(availableRooms) {
  const grid = document.getElementById("availableRoomsGrid");

  if (availableRooms.length === 0) {
    grid.innerHTML = '<div class="no-rooms-message"><i class="fa fa-exclamation-triangle"></i> Không có phòng trống phù hợp!</div>';
    return;
  }

  grid.innerHTML = "";
  availableRooms.forEach((room) => {
    const div = document.createElement("div");
    div.className = "room-option";
    div.dataset.roomId = room.id;
    div.innerHTML = `
      <div class="room-option-number">${room.roomNumber}</div>
      <div class="room-option-status"><i class="fa fa-check-circle"></i> Trống</div>
    `;
    div.addEventListener("click", () => selectRoom(room.id));
    grid.appendChild(div);
  });
}

function selectRoom(roomId) {
  selectedRoomId = roomId;
  
  // Update UI
  document.querySelectorAll(".room-option").forEach((opt) => {
    if (parseInt(opt.dataset.roomId) === roomId) {
      opt.classList.add("selected");
    } else {
      opt.classList.remove("selected");
    }
  });

  document.getElementById("confirmAssignBtn").disabled = false;
}

async function confirmAssignRoom() {
  if (!selectedRoomId || !selectedBookingId) return;

  // In a real system, you would call an API to assign the room
  // For now, we'll simulate by updating the booking locally
  const booking = bookings.find((b) => b.id === selectedBookingId);
  if (booking) {
    booking.assignedRoomId = selectedRoomId;
    booking.status = "CONFIRMED";
  }

  showMessage(pageMessage, "Đã gán phòng thành công!", "success");
  closeAssignRoomModal();
  await loadBookings();
  renderCalendar();
}

function closeAssignRoomModal() {
  assignRoomModal.classList.remove("show");
  selectedRoomId = null;
  selectedBookingId = null;
}

// ═══════════════════════════════════════════════════════════════════════
// 9. CELL DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════

function showCellDetail(roomId, dateStr) {
  const room = rooms.find((r) => r.id === roomId);
  const date = new Date(dateStr);
  
  // Find bookings for this cell
  const cellBookings = bookings.filter((booking) => {
    if (!booking.assignedRoomId || booking.assignedRoomId !== roomId) return false;
    
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    
    return date >= checkIn && date < checkOut;
  });

  if (cellBookings.length === 0) return;

  const content = document.getElementById("cellDetailContent");
  let html = `<h4>Phòng ${room.roomNumber} - ${formatDate(dateStr)}</h4><hr>`;

  cellBookings.forEach((booking) => {
    html += `
      <div class="detail-row">
        <div class="detail-label">Khách hàng:</div>
        <div class="detail-value"><strong>${booking.guestFullName}</strong></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">SĐT:</div>
        <div class="detail-value">${booking.guestPhone}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Nhận phòng:</div>
        <div class="detail-value">${formatDate(booking.checkInDate)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Trả phòng:</div>
        <div class="detail-value">${formatDate(booking.checkOutDate)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Trạng thái:</div>
        <div class="detail-value">${getStatusText(booking.status)}</div>
      </div>
      <hr>
    `;
  });

  content.innerHTML = html;
  cellDetailModal.classList.add("show");
}

function closeCellDetailModal() {
  cellDetailModal.classList.remove("show");
}

// ═══════════════════════════════════════════════════════════════════════
// 10. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function formatDateShort(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatDateForAPI(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayName(date) {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[date.getDay()];
}

function getStatusText(status) {
  const statusMap = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    CHECKED_IN: "Đã nhận phòng",
    CHECKED_OUT: "Đã trả phòng",
    CANCELLED: "Đã hủy",
  };
  return statusMap[status] || status;
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

