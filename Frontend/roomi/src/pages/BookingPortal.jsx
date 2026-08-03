import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import {
  Calendar,
  User,
  Phone,
  ArrowLeft,
  Check,
  CheckCircle,
  LogOut,
  ChevronRight,
  Search,
  Info,
  Mail,
  FileText,
  CreditCard,
  Coffee,
  Waves,
  Utensils,
  Compass,
  Star,
  MapPin,
  Sparkles,
  Shield,
  Clock,
} from "lucide-react";

const formatDateVN = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // YYYY-MM-DD -> DD/MM/YYYY
  }
  return dateStr;
};

function BookingPortal({ onBackToLogin, showNotification }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Search & Availability States
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomTypes, setRoomTypes] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

  // Selection
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [propertySettings, setPropertySettings] = useState(null);

  // Guest Details
  const [guestDetails, setGuestDetails] = useState({
    fullName: "",
    phone: "",
    idNumber: "",
    email: "",
    note: "",
  });

  // Result
  const [createdBooking, setCreatedBooking] = useState(null);

  // Refs for scrolling to landing page sections
  const roomsSectionRef = useRef(null);
  const amenitiesSectionRef = useRef(null);

  // Fetch Room Types and Property Settings on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [typesRes, settingsRes] = await Promise.all([
          api.get("/room-types"),
          api.get("/settings/public").catch(() => null)
        ]);

        if (typesRes?.data && typesRes.data.data) {
          // Lọc bỏ danh mục đang bị ẩn ([HIDDEN]) — không hiện với khách
          setRoomTypes(typesRes.data.data.filter(t => !t.amenities?.includes('[HIDDEN]')));
        }
        if (settingsRes?.data && settingsRes.data.data) {
          setPropertySettings(settingsRes.data.data);
        }
      } catch (err) {
        showNotification(err.message, "error");
      }
    };
    fetchInitialData();

    // Set default dates: checkin = today, checkout = tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setCheckInDate(today.toISOString().split("T")[0]);
    setCheckOutDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const handleDateSubmit = async (e) => {
    if (e) e.preventDefault();
    const todayStr = new Date().toISOString().split("T")[0];

    if (checkInDate < todayStr) {
      showNotification("Ngày nhận phòng không được ở trong quá khứ", "error");
      return;
    }

    if (checkInDate >= checkOutDate) {
      showNotification("Ngày trả phòng phải sau ngày nhận phòng", "error");
      return;
    }

    await loadAvailableRooms();
  };

  const loadAvailableRooms = async (filterTypeId = roomTypeId) => {
    try {
      setLoading(true);
      const params = {
        checkIn: checkInDate,
        checkOut: checkOutDate,
      };
      if (filterTypeId) {
        params.roomTypeId = filterTypeId;
      }

      const [res, roomsRes] = await Promise.all([
        api.get("/calendar/available-rooms", { params }),
        api.get("/rooms"),
      ]);

      if (res.data && res.data.data && roomsRes.data && roomsRes.data.data) {
        const inactiveIds = roomsRes.data.data
          .filter((r) => r.note && r.note.includes("[INACTIVE]"))
          .map((r) => Number(r.id));
        const activeRooms = res.data.data.filter(
          (r) => !inactiveIds.includes(Number(r.roomId)),
        );
        setAvailableRooms(activeRooms);
        setStep(2);

        // Scroll to top of the results page
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      showNotification(
        err.message || "Không thể lấy danh sách phòng trống",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterTypeChange = async (e) => {
    const typeId = e.target.value;
    setRoomTypeId(typeId);
    await loadAvailableRooms(typeId);
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    if (
      !guestDetails.fullName.trim() ||
      !guestDetails.phone.trim() ||
      !guestDetails.idNumber.trim()
    ) {
      showNotification("Vui lòng điền đầy đủ các trường bắt buộc", "error");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        fullName: guestDetails.fullName.trim(),
        phone: guestDetails.phone.trim(),
        idNumber: guestDetails.idNumber.trim(),
        email: guestDetails.email.trim() || undefined,
        note: guestDetails.note.trim() || undefined,
        roomTypeId: selectedRoom.roomTypeId,
        roomId: selectedRoom.roomId,
        checkInDate,
        checkOutDate,
        source: "BOOKING_PORTAL",
      };

      const res = await api.post("/bookings/public", payload);
      if (res.data && res.data.data) {
        setCreatedBooking(res.data.data);
        showNotification("Đặt phòng thành công!", "success");
        setStep(4);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      if (err.code === "BOOK_003") {
        showNotification(
          "Phòng vừa được đặt bởi người khác. Vui lòng quay lại chọn phòng khác.",
          "error",
        );
      } else {
        showNotification(err.message || "Đặt phòng không thành công", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPortal = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setCheckInDate(today.toISOString().split("T")[0]);
    setCheckOutDate(tomorrow.toISOString().split("T")[0]);
    setRoomTypeId("");
    setSelectedRoom(null);
    setGuestDetails({
      fullName: "",
      phone: "",
      idNumber: "",
      email: "",
      note: "",
    });
    setCreatedBooking(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Portal Header */}
      <header
        style={{
          padding: "12px 48px",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
          height: "72px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
          onClick={resetPortal}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0066cc 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 10px rgba(0, 102, 204, 0.25)'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "800",
                margin: 0,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                lineHeight: "1.1"
              }}
            >
              Roomi
            </h1>
            <span
              style={{
                fontSize: "10px",
                color: "#0066cc",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.8px"
              }}
            >
              Resort & Luxury Hotel
            </span>
          </div>
        </div>

        {/* Navigation Menu (Only shown on Step 1 / Home page) */}
        {step === 1 && (
          <nav
            className="desktop-only"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <button
              onClick={() => resetPortal()}
              style={{
                background: "rgba(0, 102, 204, 0.08)",
                border: "1px solid rgba(0, 102, 204, 0.2)",
                color: "#0066cc",
                fontWeight: "700",
                fontSize: "14px",
                padding: "8px 18px",
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Trang chủ
            </button>
            <button
              onClick={() => scrollToSection(roomsSectionRef)}
              style={{
                background: "transparent",
                border: "none",
                color: "#475569",
                fontWeight: "600",
                fontSize: "14px",
                padding: "8px 18px",
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f1f5f9";
                e.target.style.color = "#0066cc";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#475569";
              }}
            >
              Hạng phòng
            </button>
            <button
              onClick={() => scrollToSection(amenitiesSectionRef)}
              style={{
                background: "transparent",
                border: "none",
                color: "#475569",
                fontWeight: "600",
                fontSize: "14px",
                padding: "8px 18px",
                borderRadius: "20px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#f1f5f9";
                e.target.style.color = "#0066cc";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#475569";
              }}
            >
              Dịch vụ & Tiện ích
            </button>
          </nav>
        )}

        <button
          onClick={onBackToLogin}
          className="btn btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 20px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "30px",
            boxShadow: "0 4px 12px rgba(0, 102, 204, 0.25)"
          }}
        >
          <LogOut size={15} />
          <span>Nhân viên đăng nhập</span>
        </button>
      </header>

      {/* Progress Tracker (Only shown during booking wizard Steps 2, 3, 4) */}
      {step > 1 && (
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-color)",
            padding: "16px 0",
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 20px",
            }}
          >
            {[
              { s: 1, label: "Chọn ngày" },
              { s: 2, label: "Chọn phòng" },
              { s: 3, label: "Thông tin liên hệ" },
              { s: 4, label: "Hoàn tất" },
            ].map((item, idx) => (
              <React.Fragment key={item.s}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: step >= item.s ? 1 : 0.4,
                    color: step === item.s ? "var(--primary)" : "inherit",
                    fontWeight: step === item.s ? "600" : "400",
                    transition: "var(--transition-fast)",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor:
                        step > item.s
                          ? "var(--color-available)"
                          : step === item.s
                            ? "var(--primary)"
                            : "rgba(255,255,255,0.05)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {step > item.s ? <Check size={12} /> : item.s}
                  </div>
                  <span style={{ fontSize: "13px" }}>{item.label}</span>
                </div>
                {idx < 3 && (
                  <ChevronRight
                    size={16}
                    style={{
                      color: "var(--text-muted)",
                      opacity: step > item.s ? 0.8 : 0.3,
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        {/* STEP 1: HOME PAGE / LANDING WEBSITE */}
        {step === 1 && (
          <div>
            {/* HERO SECTION */}
            <section
              style={{
                position: "relative",
                padding: "120px 20px 100px 20px",
                background:
                  "linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(10, 11, 16, 0) 100%), var(--bg-primary)",
                textAlign: "center",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Floating decorative elements */}
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  right: "5%",
                  width: "300px",
                  height: "300px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(0,0,0,0) 70%)",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "10%",
                  left: "5%",
                  width: "350px",
                  height: "350px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(0,0,0,0) 70%)",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />

              {/* Tagline */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "var(--primary-glow)",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                  color: "var(--primary)",
                  fontWeight: "600",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "1.2px",
                  marginBottom: "24px",
                  zIndex: 1,
                  boxShadow: "0 4px 10px rgba(99, 102, 241, 0.05)",
                }}
              >
                <Sparkles size={12} />
                <span>Thiên đường nghỉ dưỡng lý tưởng</span>
              </div>

              {/* Main Heading */}
              <h1
                style={{
                  fontSize: "clamp(32px, 5vw, 56px)",
                  fontWeight: "800",
                  lineHeight: "1.15",
                  color: "var(--text-primary)",
                  maxWidth: "850px",
                  margin: "0 auto 20px auto",
                  letterSpacing: "-1px",
                  zIndex: 1,
                }}
              >
                Khám Phá Kỳ Nghỉ Tuyệt Vời Tại <br />
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Roomi Resort & Villas
                </span>
              </h1>

              {/* Subheading description */}
              <p
                style={{
                  fontSize: "clamp(14px, 1.8vw, 17px)",
                  color: "var(--text-secondary)",
                  maxWidth: "650px",
                  margin: "0 auto 48px auto",
                  lineHeight: "1.6",
                  zIndex: 1,
                }}
              >
                Đắm mình trong không gian sang trọng tinh tế, hài hòa cùng thiên
                nhiên hùng vĩ và trải nghiệm dịch vụ khách sạn đẳng cấp quốc tế.
              </p>

              {/* INLINE BOOKING BAR */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "920px",
                  margin: "0 auto",
                  zIndex: 2,
                }}
              >
                <form
                  onSubmit={handleDateSubmit}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    backgroundColor: "var(--bg-glass)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 24px",
                    gap: "16px",
                    alignItems: "center",
                    boxShadow: "var(--shadow-lg), var(--shadow-glow)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {/* Check-in Date */}
                  <div
                    style={{
                      flex: "1 1 180px",
                      minWidth: "160px",
                      textAlign: "left",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: "6px",
                        display: "block",
                        paddingLeft: "4px",
                      }}
                    >
                      Ngày nhận phòng
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                        style={{
                          width: "100%",
                          height: "42px",
                          paddingLeft: "36px",
                          fontSize: "13px",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                      <Calendar
                        size={14}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "14px",
                          color: "var(--text-muted)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Check-out Date */}
                  <div
                    style={{
                      flex: "1 1 180px",
                      minWidth: "160px",
                      textAlign: "left",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: "6px",
                        display: "block",
                        paddingLeft: "4px",
                      }}
                    >
                      Ngày trả phòng
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        min={
                          checkInDate || new Date().toISOString().split("T")[0]
                        }
                        required
                        style={{
                          width: "100%",
                          height: "42px",
                          paddingLeft: "36px",
                          fontSize: "13px",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                      <Calendar
                        size={14}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "14px",
                          color: "var(--text-muted)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Room Type */}
                  <div
                    style={{
                      flex: "1 1 200px",
                      minWidth: "180px",
                      textAlign: "left",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: "6px",
                        display: "block",
                        paddingLeft: "4px",
                      }}
                    >
                      Hạng phòng
                    </label>
                    <select
                      value={roomTypeId}
                      onChange={(e) => setRoomTypeId(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        fontSize: "13px",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <option value="">Tất cả hạng phòng</option>
                      {roomTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Button */}
                  <div
                    style={{
                      flex: "1 1 140px",
                      minWidth: "120px",
                      alignSelf: "flex-end",
                    }}
                  >
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        height: "42px",
                        padding: "0",
                        fontSize: "13.5px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        borderRadius: "var(--radius-md)",
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <div
                          style={{
                            border: "2px solid rgba(255,255,255,0.2)",
                            borderTop: "2px solid white",
                            borderRadius: "50%",
                            width: "16px",
                            height: "16px",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <>
                          <Search size={14} />
                          Tìm phòng
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* STATISTICS SECTION */}
            <section
              style={{
                padding: "40px 20px",
                borderTop: "1px solid var(--border-color)",
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              <div
                style={{
                  maxWidth: "920px",
                  margin: "0 auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "24px",
                  textAlign: "center",
                }}
              >
                {[
                  { count: "150+", label: "Phòng & Villa cao cấp" },
                  { count: "4.9★", label: "Đánh giá từ khách hàng" },
                  { count: "24/7", label: "Hỗ trợ lưu trú chuyên nghiệp" },
                  { count: "100%", label: "Hài lòng & Thư giãn" },
                ].map((stat, idx) => (
                  <div key={idx}>
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: "800",
                        background:
                          "linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: "4px",
                      }}
                    >
                      {stat.count}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        fontWeight: "500",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ROOM TYPES FEATURED SHOWCASE */}
            <section
              ref={roomsSectionRef}
              style={{
                padding: "80px 20px",
                maxWidth: "1000px",
                margin: "0 auto",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    marginBottom: "12px",
                  }}
                >
                  Các Hạng Phòng Nổi Bật
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    maxWidth: "500px",
                    margin: "0 auto",
                  }}
                >
                  Hệ thống phòng ốc được thiết kế tối giản, hiện đại, trang bị
                  đầy đủ nội thất sang trọng mang lại giấc ngủ êm ái tối đa.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "30px",
                }}
              >
                {roomTypes.map((type) => (
                  <div
                    key={type.id}
                    className="card glow-card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: 0,
                      overflow: "hidden",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    {/* Header Image box */}
                    <div
                      style={{
                        height: "180px",
                        background: type.roomTypeImg
                          ? "none"
                          : "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-end",
                        padding: "20px",
                        borderBottom: "1px solid var(--border-color)",
                        overflow: "hidden",
                      }}
                    >
                      {type.roomTypeImg && (
                        <img
                          src={type.roomTypeImg}
                          alt={type.name}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            zIndex: 0,
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      {type.roomTypeImg && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background:
                              "linear-gradient(to top, rgba(10, 11, 16, 0.85) 0%, rgba(10, 11, 16, 0.2) 60%, rgba(0,0,0,0) 100%)",
                            zIndex: 1,
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          top: "16px",
                          right: "16px",
                          backgroundColor: "var(--primary-glow)",
                          color: "var(--primary)",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          zIndex: 2,
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        ĐƯỢC ƯU THÍCH
                      </div>
                      <div style={{ position: "relative", zIndex: 2 }}>
                        <h3
                          style={{
                            fontSize: "20px",
                            fontWeight: "800",
                            margin: 0,
                            color: "white",
                          }}
                        >
                          {type.name}
                        </h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div
                      style={{
                        padding: "24px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <User size={14} /> Sức chứa tiêu chuẩn:{" "}
                        <strong>{type.capacity} khách</strong>
                      </div>

                      {type.amenities && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {type.amenities
                            .split(",")
                            .slice(0, 3)
                            .map((amenity, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(255,255,255,0.03)",
                                  border: "1px solid var(--border-color)",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {amenity.trim()}
                              </span>
                            ))}
                          {type.amenities.split(",").length > 3 && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                alignSelf: "center",
                                marginLeft: "2px",
                              }}
                            >
                              +{type.amenities.split(",").length - 3} tiện ích
                              khác
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: "16px",
                          borderTop: "1px solid var(--border-color)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              display: "block",
                            }}
                          >
                            Giá khởi điểm
                          </span>
                          <span
                            style={{
                              fontSize: "18px",
                              fontWeight: "800",
                              color: "var(--primary)",
                            }}
                          >
                            {type.basePrice?.toLocaleString("vi-VN")}{" "}
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "500",
                                color: "var(--text-muted)",
                              }}
                            >
                              VND / đêm
                            </span>
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setRoomTypeId(type.id);
                            // Scroll to date search form
                            window.scrollTo({ top: 180, behavior: "smooth" });
                            showNotification(
                              `Đã chọn lọc theo ${type.name}, vui lòng chọn ngày ở trên!`,
                              "info",
                            );
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontWeight: "600" }}
                        >
                          Chọn hạng
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* PREMIUM SERVICES & AMENITIES */}
            <section
              ref={amenitiesSectionRef}
              style={{
                padding: "80px 20px",
                backgroundColor: "var(--bg-secondary)",
                borderTop: "1px solid var(--border-color)",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "56px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--primary)",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Tiện ích đẳng cấp
                  </span>
                  <h2
                    style={{
                      fontSize: "28px",
                      fontWeight: "800",
                      marginTop: "8px",
                    }}
                  >
                    Trải Nghiệm Dịch Vụ Nghỉ Dưỡng Hoàn Hảo
                  </h2>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "24px",
                  }}
                >
                  {[
                    {
                      icon: Utensils,
                      title: "Ẩm thực thượng hạng",
                      desc: "Hệ thống nhà hàng đa dạng các món ăn Á-Âu chuẩn 5 sao chế biến từ nguồn hải sản tươi sống.",
                    },
                    {
                      icon: Waves,
                      title: "Bể bơi vô cực",
                      desc: "Thư giãn ngắm hoàng hôn tại bể bơi ngoài trời rộng lớn với view trọn cảnh biển xanh cát trắng.",
                    },
                    {
                      icon: Coffee,
                      title: "Quầy Bar & Lounge",
                      desc: "Thưởng thức những ly cocktail được sáng tạo độc đáo từ chuyên viên pha chế tài ba.",
                    },
                    {
                      icon: Compass,
                      title: "Hoạt động dã ngoại",
                      desc: "Tour trekking khám phá thiên nhiên hoang sơ, chèo thuyền Kayak hay lửa trại bờ biển.",
                    },
                  ].map((service, idx) => {
                    const Icon = service.icon;
                    return (
                      <div
                        key={idx}
                        className="card"
                        style={{
                          padding: "24px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                          backgroundColor: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            backgroundColor: "var(--primary-glow)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--primary)",
                          }}
                        >
                          <Icon size={22} />
                        </div>
                        <div>
                          <h3
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              marginBottom: "8px",
                              color: "var(--text-primary)",
                            }}
                          >
                            {service.title}
                          </h3>
                          <p
                            style={{
                              fontSize: "12.5px",
                              color: "var(--text-secondary)",
                              lineHeight: "1.6",
                            }}
                          >
                            {service.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* TESTIMONIALS SECTION */}
            <section
              style={{
                padding: "80px 20px",
                maxWidth: "1000px",
                margin: "0 auto",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "56px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--primary)",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Khách hàng nói gì
                </span>
                <h2
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    marginTop: "8px",
                  }}
                >
                  Nhận Xét Từ Khách Lưu Trú
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "24px",
                }}
              >
                {[
                  {
                    name: "Nguyễn Thanh H.",
                    role: "Cặp đôi lưu trú",
                    rating: 5,
                    comment:
                      "Không gian resort thực sự thanh tịnh, view phòng tuyệt đẹp ngắm trọn biển. Nhân viên phục vụ rất tinh tế, chu đáo. Kỳ nghỉ hoàn toàn mãn nguyện!",
                  },
                  {
                    name: "Trần Minh T.",
                    role: "Gia đình lưu trú",
                    rating: 5,
                    comment:
                      "Bể bơi vô cực sạch sẽ, các bé nhà mình rất thích. Đồ ăn sáng buffet đa dạng các món ăn Việt Nam chất lượng. Sẽ chắc chắn quay lại Roomi.",
                  },
                  {
                    name: "Emma Watson",
                    role: "Khách quốc tế",
                    rating: 5,
                    comment:
                      "Beautiful scenery, perfect layout, and very modern setup. The staff helped me book an amazing kayak tour. Highly recommended homestay experience!",
                  },
                ].map((feedback, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      padding: "24px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        marginBottom: "14px",
                      }}
                    >
                      {[...Array(feedback.rating)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill="var(--color-cleaning)"
                          color="var(--color-cleaning)"
                        />
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        lineHeight: "1.6",
                        fontStyle: "italic",
                        marginBottom: "16px",
                      }}
                    >
                      "{feedback.comment}"
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: "var(--primary-glow)",
                          color: "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      >
                        {feedback.name[0]}
                      </div>
                      <div>
                        <h4
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            margin: 0,
                          }}
                        >
                          {feedback.name}
                        </h4>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {feedback.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* LOCATION & POLICIES */}
            <section
              style={{
                padding: "60px 20px",
                borderTop: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              <div
                style={{
                  maxWidth: "920px",
                  margin: "0 auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "40px",
                }}
              >
                {/* Contact info */}
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      marginBottom: "16px",
                    }}
                  >
                    Vị Trí & Liên Hệ
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {propertySettings?.address && (
                      <p style={{ display: "flex", gap: "8px", margin: 0 }}>
                        <MapPin
                          size={16}
                          color="var(--primary)"
                          style={{ flexShrink: 0 }}
                        />
                        <span>{propertySettings.address}</span>
                      </p>
                    )}
                    {propertySettings?.phone && (
                      <p style={{ display: "flex", gap: "8px", margin: 0 }}>
                        <Phone size={16} color="var(--primary)" />
                        <span>{propertySettings.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Hotel Rules / Policies */}
                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      marginBottom: "16px",
                    }}
                  >
                    Chính Sách Lưu Trú
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {propertySettings?.defaultCheckinTime && (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <Clock size={14} color="var(--color-available)" />
                        <span>
                          Nhận phòng (Check-in): <strong>{propertySettings.defaultCheckinTime.substring(0, 5)}</strong> hằng ngày
                        </span>
                      </div>
                    )}
                    {propertySettings?.defaultCheckoutTime && (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <Clock size={14} color="var(--color-maintenance)" />
                        <span>
                          Trả phòng (Check-out): <strong>{propertySettings.defaultCheckoutTime.substring(0, 5)}</strong> trưa hằng ngày
                        </span>
                      </div>
                    )}
                    {propertySettings?.freeCancelHours != null && (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <Shield size={14} color="var(--primary)" />
                        <span>
                          Hủy phòng miễn phí trước <strong>{propertySettings.freeCancelHours} giờ</strong> so với thời gian nhận phòng
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* STEP 2: ROOM SELECTION */}
        {step === 2 && (
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              padding: "20px 20px 60px 20px",
            }}
          >
            {/* Filter Section */}
            <div
              className="card"
              style={{
                padding: "20px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <span
                  style={{ fontSize: "13px", color: "var(--text-secondary)" }}
                >
                  Kỳ lưu trú đã chọn:
                </span>
                <strong style={{ marginLeft: "6px", fontSize: "14px" }}>
                  {formatDateVN(checkInDate)} → {formatDateVN(checkOutDate)}
                </strong>
                <span
                  style={{
                    marginLeft: "12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  (
                  {Math.round(
                    (new Date(checkOutDate) - new Date(checkInDate)) /
                      (1000 * 60 * 60 * 24),
                  )}{" "}
                  đêm)
                </span>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <button
                  onClick={() => setStep(1)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <ArrowLeft size={12} /> Đổi ngày
                </button>

                <select
                  value={roomTypeId}
                  onChange={handleFilterTypeChange}
                  style={{
                    height: "36px",
                    minWidth: "180px",
                    fontSize: "13px",
                  }}
                  disabled={loading}
                >
                  <option value="">Lọc tất cả loại phòng</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Room list layout */}
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "100px 0",
                }}
              >
                <div
                  style={{
                    border: "4px solid rgba(255, 255, 255, 0.1)",
                    borderTop: "4px solid var(--primary)",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
            ) : availableRooms.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  gap: "24px",
                }}
              >
                {availableRooms.map((room) => {
                  const nightPrice = room.expectedPrice / room.nights;
                  return (
                    <div
                      key={room.roomId}
                      className="card glow-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        padding: 0,
                        border: "1px solid var(--border-color)",
                        transition: "transform var(--transition-normal)",
                      }}
                    >
                      {/* Image placeholder or Header with Gradient */}
                      <div
                        style={{
                          height: "150px",
                          background: room.roomTypeImg
                            ? "none"
                            : "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                          position: "relative",
                          display: "flex",
                          alignItems: "flex-end",
                          padding: "16px",
                          borderBottom: "1px solid var(--border-color)",
                          overflow: "hidden",
                        }}
                      >
                        {room.roomTypeImg && (
                          <img
                            src={room.roomTypeImg}
                            alt={room.roomTypeName}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              zIndex: 0,
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        {room.roomTypeImg && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              background:
                                "linear-gradient(to top, rgba(10, 11, 16, 0.85) 0%, rgba(10, 11, 16, 0.1) 60%, rgba(0,0,0,0) 100%)",
                              zIndex: 1,
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: "absolute",
                            top: "12px",
                            left: "12px",
                            backgroundColor: "var(--primary)",
                            color: "white",
                            padding: "4px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "11px",
                            fontWeight: "700",
                            boxShadow: "0 2px 6px rgba(99, 102, 241, 0.25)",
                            zIndex: 2,
                          }}
                        >
                          TẦNG {room.floor}
                        </div>
                        <div style={{ position: "relative", zIndex: 2 }}>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.75)",
                              textTransform: "uppercase",
                              fontWeight: "600",
                              display: "block",
                            }}
                          >
                            {room.roomTypeName}
                          </span>
                          <h3
                            style={{
                              fontSize: "20px",
                              fontWeight: "800",
                              margin: "4px 0 0 0",
                              color: "white",
                            }}
                          >
                            Phòng {room.roomNumber}
                          </h3>
                        </div>
                      </div>

                      {/* Room details */}
                      <div
                        style={{
                          padding: "20px",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <User size={14} /> Sức chứa: {room.capacity} người
                          </span>
                        </div>

                        {room.amenities && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {room.amenities.split(",").map((amenity, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(255,255,255,0.03)",
                                  border: "1px solid var(--border-color)",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {amenity.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price Details */}
                        <div
                          style={{
                            marginTop: "auto",
                            paddingTop: "16px",
                            borderTop: "1px solid var(--border-color)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-end",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                display: "block",
                              }}
                            >
                              Mức giá mỗi đêm
                            </span>
                            <span
                              style={{
                                fontSize: "16px",
                                fontWeight: "700",
                                color: "var(--text-primary)",
                              }}
                            >
                              {nightPrice.toLocaleString("vi-VN")}{" "}
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "400",
                                  color: "var(--text-muted)",
                                }}
                              >
                                VND
                              </span>
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                display: "block",
                              }}
                            >
                              Tổng tiền ({room.nights} đêm)
                            </span>
                            <span
                              style={{
                                fontSize: "20px",
                                fontWeight: "800",
                                color: "var(--primary)",
                              }}
                            >
                              {room.expectedPrice.toLocaleString("vi-VN")}{" "}
                              <span
                                style={{ fontSize: "12px", fontWeight: "500" }}
                              >
                                VND
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Select button */}
                      <button
                        onClick={() => handleSelectRoom(room)}
                        className="btn btn-primary"
                        style={{
                          width: "100%",
                          borderRadius: 0,
                          padding: "12px",
                          fontWeight: "600",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        Đặt phòng này <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="card"
                style={{ padding: "60px", textAlign: "center" }}
              >
                <Info
                  size={40}
                  style={{
                    color: "var(--color-maintenance)",
                    marginBottom: "16px",
                  }}
                />
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    marginBottom: "8px",
                  }}
                >
                  Không có phòng trống
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    maxWidth: "400px",
                    margin: "0 auto",
                  }}
                >
                  Rất tiếc, hiện tại không còn phòng trống nào khớp với yêu cầu
                  tìm kiếm của bạn trong khoảng thời gian này. Vui lòng đổi lại
                  ngày nhận/trả phòng.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CONTACT FORM */}
        {step === 3 && selectedRoom && (
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              padding: "20px 20px 60px 20px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              className="card glow-card"
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "40px 32px",
                backgroundColor: "var(--bg-glass)",
              }}
            >
              <button
                onClick={() => setStep(2)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  marginBottom: "24px",
                  padding: 0,
                }}
              >
                <ArrowLeft size={14} /> Quay lại chọn phòng
              </button>

              <div style={{ marginBottom: "24px" }}>
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    margin: "0 0 6px 0",
                  }}
                >
                  Thông tin khách hàng
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Vui lòng cung cấp chính xác thông tin liên hệ để hoàn tất đặt
                  phòng.
                </p>
              </div>

              {/* Selected Room Summary Box */}
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "24px",
                  fontSize: "13.5px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span>Phòng đã chọn:</span>
                  <strong>
                    Phòng {selectedRoom.roomNumber} ({selectedRoom.roomTypeName}
                    )
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span>Thời gian lưu trú:</span>
                  <strong>
                    {formatDateVN(checkInDate)} → {formatDateVN(checkOutDate)} (
                    {selectedRoom.nights} đêm)
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "8px",
                    marginTop: "8px",
                  }}
                >
                  <span>Tổng tiền (đã tính theo mùa):</span>
                  <strong style={{ color: "var(--primary)", fontSize: "16px" }}>
                    {selectedRoom.expectedPrice.toLocaleString("vi-VN")} VND
                  </strong>
                </div>
              </div>

              <form
                onSubmit={handleGuestSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    Họ và tên *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      required
                      value={guestDetails.fullName}
                      onChange={(e) =>
                        setGuestDetails((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        height: "42px",
                        paddingLeft: "38px",
                      }}
                    />
                    <User
                      size={16}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "13px",
                        color: "var(--text-muted)",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      Số điện thoại *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="tel"
                        placeholder="0901234567"
                        required
                        value={guestDetails.phone}
                        onChange={(e) =>
                          setGuestDetails((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          height: "42px",
                          paddingLeft: "38px",
                        }}
                      />
                      <Phone
                        size={16}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "13px",
                          color: "var(--text-muted)",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      Số CCCD / Hộ chiếu *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="001234567890"
                        required
                        value={guestDetails.idNumber}
                        onChange={(e) =>
                          setGuestDetails((prev) => ({
                            ...prev,
                            idNumber: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          height: "42px",
                          paddingLeft: "38px",
                        }}
                      />
                      <CreditCard
                        size={16}
                        style={{
                          position: "absolute",
                          left: "12px",
                          top: "13px",
                          color: "var(--text-muted)",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    Địa chỉ Email (Tùy chọn)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      placeholder="nguyenvana@email.com"
                      value={guestDetails.email}
                      onChange={(e) =>
                        setGuestDetails((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        height: "42px",
                        paddingLeft: "38px",
                      }}
                    />
                    <Mail
                      size={16}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "13px",
                        color: "var(--text-muted)",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    Yêu cầu đặc biệt / Ghi chú (Tùy chọn)
                  </label>
                  <div style={{ position: "relative" }}>
                    <textarea
                      placeholder="Ví dụ: Phòng yên tĩnh, nhận phòng muộn..."
                      value={guestDetails.note}
                      onChange={(e) =>
                        setGuestDetails((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px 12px 12px 38px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        resize: "vertical",
                      }}
                    />
                    <FileText
                      size={16}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "14px",
                        color: "var(--text-muted)",
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "14px",
                    marginTop: "10px",
                    fontSize: "15px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <div
                      style={{
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <>
                      <Check size={16} />
                      Hoàn tất đặt phòng
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS PAGE / RECEIPT */}
        {step === 4 && createdBooking && (
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              padding: "20px 20px 60px 20px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              className="card glow-card"
              style={{
                width: "100%",
                maxWidth: "560px",
                padding: "40px 32px",
                backgroundColor: "var(--bg-glass)",
                textAlign: "center",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "var(--color-available)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px auto",
                }}
              >
                <CheckCircle size={40} />
              </div>

              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "var(--text-primary)",
                  margin: "0 0 6px 0",
                }}
              >
                Yêu cầu đặt phòng đã được ghi nhận!
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "32px",
                  lineHeight: "1.6",
                }}
              >
                Cảm ơn bạn đã lựa chọn Roomi! Yêu cầu của bạn đã được chuyển tới
                lễ tân. Bộ phận lễ tân sẽ kiểm tra, gán phòng và liên hệ xác
                nhận trong thời gian sớm nhất.
              </p>

              {/* Receipt Summary details */}
              <div
                style={{
                  padding: "24px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  fontSize: "13.5px",
                  marginBottom: "32px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border-color)",
                    paddingBottom: "10px",
                  }}
                >
                  <span>Mã yêu cầu đặt phòng:</span>
                  <strong>#{createdBooking.id}</strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Khách hàng:</span>
                  <strong>
                    {createdBooking.guestFullName || createdBooking.guestName}
                  </strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Số điện thoại:</span>
                  <strong>{createdBooking.guestPhone}</strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>CCCD/CMND:</span>
                  <strong>{createdBooking.guestIdNumber}</strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Hạng phòng đã chọn:</span>
                  <strong>
                    {createdBooking.roomTypeName}{" "}
                    {createdBooking.roomNumber
                      ? `(Phòng ${createdBooking.roomNumber})`
                      : "(Lễ tân gán phòng khi duyệt)"}
                  </strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Check-in:</span>
                  <strong>{formatDateVN(createdBooking.checkInDate)}</strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Check-out:</span>
                  <strong>{formatDateVN(createdBooking.checkOutDate)}</strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Số đêm lưu trú:</span>
                  <strong>{createdBooking.nights} đêm</strong>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Trạng thái đơn:</span>
                  <span
                    className="badge badge-new"
                    style={{ fontWeight: "700" }}
                  >
                    Chờ lễ tân xác nhận
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "12px",
                    marginTop: "4px",
                    fontSize: "15px",
                  }}
                >
                  <span>Tổng tiền thanh toán:</span>
                  <strong style={{ color: "var(--primary)", fontSize: "18px" }}>
                    {createdBooking.totalAmount
                      ? createdBooking.totalAmount.toLocaleString("vi-VN")
                      : createdBooking.expectedPrice
                        ? createdBooking.expectedPrice.toLocaleString("vi-VN")
                        : "0"}{" "}
                    VND
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <button
                  onClick={resetPortal}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "12px", fontWeight: "600" }}
                >
                  Đặt phòng mới
                </button>
                <button
                  onClick={resetPortal}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "12px", fontWeight: "600" }}
                >
                  Quay lại trang chủ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: "24px",
          textAlign: "center",
          borderTop: "1px solid var(--border-color)",
          fontSize: "12px",
          color: "var(--text-muted)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        © {new Date().getFullYear()} Roomi Hotel Management System. Tất cả các
        quyền được bảo lưu.
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default BookingPortal;
