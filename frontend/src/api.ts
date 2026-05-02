import { GAS_WEB_APP_URL } from "./config";

// ─── createQueue ────────────────────────────────────────────────────────────────
export const createQueue = async (service: string, customerName?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return {
      number: `${service}-001`,
      status: "waiting",
      customer_name: customerName || "",
    };
  }

  // Use GET with query params to actually read the response (no-cors POST blocks response reading)
  // (params variable removed — not used in actual fetch call)

  // Fallback: POST no-cors (response unreadable, but writes data)
  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "create",
      service,
      customerName: customerName || "",
    }),
  });

  // After write, poll to get the latest queue number we just created
  await new Promise((r) => setTimeout(r, 1200)); // brief wait for GAS to finish writing
  const list = await getWaitingQueues(service);
  const latest = Array.isArray(list) ? list[list.length - 1] : null;
  return {
    number: latest?.number || `${service}-???`,
    status: "waiting",
    customer_name: customerName || "",
  };
};

// ─── getDisplayData ──────────────────────────────────────────────────────────────
export const getDisplayData = async () => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return {
      "Loket Customer Service": { number: "CS-012", service: "CS" },
      "Loket PLN Mobile Experience": { number: "PLN-005", service: "PLN" },
      "Loket Customer Care": { number: "CC-002", service: "CC" },
    };
  }

  const response = await fetch(
    `${GAS_WEB_APP_URL}?action=display&_t=${Date.now()}`,
    { cache: "no-store" },
  );
  return response.json();
};

// ─── getWaitingQueues ────────────────────────────────────────────────────────────
export const getWaitingQueues = async (service?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return [
      {
        id: "1",
        number: "CS-013",
        service: "CS",
        customer_name: "Budi",
        status: "waiting",
      },
      {
        id: "2",
        number: "CS-014",
        service: "CS",
        customer_name: "",
        status: "waiting",
      },
    ];
  }

  const url = service
    ? `${GAS_WEB_APP_URL}?action=list&service=${service}`
    : `${GAS_WEB_APP_URL}?action=list`;
  const response = await fetch(`${url}&_t=${Date.now()}`, {
    cache: "no-store",
  });
  return response.json();
};

// ─── getTodayHistoryQueues ─────────────────────────────────────────────────────
export const getTodayHistoryQueues = async (service?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return [
      {
        id: "1",
        number: "CS-001",
        service: "CS",
        customer_name: "Budi",
        status: "waiting",
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        number: "PLN-002",
        service: "PLN",
        customer_name: "",
        status: "called",
        created_at: new Date().toISOString(),
      },
    ];
  }

  const url = service
    ? `${GAS_WEB_APP_URL}?action=history_today&service=${service}`
    : `${GAS_WEB_APP_URL}?action=history_today`;
  const response = await fetch(`${url}&_t=${Date.now()}`, {
    cache: "no-store",
  });
  return response.json();
};

// ─── callNextQueue ───────────────────────────────────────────────────────────────
export const callNextQueue = async (service: string, counter: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return { number: `${service}-013`, status: "called", customer_name: "" };
  }

  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "call", service, counter }),
  });
  return { success: true };
};

// ─── getConfig ───────────────────────────────────────────────────────────────────
export const getConfig = async () => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return {
      youtubeUrl: "https://www.youtube.com/watch?v=DHua0l0Hhu4",
      autoPrint: true,
    };
  }

  const response = await fetch(
    `${GAS_WEB_APP_URL}?action=get_config&_t=${Date.now()}`,
    { cache: "no-store" },
  );
  const data = await response.json();

  const isObject = data && typeof data === "object" && !Array.isArray(data);
  const isEmptyObject = isObject && Object.keys(data).length === 0;
  if (isEmptyObject || (isObject && "error" in data)) {
    await fetch(`${GAS_WEB_APP_URL}?action=init_sheets&_t=${Date.now()}`, {
      cache: "no-store",
    });

    const retry = await fetch(
      `${GAS_WEB_APP_URL}?action=get_config&_t=${Date.now()}`,
      { cache: "no-store" },
    );
    return retry.json();
  }

  return data;
};

// ─── updateConfig ────────────────────────────────────────────────────────────────
export const updateConfig = async (config: Record<string, any>) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "set_config", config }),
  });
  return { success: true };
};

// ─── Survey: submit/get ────────────────────────────────────────────────────────
export type SurveyPayload = {
  inputDate: string;
  phoneNumber: string;
  satisfaction: "Sangat Puas" | "Puas" | "Kurang Puas" | "Tidak Puas";
  feedback?: string;
  source?: string;
};

