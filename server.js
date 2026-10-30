const express = require('express');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.xlsx');

app.use(express.json());
app.use(express.static(__dirname));

// 資料庫欄位定義 (遵循 PDF 規格並擴充入住人數)
const HEADERS = [
  '時間戳記',      // A 欄
  '房客姓名',      // B 欄
  '聯絡電話',      // C 欄
  '入住人數',      // 新增欄位
  '入住日期',      // D 欄
  '退房日期',      // E 欄
  '車牌號碼',      // F 欄
  '特殊備註',      // G 欄
  '排程狀態',      // H 欄
  'Event_ID'      // I 欄
];

// 初始化資料庫 (若 db.xlsx 不存在則自動建立)
function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('📦 未發現 db.xlsx，正在為您初始化建立預設資料庫...');
    const defaultData = [
      {
        '時間戳記': formatDateTime(new Date()),
        '房客姓名': '陳小姐',
        '聯絡電話': '0912345678',
        '入住人數': '2大0小 (共2人)',
        '入住日期': getRelativeDate(1),
        '退房日期': getRelativeDate(3),
        '車牌號碼': '🚗 [汽車] ABC-8899',
        '特殊備註': '預計 16:30 抵達，需要 1 個平面車位',
        '排程狀態': '✅ 已排程',
        'Event_ID': 'EVT-' + Date.now() + '-1'
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(defaultData, { header: HEADERS });
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
      { wch: 14 }, { wch: 24 }
    ];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '訂房排程');
    xlsx.writeFile(workbook, DB_FILE);
    console.log('✅ db.xlsx 建立完成！');
  }
}

// 讀取資料庫
function readBookings() {
  if (!fs.existsSync(DB_FILE)) {
    initDatabase();
  }
  try {
    const workbook = xlsx.readFile(DB_FILE);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    return rows;
  } catch (err) {
    console.error('讀取 db.xlsx 失敗:', err);
    return [];
  }
}

// 寫入資料庫
function writeBookings(data) {
  try {
    const worksheet = xlsx.utils.json_to_sheet(data, { header: HEADERS });
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 30 },
      { wch: 14 }, { wch: 24 }
    ];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '訂房排程');
    xlsx.writeFile(workbook, DB_FILE);
    return true;
  } catch (err) {
    console.error('寫入 db.xlsx 失敗:', err);
    return false;
  }
}

