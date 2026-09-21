/** Google Sheets response collection (Apps Script Web App flow). */

export type SheetsDoc = {
  /** Detects Apps Script Web App URLs, e.g. the `/exec` form. */
  endpoint?: string
}

/** Domains that can host an Apps Script Web App. */
export function isAppsScriptUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(exec|dev)(\?|$)/.test(url)
}

/** True when the string looks like any http(s) URL we accept as an endpoint. */
export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Diagnostic helper for the classic silent-failure mode of
 * `mode: "no-cors"` Apps Script deployments (request leaves the browser but
 * the response is opaque, so fetch() resolves even on failure).
 */
export function diagnoseNoCors(endpoint: string): string[] {
  const tips: string[] = []
  if (isAppsScriptUrl(endpoint)) {
    tips.push("In Apps Script: Deploy → New deployment → type “Web app”.")
    tips.push('Execute as: “Me”. Who has access: “Anyone” — with the “Anyone” option, not “Any user with a Google account”.')
    tips.push("Copy the URL that ends in /exec — that is the endpoint.")
  }
  tips.push(
    "In Apps Script, do NOT use mode=\"no-cors\" in your own code, and never invoke doPost via fetch from the script editor to test CORS.",
  )
  return tips
}

/** The complete Apps Script the user pastes into script.google.com. */
export function appsScript(doGetHtml = true): string {
  const doGetBlock = doGetHtml
    ? `function doGet() {
  return HtmlService.createHtmlOutput(
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<p style="font:15px system-ui;padding:24px">' +
    '✅ ki-forms is connected to this sheet.<br>' +
    'Re-deploy is NOT needed; new rows appear automatically.</p>'
  )
}
`
    : ""

  return `/**
 * ki-forms → Google Sheets collector.
 *
 * 1. Open your Google Sheet → Extensions → Apps Script.
 * 2. Replace everything in Code.gs with this file. Save.
 * 3. Deploy → New deployment → type "Web app" → Execute as: Me →
 *    Who has access: Anyone → Deploy.
 * 4. Copy the /exec URL into the Studio's "Collect responses" box.
 *
 * New form fields become new sheet columns automatically on the next submit.
 */

var HEADERS = []; // auto-built from the first submission

${doGetBlock}function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    var values = body.values || {};
    var meta = body.meta || {};

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (HEADERS.length === 0) {
      var existing = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
      HEADERS = existing.length ? existing : buildHeaders(values, meta);
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    }

    var row = HEADERS.map(function (h) {
      if (h in values) return values[h];
      if (h in meta) return meta[h];
      if (h === "submittedAt") return new Date().toISOString();
      return "";
    });

    // A field added after the first submission gets its column here.
    Object.keys(values).forEach(function (k) {
      if (HEADERS.indexOf(k) === -1) {
        HEADERS.push(k);
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        row.push(values[k]);
      }
    });

    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, row: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function buildHeaders(values, meta) {
  var hs = ["submittedAt"];
  Object.keys(values).forEach(function (k) { hs.push(k); });
  Object.keys(meta).forEach(function (k) {
    if (hs.indexOf(k) === -1) hs.push(k);
  });
  return hs;
}
`
}
