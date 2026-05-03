import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { loginUser as apiLogin } from "../api";

// ─── Types ────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

interface AuthSession {
  user: AuthUser;
  loginAt: number;
  lastActivity: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "pln_qms_session";
// Fallback for old storage key
const OLD_STORAGE_KEY = "pln_qms_user";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  }, []);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      // Clear old format if it exists
      if (localStorage.getItem(OLD_STORAGE_KEY)) {
        localStorage.removeItem(OLD_STORAGE_KEY);
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session: AuthSession = JSON.parse(stored);
        const now = Date.now();
        
        // Check if session is expired on load
        if (
          now - session.lastActivity > INACTIVITY_TIMEOUT_MS ||
          now - session.loginAt > ABSOLUTE_TIMEOUT_MS
        ) {
          logout();
        } else {
          setUser(session.user);
        }
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Session expiry check interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session: AuthSession = JSON.parse(stored);
          const now = Date.now();
          if (
            now - session.lastActivity > INACTIVITY_TIMEOUT_MS ||
            now - session.loginAt > ABSOLUTE_TIMEOUT_MS
          ) {
            logout();
            // Redirect ke login; pesan sesi berakhir ditampilkan melalui state URL
            window.location.href = "/login?session=expired";
          }
        }
      } catch {
        logout();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [user, logout]);

  // Activity tracker
  useEffect(() => {
    if (!user) return;

    let throttleTimer: number | null = null;

    const handleActivity = () => {
      if (throttleTimer) return;
      
      // Throttle updates to localstorage to at most once per minute
      throttleTimer = window.setTimeout(() => {
        throttleTimer = null;
      }, 60 * 1000);

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session: AuthSession = JSON.parse(stored);
          session.lastActivity = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
      } catch {
        // ignore
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (throttleTimer) window.clearTimeout(throttleTimer);
    };
  }, [user]);

  const login = async (username: string, password: string) => {
    try {
      const result = await apiLogin(username, password);

      if (result?.success && result?.user) {
        const authUser: AuthUser = result.user;
        setUser(authUser);
        
        const session: AuthSession = {
          user: authUser,
          loginAt: Date.now(),
          lastActivity: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return { success: true };
      }

      return { success: false, error: result?.error || "Login gagal." };
    } catch {
      return { success: false, error: "Tidak dapat terhubung ke server." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
