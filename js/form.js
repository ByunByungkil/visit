/* ============================================================
   신청 폼 로직 — 중복 검사는 서버(code.gs)가 최종 판단
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = window.DOCHOGO_CONFIG || {};
  var form = document.getElementById("visitationForm");
  var submitBtn = document.getElementById("submitBtn");
  var statusEl = document.getElementById("formStatus");
  var bookedMap = {}; // "2026-10-19|08:00 - 09:00" -> 신청자 이름

  if (!form) return;

  function setStatus(msg, success) {
    statusEl.textContent = msg || "";
    statusEl.className = "form-status" + (success ? " is-success" : "");
  }

  function isConfigured() {
    return CONFIG.GAS_WEB_APP_URL && CONFIG.GAS_WEB_APP_URL.indexOf("여기에") === -1;
  }

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

  function labelOf(slotId) {
    for (var i = 0; i < CONFIG.TIME_SLOTS.length; i++) {
      if (CONFIG.TIME_SLOTS[i].id === slotId) return CONFIG.TIME_SLOTS[i].label;
    }
    return slotId;
  }

  function getSelectedDate() {
    var c = form.querySelector('input[name="visitDate"]:checked');
    return c ? c.value : "";
  }

  function renderDateOptions() {
    var container = document.getElementById("dateOptions");
    container.innerHTML = "";
    getDates(CONFIG.START_DATE, CONFIG.END_DATE).forEach(function (dateStr) {
      var div = document.createElement("div");
      div.className = "radio-item";
      div.innerHTML =
        '<input type="radio" name="visitDate" id="date_' + dateStr + '" value="' + dateStr + '" required>' +
        '<label for="date_' + dateStr + '">' + formatDateDisplay(dateStr) + '</label>';
      container.appendChild(div);
    });
  }

  function renderTimeOptions() {
    var container = document.getElementById("timeOptions");
    container.innerHTML = "";
    var date = getSelectedDate();
    if (!date) {
      container.innerHTML = '<p style="color:#999;font-size:13px;margin:0;">먼저 날짜를 선택해주세요.</p>';
      return;
    }
    var grid = document.createElement("div");
    grid.className = "time-grid";
    CONFIG.TIME_SLOTS.forEach(function (slot) {
      var taken = bookedMap[date + "|" + slot.label];
      var div = document.createElement("div");
      div.className = "radio-item" + (taken ? " disabled" : "");
      div.innerHTML =
        '<input type="radio" name="visitTime" id="time_' + slot.id + '" value="' + slot.id + '"' + (taken ? " disabled" : "") + '>' +
        '<label for="time_' + slot.id + '">' + slot.label +
        (taken ? ' <span style="color:#999;font-size:11px;">(마감)</span>' : '') + '</label>';
      grid.appendChild(div);
    });
    container.appendChild(grid);
  }

  /* 서버에서 신청 목록을 받아 bookedMap 갱신 */
  function loadBookings(done) {
    if (!isConfigured()) {
      done(new Error("GAS_WEB_APP_URL 미설정"));
      return;
    }
    fetch(CONFIG.GAS_WEB_APP_URL + "?action=list", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        bookedMap = {};
        (data.bookings || []).forEach(function (b) {
          bookedMap[b.date + "|" + b.timeSlot] = b.name;
        });
        done(null);
      })
      .catch(function (err) { done(err); });
  }

  /* 날짜 선택은 유지하면서 화면 다시 그리기 */
  function refreshForm() {
    var prev = getSelectedDate();
    renderDateOptions();
    if (prev) {
      var el = form.querySelector('input[name="visitDate"][value="' + prev + '"]');
      if (el) el.checked = true;
    }
    renderTimeOptions();
  }

  document.addEventListener("change", function (e) {
    if (e.target.name === "visitDate") renderTimeOptions();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var dateEl = form.querySelector('input[name="visitDate"]:checked');
    var timeEl = form.querySelector('input[name="visitTime"]:checked');
    var name = form.visitorName.value.trim();
    var address = form.visitorAddress.value.trim();

    if (!dateEl || !timeEl || !name || !address) {
      setStatus("모든 항목을 입력해주세요.", false);
      return;
    }
    if (!isConfigured()) {
      setStatus("⚠️ js/config.js 의 GAS_WEB_APP_URL 을 먼저 설정해주세요.", false);
      return;
    }

    var date = dateEl.value;
    var slotId = timeEl.value;

    // 1차: 화면에 불러온 목록으로 빠른 확인
    if (bookedMap[date + "|" + labelOf(slotId)]) {
      setStatus("이미 신청된 시간입니다. 다른 시간을 선택해주세요.", false);
      refreshForm();
      return;
    }

    submitBtn.disabled = true;
    setStatus("신청을 저장하는 중입니다...", false);

    // 2차: 서버가 시트를 직접 확인해 저장 (응답을 읽을 수 있도록 GET 사용)
    var url = CONFIG.GAS_WEB_APP_URL +
      "?action=save" +
      "&date=" + encodeURIComponent(date) +
      "&timeSlot=" + encodeURIComponent(slotId) +
      "&name=" + encodeURIComponent(name) +
      "&address=" + encodeURIComponent(address);

    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        submitBtn.disabled = false;
        if (res.result === "success") {
          setStatus("✅ 신청이 완료되었습니다. 감사합니다!", true);
          form.reset();
        } else if (res.result === "duplicate") {
          setStatus("⚠️ " + res.message, false);
        } else {
          setStatus("⚠️ 저장에 실패했습니다: " + (res.message || ""), false);
        }
        loadBookings(function () { refreshForm(); });
      })
      .catch(function (err) {
        console.error(err);
        submitBtn.disabled = false;
        setStatus("⚠️ 서버와 통신하지 못했습니다. 잠시 후 다시 시도해주세요.", false);
      });
  });

  // 최초 로드
  renderDateOptions();
  renderTimeOptions();
  loadBookings(function (err) {
    refreshForm();
    if (err) setStatus("⚠️ 예약 현황을 불러오지 못했습니다. GAS URL을 확인해주세요.", false);
  });
})();

