export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
  empresaId?: number;
  codigoTOTP?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    empresas: { id: number; razaoSocial: string; perfil: string; perfilId?: number }[];
  };
  require2FA?: boolean;
}

export interface PermissaoInfo {
  id: number;
  modulo: string;
  acao: string;
  descricao?: string;
}

export interface PerfilInfo {
  id: number;
  nome: string;
  descricao?: string;
  sistema: boolean;
  permissoes: Array<{ permissao: PermissaoInfo }>;
  _count: { usuarios: number };
}

export interface NotificacaoInfo {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  criadoEm: string;
}
