const fs = require('fs');
const path = require('path');

const backupSourcePath = path.join(__dirname, '..', 'backups', 'stayaway_full_backup_2026_jan_to_sep.sql');
const outputSqlPath = path.join(__dirname, '..', 'backups', 'stayaway_backup_full_operational_2026.sql');

console.log('Reading source backup file:', backupSourcePath);
const sourceSql = fs.readFileSync(backupSourcePath, 'utf8');

let out = [];

out.push('-- =====================================================================');
out.push('-- STAYAWAY HOTEL PMS - COMPLETE PRODUCTION ENTERPRISE DATASET');
out.push('-- Historical Period: 2026-01-01 to 2026-09-27');
out.push('-- Master Configurations + Operational Business Lifecycle');
out.push('-- =====================================================================\n');

out.push('SET FOREIGN_KEY_CHECKS = 0;');
out.push('SET NAMES utf8mb4;\n');

// Clean all tables
const tablesToClean = [
    'audit_logs',
    'system_backups',
    'notifications',
    'notification_role_defaults',
    'payments',
    'invoice_discounts',
    'invoices',
    'booking_service_usages',
    'deposits',
    'room_stay_guests',
    'booking_staying_guests',
    'stay_declarations',
    'debt_collection_logs',
    'debt_approval_requests',
    'booking_confirmation_logs',
    'concurrency_logs',
    'bookings',
    'cashier_shift_closings',
    'cashier_shifts',
    'daily_ledgers',
    'room_cleaning_records',
    'room_incidents',
    'lost_item_logs',
    'lost_items',
    'negotiated_price_items',
    'negotiated_price_agreements',
    'corporate_clients',
    'channel_room_mappings',
    'channel_room_blocks',
    'channel_calendar_sync_logs',
    'channels',
    'identity_documents',
    'guests',
    'extra_service_inventory_items',
    'extra_service',
    'weekend_price_configs',
    'holiday_prices',
    'deposit_policies',
    'cancellation_policies',
    'loyalty_tiers',
    'rooms',
    'room_types',
    'hotel_settings',
    'user_extra_permissions',
    'users'
];

