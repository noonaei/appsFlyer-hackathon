import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'besafe.auth';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAuth(value) {
  if (!value) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    api.setAccessToken(auth?.accessToken || null);
    setBootstrapped(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.setAccessToken(auth?.accessToken || null);
    writeStoredAuth(auth);
  }, [auth]);

  const value = useMemo(() => {
    async function login({ email, password }) {
      const res = await api.parents.login({ email, password });
      setAuth({ ...res, email });
      return res;
    }

    async function signup({ name, email, password }) {
      const res = await api.parents.signup({ name, email, password });
      setAuth({ ...res, email, name: res.name || name });
      return res;
    }

    function logout() {
      setAuth(null);
    }

    async function updateParentName(name) {
      await api.parents.update({ name });
      setAuth(prev => ({ ...prev, name }));
    }

    return {
      bootstrapped,
      isAuthed: Boolean(auth?.accessToken),
      accessToken: auth?.accessToken || null,
      parentId: auth?.parentId || null,
      parentName: auth?.name || null,
      login,
      signup,
      logout,
      updateParentName,
    };
  }, [auth, bootstrapped]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
