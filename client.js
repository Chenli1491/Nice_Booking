// NICE 溫馨訂房與車牌排程小管家 - Client Logic
// 全域狀態管理
let currentCalendarDate = new Date();
let bookingsData = [];
let activeSelectedBooking = null;

// DOM 元素載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initFormDefaultDates();
  initEventListeners();
  loadBookings();
});

// 1. 即時時鐘
function initClock() {
  const clockEl = document.getElementById('currentTime');
  function updateTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const str = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (clockEl) clockEl.textContent = `🕒 當前時間：${str}`;
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// 2. 表單預設日期設定
function initFormDefaultDates() {
  const checkInEl = document.getElementById('checkIn');
  const checkOutEl = document.getElementById('checkOut');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

  const toYMD = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  if (checkInEl && !checkInEl.value) checkInEl.value = toYMD(tomorrow);
  if (checkOutEl && !checkOutEl.value) checkOutEl.value = toYMD(dayAfterTomorrow);
}

// 中華民國車牌法規正則與自動補橫線
function normalizeTaiwanPlate(raw, vehicleType) {
  if (vehicleType === 'none' || !raw) return { clean: '', valid: true };
  let clean = raw.trim().toUpperCase().replace(/\s+/g, '');

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
    /^[A-Z]{3}-[0-9]{4}$/,
    /^[A-Z]{2}-[0-9]{4}$/,
    /^[0-9]{4}-[A-Z]{2}$/,
    /^[0-9]{2}-[0-9]{4}$/,
    /^[0-9]{4}-[0-9]{2}$/,
    /^[A-Z]{2}-[0-9]{2}$/,
    /^[0-9]{2}-[A-Z]{2}$/
  ];

  const motoRegexes = [
    /^[A-Z]{3}-[0-9]{4}$/,
    /^[A-Z]{3}-[0-9]{3}$/,
    /^[0-9]{3}-[A-Z]{3}$/,
    /^[A-Z]{2}-[0-9]{3}$/,
    /^[0-9]{3}-[A-Z]{2}$/,
    /^[A-Z]{2}-[0-9]{2}$/,
    /^[0-9]{2}-[A-Z]{2}$/
  ];

  let isValid = false;
  if (vehicleType === 'car') {
    isValid = carRegexes.some((r) => r.test(clean));
  } else if (vehicleType === 'motorcycle') {
    isValid = motoRegexes.some((r) => r.test(clean));
  }

  return { clean, valid: isValid };
}

