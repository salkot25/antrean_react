// =============================================================
// PLN Queue Management System - Google Apps Script Backend
// =============================================================
// Sheet: queues   → A:id | B:number | C:service | D:customer_name | E:status | F:created_at | G:called_at | H:counter | I:date
// Sheet: counters → A:id | B:name   | C:service | D:last_called_number | E:last_called_at
// Sheet: settings → A:key | B:value | C:description
// Sheet: users    → A:id | B:username | C:fullName | D:email | E:role | F:status | G:passwordHash | H:lastLogin
// =============================================================

// Column index constants for 'users' sheet (0-based)
var U_ID = 0;
var U_USERNAME = 1;
var U_FULLNAME = 2;
var U_EMAIL = 3;
var U_ROLE = 4;
var U_STATUS = 5;
var U_PASSHASH = 6;
var U_LASTLOGIN = 7;

// Column index constants for 'queues' sheet (1-based for getRange, 0-based for array access)
var Q_ID = 0; // A
var Q_NUMBER = 1; // B
var Q_SERVICE = 2; // C
var Q_CUSTOMER = 3; // D ← NEW: customer_name
var Q_STATUS = 4; // E (was D)
var Q_CREATED_AT = 5; // F (was E)
var Q_CALLED_AT = 6; // G (was F)
var Q_COUNTER = 7; // H (was G)
var Q_DATE = 8; // I (was H)

// Column index constants for 'counters' sheet
var C_ID = 0; // A
var C_NAME = 1; // B
var C_SERVICE = 2; // C
var C_LAST_NUM = 3; // D
var C_LAST_AT = 4; // E

