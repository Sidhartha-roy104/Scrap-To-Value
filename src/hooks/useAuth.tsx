/**
 * hooks/useAuth.tsx
 * ------------------
 * Authentication context for Rubbish Revamp.
 * Connected to Node.js REST API + MySQL + JWT.
 * Does NOT use Supabase.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { RRUser } from '@/types/auth';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe,
  getStoredToken,
  type LoginCredentials,
  type RegisterCredentials,
} from '@/services/authService';

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export interface AuthContextType {
  user: RRUser | null;
  loading: boolean;
  /** Log out: clears JWT from localStorage and clears user state */
  signOut: () => void;
  /**
   * Log in with email and password.
   * Stores JWT and updates user state on success.
   * @throws on invalid credentials or network error
   */
  login: (credentials: LoginCredentials) => Promise<void>;
  /**
   * Register a new account.
   * Stores JWT and updates user state on success.
   * @throws on duplicate email or validation error
   */
  register: (credentials: RegisterCredentials) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
  login: async () => {},
  register: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RRUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * On mount: restore session from stored JWT in localStorage.
   * Calls GET /api/users/me — if it succeeds, user is set.
   * If it fails (token expired / invalid), user stays null.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getMe();
        setUser(currentUser);
      } catch {
        apiLogout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: loggedInUser } = await apiLogin(credentials);
    setUser(loggedInUser);
  }, []);

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------
  const register = useCallback(async (credentials: RegisterCredentials) => {
    const { user: newUser } = await apiRegister(credentials);
    setUser(newUser);
  }, []);

  // ---------------------------------------------------------------------------
  // signOut
  // ---------------------------------------------------------------------------
  const signOut = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, login, register }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
