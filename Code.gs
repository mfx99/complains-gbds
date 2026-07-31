/*************************************************************************
 *  GBDS অভিযোগ ও নিরাপত্তা পোর্টাল — Google Apps Script Backend
 *
 *  এই স্ক্রিপ্টটি করে:
 *   1) ফর্ম থেকে আসা ডেটা Google Sheets-এ সংরক্ষণ করে
 *   2) সংযুক্ত প্রমাণ (ছবি/ভিডিও/অডিও/PDF) Google Drive-এ আপলোড করে
 *   3) complain.gbds@gmail.com -এ একটি সুন্দর HTML ইমেইল পাঠায়
 *   4) একটি ইউনিক Complaint ID (GBDS-2026-0001 ফরম্যাটে) তৈরি করে
 *
 *  ইনস্টলেশন নির্দেশনার জন্য DEPLOYMENT_GUIDE.md এবং
 *  SHEET_SETUP_GUIDE.md দেখুন।
 *************************************************************************/

/* ----------------------------- CONFIG ---------------------------------- */
const NOTIFY_EMAIL = "complain.gbds@gmail.com";
const SHEET_NAME = "Complaints";
const DRIVE_FOLDER_NAME = "GBDS Complaint Evidence";
const ORG_NAME = "Gono Bishwabidyalay Debate Society (GBDS)";
const COMPLAINT_PREFIX = "GBDS";

/* Sheet column headers — order matters, keep in sync with appendRow below */
const HEADERS = [
  "Timestamp",
  "Complaint ID",
  "পূর্ণ নাম",
  "Student ID",
  "বিভাগ",
  "ব্যাচ",
  "মোবাইল নম্বর",
  "ইমেইল",
  "পরিচয় গোপনীয়তা",
  "অনুষ্ঠানের নাম",
  "ঘটনার তারিখ",
  "ঘটনার সময়",
  "ঘটনার স্থান",
  "অভিযোগের ধরন",
  "ঘটনার বিস্তারিত বিবরণ",
  "অভিযুক্ত ব্যক্তি",
  "প্রত্যক্ষদর্শী",
  "প্রত্যাশিত সহায়তা",
  "প্রমাণের লিংক",
  "স্ট্যাটাস",
];

/* ------------------------------------------------------------------------
   doPost — মূল এন্ট্রি পয়েন্ট, ফ্রন্টএন্ড থেকে ফর্ম সাবমিশন গ্রহণ করে
   ------------------------------------------------------------------------ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "কোনো ডেটা পাওয়া যায়নি।" });
    }

    const data = JSON.parse(e.postData.contents);

    // Honeypot spam check (server-side, defense in depth)
    if (data.website) {
      return jsonResponse({ status: "success", complaintId: "IGNORED" });
    }

    // Basic required-field validation (server-side, never trust client only)
    const requiredFields = ["fullName", "studentId", "department", "batch", "mobile", "email", "privacy", "description"];
    for (const field of requiredFields) {
      if (!data[field] || String(data[field]).trim() === "") {
        return jsonResponse({ status: "error", message: `আবশ্যক তথ্য অনুপস্থিত: ${field}` });
      }
    }
    if (!data.complaintType || data.complaintType.length === 0) {
      return jsonResponse({ status: "error", message: "অন্তত একটি অভিযোগের ধরন নির্বাচন করা আবশ্যক।" });
    }
    if (!data.declaration) {
      return jsonResponse({ status: "error", message: "ঘোষণা নিশ্চিত করা আবশ্যক।" });
    }

    const sheet = getOrCreateSheet();
    const complaintId = generateComplaintId(sheet);

    // Upload evidence files to Drive (if any) and collect shareable links
    const evidenceLinks = uploadEvidenceFiles(data.evidence || [], complaintId);

    // Append row to sheet
    sheet.appendRow([
      new Date(),
      complaintId,
      data.fullName || "",
      data.studentId || "",
      data.department || "",
      data.batch || "",
      data.mobile || "",
      data.email || "",
      data.privacy || "",
      data.eventName || "",
      data.eventDate || "",
      data.eventTime || "",
      data.eventLocation || "",
      (data.complaintType || []).join(", "),
      data.description || "",
      data.accused || "",
      data.witness || "",
      (data.support || []).join(", "),
      evidenceLinks.join("\n"),
      "নতুন",
    ]);

    // Send notification email (best-effort — don't fail the whole request if email fails)
    try {
      sendNotificationEmail(data, complaintId, evidenceLinks);
    } catch (emailErr) {
      console.error("Email sending failed: " + emailErr);
    }

    return jsonResponse({ status: "success", complaintId: complaintId });
  } catch (err) {
    console.error(err);
    return jsonResponse({ status: "error", message: "সার্ভারে একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
  } finally {
    lock.releaseLock();
  }
}

/* Simple health-check for GET requests (useful when testing the deployed URL) */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok", message: "GBDS Complaint Portal API সক্রিয় আছে।" })
  ).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------------------ */

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#0B2A5B").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    for (let i = 1; i <= HEADERS.length; i++) sheet.autoResizeColumn(i);
  }
  return sheet;
}

