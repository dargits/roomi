# Hướng dẫn FE — Tính năng Khách đặt phòng

> Base URL: `http://localhost:8080`  
> Không yêu cầu đăng nhập — tất cả endpoint trong flow này đều public.

---

## Tổng quan luồng

```
Bước 1: Khách chọn ngày check-in / check-out
         ↓
Bước 2: Load danh sách phòng trống + giá dự kiến
         ↓
Bước 3: Khách chọn phòng muốn đặt
         ↓
Bước 4: Khách nhập thông tin cá nhân
         ↓
Bước 5: Gọi API tạo booking → hiển thị trang xác nhận
```

---

## Bước 1 — Chọn ngày

Không cần gọi API. FE tự render date picker:

- `checkInDate` — ngày nhận phòng (không được là ngày trong quá khứ)
- `checkOutDate` — ngày trả phòng (phải sau `checkInDate`)

Validation phía FE trước khi gọi API:
```js
if (checkInDate >= checkOutDate) → "Ngày trả phòng phải sau ngày nhận phòng"
if (checkInDate < today)         → "Ngày nhận phòng không được trong quá khứ"
```

---

## Bước 2 — Load danh sách phòng trống

### `GET /api/v1/calendar/available-rooms`

Trả về danh sách phòng còn trống kèm giá dự kiến đã tính theo mùa (SeasonalRate).

**Query params:**

| Param        | Kiểu   | Bắt buộc | Mô tả                                        |
|--------------|--------|----------|----------------------------------------------|
| `checkIn`    | string | ✅       | Ngày nhận phòng `YYYY-MM-DD`                 |
| `checkOut`   | string | ✅       | Ngày trả phòng `YYYY-MM-DD`                  |
| `roomTypeId` | number | ❌       | Lọc theo loại phòng; bỏ qua để lấy tất cả   |

**Ví dụ request:**
```
GET /api/v1/calendar/available-rooms?checkIn=2026-08-10&checkOut=2026-08-14
GET /api/v1/calendar/available-rooms?checkIn=2026-08-10&checkOut=2026-08-14&roomTypeId=2
```

**Response (200):**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "roomId": 3,
      "roomNumber": "103",
      "floor": "1",
      "roomTypeId": 1,
      "roomTypeName": "Phòng Standard",
      "capacity": 2,
      "amenities": "1 giường đôi, TV, Điều hòa, WiFi, Nước nóng",
      "expectedPrice": 3000000,
      "nights": 4
    },
    {
      "roomId": 7,
      "roomNumber": "201",
      "floor": "2",
      "roomTypeId": 2,
      "roomTypeName": "Phòng Deluxe",
      "capacity": 3,
      "amenities": "1 giường đôi + 1 giường đơn, TV, Điều hòa, WiFi, Tủ lạnh, Ban công",
      "expectedPrice": 4800000,
      "nights": 4
    }
  ]
}
```

**Ghi chú render UI:**
- `expectedPrice` là giá toàn bộ kỳ lưu trú (đã nhân số đêm), không phải giá mỗi đêm
- Giá mỗi đêm hiển thị = `expectedPrice / nights`
- `data` rỗng → thông báo "Không còn phòng trống trong khoảng thời gian này"

---

## (Tuỳ chọn) Load danh sách loại phòng để hiển thị filter

### `GET /api/v1/room-types`

**Response (200):**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "name": "Phòng Standard",
      "capacity": 2,
      "amenities": "1 giường đôi, TV, Điều hòa, WiFi, Nước nóng",
      "basePrice": 500000
    },
    {
      "id": 2,
      "name": "Phòng Deluxe",
      "capacity": 3,
      "amenities": "1 giường đôi + 1 giường đơn, TV, Điều hòa, WiFi, Tủ lạnh, Ban công",
      "basePrice": 800000
    }
  ]
}
```

> `basePrice` là giá mặc định mỗi đêm, **chưa tính giá theo mùa**.  
> Giá thực tế chính xác lấy từ `expectedPrice` trong API `available-rooms`.

---

## Bước 3 — Khách chọn phòng

FE lưu lại `roomId` và `roomTypeId` của phòng được chọn để dùng ở bước 5.

---

## Bước 4 — Nhập thông tin khách