// =============================================================
// HTTP Handlers
// =============================================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);

    var request = JSON.parse(e.postData.contents);
    var action = request.action;

    if (action === "create") {
      return handleCreateQueue(request);
    } else if (action === "call") {
      return handleCallQueue(request);
    } else if (action === "skip") {
      return handleSkipQueue(request);
    } else if (action === "set_config") {
      return handleSetConfig(request);
    } else if (action === "init_sheets") {
      return handleInitSheets();
    } else if (action === "login") {
      return handleLogin(request);
    } else if (action === "create_user") {
      return handleCreateUser(request);
    } else if (action === "update_user") {
      return handleUpdateUser(request);
    } else if (action === "delete_user") {
      return handleDeleteUser(request);
    }

    return jsonOut({ error: "Invalid action: " + action });
  } catch (error) {
    return jsonOut({ error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = e.parameter.action;

  try {
    if (action === "list") {
      return handleListQueue(e.parameter.service);
    } else if (action === "display") {
      return handleDisplay();
    } else if (action === "get_config") {
      return handleGetConfig();
    } else if (action === "init_sheets") {
      return handleInitSheets();
    } else if (action === "get_users") {
      return handleGetUsers();
    }

    return jsonOut({ error: "Invalid action: " + action });
  } catch (error) {
    return jsonOut({ error: error.message });
  }
}

// =============================================================
// Sheet Initialization (Run once to set up headers)
// =============================================================

function handleInitSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── queues sheet ──
  var queuesSheet = ss.getSheetByName("queues");
  if (!queuesSheet) {
    queuesSheet = ss.insertSheet("queues");
  }
  // Set headers if row 1 col A is empty
  var firstCell = queuesSheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "id") {
    queuesSheet
      .getRange(1, 1, 1, 9)
      .setValues([
        [
          "id",
          "number",
          "service",
          "customer_name",
          "status",
          "created_at",
          "called_at",
          "counter",
          "date",
        ],
      ]);
    // Format header row
    queuesSheet
      .getRange(1, 1, 1, 9)
      .setFontWeight("bold")
      .setBackground("#004482")
      .setFontColor("#ffffff");
    queuesSheet.setFrozenRows(1);
    // Set column widths
    queuesSheet.setColumnWidth(1, 230); // id (UUID)
    queuesSheet.setColumnWidth(2, 80); // number
    queuesSheet.setColumnWidth(3, 80); // service
    queuesSheet.setColumnWidth(4, 150); // customer_name
    queuesSheet.setColumnWidth(5, 80); // status
    queuesSheet.setColumnWidth(6, 150); // created_at
    queuesSheet.setColumnWidth(7, 150); // called_at
    queuesSheet.setColumnWidth(8, 200); // counter
    queuesSheet.setColumnWidth(9, 100); // date
  }

  // ── counters sheet ──
  var countersSheet = ss.getSheetByName("counters");
  if (!countersSheet) {
    countersSheet = ss.insertSheet("counters");
  }
  var firstCounterCell = countersSheet.getRange(1, 1).getValue();
  if (!firstCounterCell || firstCounterCell !== "id") {
    countersSheet
      .getRange(1, 1, 1, 5)
      .setValues([
        ["id", "name", "service", "last_called_number", "last_called_at"],
      ]);
    countersSheet
      .getRange(1, 1, 1, 5)
      .setFontWeight("bold")
      .setBackground("#004482")
      .setFontColor("#ffffff");
    countersSheet.setFrozenRows(1);
    countersSheet.setColumnWidth(1, 230);
    countersSheet.setColumnWidth(2, 200);
    countersSheet.setColumnWidth(3, 80);
    countersSheet.setColumnWidth(4, 150);
    countersSheet.setColumnWidth(5, 160);
  }

  // ── settings sheet ──
  var settingsSheet = ss.getSheetByName("settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("settings");
  }
  var firstSettingCell = settingsSheet.getRange(1, 1).getValue();
  if (!firstSettingCell || firstSettingCell !== "key") {
    settingsSheet
      .getRange(1, 1, 1, 3)
      .setValues([["key", "value", "description"]]);
    settingsSheet
      .getRange(1, 1, 1, 3)
      .setFontWeight("bold")
      .setBackground("#004482")
      .setFontColor("#ffffff");
    settingsSheet.setFrozenRows(1);
    settingsSheet.setColumnWidth(1, 160);
    settingsSheet.setColumnWidth(2, 250);
    settingsSheet.setColumnWidth(3, 300);

    // Seed default settings
    settingsSheet.appendRow([
      "officeName",
      "PLN ULP Salatiga",
      "Nama kantor yang ditampilkan di header dan tiket",
    ]);
    settingsSheet.appendRow([
      "resetTime",
      "00:00",
      "Jam reset nomor antrian harian (format HH:mm)",
    ]);
    settingsSheet.appendRow([
      "dateFormat",
      "LONG_ID",
      "Format tanggal tampilan (LONG_ID | DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD)",
    ]);
    settingsSheet.appendRow([
      "youtubeUrl",
      "https://www.youtube.com/watch?v=DHua0l0Hhu4",
      "URL video YouTube untuk TV Display",
    ]);
    settingsSheet.appendRow([
      "autoPrint",
      "true",
      "Otomatis print tiket di Kiosk (true/false)",
    ]);
    settingsSheet.appendRow([
      "ttsVoiceUri",
      "",
      "Voice URI untuk Text-to-Speech",
    ]);
    settingsSheet.appendRow(["ttsPitch", "1", "Intonasi suara TTS (0-2)"]);
    settingsSheet.appendRow(["ttsRate", "0.8", "Kecepatan bicara TTS (0.5-2)"]);
    settingsSheet.appendRow([
      "videoVolume",
      "100",
      "Volume video normal saat tidak ada pemanggilan (0-100)",
    ]);
    settingsSheet.appendRow([
      "videoVolumeDucked",
      "15",
      "Volume video saat TTS sedang membacakan antrian (0-50)",
    ]);
    settingsSheet.appendRow([
      "runningText",
      "Selamat datang di PLN ULP Salatiga. Silakan ambil nomor antrian dan tunggu panggilan. Pelayanan kami mengutamakan kepuasan Anda.",
      "Teks berjalan di bagian bawah layar TV Display",
    ]);
  }

  // ── users sheet ── (auto-creates with default admin)
  ensureUsersSheetReady();

  return jsonOut({
    success: true,
    message: "Semua sheet berhasil diinisialisasi dengan header.",
  });
}

