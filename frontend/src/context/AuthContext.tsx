import {
  createContext,
  useContext,
  useState,
  useEffect,
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

const STORAGE_KEY = "pln_qms_user";

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const result = await apiLogin(username, password);

      if (result?.success && result?.user) {
        const authUser: AuthUser = result.user;
        setUser(authUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
        return { success: true };
      }

      return { success: false, error: result?.error || "Login gagal." };
    } catch {
      return { success: false, error: "Tidak dapat terhubung ke server." };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
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