Form cần thu thập:

| Field      | Label              | Bắt buộc | Ghi chú             |
|------------|--------------------|----------|---------------------|
| `fullName` | Họ và tên          | ✅       | Tối đa 150 ký tự    |
| `phone`    | Số điện thoại      | ✅       | Tối đa 20 ký tự     |
| `idNumber` | Số CCCD / Hộ chiếu | ✅       | Tối đa 30 ký tự     |
| `email`    | Email              | ❌       | Tối đa 150 ký tự    |
| `note`     | Ghi chú            | ❌       | Yêu cầu đặc biệt... |

---

## Bước 5 — Tạo booking

### `POST /api/v1/bookings/public`

Endpoint public, không yêu cầu token. Dành cho khách tự đặt phòng qua website.

**Headers:**
```
Content-Type: application/json
```

**Request body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "idNumber": "001234567890",
  "email": "nguyenvana@email.com",
  "note": "Cần phòng yên tĩnh",
  "roomTypeId": 1,
  "roomId": 3,
  "checkInDate": "2026-08-10",
  "checkOutDate": "2026-08-14",
  "source": "BOOKING_PORTAL"
}
```

| Field          | Kiểu   | Bắt buộc | Mô tả                                                    |
|----------------|--------|----------|----------------------------------------------------------|
| `fullName`     | string | ✅       | Họ tên đầy đủ                                            |
| `phone`        | string | ✅       | Số điện thoại                                            |
| `idNumber`     | string | ✅       | Số CCCD hoặc hộ chiếu                                    |
| `email`        | string | ❌       | Email liên hệ                                            |
| `note`         | string | ❌       | Ghi chú / yêu cầu đặc biệt                               |
| `roomTypeId`   | number | ✅       | ID loại phòng (lấy từ `available-rooms`)                  |
| `roomId`       | number | ❌       | ID phòng cụ thể (lấy từ `available-rooms`, nên truyền)   |
| `checkInDate`  | string | ✅       | Ngày nhận phòng `YYYY-MM-DD`                              |
| `checkOutDate` | string | ✅       | Ngày trả phòng `YYYY-MM-DD`                               |
| `source`       | string | ❌       | Nên truyền `BOOKING_PORTAL` cho web; mặc định `WALK_IN`  |

> Nên truyền `roomId` để đặt phòng cụ thể và booking sẽ tự chuyển sang trạng thái `CONFIRMED`.  
> Nếu chỉ truyền `roomTypeId` mà không có `roomId`, booking tạo ra ở trạng thái `NEW` — nhân viên sẽ gán phòng sau.

**Response thành công (201):**
```json
{
  "mess": "Đặt phòng thành công",
  "data": {
    "id": 42,
    "guestId": 5,
    "guestName": "Nguyễn Văn A",
    "guestFullName": "Nguyễn Văn A",
    "guestPhone": "0901234567",
    "guestIdNumber": "001234567890",
    "guestEmail": "nguyenvana@email.com",
    "roomTypeId": 1,
    "roomTypeName": "Phòng Standard",
    "roomId": 3,
    "roomNumber": "103",
    "checkInDate": "2026-08-10",
    "checkOutDate": "2026-08-14",
    "nights": 4,
    "status": "CONFIRMED",
    "source": "BOOKING_PORTAL",
    "note": "Cần phòng yên tĩnh",
    "expectedPrice": 3000000,
    "roomCharge": 3000000,
    "serviceCharge": 0,
    "totalAmount": 3000000,
    "createdAt": "2026-07-29T10:30:00"
  }
}
```

**Trạng thái booking sau khi tạo:**

| Truyền `roomId`? | Trạng thái     | Ý nghĩa                        |
|------------------|----------------|--------------------------------|
| Có               | `CONFIRMED`    | Phòng đã gán, chờ khách đến   |
| Không            | `NEW`          | Chờ nhân viên gán phòng        |

**Trang xác nhận nên hiển thị:**
- Mã đặt phòng: `data.id`
- Họ tên: `data.guestName`
- Phòng: `data.roomNumber` — `data.roomTypeName` (nếu có)
- Ngày nhận phòng: `data.checkInDate`
- Ngày trả phòng: `data.checkOutDate`
- Số đêm: `data.nights`
- Tổng tiền dự kiến: `data.totalAmount`
- Trạng thái: `data.status` (`CONFIRMED` = xác nhận / `NEW` = đang xử lý)

---

## Xử lý lỗi

**Format lỗi:**
```json
{
  "mess": "Mô tả lỗi cụ thể",
  "code": "BOOK_003"
}
```

| HTTP | Error code | Nguyên nhân                                       | Xử lý FE                                          |
|------|------------|---------------------------------------------------|---------------------------------------------------|
| 400  | `VAL_001`  | Thiếu hoặc sai định dạng field bắt buộc           | Hiển thị lỗi validation dưới từng field           |
| 400  | `BOOK_002` | checkInDate >= checkOutDate hoặc ngày quá khứ     | Thông báo lỗi ngày                                |
| 400  | `BOOK_003` | Phòng đã có người đặt trong khoảng thời gian đó   | "Phòng vừa được đặt, vui lòng chọn phòng khác" → reload `available-rooms` |
| 400  | `BOOK_006` | `roomId` không thuộc `roomTypeId`                 | Lỗi dữ liệu, không nên xảy ra nếu lấy từ API     |
| 500  | `SYS_001`  | Lỗi hệ thống                                      | "Có lỗi xảy ra, vui lòng thử lại sau"             |

---

## Tóm tắt các API cần gọi

| Thứ tự | Method | Endpoint                           | Mục đích                          | Bắt buộc |
|--------|--------|------------------------------------|-----------------------------------|----------|
| 1      | GET    | `/api/v1/room-types`               | Load filter loại phòng            | ❌       |
| 2      | GET    | `/api/v1/calendar/available-rooms` | Load phòng trống + giá dự kiến    | ✅       |
| 3      | POST   | `/api/v1/bookings/public`          | Tạo booking                       | ✅       |

---

## Ví dụ code JavaScript đầy đủ

```js
const BASE = 'http://localhost:8080';

