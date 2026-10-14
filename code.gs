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
 * 신청 저장 (POST)
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "save") {
      var sheet = getSheet_();
      sheet.appendRow([
        data.timestamp || new Date().toISOString(),
        data.name || "",
        data.address || "",
        data.date || "",
        data.timeSlot || ""
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
      timeSlot: row[4]
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ bookings: bookings }))
    .setMimeType(ContentService.MimeType.JSON);
}