export type SurveyRow = SurveyPayload & {
  createdAt?: string;
};

export const submitCustomerSatisfaction = async (payload: SurveyPayload) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return { success: true, createdAt: new Date().toISOString() };
  }

  const response = await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "save_survey", ...payload }),
  });
  return response.json();
};

export const getCustomerSatisfaction = async (limit = 300) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return [] as SurveyRow[];

  const response = await fetch(
    `${GAS_WEB_APP_URL}?action=get_surveys&limit=${limit}&_t=${Date.now()}`,
    { cache: "no-store" },
  );
  return response.json();
};

// ─── loginUser ───────────────────────────────────────────────────────────────────
// Uses POST without no-cors so we can read the response.
// GAS Web Apps with text/plain content-type are simple requests and support CORS reads.
export const loginUser = async (username: string, password: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    if (username === "admin" && password === "admin123") {
      return {
        success: true,
        user: {
          id: "mock-id",
          username: "admin",
          fullName: "Administrator",
          email: "admin@plnulp.local",
          role: "admin",
        },
      };
    }
    return { error: "Username atau password salah." };
  }

  const response = await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "login", username, password }),
  });
  return response.json();
};

// ─── getUsers ────────────────────────────────────────────────────────────────────
export const getUsers = async () => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return [];

  const response = await fetch(
    `${GAS_WEB_APP_URL}?action=get_users&_t=${Date.now()}`,
    { cache: "no-store" },
  );
  return response.json();
};

// ─── createUser ──────────────────────────────────────────────────────────────────
export const createUser = async (user: {
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  password: string;
}) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "create_user", ...user }),
  });
};

// ─── updateUser ──────────────────────────────────────────────────────────────────
export const updateUser = async (id: string, updates: Record<string, any>) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "update_user", id, ...updates }),
  });
};

// ─── deleteUser ──────────────────────────────────────────────────────────────────
export const deleteUser = async (id: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "delete_user", id }),
  });
};

// ─── pingBackend ─────────────────────────────────────────────────────────────────
export const pingBackend = async () => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return {
      success: true,
      status: "ONLINE",
      serverTime: new Date().toISOString(),
    };
  }

  const response = await fetch(
    `${GAS_WEB_APP_URL}?action=health&_t=${Date.now()}`,
    { cache: "no-store" },
  );
  const data = await response.json();
  if (!data?.success) {
    throw new Error(data?.error || "Health check failed");
  }
  return data;
};

// ─── logEvent ────────────────────────────────────────────────────────────────────
export const logEvent = async (payload: {
  level?: "INFO" | "WARN" | "ERROR";
  module?: string;
  event: string;
  message: string;
  connectionStatus?: "ONLINE" | "OFFLINE" | "BACKEND_UNREACHABLE" | "UNKNOWN";
  actor?: string;
  path?: string;
  details?: Record<string, unknown>;
}) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // no-cors is enough for fire-and-forget logging and avoids CORS response limitations
  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "log_event",
      level: payload.level || "INFO",
      module: payload.module || "frontend",
      event: payload.event,
      message: payload.message,
      connectionStatus: payload.connectionStatus || "UNKNOWN",
      actor: payload.actor || "anonymous",
      path: payload.path || "",
      requestId,
      details: payload.details || {},
    }),
  });
};

// ─── getLogs ─────────────────────────────────────────────────────────────────────
export type LogRow = {
  timestamp: string;
  level: string;
  module: string;
  event: string;
  message: string;
  connection_status: string;
  actor: string;
  path: string;
  details_json: string;
};

export const getLogs = async (params?: {
  limit?: number;
  level?: string;
  module?: string;
  status?: string;
  q?: string;
}) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return [] as LogRow[];

  const qs = new URLSearchParams({
    action: "get_logs",
    _t: String(Date.now()),
  });

  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.level) qs.set("level", params.level);
  if (params?.module) qs.set("module", params.module);
  if (params?.status) qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);

  const response = await fetch(`${GAS_WEB_APP_URL}?${qs.toString()}`, {
    cache: "no-store",
  });
  return response.json();
};

// ─── clearLogs ───────────────────────────────────────────────────────────────────
export const clearLogs = async (actor?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  const response = await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "clear_logs", actor: actor || "system" }),
  });
  return response.json();
};

// ─── resetQueueData ──────────────────────────────────────────────────────────────
export const resetQueueData = async (actor?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  const response = await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "reset_queue_data",
      actor: actor || "system",
    }),
  });
  return response.json();
};
