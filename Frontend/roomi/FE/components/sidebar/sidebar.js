/**
 * sidebar.js - Common Sidebar Component Loader
 * Dynamically inserts the sidebar HTML and loads sidebar.css
 */
(function () {
  // 1. Load sidebar CSS dynamically
  const cssPath = "../../components/sidebar/sidebar.css";
  if (!document.querySelector(`link[href="${cssPath}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssPath;
    document.head.appendChild(link);
  }

  // 2. Inject Sidebar HTML on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sidebar-container");
    if (!container) return;

    container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <h2><i class="fas fa-building"></i> Roomi Dev</h2>
        </div>
        <ul>
          <li>
            <a href="../dashboard/dashboard.html" id="navDashboard">
              <i class="fa fa-home"></i> Trang chủ
            </a>
          </li>
          <!-- Chỉ hiện với ADMIN -->
          <li id="navUsersMenuItem" style="display: none">
            <a href="../users/users.html" id="navUsers">
              <i class="fa fa-users"></i> Quản lý người dùng
            </a>
          </li>
          <li>
            <a href="../room-types/room-types.html" id="navRoomTypes">
              <i class="fa fa-tag"></i> Loại phòng
            </a>
          </li>
          <li>
            <a href="../rooms/rooms.html" id="navRooms">
              <i class="fa fa-door-open"></i> Quản lý phòng
            </a>
          </li>
          <li>
            <a href="../bookings/bookings.html" id="navBookings">
              <i class="fa fa-calendar-check"></i> Quản lý đặt phòng
            </a>
          </li>
          <li>
            <a href="../guests/guests.html" id="navGuests">
              <i class="fa fa-user-friends"></i> Quản lý khách hàng
            </a>
          </li>
          <li>
            <a href="../room-calendar/room-calendar.html" id="navRoomCalendar">
              <i class="fa fa-calendar-alt"></i> Lịch phòng
            </a>
          </li>
          <li>
            <a href="../seasonal-rates/seasonal-rates.html" id="navSeasonalRates">
              <i class="fa fa-chart-line"></i> Giá theo mùa
            </a>
          </li>
          <li>
            <a href="../surcharge-services/surcharge-services.html" id="navSurchargeServices">
              <i class="fa fa-concierge-bell"></i> Dịch vụ & Phụ thu
            </a>
          </li>
          <li>
            <a href="../profile/profile.html" id="navProfile">
              <i class="fa fa-user-cog"></i> Cấu hình tài khoản
            </a>
          </li>
          <li>
            <a href="../auth/change-password.html" id="navChangePassword">
              <i class="fa fa-key"></i> Đổi mật khẩu
            </a>
          </li>
          <li>
            <a href="#" id="logoutBtn">
              <i class="fa fa-sign-out-alt"></i> Đăng xuất
            </a>
          </li>
        </ul>
        <div class="sidebar-footer">
          <div class="user-info-sidebar">
            <div class="avatar-sidebar" id="userAvatar">
              <i class="fa fa-user-circle"></i>
            </div>
            <div class="sidebar-user-detail">
              <span id="sidebarUsername">Người dùng</span>
              <span class="sidebar-role-badge" id="sidebarRoleBadge" style="display: none;"></span>
            </div>
          </div>
        </div>
      </div>
    `;

    // 3. Highlight active link based on current path
    const path = window.location.pathname;
    const links = container.querySelectorAll("ul li a");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && href !== "#") {
        // Trích xuất tên trang cuối cùng từ href để so khớp, ví dụ 'dashboard.html'
        const hrefPage = href.substring(href.lastIndexOf("/") + 1);
        const pathPage = path.substring(path.lastIndexOf("/") + 1);
        
        if (hrefPage === pathPage) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      }
    });

    // 4. Render User Info & Role Badge
    if (typeof Auth !== "undefined") {
      const userInfo = Auth.getUserInfo();
      if (userInfo) {
        const sidebarUsername = container.querySelector("#sidebarUsername");
        const sidebarRoleBadge = container.querySelector("#sidebarRoleBadge");
        const navUsersMenuItem = container.querySelector("#navUsersMenuItem");

        if (sidebarUsername) {
          sidebarUsername.textContent = Auth.getDisplayName(userInfo);
        }

        if (sidebarRoleBadge && userInfo.role && userInfo.role !== "NONE") {
          const roleLabels = {
            ADMIN: "Quản trị viên",
            OWNER: "Chủ nhà trọ",
            RECEPTIONIST: "Lễ tân",
            HOUSEKEEPER: "Nhân viên phòng",
            ACCOUNTANT: "Kế toán",
            NONE: "Chưa phân quyền",
          };
          sidebarRoleBadge.textContent = roleLabels[userInfo.role] || userInfo.role;
          sidebarRoleBadge.style.display = "inline-block";
        }

        if (navUsersMenuItem && userInfo.role === "ADMIN") {
          navUsersMenuItem.style.display = "block";
        }
      }
    }

    // 5. Attach Logout Event
    const logoutBtn = container.querySelector("#logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Chuyển hướng đến trang logout tập trung
        window.location.href = "../auth/logout.html";
      });
    }
  });
})();