// 3. 事件監聽註冊
function initEventListeners() {
  // 電話號碼輸入限制：只允許數字，上限 10 碼
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  // 入住人數動態計算與防呆提示 (大人+小孩: 1~10人)
  const adultInput = document.getElementById('adultCount');
  const childInput = document.getElementById('childCount');
  const guestTotalBadge = document.getElementById('guestTotalBadge');

  function updateGuestCountHint() {
    const adults = parseInt(adultInput ? adultInput.value : 0, 10) || 0;
    const children = parseInt(childInput ? childInput.value : 0, 10) || 0;
    const total = adults + children;

    if (!guestTotalBadge) return;
    if (children > 8) {
      guestTotalBadge.className = 'guest-total-badge error';
      guestTotalBadge.textContent = `⚠️ 小孩人數最多只能填寫 8 人（目前：${children} 位小孩）`;
    } else if (total < 1) {
      guestTotalBadge.className = 'guest-total-badge error';
      guestTotalBadge.textContent = `⚠️ 入住總人數至少需 1 人（目前：${total} 人）`;
    } else if (total > 10) {
      guestTotalBadge.className = 'guest-total-badge error';
      guestTotalBadge.textContent = `⚠️ 入住總人數不能超過 10 人（目前：${total} 人）`;
    } else {
      guestTotalBadge.className = 'guest-total-badge';
      guestTotalBadge.textContent = `👥 預計入住：共 ${total} 人（${adults} 位大人、${children} 位小孩）`;
    }
  }

  if (adultInput && childInput) {
    adultInput.addEventListener('input', updateGuestCountHint);
    childInput.addEventListener('input', updateGuestCountHint);
  }

  // 交通工具種類切換監聽
  const vehicleRadios = document.querySelectorAll('input[name="vehicleType"]');
  const plateInput = document.getElementById('licensePlate');
  const plateBadge = document.getElementById('platePreviewBadge');
  const plateHint = document.getElementById('plateFormatHint');

  function updateVehicleMode() {
    const selectedType = document.querySelector('input[name="vehicleType"]:checked').value;
    if (selectedType === 'none') {
      plateInput.value = '';
      plateInput.disabled = true;
      plateBadge.textContent = '🚶 免車牌';
      plateBadge.style.background = '#e0f2fe';
      plateBadge.style.color = '#0369a1';
      plateBadge.style.borderColor = '#93c5fd';
      plateHint.textContent = '💡 房客搭乘大眾運輸或步行，無需登記車牌與車位。';
    } else {
      plateInput.disabled = false;
      if (selectedType === 'car') {
        plateInput.placeholder = '例如：ABC-1234 或 AB-1234';
        plateHint.textContent = '💡 汽車法規格式：新式七碼（例：ABC-1234）或舊式六碼（例：AB-1234、1234-AB）。';
      } else {
        plateInput.placeholder = '例如：ABC-1234 或 ABC-123';
        plateHint.textContent = '💡 機車法規格式：新式七碼（例：ABC-1234）或舊式五/六碼（例：ABC-123、AB-123）。';
      }
      checkPlateLive();
    }
  }

  vehicleRadios.forEach((r) => r.addEventListener('change', updateVehicleMode));

  // 即時車牌驗證與大寫轉換
  function checkPlateLive() {
    const selectedType = document.querySelector('input[name="vehicleType"]:checked').value;
    if (selectedType === 'none') return;

    let val = plateInput.value.toUpperCase().replace(/\s+/g, '');
    plateInput.value = val;

    if (!val) {
      plateBadge.textContent = selectedType === 'car' ? '🚗 汽車 (未登記)' : '🛵 機車 (未登記)';
      plateBadge.style.background = '#fff7f0';
      plateBadge.style.color = '#8c7361';
      plateBadge.style.borderColor = '#f0dfd1';
      return;
    }

    const res = normalizeTaiwanPlate(val, selectedType);
    if (res.valid) {
      if (selectedType === 'car') {
        plateBadge.textContent = `🚗 ${res.clean} (合格)`;
        plateBadge.style.background = '#e3f6eb';
        plateBadge.style.color = '#256f46';
        plateBadge.style.borderColor = '#9be0b8';
      } else {
        plateBadge.textContent = `🛵 ${res.clean} (合格)`;
        plateBadge.style.background = '#f3e8ff';
        plateBadge.style.color = '#6d28d9';
        plateBadge.style.borderColor = '#d8b4fe';
      }
    } else {
      plateBadge.textContent = '⚠️ 格式不符法規';
      plateBadge.style.background = '#ffe5e5';
      plateBadge.style.color = '#d93838';
      plateBadge.style.borderColor = '#f8b4b4';
    }
  }

  if (plateInput) {
    plateInput.addEventListener('input', checkPlateLive);
  }

  // 表單重設事件
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      setTimeout(() => {
        initFormDefaultDates();
        document.querySelector('input[name="vehicleType"][value="car"]').checked = true;
        updateVehicleMode();
        if (adultInput) adultInput.value = 2;
        if (childInput) childInput.value = 0;
        updateGuestCountHint();
      }, 50);
    });
  }

  // 表單送出 (新增預訂)
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', handleFormSubmit);
  }

  // 月曆切換按鈕
  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('btnNextMonth').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('btnToday').addEventListener('click', () => {
    currentCalendarDate = new Date();
    renderCalendar();
  });

  // 搜尋過濾
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  // 重新整理
  document.getElementById('btnRefresh').addEventListener('click', () => {
    loadBookings();
    showToast('🔄 已重新從 db.xlsx 讀取最新排程');
  });

  // 彈窗關閉按鈕
  document.getElementById('btnCloseDetailModal').addEventListener('click', closeDetailModal);
  document.getElementById('btnModalClose').addEventListener('click', closeDetailModal);
  document.getElementById('btnCloseEditModal').addEventListener('click', closeEditModal);
  document.getElementById('btnCancelEditPlate').addEventListener('click', closeEditModal);

  // 彈窗內部功能按鈕
  document.getElementById('btnModalEditPlate').addEventListener('click', () => {
    if (activeSelectedBooking) {
      closeDetailModal();
      openEditModal(activeSelectedBooking);
    }
  });

  document.getElementById('btnModalDelete').addEventListener('click', () => {
    if (activeSelectedBooking) {
      deleteBooking(activeSelectedBooking['Event_ID'], activeSelectedBooking['房客姓名']);
    }
  });

  // 彈窗中的交通工具切換
  const editVehicleRadios = document.querySelectorAll('input[name="editVehicleType"]');
  const editPlateInput = document.getElementById('editLicensePlateInput');
  const editPlateHint = document.getElementById('editPlateHint');

  function updateEditVehicleMode() {
    const selected = document.querySelector('input[name="editVehicleType"]:checked').value;
    if (selected === 'none') {
      editPlateInput.value = '';
      editPlateInput.disabled = true;
      editPlateHint.textContent = '免登記車牌與停車位。';
    } else {
      editPlateInput.disabled = false;
      if (selected === 'car') {
        editPlateInput.placeholder = '例如：ABC-1234';
        editPlateHint.textContent = '依中華民國汽車法規：新式「ABC-1234」或舊式六碼。';
      } else {
        editPlateInput.placeholder = '例如：ABC-1234 或 ABC-123';
        editPlateHint.textContent = '依中華民國機車法規：新式「ABC-1234」或舊式「ABC-123」。';
      }
    }
  }
  editVehicleRadios.forEach((r) => r.addEventListener('change', updateEditVehicleMode));

  document.getElementById('btnSavePlate').addEventListener('click', handleSavePlate);

  // 返回原本「預約系統」按鈕
  const btnBackToSystem = document.getElementById('btnBackToSystem');
  if (btnBackToSystem) {
    btnBackToSystem.addEventListener('click', backToBookingSystem);
  }
}

