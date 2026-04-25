import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { logEvent, pingBackend } from "../api";
import { useAuth } from "../context/AuthContext";

type ConnStatus = "ONLINE" | "OFFLINE" | "BACKEND_UNREACHABLE";

const CHECK_INTERVAL_MS = 30000;

export default function ConnectionLogger() {
  const location = useLocation();
  const { user } = useAuth();
  const lastStatusRef = useRef<ConnStatus | null>(null);

  const sendConnectionLog = async (status: ConnStatus, reason: string) => {
    if (lastStatusRef.current === status) return;

    lastStatusRef.current = status;
    try {
      await logEvent({
        level: status === "ONLINE" ? "INFO" : "WARN",
        module: "frontend",
        event: "connection_status",
        message: `Connection status changed to ${status}`,
        connectionStatus: status,
        actor: user?.username || "anonymous",
        path: location.pathname,
        details: {
          reason,
          userAgent: navigator.userAgent,
          onlineFlag: navigator.onLine,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // Avoid recursive failures when logger cannot reach backend.
    }
  };

  const runConnectionCheck = async (reason: string) => {
    if (!navigator.onLine) {
      await sendConnectionLog("OFFLINE", reason);
      return;
    }

    try {
      await pingBackend();
      await sendConnectionLog("ONLINE", reason);
    } catch {
      await sendConnectionLog("BACKEND_UNREACHABLE", reason);
    }
  };

  useEffect(() => {
    // First check when app mounts
    runConnectionCheck("app_mount");

    // Log app session start once
    logEvent({
      level: "INFO",
      module: "frontend",
      event: "app_session_start",
      message: "Frontend session started",
      connectionStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
      actor: user?.username || "anonymous",
      path: location.pathname,
      details: {
        referrer: document.referrer || "",
        at: new Date().toISOString(),
      },
    }).catch(() => {});

    const onOnline = () => runConnectionCheck("browser_online_event");
    const onOffline = () => runConnectionCheck("browser_offline_event");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const interval = window.setInterval(() => {
      runConnectionCheck("periodic_check");
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(interval);
    };
  }, []);

  // Log route changes as important trace data
  useEffect(() => {
    logEvent({
      level: "INFO",
      module: "frontend",
      event: "route_change",
      message: `Route opened: ${location.pathname}`,
      connectionStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
      actor: user?.username || "anonymous",
      path: location.pathname,
      details: {
        at: new Date().toISOString(),
      },
    }).catch(() => {});
  }, [location.pathname, user?.username]);

  return null;
}
