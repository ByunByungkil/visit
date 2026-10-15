/* ============================================================
   공개 캘린더 — 마감된 시간에는 신청자 이름을 표시
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.DOCHOGO_CONFIG || {};
  var bookedMap = {}; // "2026-10-19|08:00 - 09:00" -> 이름

  function getDates(startStr, endStr) {
    var dates = [];
    var d = new Date(startStr + "T00:00:00Z");
    var end = new Date(endStr + "T00:00:00Z");
    while (d <= end) {
      dates.push(d.toISOString().split("T")[0]);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates;
  }

  function formatDateDisplay(dateStr) {
    var d = new Date(dateStr + "T00:00:00Z");
    var days = ["일", "월", "화", "수", "목", "금", "토"];
    var parts = dateStr.split("-");
    return parts[1] + "." + parts[2] + "(" + days[d.getUTCDay()] + ")";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderCalendar() {
    var gridEl = document.getElementById("calendarGrid");
    var dates = getDates(CONFIG.START_DATE, CONFIG.END_DATE);
    gridEl.innerHTML = "";

    dates.forEach(function (dateStr) {
      var card = document.createElement("div");
      card.className = "day-card";
      card.innerHTML =
        '<div class="day-header">' +
          '<span class="date">' + dateStr + '</span>' +
          '<span class="day-name">' + formatDateDisplay(dateStr) + '</span>' +
        '</div><div class="day-slots"></div>';

      var slotsDiv = card.querySelector(".day-slots");
      CONFIG.TIME_SLOTS.forEach(function (slot) {
        var name = bookedMap[dateStr + "|" + slot.label];
        var slotEl = document.createElement("div");
        slotEl.className = "slot " + (name ? "booked" : "available");
        slotEl.innerHTML =
          '<span class="slot-label">' + slot.label + '</span>' +
          '<span class="slot-count">' +
            (name ? "마감 · " + esc(name) : "예약 가능") +
          '</span>';
        slotsDiv.appendChild(slotEl);
      });
      gridEl.appendChild(card);
    });

    var total = dates.length * CONFIG.TIME_SLOTS.length;
    var booked = Object.keys(bookedMap).length;
    document.getElementById("calendarStatus").innerHTML =
      '<span class="status-badge" style="margin-right:12px;">전체 ' + total + '개 시간</span>' +
      '<span class="status-badge" style="background:var(--accent);">마감 ' + booked + '개</span>';
  }

  function loadAndRender() {
    var loadingEl = document.getElementById("calendarLoading");
    var statusEl = document.getElementById("calendarStatus");
    if (loadingEl) loadingEl.style.display = "block";

    fetch(CONFIG.GAS_WEB_APP_URL + "?action=list", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        bookedMap = {};
        (data.bookings || []).forEach(function (b) {
          bookedMap[b.date + "|" + b.timeSlot] = b.name;
        });
        renderCalendar();
      })
      .catch(function (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = "데이터를 불러오지 못했습니다.";
      })
      .then(function () {
        if (loadingEl) loadingEl.style.display = "none";
      });
  }

  loadAndRender();
  setInterval(loadAndRender, 30000);

  var refreshBtn = document.getElementById("calendarRefresh");
  if (refreshBtn) refreshBtn.addEventListener("click", loadAndRender);
})();
