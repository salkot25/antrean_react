// =============================================================
// PLN Queue Management System - Google Apps Script Backend
// =============================================================
// Sheet: queues   → A:id | B:number | C:service | D:customer_name | E:status | F:created_at | G:called_at | H:counter | I:date
// Sheet: counters → A:id | B:name   | C:service | D:last_called_number | E:last_called_at
// Sheet: settings → A:key | B:value | C:description
// Sheet: users    → A:id | B:username | C:fullName | D:email | E:role | F:status | G:passwordHash | H:lastLogin
// Sheet: logs     → A:timestamp | B:level | C:module | D:event | E:message | F:connection_status | G:actor | H:path | I:details_json
// Sheet: customer_satisfaction → A:created_at | B:input_date | C:phone_number | D:satisfaction | E:feedback | F:source
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

// Logs retention settings
var LOGS_MAX_ROWS = 10000; // Keep last 10k logs (excluding header)
var LOGS_PRUNE_BATCH = 500;
var LOGS_RETENTION_MIN_DAYS = 1;
var LOGS_RETENTION_MAX_DAYS = 3650;
var LOGS_CLEANUP_THROTTLE_MS = 60 * 60 * 1000; // run at most once per hour

// =============================================================
// HTTP Handlers
// =============================================================

function doPost(e) {
  var action = "";
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);

    maybeAutoCleanupLogs();

    var request = JSON.parse((e.postData && e.postData.contents) || "{}");
    action = request.action || "";

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
    } else if (action === "log_event") {
      return handleLogEvent(request);
    } else if (action === "clear_logs") {
      return handleClearLogs(request);
    } else if (action === "reset_queue_data") {
      return handleResetQueueData(request);
    } else if (action === "save_survey") {
      return handleSaveSurvey(request);
    }

    appLog(
      "WARN",
      "backend",
      "invalid_action_post",
      "Invalid POST action",
      "UNKNOWN",
      "system",
      { action: action },
    );

    return jsonOut({ error: "Invalid action: " + action });
  } catch (error) {
    appLog(
      "ERROR",
      "backend",
      "post_exception",
      error.message,
      "UNKNOWN",
      "system",
      { action: action },
    );
    return jsonOut({ error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "";

  try {
    maybeAutoCleanupLogs();

    if (action === "list") {
      return handleListQueue(e.parameter.service);
    } else if (action === "history_today") {
      return handleHistoryToday(e.parameter.service);
    } else if (action === "display") {
      return handleDisplay();
    } else if (action === "get_config") {
      return handleGetConfig();
    } else if (action === "init_sheets") {
      return handleInitSheets();
    } else if (action === "get_users") {
      return handleGetUsers();
    } else if (action === "health") {
      return handleHealth();
    } else if (action === "get_logs") {
      return handleGetLogs(e.parameter || {});
    } else if (action === "get_surveys") {
      return handleGetSurveys(e.parameter || {});
    }

    appLog(
      "WARN",
      "backend",
      "invalid_action_get",
      "Invalid GET action",
      "UNKNOWN",
      "system",
      { action: action },
    );

    return jsonOut({ error: "Invalid action: " + action });
  } catch (error) {
    appLog(
      "ERROR",
      "backend",
      "get_exception",
      error.message,
      "UNKNOWN",
      "system",
      { action: action },
    );
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
      "DD MMMM YYYY",
      "Format tanggal tampilan (DD MMMM YYYY | DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD)",
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
    settingsSheet.appendRow([
      "logsAutoCleanup",
      "false",
      "Aktifkan penghapusan log otomatis berdasarkan umur data (true/false)",
    ]);
    settingsSheet.appendRow([
      "logsRetentionDays",
      "30",
      "Hapus log yang lebih lama dari jumlah hari ini",
    ]);
  }

  // ── users sheet ── (auto-creates with default admin)
  ensureUsersSheetReady();

  // ── logs sheet ──
  ensureLogsSheetReady();

  // ── customer satisfaction sheet ──
  ensureSurveySheetReady();

  appLog(
    "INFO",
    "backend",
    "init_sheets",
    "Sheet initialization completed",
    "ONLINE",
    "system",
    {},
  );

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

function ensureLogsSheetReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("logs");

  if (!sheet) {
    sheet = ss.insertSheet("logs");
  }

  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "timestamp") {
    sheet
      .getRange(1, 1, 1, 9)
      .setValues([
        [
          "timestamp",
          "level",
          "module",
          "event",
          "message",
          "connection_status",
          "actor",
          "path",
          "details_json",
        ],
      ]);
    sheet
      .getRange(1, 1, 1, 9)
      .setFontWeight("bold")
      .setBackground("#004482")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 190);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 160);
    sheet.setColumnWidth(5, 300);
    sheet.setColumnWidth(6, 150);
    sheet.setColumnWidth(7, 140);
    sheet.setColumnWidth(8, 180);
    sheet.setColumnWidth(9, 450);
  }

  return sheet;
}