// 頁面切換：顯示預約成功 LINE 好友 QR Code 頁面
function showQrCodeSuccessPage(guestName, checkIn, checkOut) {
  const mainPage = document.getElementById('bookingSystemPage');
  const qrPage = document.getElementById('qrcodeSuccessPage');
  const summaryEl = document.getElementById('qrGuestSummary');

  if (summaryEl) {
    summaryEl.textContent = `親愛的【${guestName}】您好，您的入住排程（${checkIn} 15:00 ～ ${checkOut} 11:00）已成功建立！請掃描下方 QR Code 加入 LINE 好友，方便聯繫入住與停車資訊喔 💕`;
  }
  if (mainPage) mainPage.style.display = 'none';
  if (qrPage) qrPage.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 頁面切換：返回原本「預約系統」
function backToBookingSystem() {
  const mainPage = document.getElementById('bookingSystemPage');
  const qrPage = document.getElementById('qrcodeSuccessPage');

  if (qrPage) qrPage.style.display = 'none';
  if (mainPage) mainPage.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. 從後端載入預訂資料 (db.xlsx)
async function loadBookings() {
  try {
    const res = await fetch('/api/bookings');
    const result = await res.json();
    if (result.success) {
      bookingsData = result.data || [];
      updateKPIs();
      renderCalendar();
      renderTable(bookingsData);
    } else {
      showToast('❌ 讀取資料失敗：' + result.message);
    }
  } catch (err) {
    console.error('載入失敗:', err);
    showToast('⚠️ 連線後端伺服器失敗，請確認 server.js 是否正常執行');
  }
}

// 解析車輛類型輔助函式
function parseVehicleInfo(raw) {
  const str = String(raw || '').trim();
  if (!str || str.includes('無車') || str.includes('未登記') || str === '🚶 [無車/搭車]') {
    return { type: 'none', label: '🚶 無車', plate: '', isCar: false, isMoto: false };
  }
  if (str.includes('機車') || str.includes('🛵')) {
    const cleanPlate = str.replace(/🛵|\[機車\]/g, '').trim();
    return { type: 'motorcycle', label: `🛵 ${cleanPlate}`, plate: cleanPlate, isCar: false, isMoto: true };
  }
  // 預設或汽車
  const cleanPlate = str.replace(/🚗|\[汽車\]/g, '').trim();
  return { type: 'car', label: `🚗 ${cleanPlate}`, plate: cleanPlate, isCar: true, isMoto: false };
}

// 5. 更新統計 KPI
function updateKPIs() {
  let carCount = 0;
  let motoCount = 0;
  let noCarCount = 0;
  let cleanCount = 0;

  const todayStr = formatDateYMD(new Date());

  bookingsData.forEach((b) => {
    const vInfo = parseVehicleInfo(b['車牌號碼']);
    if (vInfo.type === 'car') carCount++;
    else if (vInfo.type === 'motorcycle') motoCount++;
    else noCarCount++;

    // 檢查退房清潔
    if (b['退房日期'] >= todayStr) {
      cleanCount++;
    }
  });

  const carEl = document.getElementById('statCarCount');
  const motoEl = document.getElementById('statMotoCount');
  const noCarEl = document.getElementById('statNoCarCount');
  const cleanEl = document.getElementById('statCleanCount');
  const totalEl = document.getElementById('statTotalCount');

  if (carEl) carEl.textContent = carCount;
  if (motoEl) motoEl.textContent = motoCount;
  if (noCarEl) noCarEl.textContent = noCarCount;
  if (cleanEl) cleanEl.textContent = cleanCount;
  if (totalEl) totalEl.textContent = bookingsData.length;
}

// 6. 新增預訂表單提交處理 (含電話嚴格檢驗與中華民國車牌檢驗)
async function handleFormSubmit(e) {
  e.preventDefault();

  const guestName = document.getElementById('guestName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const adultCount = parseInt(document.getElementById('adultCount').value, 10) || 0;
  const childCount = parseInt(document.getElementById('childCount').value, 10) || 0;
  const vehicleType = document.querySelector('input[name="vehicleType"]:checked').value;
  const licensePlate = document.getElementById('licensePlate').value.trim();
  const notes = document.getElementById('notes').value.trim();

  // 0. 入住人數驗證：小孩最多 8 人，總人數最低 1 人，最高 10 人
  if (childCount > 8) {
    alert(`【訂位失敗】\n小孩人數不符合規定！\n小孩子人數最多只能填寫 8 人（目前填寫：${childCount} 人）。`);
    document.getElementById('childCount').focus();
    return;
  }
  if (childCount < 0) {
    alert('【訂位失敗】小孩人數不能為負數！');
    document.getElementById('childCount').focus();
    return;
  }
  const totalGuests = adultCount + childCount;
  if (totalGuests < 1 || totalGuests > 10) {
    alert(`【訂位失敗】\n入住人數不符合規定！\n目前填寫總人數為 ${totalGuests} 人。\n規定：入住人數總和最高不能超過 10 人，最低需 1 人！`);
    document.getElementById('adultCount').focus();
    return;
  }

  // 1. 嚴格電話格式檢驗：必須為 09 開頭且共 10 碼數字
  const phoneRegex = /^09\d{8}$/;
  if (!phoneRegex.test(phone)) {
    alert('【訂位失敗】\n聯絡電話格式不正確！\n必須為「09」開頭且共 10 碼數字（範例：0912345678）。');
    document.getElementById('phone').focus();
    return;
  }

  // 2. 日期防呆
  if (checkOut <= checkIn) {
    alert('【訂位失敗】\n日期錯誤：退房日期必須晚於入住日期！');
    return;
  }

  // 2.5 入住時間重疊防呆 (同一天上一組 11:00 退房、下一組 15:00 入住不重疊)
  const overlappingBooking = bookingsData.find((b) => {
    const existingIn = String(b['入住日期'] || '').trim();
    const existingOut = String(b['退房日期'] || '').trim();
    if (!existingIn || !existingOut) return false;
    return checkIn < existingOut && checkOut > existingIn;
  });

  if (overlappingBooking) {
    alert(
      `【訂位失敗】\n入住時間重疊，無法重複訂房！\n\n` +
      `該時段已有房客【${overlappingBooking['房客姓名']}】預訂：\n` +
      `• 入住：${overlappingBooking['入住日期']} (15:00)\n` +
      `• 退房：${overlappingBooking['退房日期']} (11:00)\n\n` +
      `請選擇其他未重疊的日期區間！`
    );
    document.getElementById('checkIn').focus();
    return;
  }

  // 3. 中華民國車牌法規檢驗
  if (vehicleType !== 'none') {
    if (!licensePlate) {
      if (!confirm('提示：您選擇了自駕，但目前尚未填寫車牌號碼。\n若是租車尚未取得車牌，可先以「無車」建立，待入住前補登；確定要現在直接留空送出嗎？')) {
        return;
      }
    } else {
      const plateCheck = normalizeTaiwanPlate(licensePlate, vehicleType);
      if (!plateCheck.valid) {
        if (vehicleType === 'car') {
          alert('【訂位失敗】\n汽車車牌格式不符合中華民國發放法規！\n正確格式範例：\n• 新式七碼：ABC-1234\n• 舊式六碼：AB-1234 或 1234-AB');
        } else {
          alert('【訂位失敗】\n機車車牌格式不符合中華民國發放法規！\n正確格式範例：\n• 新式七碼：ABC-1234\n• 舊式格式：ABC-123 或 AB-123');
        }
        document.getElementById('licensePlate').focus();
        return;
      }
    }
  }

  const btnSubmit = document.getElementById('btnSubmit');
  btnSubmit.disabled = true;
  btnSubmit.textContent = '⏳ 排程建立中...';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName, phone, checkIn, checkOut, vehicleType, licensePlate, notes, adultCount, childCount })
    });

    const result = await res.json();
    if (result.success) {
      showToast(result.message);
      document.getElementById('bookingForm').reset();
      initFormDefaultDates();
      document.getElementById('adultCount').value = 2;
      document.getElementById('childCount').value = 0;
      document.getElementById('guestTotalBadge').className = 'guest-total-badge';
      document.getElementById('guestTotalBadge').textContent = '👥 預計入住：共 2 人（2 位大人、0 位小孩）';
      document.querySelector('input[name="vehicleType"][value="car"]').checked = true;
      document.getElementById('licensePlate').disabled = false;
      const badge = document.getElementById('platePreviewBadge');
      badge.textContent = '🚗 汽車格式檢驗中';
      badge.style.background = '#fff7f0';
      badge.style.color = '#8c7361';
      badge.style.borderColor = '#f0dfd1';

      await loadBookings();
      showQrCodeSuccessPage(guestName, checkIn, checkOut);
    } else {
      alert(result.message || '訂位失敗，請檢查資料格式！');
    }
  } catch (err) {
    console.error('送出失敗:', err);
    alert('【訂位失敗】伺服器連線異常，請確認 server.js 運行中！');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>🌸 立即驗證並建立排程</span>';
  }
}