// =============================================================
// Users Handlers
// =============================================================

function hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
  );
  return bytes
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

function ensureUsersSheetReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("users");

  if (!sheet) {
    sheet = ss.insertSheet("users");
  }

  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "id") {
    sheet
      .getRange(1, 1, 1, 8)
      .setValues([
        [
          "id",
          "username",
          "fullName",
          "email",
          "role",
          "status",
          "passwordHash",
          "lastLogin",
        ],
      ]);
    sheet
      .getRange(1, 1, 1, 8)
      .setFontWeight("bold")
      .setBackground("#004482")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 230);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 80);
    sheet.setColumnWidth(7, 280);
    sheet.setColumnWidth(8, 160);
  }

  // Seed default admin if sheet has only the header row
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    sheet.appendRow([
      Utilities.getUuid(),
      "admin",
      "Administrator",
      "admin@plnulp.local",
      "admin",
      "active",
      hashPassword("admin123"),
      "",
    ]);
  }

  return sheet;
}

function handleLogin(request) {
  var username = (request.username || "").trim();
  var password = request.password || "";

  if (!username || !password) {
    return jsonOut({ error: "Username dan password wajib diisi." });
  }

  var sheet = ensureUsersSheetReady();
  var data = sheet.getDataRange().getValues();
  var inputHash = hashPassword(password);

  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][U_USERNAME]).toLowerCase() === username.toLowerCase() &&
      data[i][U_PASSHASH] === inputHash
    ) {
      if (data[i][U_STATUS] !== "active") {
        return jsonOut({
          error: "Akun tidak aktif. Hubungi administrator.",
        });
      }
      // Update last login timestamp
      sheet.getRange(i + 1, U_LASTLOGIN + 1).setValue(new Date());
      return jsonOut({
        success: true,
        user: {
          id: data[i][U_ID],
          username: data[i][U_USERNAME],
          fullName: data[i][U_FULLNAME],
          email: data[i][U_EMAIL],
          role: data[i][U_ROLE],
        },
      });
    }
  }

  return jsonOut({ error: "Username atau password salah." });
}

function handleGetUsers() {
  var sheet = ensureUsersSheetReady();
  var data = sheet.getDataRange().getValues();
  var users = [];

  for (var i = 1; i < data.length; i++) {
    var lastLogin = data[i][U_LASTLOGIN];
    users.push({
      id: data[i][U_ID],
      username: data[i][U_USERNAME],
      fullName: data[i][U_FULLNAME],
      email: data[i][U_EMAIL],
      role: data[i][U_ROLE],
      status: data[i][U_STATUS],
      lastLogin: lastLogin ? String(lastLogin) : "",
    });
  }

  return jsonOut(users);
}

function handleCreateUser(request) {
  var username = (request.username || "").trim();
  if (!username) return jsonOut({ error: "Username wajib diisi." });

  var sheet = ensureUsersSheetReady();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][U_USERNAME]).toLowerCase() === username.toLowerCase()) {
      return jsonOut({ error: "Username sudah digunakan." });
    }
  }

  var id = Utilities.getUuid();
  var hash = hashPassword(request.password || "changeme123");
  sheet.appendRow([
    id,
    username,
    request.fullName || "",
    request.email || "",
    request.role || "operator",
    request.status || "active",
    hash,
    "",
  ]);

  return jsonOut({ success: true, id: id });
}