function ensureSurveySheetReady() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("customer_satisfaction");

  if (!sheet) {
    sheet = ss.insertSheet("customer_satisfaction");
  }

  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "created_at") {
    sheet
      .getRange(1, 1, 1, 6)
      .setValues([
        [
          "created_at",
          "input_date",
          "phone_number",
          "satisfaction",
          "feedback",
          "source",
        ],
      ]);

    sheet
      .getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#004482")
      .setFontColor("#ffffff");

    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 190);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 420);
    sheet.setColumnWidth(6, 100);
  }

  return sheet;
}

function handleSaveSurvey(request) {
  var inputDate = (request.inputDate || "").toString().trim();
  var phoneNumber = (request.phoneNumber || "").toString().trim();
  var satisfaction = (request.satisfaction || "").toString().trim();
  var feedback = (request.feedback || "").toString().trim();
  var source = (request.source || "kiosk").toString().trim();

  if (!inputDate || !phoneNumber || !satisfaction) {
    return jsonOut({
      success: false,
      error: "Tanggal, nomor HP, dan kepuasan wajib diisi.",
    });
  }

  var sheet = ensureSurveySheetReady();
  var createdAt = new Date().toISOString();

  sheet.appendRow([
    createdAt,
    inputDate,
    phoneNumber,
    satisfaction,
    feedback,
    source,
  ]);

  appLog(
    "INFO",
    "survey",
    "save_survey",
    "Customer satisfaction survey saved",
    "ONLINE",
    "kiosk",
    {
      inputDate: inputDate,
      satisfaction: satisfaction,
      source: source,
    },
  );

  return jsonOut({ success: true, createdAt: createdAt });
}

function handleGetSurveys(params) {
  var sheet = ensureSurveySheetReady();
  var rows = sheet.getDataRange().getValues();
  if (!rows || rows.length <= 1) return jsonOut([]);

  var limit = parseInt((params && params.limit) || "300", 10);
  if (!isFinite(limit) || limit <= 0) limit = 300;
  if (limit > 1000) limit = 1000;

  var items = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    items.push({
      createdAt: row[0] ? String(row[0]) : "",
      inputDate: row[1] ? String(row[1]) : "",
      phoneNumber: row[2] ? String(row[2]) : "",
      satisfaction: row[3] ? String(row[3]) : "",
      feedback: row[4] ? String(row[4]) : "",
      source: row[5] ? String(row[5]) : "",
    });
  }

  items.sort(function (a, b) {
    var ax = a.createdAt || "";
    var bx = b.createdAt || "";
    if (ax === bx) return 0;
    return ax > bx ? -1 : 1;
  });

  return jsonOut(items.slice(0, limit));
}