// 日期格式輔助函式
function formatDateTime(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 台灣汽機車車牌格式驗證與自動正規化
function validateAndFormatPlate(rawPlate, vehicleType) {
  if (vehicleType === 'none' || !rawPlate || String(rawPlate).trim() === '') {
    return { valid: true, plate: '', type: 'none' };
  }

  let clean = String(rawPlate).trim().toUpperCase().replace(/\s+/g, '');

  // 若房客未輸入連字號，自動補上標準連字號
  if (!clean.includes('-')) {
    if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) clean = clean.slice(0, 3) + '-' + clean.slice(3);
    else if (/^[A-Z]{2}[0-9]{4}$/.test(clean)) clean = clean.slice(0, 2) + '-' + clean.slice(2);
    else if (/^[0-9]{4}[A-Z]{2}$/.test(clean)) clean = clean.slice(0, 4) + '-' + clean.slice(4);
    else if (/^[0-9]{2}[0-9]{4}$/.test(clean)) clean = clean.slice(0, 2) + '-' + clean.slice(2);
    else if (/^[A-Z]{3}[0-9]{3}$/.test(clean)) clean = clean.slice(0, 3) + '-' + clean.slice(3);
    else if (/^[0-9]{3}[A-Z]{3}$/.test(clean)) clean = clean.slice(0, 3) + '-' + clean.slice(3);
    else if (/^[A-Z]{2}[0-9]{3}$/.test(clean)) clean = clean.slice(0, 2) + '-' + clean.slice(2);
    else if (/^[0-9]{3}[A-Z]{2}$/.test(clean)) clean = clean.slice(0, 3) + '-' + clean.slice(3);
    else if (/^[A-Z]{2}[0-9]{2}$/.test(clean)) clean = clean.slice(0, 2) + '-' + clean.slice(2);
    else if (/^[0-9]{2}[A-Z]{2}$/.test(clean)) clean = clean.slice(0, 2) + '-' + clean.slice(2);
  }

  const carRegexes = [
    /^[A-Z]{3}-[0-9]{4}$/, /^[A-Z]{2}-[0-9]{4}$/, /^[0-9]{4}-[A-Z]{2}$/,
    /^[0-9]{2}-[0-9]{4}$/, /^[0-9]{4}-[0-9]{2}$/, /^[A-Z]{2}-[0-9]{2}$/,
    /^[0-9]{2}-[A-Z]{2}$/
  ];

  const motoRegexes = [
    /^[A-Z]{3}-[0-9]{4}$/, /^[A-Z]{3}-[0-9]{3}$/, /^[0-9]{3}-[A-Z]{3}$/,
    /^[A-Z]{2}-[0-9]{3}$/, /^[0-9]{3}-[A-Z]{2}$/, /^[A-Z]{2}-[0-9]{2}$/,
    /^[0-9]{2}-[A-Z]{2}$/
  ];

  if (vehicleType === 'car') {
    const isValid = carRegexes.some(r => r.test(clean));
    return {
      valid: isValid,
      plate: clean,
      type: 'car',
      error: isValid ? null : '訂位失敗：汽車車牌格式不正確！應為前3碼英文後4碼數字（例如：ABC-1234）或舊式六碼（例如：AB-1234、1234-AB）'
    };
  } else if (vehicleType === 'motorcycle') {
    const isValid = motoRegexes.some(r => r.test(clean));
    return {
      valid: isValid,
      plate: clean,
      type: 'motorcycle',
      error: isValid ? null : '訂位失敗：機車車牌格式不正確！應為前3碼英文後4碼數字（例如：ABC-1234）或舊式格式（例如：ABC-123、AB-123）'
    };
  }

  return { valid: true, plate: clean, type: 'none' };
}

// ================= API 路由 =================

// 1. 取得所有訂房資料
app.get('/api/bookings', (req, res) => {
  const bookings = readBookings();
  res.json({ success: true, data: bookings });
});

// 2. 下載最新 Excel 資料庫 (線上管理備份專用)
app.get('/api/download-db', (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    res.download(DB_FILE, 'Luodong_Nice_訂房排程.xlsx');
  } else {
    res.status(404).json({ success: false, message: '目前尚未有資料庫檔案！' });
  }
});