function handleUpdateUser(request) {
  if (!request.id) return jsonOut({ error: "ID user wajib diisi." });

  var sheet = ensureUsersSheetReady();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][U_ID] === request.id) {
      if (request.fullName !== undefined)
        sheet.getRange(i + 1, U_FULLNAME + 1).setValue(request.fullName);
      if (request.email !== undefined)
        sheet.getRange(i + 1, U_EMAIL + 1).setValue(request.email);
      if (request.role !== undefined)
        sheet.getRange(i + 1, U_ROLE + 1).setValue(request.role);
      if (request.status !== undefined)
        sheet.getRange(i + 1, U_STATUS + 1).setValue(request.status);
      if (request.password)
        sheet
          .getRange(i + 1, U_PASSHASH + 1)
          .setValue(hashPassword(request.password));
      return jsonOut({ success: true });
    }
  }

  return jsonOut({ error: "User tidak ditemukan." });
}

function handleDeleteUser(request) {
  if (!request.id) return jsonOut({ error: "ID user wajib diisi." });

  var sheet = ensureUsersSheetReady();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][U_ID] === request.id) {
      // Prevent deleting the last admin
      if (data[i][U_ROLE] === "admin") {
        var adminCount = 0;
        for (var j = 1; j < data.length; j++) {
          if (data[j][U_ROLE] === "admin" && data[j][U_STATUS] === "active")
            adminCount++;
        }
        if (adminCount <= 1) {
          return jsonOut({
            error: "Tidak bisa menghapus admin terakhir.",
          });
        }
      }
      sheet.deleteRow(i + 1);
      return jsonOut({ success: true });
    }
  }

  return jsonOut({ error: "User tidak ditemukan." });
}

function handleCreateQueue(request) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("queues");
  if (!sheet)
    return jsonOut({
      error:
        "Sheet 'queues' tidak ditemukan. Jalankan init_sheets terlebih dahulu.",
    });

  var service = request.service || "CS";
  var customerName = request.customerName || "";

  var sessionStart = getSessionStart();
  var today = new Date();
  var dateStr = Utilities.formatDate(
    today,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd",
  );

  // Find last number for the current session and this service
  var data = sheet.getDataRange().getValues();
  var lastNum = 0;

  for (var i = 1; i < data.length; i++) {
    var createdAt = data[i][Q_CREATED_AT];
    var rowService = data[i][Q_SERVICE];
    if (
      createdAt &&
      new Date(createdAt) >= sessionStart &&
      rowService === service
    ) {
      var numPart = parseInt(String(data[i][Q_NUMBER]).split("-")[1], 10);
      if (!isNaN(numPart) && numPart > lastNum) lastNum = numPart;
    }
  }

  var newNum = lastNum + 1;
  var formattedNum = service + "-" + ("000" + newNum).slice(-3);
  var id = Utilities.getUuid();

  // Columns: id | number | service | customer_name | status | created_at | called_at | counter | date
  sheet.appendRow([
    id,
    formattedNum,
    service,
    customerName,
    "waiting",
    new Date(),
    "",
    "",
    dateStr,
  ]);

  return jsonOut({
    number: formattedNum,
    status: "waiting",
    customer_name: customerName,
  });
}

function handleCallQueue(request) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("queues");
  if (!sheet) return jsonOut({ error: "Sheet 'queues' tidak ditemukan." });

  var service = request.service || "CS";
  var counter = request.counter || "Loket Customer Service";

  var sessionStart = getSessionStart();
  var data = sheet.getDataRange().getValues();
  var rowToCall = -1;
  var foundNum = null;
  var foundId = null;
  var foundCust = null;

  for (var i = 1; i < data.length; i++) {
    var createdAt = data[i][Q_CREATED_AT];
    if (
      createdAt &&
      new Date(createdAt) >= sessionStart &&
      data[i][Q_SERVICE] === service &&
      data[i][Q_STATUS] === "waiting"
    ) {
      rowToCall = i + 1; // 1-based
      foundId = data[i][Q_ID];
      foundNum = data[i][Q_NUMBER];
      foundCust = data[i][Q_CUSTOMER];
      break;
    }
  }

  if (rowToCall > -1) {
    sheet.getRange(rowToCall, Q_STATUS + 1).setValue("called"); // E: status
    sheet.getRange(rowToCall, Q_CALLED_AT + 1).setValue(new Date()); // G: called_at
    sheet.getRange(rowToCall, Q_COUNTER + 1).setValue(counter); // H: counter

    updateCounterLastCalled(counter, service, foundNum);

    return jsonOut({
      id: foundId,
      number: foundNum,
      status: "called",
      customer_name: foundCust || "",
    });
  } else {
    return jsonOut({
      error: "Tidak ada antrian menunggu untuk layanan " + service,
    });
  }
}