function handleLogin(request) {
  var username = (request.username || "").trim();
  var password = request.password || "";

  if (!username || !password) {
    appLog(
      "WARN",
      "auth",
      "login_failed",
      "Login rejected: missing credentials",
      "ONLINE",
      username || "anonymous",
      {},
    );
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
        appLog(
          "WARN",
          "auth",
          "login_failed",
          "Login rejected: account inactive",
          "ONLINE",
          username,
          {},
        );
        return jsonOut({
          error: "Akun tidak aktif. Hubungi administrator.",
        });
      }
      // Update last login timestamp
      sheet.getRange(i + 1, U_LASTLOGIN + 1).setValue(new Date());
      appLog(
        "INFO",
        "auth",
        "login_success",
        "User login success",
        "ONLINE",
        username,
        { role: data[i][U_ROLE] },
      );
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

  appLog(
    "WARN",
    "auth",
    "login_failed",
    "Login rejected: wrong username or password",
    "ONLINE",
    username,
    {},
  );

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
      appLog(
        "WARN",
        "users",
        "create_user_failed",
        "Create user rejected: duplicate username",
        "ONLINE",
        "system",
        { username: username },
      );
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

  appLog("INFO", "users", "create_user", "User created", "ONLINE", "system", {
    username: username,
    role: request.role || "operator",
  });

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
      appLog(
        "INFO",
        "users",
        "update_user",
        "User updated",
        "ONLINE",
        "system",
        { id: request.id, username: data[i][U_USERNAME] },
      );
      return jsonOut({ success: true });
    }
  }

  appLog(
    "WARN",
    "users",
    "update_user_failed",
    "Update user failed: user not found",
    "ONLINE",
    "system",
    { id: request.id },
  );

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
          appLog(
            "WARN",
            "users",
            "delete_user_failed",
            "Delete user blocked: last active admin",
            "ONLINE",
            "system",
            { id: request.id, username: data[i][U_USERNAME] },
          );
          return jsonOut({
            error: "Tidak bisa menghapus admin terakhir.",
          });
        }
      }
      appLog(
        "INFO",
        "users",
        "delete_user",
        "User deleted",
        "ONLINE",
        "system",
        { id: request.id, username: data[i][U_USERNAME] },
      );
      sheet.deleteRow(i + 1);
      return jsonOut({ success: true });
    }
  }

  appLog(
    "WARN",
    "users",
    "delete_user_failed",
    "Delete user failed: user not found",
    "ONLINE",
    "system",
    { id: request.id },
  );

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

  appLog(
    "INFO",
    "queue",
    "create_queue",
    "Queue ticket created",
    "ONLINE",
    customerName || "anonymous",
    { service: service, number: formattedNum },
  );

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

    appLog(
      "INFO",
      "queue",
      "call_queue",
      "Queue called to counter",
      "ONLINE",
      counter,
      { service: service, number: foundNum },
    );

    return jsonOut({
      id: foundId,
      number: foundNum,
      status: "called",
      customer_name: foundCust || "",
    });
  } else {
    appLog(
      "WARN",
      "queue",
      "call_queue_failed",
      "No waiting queue for requested service",
      "ONLINE",
      counter,
      { service: service },
    );
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
        appLog(
          "INFO",
          "queue",
          "skip_queue",
          "Queue marked as skipped",
          "ONLINE",
          "system",
          { id: skipId, service: service },
        );
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

function handleHistoryToday(serviceFilter) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("queues");
  if (!sheet) return jsonOut([]);

  var tz = Session.getScriptTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  var data = sheet.getDataRange().getValues();
  var result = [];

  function toYmd(value) {
    if (!value) return "";
    if (value instanceof Date) {
      return Utilities.formatDate(value, tz, "yyyy-MM-dd");
    }
    var str = String(value).trim();
    // Accept plain yyyy-MM-dd or datetime-like strings that start with it.
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10);
    }
    var parsed = new Date(str);
    if (isFinite(parsed.getTime())) {
      return Utilities.formatDate(parsed, tz, "yyyy-MM-dd");
    }
    return "";
  }

  for (var i = 1; i < data.length; i++) {
    var rowService = data[i][Q_SERVICE];
    var rowDate = data[i][Q_DATE];
    var createdAt = data[i][Q_CREATED_AT];

    var rowDateStr = toYmd(rowDate);
    var createdDateStr = toYmd(createdAt);
    var dateMatch = rowDateStr === todayStr || createdDateStr === todayStr;

    if (!dateMatch) continue;
    if (serviceFilter && rowService !== serviceFilter) continue;

    result.push({
      id: data[i][Q_ID],
      number: data[i][Q_NUMBER],
      service: rowService,
      customer_name: data[i][Q_CUSTOMER] || "",
      status: data[i][Q_STATUS] || "waiting",
      created_at: createdAt ? new Date(createdAt).toISOString() : "",
      called_at: data[i][Q_CALLED_AT]
        ? new Date(data[i][Q_CALLED_AT]).toISOString()
        : "",
      counter: data[i][Q_COUNTER] || "",
      date: rowDate || todayStr,
    });
  }

  // Latest ticket first
  result.sort(function (a, b) {
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });

  return jsonOut(result);
}

