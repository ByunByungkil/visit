/* ============================================================
   신청 폼 로직
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.DOCHOGO_CONFIG || {};
  var form = document.getElementById("visitationForm");
  var submitBtn = document.getElementById("submitBtn");
  var statusEl = document.getElementById("formStatus");
  var bookedSlots = {}; // { "2026-10-19|slot_0": true, ... }

  if (!form) return;

  function setStatus(msg, success) {
    if (statusEl) {
      statusEl.textContent = msg || "";
      statusEl.className = "form-status" + (success ? " is-success" : "");
    }
  }

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

  function renderDateOptions() {
    var container = document.getElementById("dateOptions");
    if (!container) return;
    var dates = getDatesBetween(CONFIG.START_DATE, CONFIG.END_DATE);
    container.innerHTML = "";
    dates.forEach(function (dateStr) {
      var label = formatDateDisplay(dateStr);
      var div = document.createElement("div");
      div.className = "radio-item";
      div.innerHTML =
        '<input type="radio" name="visitDate" id="date_' + dateStr + '" value="' + dateStr + '" required>' +
        '<label for="date_' + dateStr + '">' + label + '</label>';
      container.appendChild(div);
    });
  }

  function updateAvailableSlots() {
    var container = document.getElementById("timeOptions");
    if (!container) return;
    var selectedDate = form.visitDate.value;
    container.innerHTML = "";

    if (!selectedDate) {
      container.innerHTML = '<p style="color:#999;font-size:13px;margin:0;">먼저 날짜를 선택해주세요.</p>';
      return;
    }

    var slotsDiv = document.createElement("div");
    slotsDiv.className = "time-grid";

    CONFIG.TIME_SLOTS.forEach(function (slot) {
      var key = selectedDate + "|" + slot.id;
      var isBooked = bookedSlots[key];
      var div = document.createElement("div");
      div.className = "radio-item" + (isBooked ? " disabled" : "");
      div.innerHTML =
        '<input type="radio" name="visitTime" id="time_' + slot.id + '" value="' + slot.id + '" ' + (isBooked ? "disabled" : "") + '>' +
        '<label for="time_' + slot.id + '">' + slot.label + (isBooked ? ' <span style="color:#999;font-size:11px;">(마감)</span>' : '') + '</label>';
      slotsDiv.appendChild(div);
    });

    container.appendChild(slotsDiv);
  }

  function loadBookedSlots() {
    setStatus("예약 현황을 불러오는 중...", false);

    fetch(CONFIG.GAS_WEB_APP_URL + "?action=list")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.bookings && Array.isArray(data.bookings)) {
          bookedSlots = {};
          data.bookings.forEach(function (booking) {
            var key = booking.date + "|" + booking.timeSlot;
            bookedSlots[key] = true;
          });
        }
        setStatus("");
        renderDateOptions();
        updateAvailableSlots();
      })
      .catch(function (err) {
        console.error(err);
        setStatus("예약 현황을 불러오지 못했습니다.", false);
        renderDateOptions();
        updateAvailableSlots();
      });
  }

  // 날짜 선택 시 시간 옵션 업데이트
  document.addEventListener("change", function (e) {
    if (e.target.name === "visitDate") {
      updateAvailableSlots();
    }
  });

  // 폼 제출
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var date = form.visitDate.value;
    var timeSlot = form.visitTime.value;
    var name = form.visitorName.value.trim();
    var address = form.visitorAddress.value.trim();

    if (!date || !timeSlot || !name || !address) {
      setStatus("모든 항목을 입력해주세요.", false);
      return;
    }

    submitBtn.disabled = true;
    setStatus("신청을 저장하는 중...", false);

    var payload = {
      action: "save",
      date: date,
      timeSlot: timeSlot,
      name: name,
      address: address,
      timestamp: new Date().toISOString()
    };

    fetch(CONFIG.GAS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function () {
        setStatus("신청이 완료되었습니다. 감사합니다!", true);
        form.reset();
        setTimeout(function () {
          loadBookedSlots();
          submitBtn.disabled = false;
        }, 1500);
      })
      .catch(function (err) {
        console.error(err);
        submitBtn.disabled = false;
        setStatus("전송 중 오류가 발생했습니다. 다시 시도해주세요.", false);
      });
  });

  // 페이지 로드 시 예약 현황 불러오기
  loadBookedSlots();
})();
