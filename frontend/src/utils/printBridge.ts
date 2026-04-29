export type BridgePrintStatus =
  | "success"
  | "failed"
  | "timeout"
  | "unsupported";

export type BridgePrintResult = {
  status: BridgePrintStatus;
  mode: "bridge" | "browser";
  reason?: string;
};

export type TicketPrintPayload = {
  number: string;
  serviceCode: string;
  serviceName: string;
  printedAt: string;
  customerName: string;
  officeName: string;
  html?: string;
};

type AndroidPrintBridge = {
  printTicket?: (payload: string) => unknown;
  printThermal?: (payload: string) => unknown;
};

declare global {
  interface Window {
    AndroidPrintBridge?: AndroidPrintBridge;
  }
}

const normalizeBridgeResponse = (raw: unknown): BridgePrintResult => {
  if (typeof raw === "boolean") {
    return raw
      ? { status: "success", mode: "bridge" }
      : { status: "failed", mode: "bridge", reason: "bridge_returned_false" };
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "ok" || normalized === "success") {
      return { status: "success", mode: "bridge" };
    }
    return {
      status: "failed",
      mode: "bridge",
      reason: normalized || "bridge_returned_string_error",
    };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as {
      success?: unknown;
      status?: unknown;
      reason?: unknown;
    };
    if (obj.success === true || obj.status === "success") {
      return { status: "success", mode: "bridge" };
    }
    const reason =
      typeof obj.reason === "string"
        ? obj.reason
        : typeof obj.status === "string"
          ? obj.status
          : "bridge_returned_object_error";
    return { status: "failed", mode: "bridge", reason };
  }

  return { status: "success", mode: "bridge" };
};

export const requestBridgePrint = async (
  payload: TicketPrintPayload,
  timeoutMs = 6000,
): Promise<BridgePrintResult> => {
  const bridge = window.AndroidPrintBridge;
  if (!bridge) {
    return {
      status: "unsupported",
      mode: "bridge",
      reason: "bridge_unavailable",
    };
  }

  const bridgeFn = bridge.printTicket ?? bridge.printThermal;
  if (!bridgeFn) {
    return {
      status: "unsupported",
      mode: "bridge",
      reason: "bridge_method_missing",
    };
  }

  try {
    const timeoutPromise = new Promise<BridgePrintResult>((resolve) => {
      setTimeout(() => {
        resolve({
          status: "timeout",
          mode: "bridge",
          reason: "bridge_timeout",
        });
      }, timeoutMs);
    });

    const callPromise = Promise.resolve(bridgeFn(JSON.stringify(payload))).then(
      normalizeBridgeResponse,
    );

    return Promise.race([callPromise, timeoutPromise]);
  } catch (error) {
    return {
      status: "failed",
      mode: "bridge",
      reason: error instanceof Error ? error.message : "bridge_exception",
    };
  }
};

export const browserPrint = (): BridgePrintResult => {
  window.print();
  return { status: "success", mode: "browser" };
};