// 3. 新增訂房 (排程建立)
app.post('/api/bookings', (req, res) => {
  let { guestName, phone, checkIn, checkOut, licensePlate, vehicleType, notes, adultCount, childCount } = req.body;

  if (!guestName || !phone || !checkIn || !checkOut) {
    return res.status(400).json({ success: false, message: '訂位失敗：請填寫完整的房客姓名、聯絡電話、入住與退房日期！' });
  }

  guestName = String(guestName).trim();
  phone = String(phone).trim();
  checkIn = String(checkIn).trim();
  checkOut = String(checkOut).trim();
  vehicleType = vehicleType || 'car';
  notes = notes ? String(notes).trim() : '無特殊備註';

  // 0. 入住人數檢驗 (小孩最多 8 人，總人數最低 1 人，最高 10 人)
  const adults = parseInt(adultCount, 10) || 0;
  const children = parseInt(childCount, 10) || 0;

  if (children < 0 || children > 8) {
    return res.status(400).json({
      success: false,
      message: '訂位失敗：小孩人數最多只能填寫 8 人！'
    });
  }

  const totalGuests = adults + children;
  if (totalGuests < 1 || totalGuests > 10) {
    return res.status(400).json({
      success: false,
      message: '訂位失敗：入住總人數（大人＋小孩）最低需 1 人，最高不能超過 10 人！'
    });
  }
  const guestCountStr = `${adults}大${children}小 (共${totalGuests}人)`;

  // 1. 嚴格電話格式檢驗：必須為 09 開頭且共 10 碼數字
  const phoneRegex = /^09\d{8}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: '訂位失敗：電話格式錯誤，必須為 09 開頭且共 10 碼數字（例如：0912345678）！'
    });
  }

  // 2. 防呆機制：退房日需晚於入住日
  const checkInDate = new Date(checkIn + 'T15:00:00');
  const checkOutDate = new Date(checkOut + 'T11:00:00');
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({ success: false, message: '訂位失敗：無效的日期格式！' });
  }
  if (checkOutDate <= checkInDate) {
    return res.status(400).json({ success: false, message: '訂位失敗：退房日期必須晚於入住日期！' });
  }

  // 3. 中華民國汽機車車牌法規檢驗
  const plateCheck = validateAndFormatPlate(licensePlate, vehicleType);
  if (!plateCheck.valid) {
    return res.status(400).json({ success: false, message: plateCheck.error });
  }

  // 4. 防呆機制：檢查入住時間是否與現有訂單重疊
  const currentBookings = readBookings();
  const overlappingBooking = currentBookings.find((b) => {
    const existingIn = String(b['入住日期'] || '').trim();
    const existingOut = String(b['退房日期'] || '').trim();
    if (!existingIn || !existingOut) return false;
    return checkIn < existingOut && checkOut > existingIn;
  });

  if (overlappingBooking) {
    return res.status(400).json({
      success: false,
      message: `訂位失敗：入住時間重疊！該時段已有房客「${overlappingBooking['房客姓名']}」（${overlappingBooking['入住日期']} 入住 ～ ${overlappingBooking['退房日期']} 退房），無法重複訂房！`
    });
  }

  // 格式化車牌存入字串
  let formattedPlate = '';
  if (plateCheck.type === 'car' && plateCheck.plate) {
    formattedPlate = `🚗 [汽車] ${plateCheck.plate}`;
  } else if (plateCheck.type === 'motorcycle' && plateCheck.plate) {
    formattedPlate = `🛵 [機車] ${plateCheck.plate}`;
  } else {
    formattedPlate = '🚶 [無車/搭車]';
  }

  const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const timestamp = formatDateTime(new Date());

  const newRecord = {
    '時間戳記': timestamp,
    '房客姓名': guestName,
    '聯絡電話': phone,
    '入住人數': guestCountStr,
    '入住日期': checkIn,
    '退房日期': checkOut,
    '車牌號碼': formattedPlate,
    '特殊備註': notes,
    '排程狀態': '✅ 已排程',
    'Event_ID': eventId
  };

  currentBookings.push(newRecord);
  const ok = writeBookings(currentBookings);

  if (ok) {
    res.json({
      success: true,
      message: '🎉 預訂與行事曆排程已成功建立！',
      data: newRecord
    });
  } else {
    res.status(500).json({ success: false, message: '訂位失敗：寫入資料庫失敗，請確認檔案未被鎖定。' });
  }
});

