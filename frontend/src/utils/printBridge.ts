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
  getPrinterStatus?: () => string;
  pickPrinter?: () => void;
};

declare global {
  interface Window {
    AndroidPrintBridge?: AndroidPrintBridge;
    onAndroidPrintResult?: (result: {
      success: boolean;
      reason: string | null;
      number: string;
    }) => void;
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

  const hasPrintTicket = typeof bridge.printTicket === "function";
  const hasPrintThermal = typeof bridge.printThermal === "function";
  if (!hasPrintTicket && !hasPrintThermal) {
    return {
      status: "unsupported",
      mode: "bridge",
      reason: "bridge_method_missing",
    };
  }

  try {
    return await new Promise<BridgePrintResult>((resolve) => {
      let settled = false;
      const prevHandler = window.onAndroidPrintResult;

      const cleanup = (handler: typeof window.onAndroidPrintResult) => {
        if (window.onAndroidPrintResult === handler) {
          window.onAndroidPrintResult = prevHandler;
        }
      };

      const resolveOnce = (
        result: BridgePrintResult,
        handler: typeof window.onAndroidPrintResult,
        timer: ReturnType<typeof setTimeout>,
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup(handler);
        resolve(result);
      };

      const handler: typeof window.onAndroidPrintResult = (asyncResult) => {
        try {
          prevHandler?.(asyncResult);
        } catch {
          // Ignore external callback errors and keep bridge flow intact.
        }

        const matchesTicket =
          !asyncResult?.number || asyncResult.number === payload.number;
        if (!matchesTicket) return;

        if (asyncResult.success) {
          resolveOnce({ status: "success", mode: "bridge" }, handler, timer);
        } else {
          resolveOnce(
            {
              status: "failed",
              mode: "bridge",
              reason: asyncResult.reason || "bridge_async_failed",
            },
            handler,
            timer,
          );
        }
      };

      const timer = setTimeout(() => {
        resolveOnce(
          {
            status: "timeout",
            mode: "bridge",
            reason: "bridge_timeout",
          },
          handler,
          timer,
        );
      }, timeoutMs);

      window.onAndroidPrintResult = handler;

      Promise.resolve()
        .then(() => {
          const payloadJson = JSON.stringify(payload);
          // Important: call method through bridge object to preserve Java bridge context.
          if (hasPrintTicket && bridge.printTicket) {
            return bridge.printTicket(payloadJson);
          }
          return bridge.printThermal?.(payloadJson);
        })
        .then((raw) => {
          const immediate = normalizeBridgeResponse(raw);

          // If bridge returns an immediate error, fail fast.
          if (
            immediate.status === "failed" ||
            immediate.status === "unsupported"
          ) {
            resolveOnce(immediate, handler, timer);
          }
          // For "success" (usually just "ok" ack), wait for async callback.
        })
        .catch((error) => {
          resolveOnce(
            {
              status: "failed",
              mode: "bridge",
              reason:
                error instanceof Error ? error.message : "bridge_exception",
            },
            handler,
            timer,
          );
        });
    });
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

/** Returns true when running inside the Android kiosk app. */
export const isBridgeAvailable = (): boolean => !!window.AndroidPrintBridge;

/** Queries the Android bridge for current printer connection status. */
export const getPrinterStatus = (): { connected: boolean; address: string } => {
  try {
    const raw = window.AndroidPrintBridge?.getPrinterStatus?.();
    if (!raw) return { connected: false, address: "" };
    const parsed = JSON.parse(raw) as {
      connected?: unknown;
      address?: unknown;
    };
    return {
      connected: Boolean(parsed.connected),
      address: String(parsed.address || ""),
    };
  } catch {
    return { connected: false, address: "" };
  }
};

/** Opens the Bluetooth device picker in the Android app. */
export const pickPrinter = (): void => {
  window.AndroidPrintBridge?.pickPrinter?.();
};