/**
 * Complaint ID ফরম্যাট: GBDS-YYYY-0001
 * চলতি বছরের শেষ ব্যবহৃত সিরিয়াল নম্বর খুঁজে তার পরেরটি ব্যবহার করে।
 */
function generateComplaintId(sheet) {
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  let maxSerial = 0;

  if (lastRow > 1) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Complaint ID column
    const pattern = new RegExp(`^${COMPLAINT_PREFIX}-${year}-(\\d+)$`);
    ids.forEach((row) => {
      const match = String(row[0]).match(pattern);
      if (match) {
        const serial = parseInt(match[1], 10);
        if (serial > maxSerial) maxSerial = serial;
      }
    });
  }

  const nextSerial = maxSerial + 1;
  return `${COMPLAINT_PREFIX}-${year}-${String(nextSerial).padStart(4, "0")}`;
}

/**
 * প্রমাণের ফাইলগুলো (base64) Google Drive-এ আপলোড করে এবং শেয়ারযোগ্য লিংক ফেরত দেয়।
 */
function uploadEvidenceFiles(evidenceArray, complaintId) {
  if (!evidenceArray || evidenceArray.length === 0) return [];

  const folder = getOrCreateEvidenceFolder();
  const complaintFolder = folder.createFolder(complaintId);
  const links = [];

  evidenceArray.forEach((item) => {
    try {
      const decoded = Utilities.base64Decode(item.base64);
      const blob = Utilities.newBlob(decoded, item.type || "application/octet-stream", item.name || "evidence");
      const file = complaintFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      links.push(`${item.name}: ${file.getUrl()}`);
    } catch (err) {
      console.error("Evidence upload failed for " + item.name + ": " + err);
      links.push(`${item.name}: [আপলোড ব্যর্থ হয়েছে]`);
    }
  });

  return links;
}

function getOrCreateEvidenceFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

/**
 * নতুন অভিযোগ জমা হলে GBDS টিমকে সুন্দর HTML ইমেইল পাঠায়।
 */
function sendNotificationEmail(data, complaintId, evidenceLinks) {
  const subject = `[GBDS Complaint] New Incident Report Received — ${complaintId}`;
  const html = buildEmailHtml(data, complaintId, evidenceLinks);

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    htmlBody: html,
    name: "GBDS অভিযোগ ও নিরাপত্তা পোর্টাল",
  });
}