function handleDisplay() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var countersSheet = ss.getSheetByName("counters");
  if (!countersSheet) return jsonOut({});

  var sessionStart = getSessionStart();

  // ── Count waiting queues per service ──────────────────────────
  // ── Count waiting queues and find next number per service ──────────────────────────
  var waitingByService = {};
  var nextNumberByService = {};
  var queuesSheet = ss.getSheetByName("queues");
  if (queuesSheet) {
    var qData = queuesSheet.getDataRange().getValues();
    for (var q = 1; q < qData.length; q++) {
      var qService = qData[q][Q_SERVICE];
      var qStatus = qData[q][Q_STATUS];
      var qCreatedAt = qData[q][Q_CREATED_AT];
      // Use Q_CREATED_AT (actual datetime) for session comparison, same as handleListQueue
      var qTime = qCreatedAt ? new Date(qCreatedAt) : null;
      if (qStatus === "waiting" && qTime && qTime >= sessionStart) {
        waitingByService[qService] = (waitingByService[qService] || 0) + 1;
        // First waiting row = next to be called (sheet ordered by created_at ascending)
        if (!nextNumberByService[qService]) {
          nextNumberByService[qService] = qData[q][Q_NUMBER];
        }
      }
    }
  }

  // ── Build display data per counter ────────────────────────────
  var data = countersSheet.getDataRange().getValues();
  var displayData = {};

  for (var i = 1; i < data.length; i++) {
    var name = data[i][C_NAME];
    var service = data[i][C_SERVICE];
    var lastNum = data[i][C_LAST_NUM];
    var lastAt = data[i][C_LAST_AT];

    if (name) {
      var withinSession = lastAt && new Date(lastAt) >= sessionStart;
      displayData[name] = {
        number: withinSession ? lastNum || "--" : "--",
        service: service || "",
        called_at:
          withinSession && lastAt ? new Date(lastAt).toISOString() : "",
        waitingCount: waitingByService[service] || 0,
        nextNumber: nextNumberByService[service] || "",
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
      "DD MMMM YYYY",
      "Format tanggal tampilan (DD MMMM YYYY | DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD)",
    ],
    [
      "youtubeUrl",
      "https://www.youtube.com/watch?v=DHua0l0Hhu4",
      "URL video YouTube untuk TV Display",
    ],
    ["autoPrint", "true", "Otomatis print tiket di Kiosk (true/false)"],
    ["printMode", "auto", "Mode cetak kiosk (auto | bridge | browser)"],
    [
      "printTimeoutMs",
      "6000",
      "Batas waktu tunggu hasil print bridge dalam milidetik",
    ],
    ["printRetryCount", "1", "Jumlah retry saat print bridge gagal (0-3)"],
    [
      "printerConnectionType",
      "bluetooth_spp",
      "Jenis koneksi printer (bluetooth_spp | bluetooth_ble | network)",
    ],
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
    [
      "logsAutoCleanup",
      "false",
      "Aktifkan penghapusan log otomatis berdasarkan umur data (true/false)",
    ],
    [
      "logsRetentionDays",
      "30",
      "Hapus log yang lebih lama dari jumlah hari ini",
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
      if (value instanceof Date) {
        // GAS auto-parses time cells (e.g. "00:00") as Date objects—convert back to HH:MM string
        var hh = String(value.getHours()).padStart(2, "0");
        var mm = String(value.getMinutes()).padStart(2, "0");
        config[key] = hh + ":" + mm;
      } else if (value === "true") {
        config[key] = true;
      } else if (value === "false") {
        config[key] = false;
      } else {
        config[key] = value;
      }
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

  appLog(
    "INFO",
    "config",
    "set_config",
    "Configuration updated",
    "ONLINE",
    "system",
    { keyCount: keys.length, keys: keys },
  );

  return jsonOut({ success: true });
}

function handleHealth() {
  return jsonOut({
    success: true,
    status: "ONLINE",
    serverTime: new Date().toISOString(),
  });
}

function handleLogEvent(request) {
  var level = (request.level || "INFO").toUpperCase();
  var moduleName = request.module || "frontend";
  var eventName = request.event || "client_event";
  var message = request.message || "No message";
  var connectionStatus = request.connectionStatus || "UNKNOWN";
  var actor = request.actor || "anonymous";
  var path = request.path || "";
  var details = request.details || {};
  var requestId = request.requestId || "";

  appLog(level, moduleName, eventName, message, connectionStatus, actor, {
    path: path,
    details: {
      requestId: requestId,
      payload: details,
    },
  });

  return jsonOut({ success: true });
}

function handleGetLogs(params) {
  params = params || {};
  var limit = parseInt(params.limit, 10);
  if (isNaN(limit) || limit <= 0) limit = 100;
  if (limit > 500) limit = 500;

  var levelFilter = params.level ? String(params.level).toUpperCase() : "";
  var moduleFilter = params.module ? String(params.module).toLowerCase() : "";
  var statusFilter = params.status ? String(params.status).toUpperCase() : "";
  var query = params.q ? String(params.q).toLowerCase() : "";

  var sheet = ensureLogsSheetReady();
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = data.length - 1; i >= 1 && result.length < limit; i--) {
    var level = String(data[i][1] || "").toUpperCase();
    var moduleName = String(data[i][2] || "").toLowerCase();
    var eventName = String(data[i][3] || "").toLowerCase();
    var message = String(data[i][4] || "").toLowerCase();
    var connStatus = String(data[i][5] || "").toUpperCase();
    var actor = String(data[i][6] || "").toLowerCase();
    var path = String(data[i][7] || "").toLowerCase();
    var detailsJson = String(data[i][8] || "").toLowerCase();

    if (levelFilter && level !== levelFilter) continue;
    if (moduleFilter && moduleName !== moduleFilter) continue;
    if (statusFilter && connStatus !== statusFilter) continue;

    if (query) {
      var searchable =
        level +
        " " +
        moduleName +
        " " +
        eventName +
        " " +
        message +
        " " +
        actor +
        " " +
        path +
        " " +
        detailsJson;
      if (searchable.indexOf(query) === -1) continue;
    }

    result.push({
      timestamp: data[i][0],
      level: data[i][1],
      module: data[i][2],
      event: data[i][3],
      message: data[i][4],
      connection_status: data[i][5],
      actor: data[i][6],
      path: data[i][7],
      details_json: data[i][8],
    });
  }

  return jsonOut(result);
}

function handleClearLogs(request) {
  var actor = (request && request.actor) || "system";
  var sheet = ensureLogsSheetReady();

  clearDataRows(sheet);

  // Keep one audit record after clear operation.
  appLog(
    "WARN",
    "maintenance",
    "clear_logs",
    "All logs cleared by administrator",
    "ONLINE",
    actor,
    {},
  );

  return jsonOut({ success: true, message: "Logs berhasil dihapus." });
}

function handleResetQueueData(request) {
  var actor = (request && request.actor) || "system";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var queuesSheet = ss.getSheetByName("queues");
  var countersSheet = ss.getSheetByName("counters");

  if (!queuesSheet || !countersSheet) {
    return jsonOut({
      error:
        "Sheet queues/counters tidak ditemukan. Jalankan init_sheets terlebih dahulu.",
    });
  }

  var queueRows = clearDataRows(queuesSheet);
  var counterRows = clearDataRows(countersSheet);

  appLog(
    "WARN",
    "maintenance",
    "reset_queue_data",
    "Queue and counter data reset",
    "ONLINE",
    actor,
    { queueRowsDeleted: queueRows, counterRowsDeleted: counterRows },
  );

  return jsonOut({
    success: true,
    message: "Data antrean berhasil direset.",
    queueRowsDeleted: queueRows,
    counterRowsDeleted: counterRows,
  });
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

function safeJsonString(value) {
  try {
    return JSON.stringify(value || {});
  } catch (e) {
    return JSON.stringify({ serialization_error: String(e.message || e) });
  }
}

function appLog(
  level,
  moduleName,
  eventName,
  message,
  connectionStatus,
  actor,
  details,
) {
  try {
    var sheet = ensureLogsSheetReady();
    var detailObj = details || {};
    var pathValue = detailObj.path || "";
    var detailString = safeJsonString(detailObj.details || detailObj);
    if (detailString.length > 49000) {
      detailString = detailString.substring(0, 49000) + "...(truncated)";
    }

    sheet.appendRow([
      new Date().toISOString(),
      level || "INFO",
      moduleName || "app",
      eventName || "event",
      message || "",
      connectionStatus || "UNKNOWN",
      actor || "system",
      pathValue,
      detailString,
    ]);

    trimLogsIfNeeded(sheet);
  } catch (e) {
    // Never throw from logger to avoid blocking main request path.
  }
}

function trimLogsIfNeeded(sheet) {
  try {
    var currentRows = sheet.getLastRow();
    var frozenRows = Math.max(1, sheet.getFrozenRows());
    var dataStartRow = frozenRows + 1;
    var dataRows = Math.max(0, currentRows - frozenRows); // exclude frozen/header rows
    if (dataRows <= LOGS_MAX_ROWS) return;

    var toDelete = Math.min(dataRows - LOGS_MAX_ROWS, LOGS_PRUNE_BATCH);
    // Delete oldest log rows first, preserving frozen/header rows.
    sheet.deleteRows(dataStartRow, toDelete);
  } catch (e) {
    // Never throw from retention to avoid blocking main request path.
  }
}

function clearDataRows(sheet) {
  var frozenRows = Math.max(1, sheet.getFrozenRows());
  var dataStartRow = frozenRows + 1;
  var lastRow = sheet.getLastRow();

  if (lastRow < dataStartRow) return 0;

  var count = lastRow - dataStartRow + 1;
  try {
    sheet.deleteRows(dataStartRow, count);
  } catch (e) {
    // Some sheets with frozen-row configurations may reject deleteRows.
    // Fallback to clearing cell values while preserving structure.
    sheet
      .getRange(dataStartRow, 1, count, sheet.getLastColumn())
      .clearContent();
  }

  return count;
}

function parseRetentionDays(rawValue, defaultValue) {
  var parsed = parseInt(rawValue, 10);
  if (isNaN(parsed)) return defaultValue;
  if (parsed < LOGS_RETENTION_MIN_DAYS) return LOGS_RETENTION_MIN_DAYS;
  if (parsed > LOGS_RETENTION_MAX_DAYS) return LOGS_RETENTION_MAX_DAYS;
  return parsed;
}

function deleteLogsOlderThanDays(retentionDays) {
  var sheet = ensureLogsSheetReady();
  var frozenRows = Math.max(1, sheet.getFrozenRows());
  var dataStartRow = frozenRows + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < dataStartRow) return 0;

  var cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  var timestamps = sheet
    .getRange(dataStartRow, 1, lastRow - dataStartRow + 1, 1)
    .getValues();
  var deleteCount = 0;

  for (var i = 0; i < timestamps.length; i++) {
    var rawTs = timestamps[i][0];
    var tsMs = null;

    if (rawTs instanceof Date) {
      tsMs = rawTs.getTime();
    } else {
      tsMs = Date.parse(String(rawTs || ""));
    }

    // Stop at first unknown/non-older row to avoid deleting fresh data.
    if (!isFinite(tsMs) || tsMs >= cutoffMs) break;
    deleteCount += 1;
  }

  if (deleteCount > 0) {
    sheet.deleteRows(dataStartRow, deleteCount);
  }

  return deleteCount;
}

function maybeAutoCleanupLogs() {
  try {
    var config = getConfigObj();
    var enabled = config.logsAutoCleanup === true;
    if (!enabled) return 0;

    var retentionDays = parseRetentionDays(config.logsRetentionDays, 30);
    var props = PropertiesService.getScriptProperties();
    var lastRunMs = parseInt(
      props.getProperty("logs_cleanup_last_run_ms") || "0",
      10,
    );
    var nowMs = Date.now();

    if (lastRunMs > 0 && nowMs - lastRunMs < LOGS_CLEANUP_THROTTLE_MS) {
      return 0;
    }

    var deleted = deleteLogsOlderThanDays(retentionDays);
    props.setProperty("logs_cleanup_last_run_ms", String(nowMs));
    return deleted;
  } catch (e) {
    // Never throw from maintenance path.
    return 0;
  }
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