for (const t of tablesToClean) {
    out.push(`DELETE FROM \`${t}\`;`);
    out.push(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1;`);
}
out.push('');

// 1. Users
out.push('-- 1. USERS');
out.push(`INSERT INTO \`users\` (\`id\`, \`account\`, \`name\`, \`password\`, \`email\`, \`phone\`, \`role\`, \`active\`, \`must_change_password\`, \`create_at\`) VALUES
(1, 'admin', 'Bàn Hữu Sự', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'huusu@stayaway.vn', '0981111111', 'ADMIN', 1, 0, '2026-01-01 00:00:00.000000'),
(2, 'chusohuu', 'Trần Thị Mai', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'mai.tran@stayaway.vn', '0982222222', 'OWNER', 1, 0, '2026-01-01 00:00:00.000000'),
(3, 'letan', 'Lê Ngọc Hân', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'han.le@stayaway.vn', '0983333333', 'RECEPTIONIST', 1, 0, '2026-01-01 00:00:00.000000'),
(4, 'buongphong', 'Phạm Thị Yến', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'yen.pham@stayaway.vn', '0984444444', 'HOUSEKEEPER', 1, 0, '2026-01-01 00:00:00.000000'),
(5, 'ketoan', 'Hoàng Minh Trí', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'tri.hoang@stayaway.vn', '0985555555', 'ACCOUNTANT', 1, 0, '2026-01-01 00:00:00.000000'),
(6, 'buongphong2', 'Nguyễn Văn Nam', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'nam.nguyen@stayaway.vn', '0986666666', 'HOUSEKEEPER', 1, 0, '2026-01-01 00:00:00.000000'),
(7, 'letan2', 'Trần Hải Đăng', '2XCGkZtlIuE7qbRsBJAsODchAiGKSz7y9FrCqA6f0kA=', 'dang.tran@stayaway.vn', '0987777777', 'RECEPTIONIST', 1, 0, '2026-01-01 00:00:00.000000');\n`);

// 2. Hotel Settings
out.push('-- 2. HOTEL SETTINGS');
out.push(`INSERT INTO \`hotel_settings\` (\`id\`, \`property_name\`, \`address\`, \`phone\`, \`email\`, \`home_image\`, \`default_checkin_time\`, \`default_checkout_time\`, \`temporary_hold_minutes\`, \`reminder_morning_time\`, \`reminder_evening_time\`, \`reminder_email_enabled\`, \`session_timeout_minutes\`, \`max_session_lifetime_hours\`, \`max_concurrent_sessions\`, \`lost_item_retention_days\`, \`periodic_cleaning_days\`, \`periodic_cleaning_enabled\`, \`price_suggestion_high_threshold\`, \`price_suggestion_low_threshold\`, \`price_suggestion_imminent_days\`, \`public_invoice_lookup_enabled\`, \`auto_backup_enabled\`, \`auto_backup_time\`, \`backup_retention_days\`, \`last_backup_at\`, \`last_backup_status\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'Khách sạn Stay Away Luxury', 'Z115, Phan Đình Phùng, Tp. Thái Nguyên, Tỉnh Thái Nguyên', '0365224245', 'lienhe@stayaway.vn', 'https://res.cloudinary.com/dnyemotdi/image/upload/v1790164724/gomyenal8lfhuhwzlebv.jpg', '14:00:00', '12:00:00', 60, '10:30:00', '19:00:00', 1, 120, 24, 1, 30, 5, 1, 80, 30, 7, 1, 1, '02:00:00', 30, '2026-09-27 16:30:00.000000', 'SUCCESS', '2026-01-01 00:00:00.000000', '2026-09-27 16:30:00.000000');\n`);

// 3. Room Types
out.push('-- 3. ROOM TYPES');
out.push(`INSERT INTO \`room_types\` (\`id\`, \`name\`, \`base_price\`, \`standard_capacity\`, \`max_capacity\`, \`max_child_age_free\`, \`extra_person_charge\`, \`standard_checkout_cleaning_minutes\`, \`standard_periodic_cleaning_minutes\`, \`active\`, \`amenities_description\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'Phòng Tiêu Chuẩn', 500000.00, 2, 2, 6, 150000.00, 30, 20, 1, 'Giường đôi Queen, Điều hòa 2 chiều, TV 43 inch, Wifi tốc độ cao, Minibar, Bình đun nước, Máy sấy tóc', '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(2, 'Phòng Cao Cấp', 700000.00, 2, 2, 6, 150000.00, 35, 25, 1, 'Giường King rộng rãi, Ban công ngắm phố, Smart TV 50 inch, Sofa thư giãn, Bàn làm việc, Minibar cao cấp', '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(3, 'Phòng Sang Trọng', 1000000.00, 2, 3, 6, 200000.00, 40, 30, 1, 'Không gian Suite view toàn cảnh thành phố, Bồn tắm nằm massage, Smart TV 55 inch, Máy pha cafe espresso', '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(4, 'Phòng Tổng Thống', 2000000.00, 2, 4, 6, 300000.00, 50, 35, 1, 'Phòng Penthouse thượng hạng 2 phòng ngủ, Phòng khách riêng biệt, Bồn sục Jacuzzi, Quầy bar sang trọng, Dịch vụ quản gia riêng', '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000');\n`);

// 4. Rooms
out.push('-- 4. ROOMS');
out.push(`INSERT INTO \`rooms\` (\`id\`, \`floor\`, \`room_number\`, \`status\`, \`room_type_id\`, \`created_at\`, \`updated_at\`) VALUES
(1, '1', '101', 'OCCUPIED', 1, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(2, '1', '102', 'OCCUPIED', 1, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(3, '1', '103', 'DIRTY', 1, '2026-01-01 00:00:00.000000', '2026-09-27 11:30:00.000000'),
(4, '1', '104', 'AVAILABLE', 1, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(5, '1', '105', 'AVAILABLE', 1, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(6, '2', '201', 'OCCUPIED', 2, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(7, '2', '202', 'MAINTENANCE', 2, '2026-01-01 00:00:00.000000', '2026-09-27 10:00:00.000000'),
(8, '2', '203', 'OCCUPIED', 2, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(9, '2', '204', 'AVAILABLE', 2, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(10, '2', '205', 'AVAILABLE', 2, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(11, '3', '301', 'OCCUPIED', 3, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(12, '3', '302', 'AVAILABLE', 3, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(13, '3', '303', 'AVAILABLE', 3, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(14, '4', '401', 'AVAILABLE', 4, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000'),
(15, '4', '402', 'AVAILABLE', 4, '2026-01-01 00:00:00.000000', '2026-09-27 14:00:00.000000');\n`);

// 5. Loyalty Tiers
out.push('-- 5. LOYALTY TIERS');
out.push(`INSERT INTO \`loyalty_tiers\` (\`id\`, \`name\`, \`min_points\`, \`discount_percent\`, \`benefit_description\`) VALUES
(1, 'Thành viên Đồng', 0, 0.00, 'Tích lũy 1 điểm mỗi 50.000 đ chi tiêu, nhận bản tin ưu đãi'),
(2, 'Hội viên Bạc', 500, 5.00, 'Giảm 5% giá phòng trực tiếp, ưu tiên xếp phòng tầng cao'),
(3, 'Hội viên Vàng', 1500, 10.00, 'Giảm 10% giá phòng, miễn phí nhận phòng sớm 2 tiếng (khi có phòng), tặng set trái cây chào mừng'),
(4, 'Hội viên Kim Cương', 3500, 15.00, 'Giảm 15% giá phòng & 10% dịch vụ, miễn phí trả phòng trễ đến 15:00, nâng hạng phòng miễn phí');\n`);

// 6. Deposit & Cancellation Policies
out.push('-- 6. POLICIES & PRICING CONFIGS');
out.push(`INSERT INTO \`deposit_policies\` (\`id\`, \`deposit_percent\`, \`is_active\`, \`created_at\`, \`updated_at\`, \`updated_by\`) VALUES
(1, 30.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000', 1);

INSERT INTO \`cancellation_policies\` (\`id\`, \`free_cancel_hours\`, \`penalty_percent\`) VALUES
(1, 24, 50.00);

INSERT INTO \`weekend_price_configs\` (\`id\`, \`room_type_id\`, \`price_per_night\`, \`weekend_days\`, \`active\`, \`created_at\`, \`updated_at\`) VALUES
(1, 1, 575000.00, 'FRIDAY,SATURDAY,SUNDAY', 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(2, 2, 805000.00, 'FRIDAY,SATURDAY,SUNDAY', 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(3, 3, 1150000.00, 'FRIDAY,SATURDAY,SUNDAY', 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(4, 4, 2300000.00, 'FRIDAY,SATURDAY,SUNDAY', 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000');

INSERT INTO \`holiday_prices\` (\`id\`, \`holiday_name\`, \`holiday_date\`, \`room_type_id\`, \`price_per_night\`, \`active\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'Tết Dương Lịch 2026', '2026-01-01', 1, 600000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(2, 'Tết Dương Lịch 2026', '2026-01-01', 2, 850000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(3, 'Tết Dương Lịch 2026', '2026-01-01', 3, 1250000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(4, 'Tết Dương Lịch 2026', '2026-01-01', 4, 2500000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(5, 'Ngày Giải phóng miền Nam 30/4', '2026-04-30', 1, 650000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(6, 'Ngày Giải phóng miền Nam 30/4', '2026-04-30', 2, 900000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(7, 'Ngày Giải phóng miền Nam 30/4', '2026-04-30', 3, 1300000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(8, 'Ngày Giải phóng miền Nam 30/4', '2026-04-30', 4, 2600000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(9, 'Quốc tế Lao động 1/5', '2026-05-01', 1, 650000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(10, 'Quốc tế Lao động 1/5', '2026-05-01', 2, 900000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(11, 'Quốc tế Lao động 1/5', '2026-05-01', 3, 1300000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(12, 'Quốc tế Lao động 1/5', '2026-05-01', 4, 2600000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(13, 'Quốc khánh Việt Nam 2/9', '2026-09-02', 1, 650000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(14, 'Quốc khánh Việt Nam 2/9', '2026-09-02', 2, 900000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(15, 'Quốc khánh Việt Nam 2/9', '2026-09-02', 3, 1300000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000'),
(16, 'Quốc khánh Việt Nam 2/9', '2026-09-02', 4, 2600000.00, 1, '2026-01-01 00:00:00.000000', '2026-01-01 00:00:00.000000');\n`);

// 7. Notification Role Defaults
out.push('-- 7. NOTIFICATION ROLE DEFAULTS');
out.push(`INSERT INTO \`notification_role_defaults\` (\`id\`, \`type\`, \`role\`, \`is_mandatory\`) VALUES
(1, 'CHECKIN_TODAY', 'RECEPTIONIST', 1),
(2, 'CHECKIN_TODAY', 'OWNER', 0),
(3, 'CHECKIN_TODAY', 'ADMIN', 0),
(4, 'CHECKOUT_TODAY', 'RECEPTIONIST', 1),
(5, 'CHECKOUT_TODAY', 'OWNER', 0),
(6, 'CHECKOUT_TODAY', 'ADMIN', 0),
(7, 'ROOM_DIRTY', 'HOUSEKEEPER', 1),
(8, 'ROOM_DIRTY', 'RECEPTIONIST', 0),
(9, 'DEBT_REMINDER', 'ACCOUNTANT', 1),
(10, 'DEBT_REMINDER', 'OWNER', 1),
(11, 'DEBT_REMINDER', 'ADMIN', 1),
(12, 'STAY_MILESTONE', 'OWNER', 1),
(13, 'STAY_MILESTONE', 'ADMIN', 0);\n`);

const lines = sourceSql.split('\n');

function extractLinesForTable(tableName) {
    const prefix = `INSERT INTO \`${tableName}\``;
    return lines.filter(l => l.startsWith(prefix));
}

// 8. Extra Services
out.push('-- 8. EXTRA SERVICES');
out.push(extractLinesForTable('extra_service').join('\n') + '\n');

// 9. Corporate Clients & Negotiated Agreements
out.push('-- 9. CORPORATE CLIENTS & NEGOTIATED AGREEMENTS');
out.push(extractLinesForTable('corporate_clients').join('\n') + '\n');
out.push(extractLinesForTable('negotiated_price_agreements').join('\n') + '\n');

// 10. Negotiated Price Items
out.push('-- 10. NEGOTIATED PRICE ITEMS');
const agreementBaseRates = [
    { id: 1, std: 420000, sup: 600000, dlx: 850000, sui: 1700000 },
    { id: 2, std: 440000, sup: 620000, dlx: 880000, sui: 1750000 },
    { id: 3, std: 410000, sup: 590000, dlx: 820000, sui: 1650000 },
    { id: 4, std: 400000, sup: 580000, dlx: 800000, sui: 1600000 },
    { id: 5, std: 400000, sup: 580000, dlx: 800000, sui: 1600000 },
    { id: 6, std: 425000, sup: 610000, dlx: 860000, sui: 1720000 },
    { id: 7, std: 400000, sup: 580000, dlx: 800000, sui: 1600000 }
];

let npItemRows = [];
for (const ag of agreementBaseRates) {
    npItemRows.push(`(${ag.id}, 1, 'Phòng Tiêu Chuẩn', ${ag.std.toFixed(2)})`);
    npItemRows.push(`(${ag.id}, 2, 'Phòng Cao Cấp', ${ag.sup.toFixed(2)})`);
    npItemRows.push(`(${ag.id}, 3, 'Phòng Sang Trọng', ${ag.dlx.toFixed(2)})`);
    npItemRows.push(`(${ag.id}, 4, 'Phòng Tổng Thống', ${ag.sui.toFixed(2)})`);
}
out.push(`INSERT INTO \`negotiated_price_items\` (\`agreement_id\`, \`room_type_id\`, \`room_type_name\`, \`price_per_night\`) VALUES\n` + npItemRows.join(',\n') + ';\n');

// 11. OTA Channels & Room Mappings
out.push('-- 11. OTA CHANNELS & MAPPINGS');
out.push(extractLinesForTable('channels').join('\n') + '\n');
out.push(extractLinesForTable('channel_room_mappings').join('\n') + '\n');

// 12. Guests
out.push('-- 12. GUESTS');
const guestLines = extractLinesForTable('guests');
out.push(guestLines.join('\n') + '\n');

const guestMap = new Map();
for (const gl of guestLines) {
    const m = gl.match(/VALUES \(([0-9]+), '([^']+)', '([^']+)', '([^']+)', '([^']+)', ([0-9]+), ([0-9]+)/);
    if (m) {
        guestMap.set(parseInt(m[1]), {
            id: parseInt(m[1]),
            name: m[2],
            phone: m[3],
            email: m[4],
            idNumber: m[5],
            points: parseInt(m[6]),
            tierId: parseInt(m[7])
        });
    }
}

// 13. Identity Documents
out.push('-- 13. IDENTITY DOCUMENTS');
let idDocRows = [];
let docId = 1;
for (const [gId, g] of guestMap.entries()) {
    const isPassport = g.idNumber.startsWith('P') || g.idNumber.length < 10;
    if (isPassport) {
        idDocRows.push(`(${docId++}, ${gId}, 'PASSPORT', '${g.idNumber}', 'https://res.cloudinary.com/dnyemotdi/image/upload/v1790000000/passports/passport_${gId}.jpg', 1, '2026-01-01 08:00:00.000000', '2026-01-01 08:00:00.000000')`);
    } else {
        idDocRows.push(`(${docId++}, ${gId}, 'NATIONAL_ID_FRONT', '${g.idNumber}', 'https://res.cloudinary.com/dnyemotdi/image/upload/v1790000000/cccd/front_${gId}.jpg', 1, '2026-01-01 08:00:00.000000', '2026-01-01 08:00:00.000000')`);
        idDocRows.push(`(${docId++}, ${gId}, 'NATIONAL_ID_BACK', '${g.idNumber}', 'https://res.cloudinary.com/dnyemotdi/image/upload/v1790000000/cccd/back_${gId}.jpg', 1, '2026-01-01 08:00:00.000000', '2026-01-01 08:00:00.000000')`);
    }
}
out.push(`INSERT INTO \`identity_documents\` (\`id\`, \`guest_id\`, \`document_type\`, \`document_number\`, \`image_url\`, \`verified\`, \`created_at\`, \`updated_at\`) VALUES\n` + idDocRows.join(',\n') + ';\n');

// 14. Bookings
out.push('-- 14. BOOKINGS');
const bookingLines = extractLinesForTable('bookings');
out.push(bookingLines.join('\n') + '\n');

const parsedBookings = [];
for (const bl of bookingLines) {
    const m = bl.match(/VALUES \(([0-9]+), ([0-9]+), ([0-9]+), ([0-9]+), '([^']+)', '([^']+)', '([^']+)', ([0-9.]+), ([0-9.]+), '([^']+)', (NULL|[0-9]+), (NULL|[0-9]+), (NULL|'[^']+'), (NULL|'[^']+'), '([^']+)', '([^']+)', ([0-9]+), ([0-9]+)\);/);
    if (m) {
        parsedBookings.push({
            id: parseInt(m[1]),
            guestId: parseInt(m[2]),
            roomId: parseInt(m[3]),
            roomTypeId: parseInt(m[4]),
            checkInDate: m[5],
            checkOutDate: m[6],
            status: m[7],
            expectedPrice: m[8],
            actualPrice: m[9],
            source: m[10],
            checkedInAt: m[13] === 'NULL' ? null : m[13].replace(/'/g, ''),
            checkedOutAt: m[14] === 'NULL' ? null : m[14].replace(/'/g, '')
        });
    }
}

// 15. Room Stay Guests & Booking Staying Guests
out.push('-- 15. ROOM STAY GUESTS & BOOKING STAYING GUESTS');
let roomStayGuestRows = [];
let bookingStayingGuestRows = [];
let rsgId = 1;

for (const b of parsedBookings) {
    const g = guestMap.get(b.guestId);
    const gName = g ? g.name : `Khách phòng ${b.roomId}`;
    const gDoc = g ? g.idNumber : `001200${String(1000 + b.id).padStart(6, '0')}`;
    const isPass = gDoc.startsWith('P') || gDoc.length < 10;
    const docType = isPass ? 'PASSPORT' : 'CCCD';
    const birthYear = 1978 + (b.guestId % 25);
    const checkInTime = b.checkedInAt ? `'${b.checkedInAt}'` : `'${b.checkInDate} 14:00:00.000000'`;

    // 1. Primary Guest
    roomStayGuestRows.push(`(${rsgId++}, ${b.id}, '${gName}', ${birthYear}, '${docType}', '${gDoc}', 0, 1, 1, ${checkInTime}, NULL, '${b.checkInDate} 14:00:00.000000', '${b.checkInDate} 14:00:00.000000')`);
    bookingStayingGuestRows.push(`(${b.id}, ${b.guestId})`);

    // 2. Additional guest for multi-capacity rooms (roomTypeId >= 2 and ~45% of bookings)
    if (b.roomTypeId >= 2 && (b.id % 2 === 0)) {
        const isChild = (b.id % 5 === 0);
        if (isChild) {
            const childName = 'Bé ' + gName.split(' ').slice(1).join(' ') + ' Nhi';
            const childBirth = 2021 + (b.id % 3);
            const childDoc = `GKS-${202600 + b.id}`;
            roomStayGuestRows.push(`(${rsgId++}, ${b.id}, '${childName}', ${childBirth}, 'OTHER', '${childDoc}', 1, 1, 0, ${checkInTime}, NULL, '${b.checkInDate} 14:00:00.000000', '${b.checkInDate} 14:00:00.000000')`);
        } else {
            const companionName = (b.id % 3 === 0) ? ('Nguyễn Thị ' + gName.split(' ')[0]) : ('Trần Văn ' + (b.id % 7 + 1));
            const companionBirth = birthYear + (b.id % 4) - 2;
            const companionDoc = `001200${String(7000 + b.id).padStart(6, '0')}`;
            roomStayGuestRows.push(`(${rsgId++}, ${b.id}, '${companionName}', ${companionBirth}, 'CCCD', '${companionDoc}', 0, 1, 0, ${checkInTime}, NULL, '${b.checkInDate} 14:00:00.000000', '${b.checkInDate} 14:00:00.000000')`);
        }
    }
}

out.push(`INSERT INTO \`room_stay_guests\` (\`id\`, \`booking_id\`, \`full_name\`, \`birth_year\`, \`document_type\`, \`document_number\`, \`is_child\`, \`is_exported\`, \`is_primary_guest\`, \`check_in_at\`, \`left_early_at\`, \`created_at\`, \`updated_at\`) VALUES\n` + roomStayGuestRows.join(',\n') + ';\n');
out.push(`INSERT INTO \`booking_staying_guests\` (\`booking_id\`, \`guest_id\`) VALUES\n` + bookingStayingGuestRows.join(',\n') + ';\n');

// 16. Stay Declarations
out.push('-- 16. STAY DECLARATIONS');
let stayDecRows = [];
let sdId = 1;
for (const b of parsedBookings) {
    if (b.status === 'CHECKED_OUT' || b.status === 'CHECKED_IN') {
        const compTime = b.checkedInAt ? `'${b.checkedInAt.replace('14:', '15:')}'` : `'${b.checkInDate} 15:00:00.000000'`;
        stayDecRows.push(`(${sdId++}, ${b.id}, 'COMPLETED', ${compTime}, 3)`);
    } else {
        stayDecRows.push(`(${sdId++}, ${b.id}, 'PENDING', NULL, NULL)`);
    }
}
out.push(`INSERT INTO \`stay_declarations\` (\`id\`, \`booking_id\`, \`status\`, \`completed_at\`, \`completed_by\`) VALUES\n` + stayDecRows.join(',\n') + ';\n');

// 17. Booking Service Usages
out.push('-- 17. BOOKING SERVICE USAGES');
out.push(extractLinesForTable('booking_service_usages').join('\n') + '\n');

// 18. Invoices, Payments, Deposits
out.push('-- 18. INVOICES, PAYMENTS & DEPOSITS');
out.push(extractLinesForTable('invoices').join('\n') + '\n');
out.push(extractLinesForTable('payments').join('\n') + '\n');
out.push(extractLinesForTable('deposits').join('\n') + '\n');

// 19. Invoice Discounts
out.push('-- 19. INVOICE DISCOUNTS');
out.push(`INSERT INTO \`invoice_discounts\` (\`id\`, \`invoice_id\`, \`discount_type\`, \`discount_value\`, \`calculated_amount\`, \`reason\`, \`status\`, \`created_by\`, \`reviewed_by\`, \`reviewed_at\`, \`created_at\`) VALUES
(1, 14, 'PERCENTAGE', 10.00, 80000.00, 'Chiết khấu đoàn công tác lưu trú liên tục trên 3 ngày', 'APPLIED', 3, 2, '2026-01-19 14:30:00.000000', '2026-01-19 14:00:00.000000'),
(2, 28, 'PERCENTAGE', 10.00, 250000.00, 'Ưu đãi tri ân đối tác doanh nghiệp Vietcombank', 'APPLIED', 3, 2, '2026-02-04 14:30:00.000000', '2026-02-04 14:00:00.000000'),
(3, 49, 'FIXED_AMOUNT', 300000.00, 300000.00, 'Voucher giảm giá khai xuân đầu năm Bính Ngọ', 'APPLIED', 3, 2, '2026-02-19 14:30:00.000000', '2026-02-19 14:00:00.000000'),
(4, 95, 'PERCENTAGE', 15.00, 375000.00, 'Hội viên Kim Cương nghỉ dưỡng kỳ lễ 30/4', 'APPLIED', 3, 2, '2026-04-29 14:30:00.000000', '2026-04-29 14:00:00.000000'),
(5, 142, 'PERCENTAGE', 10.00, 140000.00, 'Chương trình kích cầu du lịch hè tháng 6', 'APPLIED', 3, 2, '2026-06-15 14:30:00.000000', '2026-06-15 14:00:00.000000'),
(6, 188, 'PERCENTAGE', 10.00, 200000.00, 'Khách hàng thân thiết đặt phòng trực tiếp qua hotline', 'APPLIED', 3, 2, '2026-08-10 14:30:00.000000', '2026-08-10 14:00:00.000000'),
(7, 215, 'PERCENTAGE', 10.00, 210000.00, 'Ưu đãi dịp Đại lễ Quốc khánh 2/9', 'APPLIED', 3, 2, '2026-09-01 14:30:00.000000', '2026-09-01 14:00:00.000000');\n`);

// 20. Daily Ledgers
out.push('-- 20. DAILY LEDGERS');
const dlLines = extractLinesForTable('daily_ledgers');
out.push(dlLines.join('\n') + '\n');
out.push(`INSERT INTO \`daily_ledgers\` (\`id\`, \`date\`, \`status\`, \`closed_at\`, \`closed_by\`, \`total_invoice_cash\`, \`total_invoice_transfer\`, \`total_invoice_card\`, \`total_deposit_cash\`, \`total_deposit_transfer\`, \`total_deposit_card\`, \`total_refund_cash\`, \`total_refund_transfer\`, \`total_refund_card\`, \`total_expected_cash\`, \`total_actual_cash\`, \`total_discrepancy\`, \`cash_handover_amount\`) VALUES
(267, '2026-09-25', 'CLOSED', '2026-09-25 23:30:00.000000', 3, 1400000.00, 2800000.00, 0.00, 300000.00, 600000.00, 0.00, 0.00, 0.00, 0.00, 1700000.00, 1700000.00, 0.00, 1700000.00),
(268, '2026-09-26', 'CLOSED', '2026-09-26 23:30:00.000000', 3, 1200000.00, 3500000.00, 700000.00, 450000.00, 900000.00, 0.00, 0.00, 0.00, 0.00, 1650000.00, 1650000.00, 0.00, 1650000.00),
(269, '2026-09-27', 'OPEN', NULL, NULL, 500000.00, 1000000.00, 0.00, 300000.00, 600000.00, 0.00, 0.00, 0.00, 0.00, 800000.00, 800000.00, 0.00, 800000.00);\n`);

// 21. Cashier Shifts
out.push('-- 21. CASHIER SHIFTS');
const csLines = extractLinesForTable('cashier_shifts');
out.push(csLines.join('\n') + '\n');
out.push(`INSERT INTO \`cashier_shifts\` (\`id\`, \`opened_by\`, \`closed_by\`, \`opened_at\`, \`closed_at\`, \`opening_cash\`, \`opening_note\`, \`status\`, \`invoice_cash\`, \`invoice_transfer\`, \`invoice_card\`, \`deposit_cash\`, \`deposit_transfer\`, \`deposit_card\`, \`refund_cash\`, \`refund_transfer\`, \`refund_card\`, \`expected_cash\`, \`actual_cash\`, \`discrepancy\`) VALUES
(268, 3, 3, '2026-09-25 07:00:00.000000', '2026-09-25 15:00:00.000000', 2000000.00, 'Ca sáng nhận bàn giao két', 'CLOSED', 1400000.00, 2000000.00, 0.00, 300000.00, 600000.00, 0.00, 0.00, 0.00, 0.00, 3700000.00, 3700000.00, 0.00),
(269, 7, 7, '2026-09-25 15:00:00.000000', '2026-09-25 23:00:00.000000', 3700000.00, 'Ca chiều tiếp quản', 'CLOSED', 0.00, 800000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 3700000.00, 3700000.00, 0.00),
(270, 3, 3, '2026-09-26 07:00:00.000000', '2026-09-26 15:00:00.000000', 2000000.00, 'Ca sáng đầu ngày cuối tuần', 'CLOSED', 800000.00, 2500000.00, 700000.00, 450000.00, 900000.00, 0.00, 0.00, 0.00, 0.00, 3250000.00, 3250000.00, 0.00),
(271, 7, 7, '2026-09-26 15:00:00.000000', '2026-09-26 23:00:00.000000', 3250000.00, 'Ca chiều trực tối', 'CLOSED', 400000.00, 1000000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 3650000.00, 3650000.00, 0.00),
(272, 3, 3, '2026-09-27 07:00:00.000000', '2026-09-27 15:00:00.000000', 2000000.00, 'Ca sáng Chủ nhật', 'CLOSED', 500000.00, 1000000.00, 0.00, 300000.00, 600000.00, 0.00, 0.00, 0.00, 0.00, 2800000.00, 2800000.00, 0.00),
(273, 7, NULL, '2026-09-27 15:00:00.000000', NULL, 2800000.00, 'Ca chiều đang hoạt động', 'OPEN', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 2800000.00, 2800000.00, 0.00);\n`);

// 22. Housekeeping Cleanings, Incidents, Lost Items
out.push('-- 22. HOUSEKEEPING, INCIDENTS & LOST ITEMS');
out.push(extractLinesForTable('room_cleaning_records').join('\n') + '\n');
out.push(extractLinesForTable('room_incidents').join('\n') + '\n');
out.push(extractLinesForTable('lost_items').join('\n') + '\n');

// 23. Notifications for today
out.push('-- 23. NOTIFICATIONS');
out.push(`INSERT INTO \`notifications\` (\`id\`, \`user_id\`, \`type\`, \`title\`, \`body\`, \`ref_type\`, \`ref_id\`, \`is_read\`, \`created_at\`) VALUES
(1, 3, 'CHECKIN_TODAY', 'Check-in: Phòng 104', 'Khách Đặng Quốc Huy dự kiến nhận phòng 104 hôm nay lúc 14:00', 'ROOM', '4', 0, '2026-09-27 08:00:00.000000'),
(2, 3, 'CHECKIN_TODAY', 'Check-in: Phòng 204', 'Khách Ngô Thanh Hằng dự kiến nhận phòng 204 hôm nay lúc 15:30', 'ROOM', '9', 0, '2026-09-27 08:30:00.000000'),
(3, 3, 'CHECKOUT_TODAY', 'Check-out: Phòng 103', 'Phòng 103 đã hoàn tất thủ tục trả phòng và thanh toán hóa đơn', 'ROOM', '3', 1, '2026-09-27 11:30:00.000000'),
(4, 4, 'ROOM_DIRTY', 'Phòng cần dọn: 103', 'Phòng 103 vừa trả phòng, cần dọn dẹp để sẵn sàng đón khách', 'ROOM', '3', 0, '2026-09-27 11:35:00.000000'),
(5, 2, 'STAY_MILESTONE', 'Cột mốc doanh thu tháng 9', 'Hệ thống ghi nhận doanh thu tháng 9 đã vượt mốc 45.000.000 đ', 'INVOICE', '228', 0, '2026-09-27 12:00:00.000000');\n`);

// 24. Audit Logs
out.push('-- 24. AUDIT LOGS');
out.push(`INSERT INTO \`audit_logs\` (\`id\`, \`entity_name\`, \`entity_id\`, \`action\`, \`actor_id\`, \`detail_json\`, \`timestamp\`) VALUES
(1, 'System', 1, 'INIT_DATA', 1, '{"message": "Khởi tạo thành công toàn bộ dữ liệu mẫu Stay Away Luxury"}', '2026-01-01 00:00:00.000000'),
(2, 'Booking', 1, 'CHECK_OUT', 3, '{"room": "205", "guest": "Vũ Quốc Huy", "total": 700000}', '2026-01-02 11:00:00.000000'),
(3, 'CashierShift', 1, 'CLOSE_SHIFT', 3, '{"cashHandover": 2500000, "shift": "MORNING"}', '2026-01-02 15:00:00.000000'),
(4, 'DailyLedger', 1, 'CLOSE_DAY', 3, '{"date": "2026-01-01", "totalRevenue": 700000}', '2026-01-01 23:30:00.000000'),
(5, 'Booking', 235, 'CHECK_IN', 3, '{"room": "301", "guest": "Alexander Chen", "advanceDeposit": 900000}', '2026-09-24 14:15:00.000000'),
(6, 'CashierShift', 272, 'CLOSE_SHIFT', 3, '{"cashHandover": 2800000, "shift": "MORNING"}', '2026-09-27 15:00:00.000000');\n`);

out.push('SET FOREIGN_KEY_CHECKS = 1;\n');

fs.writeFileSync(outputSqlPath, out.join('\n'), 'utf8');
console.log('Successfully written complete production SQL dataset to:', outputSqlPath);
console.log('File size:', fs.statSync(outputSqlPath).size, 'bytes');
