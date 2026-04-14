import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface Empresa {
  id: number;
  razaoSocial: string;
}

interface User {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  empresas: Empresa[];
}

interface EmpresaAtiva {
  id: number;
  razaoSocial: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  empresaAtiva: EmpresaAtiva | null;
  isAuthenticated: boolean;
  login: (email: string, senha: string, empresaId?: number) => Promise<{ require2FA?: boolean; empresas?: Empresa[] }>;
  logout: () => Promise<void>;
  selectEmpresa: (empresaId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaAtiva | null>(() => {
    const stored = localStorage.getItem('empresaAtiva');
    return stored ? JSON.parse(stored) : null;
  });

  const isAuthenticated = !!token;

  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me')
        .then(({ data }) => {
          const resp = data as { data: User };
          const userData = resp.data as User;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        });
    }
  }, [token, user]);

  const login = useCallback(async (email: string, senha: string, empresaId?: number) => {
    const { data: response } = await api.post('/auth/login', { email, senha, empresaId });
    const res = (response as { data: Record<string, unknown> }).data;

    if (res.require2FA) {
      return { require2FA: true };
    }

    const usuario = res.usuario as { id: number; nome: string; email: string; empresas: Array<{ id: number; razaoSocial: string; perfil: string }> } | undefined;

    if (usuario && usuario.empresas.length > 1 && !empresaId && !res.token) {
      return { empresas: usuario.empresas };
    }

    if (res.token) {
      localStorage.setItem('token', res.token as string);
      if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken as string);

      const empresasList = usuario?.empresas ?? [];
      const activeEmpresa = empresasList.find(e => e.id === empresaId) ?? empresasList[0];

      const userData: User = {
        id: usuario?.id ?? 0,
        nome: usuario?.nome ?? '',
        email: usuario?.email ?? '',
        perfil: activeEmpresa?.perfil ?? 'USUARIO',
        empresas: empresasList,
      };

      localStorage.setItem('user', JSON.stringify(userData));
      if (activeEmpresa) {
        localStorage.setItem('empresaAtiva', JSON.stringify({ id: activeEmpresa.id, razaoSocial: activeEmpresa.razaoSocial }));
        setEmpresaAtiva({ id: activeEmpresa.id, razaoSocial: activeEmpresa.razaoSocial });
      }

      setToken(res.token as string);
      setUser(userData);
    }

    return {};
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('empresaAtiva');
    setToken(null);
    setUser(null);
    setEmpresaAtiva(null);
  }, []);

  const selectEmpresa = useCallback(async (empresaId: number) => {
    const { data } = await api.post('/auth/select-empresa', { empresaId });
    const envelope = data as { data: { token: string; refreshToken?: string; empresa: EmpresaAtiva } };
    const res = envelope.data;

    localStorage.setItem('token', res.token);
    if (res.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('empresaAtiva', JSON.stringify(res.empresa));

    setToken(res.token);
    setEmpresaAtiva(res.empresa);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, empresaAtiva, isAuthenticated, login, logout, selectEmpresa }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
