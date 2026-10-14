/**
 * ============================================================
 * 도초동부성결교회 가을대심방 — 백엔드 (Google Apps Script)
 * ============================================================
 * 스프레드시트:
 * https://docs.google.com/spreadsheets/d/1p7_GH-pIZtKJ6pVWIIK3FDp5l7oWnbJjkFpzAj8-4VA/edit
 */

var SHEET_ID = "1p7_GH-pIZtKJ6pVWIIK3FDp5l7oWnbJjkFpzAj8-4VA";
var SHEET_NAME = "신청현황";
var HEADERS = ["신청일시", "성명", "주소", "방문날짜", "방문시간"];

// timeSlot ID를 실제 시간 문자열로 변환
var TIME_SLOT_MAP = {
  "slot_0": "08:00 - 09:00",
  "slot_1": "09:10 - 10:10",
  "slot_2": "10:20 - 11:20",
  "slot_3": "11:30 - 12:30",
  "slot_4": "13:00 - 14:00",
  "slot_5": "14:10 - 15:10",
  "slot_6": "15:20 - 16:20"
};

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * timeSlot ID를 실제 시간 문자열로 변환
 */
function convertTimeSlotToLabel_(slotId) {
  return TIME_SLOT_MAP[slotId] || slotId;
}

/**
 * 동일 날짜/시간 중복 신청 확인
 */
function isDuplicateBooking_(date, timeSlot, sheet) {
  var timeLabel = convertTimeSlotToLabel_(timeSlot);
  var values = sheet.getDataRange().getValues();
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // row[3] = 날짜, row[4] = 시간(실제 문자열)
    if (row[3] === date && row[4] === timeLabel) {
      return true; // 이미 예약됨
    }
  }
  return false;
}

/**
 * 신청 저장 (POST)
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "save") {
      var sheet = getSheet_();
      
      // 중복 체크
      if (isDuplicateBooking_(data.date, data.timeSlot, sheet)) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            result: "error", 
            message: "이미 신청된 날짜/시간입니다. 다른 시간을 선택해주세요." 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // timeSlot을 실제 시간 문자열로 변환해서 저장
      var timeLabel = convertTimeSlotToLabel_(data.timeSlot);
      
      // 데이터 저장
      sheet.appendRow([
        data.timestamp || new Date().toISOString(),
        data.name || "",
        data.address || "",
        data.date || "",
        timeLabel  // 실제 시간 문자열 저장
      ]);
      
      return ContentService
        .createTextOutput(JSON.stringify({ result: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 신청 목록 조회 (GET)
 * /exec?action=list 로 호출
 */
function doGet(e) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var bookings = [];

  // 헤더 건너뛰고 데이터 행부터 시작
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue; // 빈 행 건너뛰기
    
    bookings.push({
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      name: row[1],
      address: row[2],
      date: row[3],
      timeSlot: row[4]  // 실제 시간 문자열이 들어옴
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ bookings: bookings }))
    .setMimeType(ContentService.MimeType.JSON);
}