function handleSkipQueue(request) {
  // Skip: mark current 'waiting' as 'skipped', then call next
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("queues");
  if (!sheet) return jsonOut({ error: "Sheet 'queues' tidak ditemukan." });

  var skipId = request.skipId || null;
  var service = request.service || "CS";

  if (skipId) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][Q_ID] === skipId) {
        sheet.getRange(i + 1, Q_STATUS + 1).setValue("skipped");
        break;
      }
    }
  }

  // Now call next (reuse handleCallQueue logic)
  return handleCallQueue(request);
}

function handleListQueue(serviceFilter) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("queues");
  if (!sheet) return jsonOut([]);

  var sessionStart = getSessionStart();
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var createdAt = data[i][Q_CREATED_AT];
    if (
      createdAt &&
      new Date(createdAt) >= sessionStart &&
      data[i][Q_STATUS] === "waiting"
    ) {
      if (!serviceFilter || data[i][Q_SERVICE] === serviceFilter) {
        result.push({
          id: data[i][Q_ID],
          number: data[i][Q_NUMBER],
          service: data[i][Q_SERVICE],
          customer_name: data[i][Q_CUSTOMER] || "",
          status: data[i][Q_STATUS],
          created_at: new Date(createdAt).toISOString(),
        });
      }
    }
  }

  return jsonOut(result);
}

function handleDisplay() {
  var countersSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("counters");
  if (!countersSheet) return jsonOut({});

  var sessionStart = getSessionStart();
  var data = countersSheet.getDataRange().getValues();
  var displayData = {};

  for (var i = 1; i < data.length; i++) {
    var name = data[i][C_NAME];
    var service = data[i][C_SERVICE];
    var lastNum = data[i][C_LAST_NUM];
    var lastAt = data[i][C_LAST_AT];

    if (name) {
      // Only show the stored number if it was called within the current session.
      // Outside the session window, reset the display to "--".
      var withinSession = lastAt && new Date(lastAt) >= sessionStart;
      displayData[name] = {
        number: withinSession ? lastNum || "--" : "--",
        service: service || "",
        called_at:
          withinSession && lastAt ? new Date(lastAt).toISOString() : "",
      };
    }
  }

  return jsonOut(displayData);
}

// =============================================================
// Config Handlers
// =============================================================

function ensureSettingsSheetReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("settings");

  if (!sheet) {
    sheet = ss.insertSheet("settings");
  }

  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "key") {
    sheet.getRange(1, 1, 1, 3).setValues([["key", "value", "description"]]);
  }

  var defaults = [
    [
      "officeName",
      "PLN ULP Salatiga",
      "Nama kantor yang ditampilkan di header dan tiket",
    ],
    ["resetTime", "00:00", "Jam reset nomor antrian harian (format HH:mm)"],
    [
      "dateFormat",
      "LONG_ID",
      "Format tanggal tampilan (LONG_ID | DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD)",
    ],
    [
      "youtubeUrl",
      "https://www.youtube.com/watch?v=DHua0l0Hhu4",
      "URL video YouTube untuk TV Display",
    ],
    ["autoPrint", "true", "Otomatis print tiket di Kiosk (true/false)"],
    ["ttsVoiceUri", "", "Voice URI untuk Text-to-Speech"],
    ["ttsPitch", "1", "Intonasi suara TTS (0-2)"],
    ["ttsRate", "0.8", "Kecepatan bicara TTS (0.5-2)"],
    [
      "videoVolume",
      "100",
      "Volume video normal saat tidak ada pemanggilan (0-100)",
    ],
    [
      "videoVolumeDucked",
      "15",
      "Volume video saat TTS sedang membacakan antrian (0-50)",
    ],
    [
      "runningText",
      "Selamat datang di PLN ULP Salatiga. Silakan ambil nomor antrian dan tunggu panggilan. Pelayanan kami mengutamakan kepuasan Anda.",
      "Teks berjalan di bagian bawah layar TV Display",
    ],
  ];

  var data = sheet.getDataRange().getValues();
  var existing = {};
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    if (key) existing[String(key)] = true;
  }

  var missingRows = [];
  for (var d = 0; d < defaults.length; d++) {
    if (!existing[defaults[d][0]]) {
      missingRows.push(defaults[d]);
    }
  }

  if (missingRows.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, missingRows.length, 3)
      .setValues(missingRows);
  }

  return sheet;
}

function handleGetConfig() {
  var sheet = ensureSettingsSheetReady();

  var data = sheet.getDataRange().getValues();
  var config = {};

  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var value = data[i][1];
    if (key) {
      if (value === "true") config[key] = true;
      else if (value === "false") config[key] = false;
      else config[key] = value;
    }
  }

  return jsonOut(config);
}

function handleSetConfig(request) {
  var sheet = ensureSettingsSheetReady();

  var data = sheet.getDataRange().getValues();
  var keys = Object.keys(request.config || {});

  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var value = request.config[key];
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value.toString());
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([key, value.toString(), ""]);
      data.push([key, value.toString(), ""]);
    }
  }

  return jsonOut({ success: true });
}

// =============================================================
// Helpers
// =============================================================

// Returns settings sheet as a plain object (for internal use).
function getConfigObj() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("settings");
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0];
    var value = data[i][1];
    if (key) {
      if (value === "true") config[key] = true;
      else if (value === "false") config[key] = false;
      else config[key] = value;
    }
  }
  return config;
}

// Returns a Date representing the start of the current service session.
// If current time >= resetTime today  → session started today at resetTime.
// If current time <  resetTime today  → session started yesterday at resetTime.
function getSessionStart() {
  var config = getConfigObj();
  var rawResetTime = config.resetTime;
  var resetHour = 0;
  var resetMin = 0;

  if (rawResetTime instanceof Date) {
    // GAS auto-parsed "HH:MM" cell value as a Date object — extract hours/minutes directly.
    resetHour = rawResetTime.getHours();
    resetMin = rawResetTime.getMinutes();
  } else if (rawResetTime) {
    // Plain string "HH:MM"
    var parts = String(rawResetTime).split(":");
    resetHour = parseInt(parts[0], 10) || 0;
    resetMin = parseInt(parts[1], 10) || 0;
  }

  var now = new Date();
  // Construct reset moment in script local time
  var todayReset = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    resetHour,
    resetMin,
    0,
    0,
  );

  if (now >= todayReset) {
    return todayReset;
  } else {
    // Session still belongs to yesterday's reset window
    return new Date(todayReset.getTime() - 86400 * 1000);
  }
}

function updateCounterLastCalled(counterName, service, number) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("counters");
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][C_NAME] === counterName) {
      sheet.getRange(i + 1, C_SERVICE + 1).setValue(service);
      sheet.getRange(i + 1, C_LAST_NUM + 1).setValue(number);
      sheet.getRange(i + 1, C_LAST_AT + 1).setValue(new Date());
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([
      Utilities.getUuid(),
      counterName,
      service,
      number,
      new Date(),
    ]);
  }
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
