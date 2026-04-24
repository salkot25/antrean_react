import { GAS_WEB_APP_URL } from './config';

// ─── createQueue ────────────────────────────────────────────────────────────────
export const createQueue = async (service: string, customerName?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return { number: `${service}-001`, status: 'waiting', customer_name: customerName || '' };
  }
  
  // Use GET with query params to actually read the response (no-cors POST blocks response reading)
  const params = new URLSearchParams({
    action: 'create_get',
    service,
    customerName: customerName || ''
  });

  // Fallback: POST no-cors (response unreadable, but writes data)
  await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'create', service, customerName: customerName || '' })
  });

  // After write, poll to get the latest queue number we just created
  await new Promise(r => setTimeout(r, 1200)); // brief wait for GAS to finish writing
  const list = await getWaitingQueues(service);
  const latest = Array.isArray(list) ? list[list.length - 1] : null;
  return {
    number: latest?.number || `${service}-???`,
    status: 'waiting',
    customer_name: customerName || ''
  };
};

// ─── getDisplayData ──────────────────────────────────────────────────────────────
export const getDisplayData = async () => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return {
      "Loket Customer Service":       { number: "CS-012", service: "CS" },
      "Loket PLN Mobile Experience":  { number: "PLN-005", service: "PLN" },
      "Loket Customer Care":          { number: "CC-002", service: "CC" }
    };
  }

  const response = await fetch(`${GAS_WEB_APP_URL}?action=display`);
  return response.json();
};

// ─── getWaitingQueues ────────────────────────────────────────────────────────────
export const getWaitingQueues = async (service?: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return [
      { id: '1', number: 'CS-013', service: 'CS', customer_name: 'Budi', status: 'waiting' },
      { id: '2', number: 'CS-014', service: 'CS', customer_name: '',      status: 'waiting' }
    ];
  }

  const url = service
    ? `${GAS_WEB_APP_URL}?action=list&service=${service}`
    : `${GAS_WEB_APP_URL}?action=list`;
  const response = await fetch(url);
  return response.json();
};

// ─── callNextQueue ───────────────────────────────────────────────────────────────
export const callNextQueue = async (service: string, counter: string) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return { number: `${service}-013`, status: 'called', customer_name: '' };
  }

  await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'call', service, counter })
  });
  return { success: true };
};

// ─── getConfig ───────────────────────────────────────────────────────────────────
export const getConfig = async () => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
    return { youtubeUrl: "https://www.youtube.com/watch?v=DHua0l0Hhu4", autoPrint: true };
  }

  const response = await fetch(`${GAS_WEB_APP_URL}?action=get_config`);
  return response.json();
};

// ─── updateConfig ────────────────────────────────────────────────────────────────
export const updateConfig = async (config: Record<string, any>) => {
  if (GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") return { success: true };

  await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'set_config', config })
  });
  return { success: true };
};
