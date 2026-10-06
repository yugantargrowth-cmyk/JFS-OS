/**
 * ============================================================================
 * JANGID FURNITURE STUDIO (JFS) - GOOGLE APPS SCRIPT LEAD CAPTURE WEBHOOK
 * ============================================================================
 * 
 * Instructions for JFS Owner (Personal Gmail / Google Account):
 * 
 * 1. Open Google Sheets (https://sheets.google.com) in your personal Google account.
 * 2. Create a new Sheet named: "JFS Leads Database".
 * 3. In the top menu, click: Extensions -> Apps Script.
 * 4. Delete any code in the editor, and paste this entire code.
 * 5. Click "Deploy" (top right) -> "New deployment".
 * 6. Under "Select type", choose "Web app".
 * 7. Set:
 *    - Description: "JFS Website Lead Capture Webhook"
 *    - Execute as: "Me" (your personal Gmail account)
 *    - Who has access: "Anyone"
 * 8. Click "Deploy", authorize permissions when prompted.
 * 9. Copy the "Web app URL" (it looks like: https://script.google.com/macros/s/.../exec).
 * 10. Paste this URL into `JFS_CONFIG.googleSheetUrl` in `website/index.html` and in
 *     the JFS Business Hub Settings.
 * 
 * That's it! Every inquiry from your website will instantly appear as a row in your Google Sheet!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Set up headers if empty
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Timestamp",
        "Date",
        "Lead Type",
        "Customer Name",
        "Phone Number",
        "Email",
        "City / Area",
        "Service",
        "Budget",
        "Preferred Date",
        "Requirements / Notes",
        "Source",
        "Stage",
        "Next Action",
        "Next Follow-up Date"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E07B39").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var now = new Date();
    var formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone() || "Asia/Kolkata", "dd-MMM-yyyy HH:mm");
    
    var stage = data.stage || (data.type && data.type.indexOf("Visit") !== -1 ? "Site Visit" : "Lead");
    var nextAction = stage === "Site Visit" ? "Call customer to schedule site visit" : "Initial call & qualification";
    
    // Default next follow-up date: tomorrow
    var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    var nextFollowUp = Utilities.formatDate(tomorrow, Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd");

    var row = [
      data.timestamp || now.toISOString(),
      data.created_at || formattedDate,
      data.type || "Website Lead",
      data.name || "Unknown",
      data.phone || "",
      data.email || "",
      data.city || "Ahmedabad",
      data.service || "Modular Furniture",
      data.budget || "",
      data.date || "",
      data.notes || "",
      data.source || "Website",
      stage,
      nextAction,
      nextFollowUp
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Lead recorded successfully" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  // Allow fetching leads for the Hub if deployed with GET support
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", leads: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = rows[0];
    var leads = [];
    for (var i = 1; i < rows.length; i++) {
      var obj = { id: "sheet-row-" + i };
      for (var j = 0; j < headers.length; j++) {
        var key = String(headers[j]).toLowerCase().replace(/[^a-z0-9]/g, '_');
        obj[key] = rows[i][j];
      }
      leads.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", leads: leads }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