// 7. 渲染行事曆 (Calendar View - 週一在最左邊，週日在最右邊)
function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const titleEl = document.getElementById('calendarTitle');
  if (titleEl) titleEl.textContent = `🗓️ ${year}年 ${month + 1}月`;

  const gridEl = document.getElementById('calendarGrid');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 將 JS 的 getDay() (週日=0 .. 週六=6) 轉換為「週一為首 (週一=0 .. 週日=6)」
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  let cellIndex = 0;

  // 上個月尾端補齊
  for (let i = mondayFirstOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const isWeekend = (cellIndex % 7 === 5 || cellIndex % 7 === 6);
    const dayEl = createDayCell(dayNum, true, false, isWeekend);
    gridEl.appendChild(dayEl);
    cellIndex++;
  }

  const today = new Date();
  const todayYMD = formatDateYMD(today);

  // 當月每一天
  for (let d = 1; d <= totalDays; d++) {
    const currentDayDate = new Date(year, month, d);
    const dateStr = formatDateYMD(currentDayDate);
    const isToday = (dateStr === todayYMD);
    const isWeekend = (cellIndex % 7 === 5 || cellIndex % 7 === 6);

    const dayEl = createDayCell(d, false, isToday, isWeekend);
    const eventsContainer = dayEl.querySelector('.day-events');

    bookingsData.forEach((booking) => {
      const inDate = booking['入住日期'];
      const outDate = booking['退房日期'];
      const guestName = booking['房客姓名'];
      const vInfo = parseVehicleInfo(booking['車牌號碼']);

      let pillClass = 'event-no-car';
      if (vInfo.type === 'car') pillClass = 'event-car';
      else if (vInfo.type === 'motorcycle') pillClass = 'event-moto';

      // 入住日標籤 (下午 15:00)
      if (dateStr === inDate) {
        const pill = document.createElement('div');
        pill.className = `event-pill ${pillClass}`;
        pill.textContent = `🏡 [入住 15:00] ${guestName} (${vInfo.label})`;
        pill.title = `點擊查看 ${guestName} 的完整訂房資訊`;
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailModal(booking);
        });
        eventsContainer.appendChild(pill);
      }
      // 在住期間
      else if (dateStr > inDate && dateStr < outDate) {
        const pill = document.createElement('div');
        pill.className = `event-pill ${pillClass}`;
        pill.style.opacity = '0.82';
        pill.textContent = `🛌 在住：${guestName} (${vInfo.label})`;
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailModal(booking);
        });
        eventsContainer.appendChild(pill);
      }
      // 退房日標籤 (上午 11:00) + 自動衍生清潔事件 (11:00-15:00)
      else if (dateStr === outDate) {
        const pillOut = document.createElement('div');
        pillOut.className = 'event-pill event-checkout';
        pillOut.textContent = `👋 [退房 11:00] ${guestName}`;
        pillOut.addEventListener('click', (e) => {
          e.stopPropagation();
          openDetailModal(booking);
        });
        eventsContainer.appendChild(pillOut);

        const cleanPill = document.createElement('div');
        cleanPill.className = 'event-pill event-clean';
        cleanPill.textContent = `🧹 [清潔 11:00-15:00] ${guestName} 退房`;
        cleanPill.title = `房務人員清潔維護時段：${guestName} 退房`;
        eventsContainer.appendChild(cleanPill);
      }
    });

    gridEl.appendChild(dayEl);
    cellIndex++;
  }

  // 下個月初補齊
  const nextMonthDays = (cellIndex % 7 === 0) ? 0 : 7 - (cellIndex % 7);
  for (let i = 1; i <= nextMonthDays; i++) {
    const isWeekend = (cellIndex % 7 === 5 || cellIndex % 7 === 6);
    const dayEl = createDayCell(i, true, false, isWeekend);
    gridEl.appendChild(dayEl);
    cellIndex++;
  }
}