// 4. 更新訂房 (例如補登車牌、修改備註或人數)
app.put('/api/bookings/:id', (req, res) => {
  const eventId = req.params.id;
  const { licensePlate, vehicleType, notes, guestName, phone, checkIn, checkOut, adultCount, childCount } = req.body;

  const currentBookings = readBookings();
  const index = currentBookings.findIndex((b) => b['Event_ID'] === eventId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '找不到此預訂代碼之記錄！' });
  }

  const record = currentBookings[index];

  if (adultCount !== undefined || childCount !== undefined) {
    const adults = parseInt(adultCount !== undefined ? adultCount : 1, 10) || 0;
    const children = parseInt(childCount !== undefined ? childCount : 0, 10) || 0;
    if (children < 0 || children > 8) {
      return res.status(400).json({ success: false, message: '訂位失敗：小孩人數最多只能填寫 8 人！' });
    }
    const total = adults + children;
    if (total < 1 || total > 10) {
      return res.status(400).json({ success: false, message: '訂位失敗：入住總人數必須在 1 到 10 人之間！' });
    }
    record['入住人數'] = `${adults}大${children}小 (共${total}人)`;
  }

  if (phone) {
    const cleanPhone = String(phone).trim();
    if (!/^09\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: '訂位失敗：電話格式錯誤，必須為 09 開頭且共 10 碼數字！' });
    }
    record['聯絡電話'] = cleanPhone;
  }

  if (licensePlate !== undefined || vehicleType !== undefined) {
    const vType = vehicleType || 'car';
    const plateCheck = validateAndFormatPlate(licensePlate, vType);
    if (!plateCheck.valid) {
      return res.status(400).json({ success: false, message: plateCheck.error });
    }
    if (plateCheck.type === 'car' && plateCheck.plate) {
      record['車牌號碼'] = `🚗 [汽車] ${plateCheck.plate}`;
    } else if (plateCheck.type === 'motorcycle' && plateCheck.plate) {
      record['車牌號碼'] = `🛵 [機車] ${plateCheck.plate}`;
    } else {
      record['車牌號碼'] = '🚶 [無車/搭車]';
    }
  }

  if (notes !== undefined) {
    record['特殊備註'] = String(notes).trim();
  }
  if (guestName) record['房客姓名'] = String(guestName).trim();
  if (checkIn && checkOut) {
    const dIn = new Date(checkIn + 'T15:00:00');
    const dOut = new Date(checkOut + 'T11:00:00');
    if (dOut <= dIn) {
      return res.status(400).json({ success: false, message: '訂位失敗：退房日必須晚於入住日！' });
    }
    const conflict = currentBookings.find((b) => {
      if (b['Event_ID'] === eventId) return false;
      const existingIn = String(b['入住日期'] || '').trim();
      const existingOut = String(b['退房日期'] || '').trim();
      if (!existingIn || !existingOut) return false;
      return checkIn < existingOut && checkOut > existingIn;
    });
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: `訂位失敗：入住時間與「${conflict['房客姓名']}」（${conflict['入住日期']} ～ ${conflict['退房日期']}）重疊，無法修改至此時段！`
      });
    }
    record['入住日期'] = checkIn;
    record['退房日期'] = checkOut;
  }

  const ok = writeBookings(currentBookings);
  if (ok) {
    res.json({ success: true, message: '✅ 預訂資訊更新成功！', data: record });
  } else {
    res.status(500).json({ success: false, message: '更新失敗，請確認 db.xlsx 檔案狀態。' });
  }
});

// 5. 刪除/取消訂房
app.delete('/api/bookings/:id', (req, res) => {
  const eventId = req.params.id;
  const currentBookings = readBookings();
  const nextBookings = currentBookings.filter((b) => b['Event_ID'] !== eventId);

  if (nextBookings.length === currentBookings.length) {
    return res.status(404).json({ success: false, message: '找不到該筆訂單！' });
  }

  const ok = writeBookings(nextBookings);
  if (ok) {
    res.json({ success: true, message: '🗑️ 已成功取消訂單並自資料庫中移除！' });
  } else {
    res.status(500).json({ success: false, message: '刪除失敗，請檢查資料庫檔案。' });
  }
});

// 預設進入點
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 啟動伺服器
initDatabase();
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Luodong Nice 訂房系統 已成功啟動！`);
  console.log(`📡 運行通訊埠：${PORT}`);
  console.log(`📁 集中管理資料庫：${DB_FILE}`);
  console.log(`=======================================================`);
});

