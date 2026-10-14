/* ============================================================
   신청 폼 로직 (시간 표시 및 중복 방지 개선)
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.DOCHOGO_CONFIG || {};
  var form = document.getElementById("visitationForm");
  var submitBtn = document.getElementById("submitBtn");
  var statusEl = document.getElementById("formStatus");
  var bookedSlots = {}; // { "2026-10-19|08:00 - 09:00": true, ... }

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
      // 실제 시간 레이블로 키 생성 (예: "2026-10-19|08:00 - 09:00")
      var key = selectedDate + "|" + slot.label;
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

    if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.indexOf("여기에") !== -1) {
      setStatus("⚠️ GAS_WEB_APP_URL이 설정되지 않았습니다. js/config.js를 확인해주세요.", false);
      renderDateOptions();
      return;
    }

    fetch(CONFIG.GAS_WEB_APP_URL + "?action=list")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.bookings && Array.isArray(data.bookings)) {
          bookedSlots = {};
          data.bookings.forEach(function (booking) {
            // 실제 시간 문자열로 키 생성 (예: "2026-10-19|08:00 - 09:00")
            var key = booking.date + "|" + booking.timeSlot;
            bookedSlots[key] = true;
          });
        }
        setStatus("");
        renderDateOptions();
        updateAvailableSlots();
      })
      .catch(function (err) {
        console.error("예약 데이터 로드 오류:", err);
        setStatus("⚠️ 예약 현황을 불러오지 못했습니다. GAS URL을 확인하고 잠시 후 다시 시도해주세요.", false);
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

    // 클라이언트 단 중복 체크: 실제 시간 레이블과 비교
    var selectedSlot = CONFIG.TIME_SLOTS.find(function (s) { return s.id === timeSlot; });
    if (selectedSlot) {
      var key = date + "|" + selectedSlot.label;
      if (bookedSlots[key]) {
        setStatus("이미 신청된 날짜/시간입니다. 다른 시간을 선택해주세요.", false);
        return;
      }
    }

    submitBtn.disabled = true;
    setStatus("신청을 저장하는 중...", false);

    var payload = {
      action: "save",
      date: date,
      timeSlot: timeSlot,  // slot_0 같은 ID를 전송하면 서버에서 변환됨
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
        // 1초 기다린 후 데이터를 다시 불러옴 (저장 확인)
        setTimeout(function () {
          fetch(CONFIG.GAS_WEB_APP_URL + "?action=list")
            .then(function (res) { return res.json(); })
            .then(function (data) {
              if (data.bookings) {
                // 방금 신청한 데이터가 들어왔는지 확인
                var found = data.bookings.some(function (b) {
                  return b.date === date && b.name === name;
                });
                
                if (found) {
                  setStatus("✅ 신청이 완료되었습니다. 감사합니다!", true);
                  form.reset();
                  loadBookedSlots(); // 예약 현황 업데이트
                } else {
                  setStatus("⚠️ 신청은 되었지만 확인되지 않습니다. 새로고침 후 확인해주세요.", false);
                }
              }
              submitBtn.disabled = false;
            })
            .catch(function () {
              setStatus("✅ 신청이 완료되었습니다.", true);
              form.reset();
              submitBtn.disabled = false;
              loadBookedSlots();
            });
        }, 1000);
      })
      .catch(function (err) {
        console.error("전송 오류:", err);
        submitBtn.disabled = false;
        setStatus("⚠️ 전송 중 오류가 발생했습니다. GAS URL을 확인하고 다시 시도해주세요.", false);
      });
  });

  // 페이지 로드 시 예약 현황 불러오기
  loadBookedSlots();
})();