// Bước 2: Load phòng trống
async function loadAvailableRooms(checkIn, checkOut, roomTypeId = null) {
  const params = new URLSearchParams({ checkIn, checkOut });
  if (roomTypeId) params.set('roomTypeId', roomTypeId);

  const res = await fetch(`${BASE}/api/v1/calendar/available-rooms?${params}`);
  const json = await res.json();

  if (!res.ok) throw new Error(json.mess);
  return json.data; // AvailableRoomResponse[]
}

// Bước 5: Tạo booking
async function createBooking({ fullName, phone, idNumber, email, note,
                                roomTypeId, roomId, checkInDate, checkOutDate }) {
  const res = await fetch(`${BASE}/api/v1/bookings/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName, phone, idNumber, email, note,
      roomTypeId, roomId,
      checkInDate, checkOutDate,
      source: 'BOOKING_PORTAL',
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    // json.code và json.mess chứa thông tin lỗi
    if (json.code === 'BOOK_003') {
      throw new Error('Phòng vừa được đặt bởi người khác, vui lòng chọn phòng khác');
    }
    throw new Error(json.mess);
  }

  return json.data; // BookingResponse
}

// --- Ví dụ sử dụng ---

// 1. Load phòng trống
const rooms = await loadAvailableRooms('2026-08-10', '2026-08-14');
// rooms[0] = { roomId: 3, roomNumber: '103', roomTypeId: 1, expectedPrice: 3000000, nights: 4, ... }

// 2. Khách chọn phòng (giả sử chọn rooms[0])
const selectedRoom = rooms[0];

// 3. Tạo booking sau khi khách nhập form
try {
  const booking = await createBooking({
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    idNumber: '001234567890',
    email: 'nguyenvana@email.com',
    roomTypeId: selectedRoom.roomTypeId,
    roomId: selectedRoom.roomId,
    checkInDate: '2026-08-10',
    checkOutDate: '2026-08-14',
  });

  // Hiển thị trang xác nhận
  console.log('Mã đặt phòng:', booking.id);
  console.log('Trạng thái:', booking.status); // CONFIRMED hoặc NEW
  console.log('Tổng tiền:', booking.totalAmount);

} catch (err) {
  console.error(err.message);
}
```
