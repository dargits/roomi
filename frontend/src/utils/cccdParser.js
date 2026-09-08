/**
 * Tiện ích phân tích dữ liệu mã QR trên thẻ Căn cước công dân (CCCD) gắn chip Việt Nam.
 *
 * Định dạng chuẩn của QR CCCD:
 * Số CCCD|Số CMND cũ|Họ và tên|Ngày sinh|Giới tính|Nơi thường trú|Ngày cấp
 *
 * Ví dụ:
 * 001098012345|012345678|NGUYỄN VĂN A|01011998|Nam|Số 10 Tràng Thi, Hoàn Kiếm, Hà Nội|01012023
 */

/**
 * Format chuỗi DDMMYYYY thành DD/MM/YYYY
 */
export const formatCccdDate = (dateStr) => {
  if (!dateStr || dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
    return dateStr || '';
  }
  const day = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const year = dateStr.substring(4, 8);
  return `${day}/${month}/${year}`;
};

/**
 * Phân tích chuỗi QR CCCD
 * @param {string} rawString 
 * @returns {object} { isValid, idNumber, oldIdNumber, name, dob, gender, address, issueDate, raw }
 */
export const parseCccdQr = (rawString) => {
  if (!rawString || typeof rawString !== 'string') {
    return {
      isValid: false,
      idNumber: '',
      oldIdNumber: '',
      name: '',
      dob: '',
      gender: '',
      address: '',
      issueDate: '',
      raw: ''
    };
  }

  const clean = rawString.trim();

  // 1. Trường hợp chuỗi phân cách bởi ký tự gạch đứng '|' (Chuẩn CCCD Việt Nam)
  if (clean.includes('|')) {
    const parts = clean.split('|').map(p => p.trim());
    let idNumber = parts[0]?.replace(/\D/g, '') || '';
    const oldIdNumber = parts[1]?.replace(/\D/g, '') || '';
    const name = parts[2] || '';
    const rawDob = parts[3] || '';
    const gender = parts[4] || '';
    const address = parts[5] || '';
    const rawIssueDate = parts[6] || '';

    // Nếu parts[0] không chứa đủ 9-12 số, quét tìm trong các phần tử khác
    if (!/^\d{9,12}$/.test(idNumber)) {
      for (const p of parts) {
        const d = p.replace(/\D/g, '');
        if (d.length === 12 || d.length === 9) {
          idNumber = d;
          break;
        }
      }
    }

    const isValidId = /^\d{9,12}$/.test(idNumber);

    return {
      isValid: isValidId || Boolean(name),
      idNumber,
      oldIdNumber,
      name,
      dob: formatCccdDate(rawDob),
      rawDob,
      gender,
      address,
      issueDate: formatCccdDate(rawIssueDate),
      rawIssueDate,
      raw: clean
    };
  }

  // 2. Trường hợp chuỗi phân cách bởi dấu chấm phẩy hoặc tab
  if (clean.includes(';') || clean.includes('\t')) {
    const delimiter = clean.includes(';') ? ';' : '\t';
    const parts = clean.split(delimiter).map(p => p.trim());
    const idNumber = parts[0]?.replace(/\D/g, '') || '';
    const name = parts[1] || '';
    return {
      isValid: /^\d{9,12}$/.test(idNumber) || Boolean(name),
      idNumber,
      oldIdNumber: '',
      name,
      dob: '',
      gender: '',
      address: '',
      issueDate: '',
      raw: clean
    };
  }

  // 3. Tìm số 12 chữ số hoặc 9 chữ số liên tiếp trong chuỗi
  const match12 = clean.match(/\b\d{12}\b/) || clean.match(/\d{12}/);
  if (match12) {
    return {
      isValid: true,
      idNumber: match12[0],
      oldIdNumber: '',
      name: '',
      dob: '',
      gender: '',
      address: '',
      issueDate: '',
      raw: clean
    };
  }

  const match9 = clean.match(/\b\d{9}\b/) || clean.match(/\d{9}/);
  if (match9) {
    return {
      isValid: true,
      idNumber: match9[0],
      oldIdNumber: '',
      name: '',
      dob: '',
      gender: '',
      address: '',
      issueDate: '',
      raw: clean
    };
  }

  // 4. Nếu toàn bộ ký tự số gom lại có độ dài từ 9 đến 12 số
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 9 && digitsOnly.length <= 12) {
    return {
      isValid: true,
      idNumber: digitsOnly,
      oldIdNumber: '',
      name: '',
      dob: '',
      gender: '',
      address: '',
      issueDate: '',
      raw: clean
    };
  }

  // 5. Trường hợp không nhận dạng được định dạng cụ thể
  return {
    isValid: false,
    idNumber: clean,
    oldIdNumber: '',
    name: '',
    dob: '',
    gender: '',
    address: '',
    issueDate: '',
    raw: clean
  };
};
