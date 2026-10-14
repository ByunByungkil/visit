/* ============================================================
   공개 예약 캘린더 로직
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.DOCHOGO_CONFIG || {};
  var allBookings = [];
  var refreshInterval = null;

  function getDatesBetween(startStr, endStr) {
    var dates = [];
    var d = new Date(startStr + "T00:00:00Z");
    var end = new Date(endStr + "T00:00:00Z");
    while (d <= end) {
      var iso = d.toISOString().split("T")[0];
      dates.push(iso);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  function formatDateDisplay(dateStr) {
    var d = new Date(dateStr + "T00:00:00Z");
    var days = ["일", "월", "화", "수", "목", "금", "토"];
    var day = days[d.getUTCDay()];
    var parts = dateStr.split("-");
    return parts[1] + "." + parts[2] + "(" + day + ")";
  }

  function getCountByDateAndTime(date, timeSlot) {
    return allBookings.filter(function (b) {
      return b.date === date && b.timeSlot === timeSlot;
    }).length;
  }

  function loadAndRender() {
    var loadingEl = document.getElementById("calendarLoading");
    var gridEl = document.getElementById("calendarGrid");
    var statusEl = document.getElementById("calendarStatus");

    if (loadingEl) loadingEl.style.display = "block";

    fetch(CONFIG.GAS_WEB_APP_URL + "?action=list")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.bookings && Array.isArray(data.bookings)) {
          allBookings = data.bookings;
        }
        renderCalendar();
        if (loadingEl) loadingEl.style.display = "none";
      })
      .catch(function (err) {
        console.error(err);
        if (loadingEl) loadingEl.style.display = "none";
        if (statusEl) statusEl.textContent = "데이터를 불러오지 못했습니다.";
      });
  }

  function renderCalendar() {
    var gridEl = document.getElementById("calendarGrid");
    if (!gridEl) return;

    var dates = getDatesBetween(CONFIG.START_DATE, CONFIG.END_DATE);
    gridEl.innerHTML = "";

    dates.forEach(function (dateStr) {
      var card = document.createElement("div");
      card.className = "day-card";
      card.innerHTML = '<div class="day-header">' +
        '<span class="date">' + dateStr + '</span>' +
        '<span class="day-name">' + formatDateDisplay(dateStr) + '</span>' +
        '</div><div class="day-slots"></div>';

      var slotsDiv = card.querySelector(".day-slots");
      CONFIG.TIME_SLOTS.forEach(function (slot) {
        var count = getCountByDateAndTime(dateStr, slot.id);
        var slotEl = document.createElement("div");
        slotEl.className = "slot" + (count > 0 ? " booked" : " available");
        slotEl.innerHTML =
          '<span class="slot-label">' + slot.label + '</span>' +
          '<span class="slot-count">' + (count > 0 ? count + '명 신청됨' : '예약 가능') + '</span>';
        slotsDiv.appendChild(slotEl);
      });

      gridEl.appendChild(card);
    });

    updateStatus();
  }

  function updateStatus() {
    var statusEl = document.getElementById("calendarStatus");
    if (!statusEl) return;

    var totalSlots = getDatesBetween(CONFIG.START_DATE, CONFIG.END_DATE).length * CONFIG.TIME_SLOTS.length;
    var bookedCount = allBookings.length;
    var availCount = totalSlots - bookedCount;

    statusEl.innerHTML =
      '<span class="status-badge" style="margin-right:12px;">총 ' + totalSlots + '개 슬롯</span>' +
      '<span class="status-badge" style="background:var(--accent);">신청 ' + bookedCount + '명</span>';
  }

  // 초기 로드
  loadAndRender();

  // 30초마다 새로고침
  refreshInterval = setInterval(loadAndRender, 30000);

  // 수동 새로고침 버튼
  var refreshBtn = document.getElementById("calendarRefresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      loadAndRender();
    });
  }

  // 페이지 나갈 때 인터벌 정리
  window.addEventListener("beforeunload", function () {
    if (refreshInterval) clearInterval(refreshInterval);
  });
})();
