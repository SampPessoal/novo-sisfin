import { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { Nav, Dropdown, Button, Modal, Form, Spinner, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import Breadcrumbs from '../components/Breadcrumbs';
import CommandPalette from '../components/CommandPalette';
import { get, post, put } from '../services/api';

interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  criadoEm: string;
}

const CADASTROS = [
  { to: '/fornecedores', icon: '🏢', label: 'Fornecedores' },
  { to: '/clientes', icon: '👥', label: 'Clientes' },
  { to: '/categorias', icon: '📂', label: 'Categorias' },
  { to: '/centros-custo', icon: '🏷️', label: 'Centros de Custo' },
  { to: '/plano-contas', icon: '📋', label: 'Plano de Contas' },
  { to: '/contas-bancarias', icon: '🏦', label: 'Contas Bancárias' },
];

const FINANCEIRO = [
  { to: '/contas-pagar', icon: '📤', label: 'Contas a Pagar' },
  { to: '/contas-receber', icon: '📥', label: 'Contas a Receber' },
  { to: '/fluxo-caixa', icon: '📊', label: 'Fluxo de Caixa' },
  { to: '/dre', icon: '📈', label: 'DRE' },
  { to: '/conciliacao', icon: '🔄', label: 'Conciliação' },
  { to: '/transferencias', icon: '🔀', label: 'Transferências' },
];

const COBRANCAS = [
  { to: '/boletos', icon: '🧾', label: 'Boletos/PIX' },
  { to: '/nfe', icon: '📄', label: 'Notas Fiscais' },
];

const CONTRATOS_SECTION = [
  { to: '/contratos', icon: '📝', label: 'Contratos' },
  { to: '/comissoes', icon: '💰', label: 'Comissões' },
];

const VIAGENS = [
  { to: '/viagens', icon: '✈️', label: 'Viagens' },
  { to: '/caixa-entrada', icon: '📬', label: 'Caixa de Entrada' },
];

const OUTROS = [
  { to: '/emprestimos', icon: '💳', label: 'Empréstimos' },
  { to: '/parcelamento-impostos', icon: '🧮', label: 'Parc. Impostos' },
  { to: '/apuracao-impostos', icon: '📑', label: 'Apuração Impostos' },
];

const ADMIN = [
  { to: '/usuarios', icon: '👤', label: 'Usuários' },
  { to: '/empresas', icon: '🏗️', label: 'Empresas' },
  { to: '/perfis', icon: '🔐', label: 'Perfis e Permissões' },
  { to: '/audit-log', icon: '📋', label: 'Auditoria' },
];

function SidebarSection({ title, items }: { title: string; items: typeof CADASTROS }) {
  return (
    <>
      <div className="sidebar-section-title">{title}</div>
      <Nav className="flex-column">
        {items.map((item) => (
          <Nav.Link key={item.to} as={NavLink} to={item.to}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Nav.Link>
        ))}
      </Nav>
    </>
  );
}

export default function MainLayout() {
  const { isAuthenticated, user, empresaAtiva, logout, selectEmpresa } = useAuth();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const { data: notifCount } = useQuery({
    queryKey: ['notificacoes-count'],
    queryFn: async () => {
      const { data } = await get('/notificacoes/count');
      return (data as any).data?.total ?? 0;
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  const { data: notificacoes } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data } = await get('/notificacoes?naoLidas=true');
      return (data as any).data as Notificacao[];
    },
    enabled: showNotifications && isAuthenticated,
  });

  const marcarTodasLidasMut = useMutation({
    mutationFn: () => put('/notificacoes/marcar-todas-lidas'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-count'] });
    },
  });

  const setup2FAMutation = useMutation({
    mutationFn: () => post<{ success: boolean; data: { qrCodeUrl: string; secret: string } }>('/auth/2fa/setup'),
    onSuccess: ({ data }) => {
      const result = data as unknown as { success: boolean; data: { qrCodeUrl: string } };
      setQrCodeUrl(result.data.qrCodeUrl);
    },
    onError: () => toast.error('Erro ao configurar 2FA.'),
  });

  const verify2FAMutation = useMutation({
    mutationFn: (code: string) => post('/auth/2fa/verify', { code }),
    onSuccess: () => {
      toast.success('2FA ativado com sucesso!');
      setTwoFAEnabled(true);
      setQrCodeUrl('');
      setTotpCode('');
    },
    onError: () => toast.error('Código inválido. Tente novamente.'),
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <CommandPalette />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>💼</span>
          SISFIN
        </div>

        <Nav className="flex-column mt-2">
          <Nav.Link as={NavLink} to="/" end>
            <span className="nav-icon">📊</span>
            Dashboard
          </Nav.Link>
        </Nav>

        <SidebarSection title="CADASTROS" items={CADASTROS} />
        <SidebarSection title="FINANCEIRO" items={FINANCEIRO} />
        <SidebarSection title="COBRANÇAS" items={COBRANCAS} />
        <SidebarSection title="CONTRATOS" items={CONTRATOS_SECTION} />
        <SidebarSection title="VIAGENS" items={VIAGENS} />
        <SidebarSection title="OUTROS" items={OUTROS} />
        {isAdmin && <SidebarSection title="ADMIN" items={ADMIN} />}

        <div style={{ height: '2rem' }} />
      </aside>

      {/* Topbar */}
      <header className="topbar">
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="link"
            className="sidebar-toggle p-0 text-dark"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </Button>

          {user && user.empresas.length > 1 && (
            <Dropdown className="empresa-selector">
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                {empresaAtiva?.razaoSocial ?? 'Selecionar empresa'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {user.empresas.map((emp) => (
                  <Dropdown.Item
                    key={emp.id}
                    active={emp.id === empresaAtiva?.id}
                    onClick={() => selectEmpresa(emp.id)}
                  >
                    {emp.razaoSocial}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}

          {user && user.empresas.length === 1 && (
            <span className="text-muted small">{empresaAtiva?.razaoSocial}</span>
          )}

          <Button
            variant="link"
            className="p-0 text-muted small d-none d-md-block"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            title="Busca rápida (⌘K)"
          >
            <span className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded" style={{ background: 'var(--bs-gray-200)', fontSize: '0.75rem' }}>
              🔍 Buscar... <kbd style={{ fontSize: '0.65rem' }}>⌘K</kbd>
            </span>
          </Button>
        </div>

        <div className="d-flex align-items-center gap-3">
          <Button
            variant="link"
            className="p-0"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </Button>

          <Dropdown show={showNotifications} onToggle={setShowNotifications}>
            <Dropdown.Toggle variant="link" className="p-0 text-dark position-relative" id="notifications-dropdown">
              🔔
              {(notifCount ?? 0) > 0 && (
                <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6rem' }}>
                  {notifCount}
                </Badge>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" style={{ width: '360px', maxHeight: '400px', overflowY: 'auto' }}>
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                <strong className="small">Notificações</strong>
                {(notifCount ?? 0) > 0 && (
                  <Button variant="link" size="sm" className="p-0 text-primary small" onClick={() => marcarTodasLidasMut.mutate()}>
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
              {!notificacoes?.length ? (
                <div className="text-center text-muted py-3 small">Sem notificações novas</div>
              ) : (
                notificacoes.map((n) => (
                  <Dropdown.Item key={n.id} className="py-2 border-bottom" href={n.link || '#'}>
                    <div className="fw-semibold small">{n.titulo}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{n.mensagem}</div>
                    <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                      {new Date(n.criadoEm).toLocaleString('pt-BR')}
                    </div>
                  </Dropdown.Item>
                ))
              )}
            </Dropdown.Menu>
          </Dropdown>

          <Button variant="link" className="p-0 text-dark small fw-medium" onClick={() => setShowProfile(true)} title="Meu Perfil">
            {user?.nome}
          </Button>
          <Button variant="outline-danger" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </header>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 999 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content */}
      <main className="main-content">
        <Breadcrumbs />
        <Outlet />
      </main>

      {/* Profile Modal */}
      <Modal show={showProfile} onHide={() => { setShowProfile(false); setQrCodeUrl(''); setTotpCode(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Meu Perfil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label text-muted small mb-0">Nome</label>
            <div className="fw-medium">{user?.nome}</div>
          </div>
          <div className="mb-3">
            <label className="form-label text-muted small mb-0">Email</label>
            <div className="fw-medium">{user?.email}</div>
          </div>
          <div className="mb-3">
            <label className="form-label text-muted small mb-0">Perfil</label>
            <div><Badge bg="primary">{user?.perfil}</Badge></div>
          </div>
          <hr />
          <h6>Autenticação em Dois Fatores (2FA)</h6>
          {twoFAEnabled ? (
            <div className="text-success fw-medium">2FA ativado</div>
          ) : !qrCodeUrl ? (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setup2FAMutation.mutate()}
              disabled={setup2FAMutation.isPending}
            >
              {setup2FAMutation.isPending && <Spinner size="sm" className="me-2" />}
              Ativar 2FA
            </Button>
          ) : (
            <div>
              <p className="small text-muted">Escaneie o QR code abaixo com seu aplicativo autenticador:</p>
              <div className="text-center mb-3">
                <img src={qrCodeUrl} alt="QR Code 2FA" style={{ maxWidth: '200px' }} />
              </div>
              <Form.Group className="mb-3">
                <Form.Label>Código de verificação</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                />
              </Form.Group>
              <Button
                variant="primary"
                size="sm"
                disabled={totpCode.length !== 6 || verify2FAMutation.isPending}
                onClick={() => verify2FAMutation.mutate(totpCode)}
              >
                {verify2FAMutation.isPending && <Spinner size="sm" className="me-2" />}
                Verificar e Ativar
              </Button>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowProfile(false); setQrCodeUrl(''); setTotpCode(''); }}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