function buildEmailHtml(data, complaintId, evidenceLinks) {
  const row = (label, value) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #E5EEFB;color:#5B6B85;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5EEFB;color:#0B2A5B;font-size:13px;font-weight:600;">${escapeHtml(value || "—")}</td>
    </tr>`;

  const evidenceHtml =
    evidenceLinks && evidenceLinks.length
      ? evidenceLinks.map((l) => `<div style="font-size:12px;color:#1848B3;margin-bottom:4px;">${escapeHtml(l)}</div>`).join("")
      : `<div style="font-size:12px;color:#8896AC;">কোনো প্রমাণ সংযুক্ত করা হয়নি।</div>`;

  return `
  <div style="font-family:Arial, sans-serif;background:#F3F8FF;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(11,42,91,0.08);">
      <div style="background:linear-gradient(135deg,#0B2A5B,#1848B3);padding:28px 32px;">
        <p style="margin:0;color:#B7DCFF;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;">GBDS অভিযোগ ও নিরাপত্তা পোর্টাল</p>
        <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;">নতুন অভিযোগ জমা হয়েছে</h1>
        <p style="margin:10px 0 0;color:#DCEEFF;font-size:13px;">Complaint ID: <strong>${escapeHtml(complaintId)}</strong></p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${row("পূর্ণ নাম", data.fullName)}
        ${row("Student ID", data.studentId)}
        ${row("বিভাগ", data.department)}
        ${row("ব্যাচ", data.batch)}
        ${row("মোবাইল নম্বর", data.mobile)}
        ${row("ইমেইল", data.email)}
        ${row("পরিচয় গোপনীয়তার পছন্দ", data.privacy)}
        ${row("অনুষ্ঠানের নাম", data.eventName)}
        ${row("ঘটনার তারিখ", data.eventDate)}
        ${row("ঘটনার সময়", data.eventTime)}
        ${row("ঘটনার স্থান", data.eventLocation)}
        ${row("অভিযোগের ধরন", (data.complaintType || []).join(", "))}
        ${row("অভিযুক্ত ব্যক্তির তথ্য", data.accused)}
        ${row("প্রত্যক্ষদর্শীর তথ্য", data.witness)}
        ${row("প্রত্যাশিত সহায়তা", (data.support || []).join(", "))}
      </table>

      <div style="padding:16px 32px;border-bottom:1px solid #E5EEFB;">
        <p style="margin:0 0 6px;color:#5B6B85;font-size:13px;">ঘটনার বিস্তারিত বিবরণ</p>
        <p style="margin:0;color:#0B2A5B;font-size:13px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.description)}</p>
      </div>

      <div style="padding:16px 32px;">
        <p style="margin:0 0 8px;color:#5B6B85;font-size:13px;">সংযুক্ত প্রমাণ</p>
        ${evidenceHtml}
      </div>

      <div style="background:#F3F8FF;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#8896AC;font-size:11px;">এই ইমেইলটি GBDS অভিযোগ ও নিরাপত্তা পোর্টাল থেকে স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে।</p>
      </div>
    </div>
  </div>`;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ------------------------------------------------------------------------
   TEST HELPER — Apps Script এডিটর থেকে সরাসরি চালিয়ে দেখতে পারেন
   (Run > testSubmission)। এটি একটি নমুনা অভিযোগ তৈরি করবে।
   ------------------------------------------------------------------------ */
function testSubmission() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        fullName: "টেস্ট ইউজার",
        studentId: "2021-00-00",
        department: "টেস্ট বিভাগ",
        batch: "টেস্ট ব্যাচ",
        mobile: "01700000000",
        email: "test@example.com",
        privacy: "আমার পরিচয় সম্পূর্ণ গোপন রাখা হোক",
        eventName: "টেস্ট ইভেন্ট",
        eventDate: "2026-08-01",
        eventTime: "18:00",
        eventLocation: "টেস্ট স্থান",
        complaintType: ["মৌখিক হয়রানি"],
        description: "এটি একটি পরীক্ষামূলক অভিযোগ যা সিস্টেম পরীক্ষার জন্য ব্যবহৃত হচ্ছে।",
        accused: "",
        witness: "",
        support: ["বিষয়টি তদন্ত করা হোক"],
        declaration: true,
        evidence: [],
        website: "",
      }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
