/* ============================================================
   도초동부성결교회 가을대심방 — 설정 파일
   ============================================================ */
window.DOCHOGO_CONFIG = {
  // Google Apps Script 웹앱 배포 URL
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzAq1JeDKgLEx8MEa_6qMkDO2RrKF4JQJgpj-3n8AEKBBplpCNaWWBdU3nYFK6owEmZmQ/exec",

  // 심방 날짜 범위
  START_DATE: "2026-10-19", // 월요일
  END_DATE: "2026-10-24",   // 토요일

  // 심방 시간 구간 (7개)
  TIME_SLOTS: [
    { id: "slot_0", label: "08:00 - 09:00" },
    { id: "slot_1", label: "09:10 - 10:10" },
    { id: "slot_2", label: "10:20 - 11:20" },
    { id: "slot_3", label: "11:30 - 12:30" },
    { id: "slot_4", label: "13:00 - 14:00" },
    { id: "slot_5", label: "14:10 - 15:10" },
    { id: "slot_6", label: "15:20 - 16:20" }
  ],

  // 스프레드시트 정보
  SHEET_ID: "1p7_GH-pIZtKJ6pVWIIK3FDp5l7oWnbJjkFpzAj8-4VA",
  SHEET_NAME: "신청현황"
};