function createDayCell(dayNumber, isOtherMonth = false, isToday = false, isWeekend = false) {
  const cell = document.createElement('div');
  cell.className = 'calendar-day';
  if (isWeekend) cell.classList.add('weekend');
  if (isOtherMonth) cell.classList.add('other-month');
  if (isToday) cell.classList.add('today');

  cell.innerHTML = `
    <div class="day-header">
      <span class="day-number">${dayNumber}</span>
    </div>
    <div class="day-events"></div>
  `;
  return cell;
}

// 8. 渲染資料庫表格
function renderTable(dataList) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (dataList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 28px;">🧸 目前還沒有符合的預訂排程資料喔！</td></tr>`;
    return;
  }

  dataList.forEach((item) => {
    const tr = document.createElement('tr');
    const vInfo = parseVehicleInfo(item['車牌號碼']);

    let plateBadgeClass = 'no-plate';
    if (vInfo.type === 'car') plateBadgeClass = 'has-plate';
    else if (vInfo.type === 'motorcycle') plateBadgeClass = 'is-moto';

    tr.innerHTML = `
      <td>${escapeHtml(item['時間戳記'] || '-')}</td>
      <td><strong>${escapeHtml(item['房客姓名'] || '-')}</strong></td>
      <td><a href="tel:${escapeHtml(item['聯絡電話'])}" style="color: var(--primary); text-decoration: none; font-weight: 700;">📞 ${escapeHtml(item['聯絡電話'] || '-')}</a></td>
      <td><span style="font-weight: 700; color: #4a3728;">${escapeHtml(item['入住人數'] || '-')}</span></td>
      <td><span style="font-weight: 700;">${escapeHtml(item['入住日期'] || '-')}</span> <small style="color:var(--text-muted)">(15:00)</small></td>
      <td><span style="font-weight: 700;">${escapeHtml(item['退房日期'] || '-')}</span> <small style="color:var(--text-muted)">(11:00)</small></td>
      <td>
        <span class="cell-plate ${plateBadgeClass}">
          ${escapeHtml(vInfo.label)}
        </span>
      </td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item['特殊備註'])}">
        ${escapeHtml(item['特殊備註'] || '無')}
      </td>
      <td><span class="cell-status">${escapeHtml(item['排程狀態'] || '✅ 已排程')}</span></td>
      <td><span class="cell-id">${escapeHtml(item['Event_ID'] || '-')}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-outline btn-table-edit" title="補登或修改車牌">✏️ 車牌</button>
          <button class="btn btn-sm btn-danger btn-table-del" title="取消並刪除排程">🗑️</button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-table-edit').addEventListener('click', () => openEditModal(item));
    tr.querySelector('.btn-table-del').addEventListener('click', () => deleteBooking(item['Event_ID'], item['房客姓名']));

    tbody.appendChild(tr);
  });
}

// 9. 關鍵字搜尋過濾
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderTable(bookingsData);
    return;
  }
  const filtered = bookingsData.filter((b) => {
    const name = String(b['房客姓名'] || '').toLowerCase();
    const phone = String(b['聯絡電話'] || '').toLowerCase();
    const plate = String(b['車牌號碼'] || '').toLowerCase();
    const notes = String(b['特殊備註'] || '').toLowerCase();
    const id = String(b['Event_ID'] || '').toLowerCase();
    return name.includes(query) || phone.includes(query) || plate.includes(query) || notes.includes(query) || id.includes(query);
  });
  renderTable(filtered);
}

// 10. 彈窗控制：訂單詳細
function openDetailModal(booking) {
  activeSelectedBooking = booking;
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalDetailContent');
  const vInfo = parseVehicleInfo(booking['車牌號碼']);

  let plateClass = 'cell-plate no-plate';
  if (vInfo.type === 'car') plateClass = 'cell-plate has-plate';
  else if (vInfo.type === 'motorcycle') plateClass = 'cell-plate is-moto';

  content.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">👤 房客姓名</span>
      <span class="detail-value">${escapeHtml(booking['房客姓名'])}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">📞 聯絡電話</span>
      <span class="detail-value"><a href="tel:${escapeHtml(booking['聯絡電話'])}" style="color:var(--primary); font-weight:700;">${escapeHtml(booking['聯絡電話'])}</a></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">👥 入住人數</span>
      <span class="detail-value" style="color: var(--primary); font-weight: 700;">${escapeHtml(booking['入住人數'] || '未登記')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">🚦 交通與車牌</span>
      <span class="detail-value ${plateClass}">${escapeHtml(vInfo.label)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">🌞 入住時間</span>
      <span class="detail-value">${escapeHtml(booking['入住日期'])} 下午 15:00</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">🌙 退房時間</span>
      <span class="detail-value">${escapeHtml(booking['退房日期'])} 上午 11:00</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">🧹 房務清潔排程</span>
      <span class="detail-value" style="color: var(--color-clean-text); font-weight: 700;">${escapeHtml(booking['退房日期'])} 11:00 ~ 15:00</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">💌 特殊備註</span>
      <span class="detail-value" style="max-width: 300px;">${escapeHtml(booking['特殊備註'] || '無特殊備註')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">📋 排程狀態</span>
      <span class="detail-value"><span class="cell-status">${escapeHtml(booking['排程狀態'] || '✅ 已排程')}</span></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">🔑 Event_ID</span>
      <span class="detail-value cell-id">${escapeHtml(booking['Event_ID'] || '-')}</span>
    </div>
    <div class="detail-row" style="border-bottom:none;">
      <span class="detail-label">⏱️ 表單建立時間</span>
      <span class="detail-value" style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(booking['時間戳記'] || '-')}</span>
    </div>
  `;

  modal.classList.add('active');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('active');
  activeSelectedBooking = null;
}

// 11. 彈窗控制：補登/修改車牌
function openEditModal(booking) {
  document.getElementById('editEventId').value = booking['Event_ID'];
  document.getElementById('editGuestName').textContent = booking['房客姓名'];

  const vInfo = parseVehicleInfo(booking['車牌號碼']);
  const radio = document.querySelector(`input[name="editVehicleType"][value="${vInfo.type}"]`);
  if (radio) radio.checked = true;

  const editPlateInput = document.getElementById('editLicensePlateInput');
  editPlateInput.value = vInfo.plate || '';
  editPlateInput.disabled = (vInfo.type === 'none');

  document.getElementById('editPlateModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editPlateModal').classList.remove('active');
}

async function handleSavePlate() {
  const eventId = document.getElementById('editEventId').value;
  const vehicleType = document.querySelector('input[name="editVehicleType"]:checked').value;
  const plateVal = document.getElementById('editLicensePlateInput').value.trim().toUpperCase();

  if (vehicleType !== 'none') {
    if (plateVal) {
      const check = normalizeTaiwanPlate(plateVal, vehicleType);
      if (!check.valid) {
        alert('【訂位失敗】車牌號碼不符合中華民國發放法規！請重新檢查輸入。');
        return;
      }
    }
  }

  try {
    const res = await fetch(`/api/bookings/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleType, licensePlate: plateVal })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message);
      closeEditModal();
      await loadBookings();
    } else {
      alert(result.message || '更新失敗');
    }
  } catch (err) {
    console.error('更新失敗:', err);
    alert('【更新失敗】伺服器連線異常！');
  }
}

// 12. 刪除/取消排程
async function deleteBooking(eventId, guestName) {
  if (!confirm(`確定要取消【${guestName}】的訂房排程嗎？\n取消後將自 db.xlsx 與行事曆中完全移除。`)) {
    return;
  }

  try {
    const res = await fetch(`/api/bookings/${eventId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message);
      closeDetailModal();
      await loadBookings();
    } else {
      alert('刪除失敗：' + result.message);
    }
  } catch (err) {
    console.error('刪除失敗:', err);
    alert('伺服器連線異常！');
  }
}

// 輔助工具函式
function formatDateYMD(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
