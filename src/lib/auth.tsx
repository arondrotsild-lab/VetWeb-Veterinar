import { createContext, useContext, useState, ReactNode } from 'react';
import { storage } from './api';

interface User { id: number; name: string; phone: string; email?: string; role: string; avatar_url?: string }
interface Ctx { user: User | null; login: (token: string, user: User) => void; logout: () => void }

const AuthCtx = createContext<Ctx | null>(null);

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(storage.USER);
    return raw && localStorage.getItem(storage.TOKEN) ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const login = (token: string, u: User) => {
    localStorage.setItem(storage.TOKEN, token);
    localStorage.setItem(storage.USER, JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem(storage.TOKEN);
    localStorage.removeItem(storage.USER);
    setUser(null);
  };
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
