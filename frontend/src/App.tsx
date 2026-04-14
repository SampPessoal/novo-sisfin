import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const MainLayout = lazy(() => import('./layouts/MainLayout'));
const AuthLayout = lazy(() => import('./layouts/AuthLayout'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

const ContasPagarPage = lazy(() => import('./pages/contas-pagar/ContasPagarPage'));
const ContasReceberPage = lazy(() => import('./pages/contas-receber/ContasReceberPage'));

const FornecedoresPage = lazy(() => import('./pages/cadastros/FornecedoresPage'));
const ClientesPage = lazy(() => import('./pages/cadastros/ClientesPage'));
const ClientePainelPage = lazy(() => import('./pages/cadastros/ClientePainelPage'));
const FornecedorPainelPage = lazy(() => import('./pages/cadastros/FornecedorPainelPage'));
const CategoriasPage = lazy(() => import('./pages/cadastros/CategoriasPage'));
const CentrosCustoPage = lazy(() => import('./pages/cadastros/CentrosCustoPage'));
const PlanoContasPage = lazy(() => import('./pages/cadastros/PlanoContasPage'));
const ContasBancariasPage = lazy(() => import('./pages/cadastros/ContasBancariasPage'));

const FluxoCaixaPage = lazy(() => import('./pages/financeiro/FluxoCaixaPage'));
const DREPage = lazy(() => import('./pages/financeiro/DREPage'));
const ConciliacaoPage = lazy(() => import('./pages/financeiro/ConciliacaoPage'));
const TransferenciasPage = lazy(() => import('./pages/financeiro/TransferenciasPage'));

const BoletosPage = lazy(() => import('./pages/cobrancas/BoletosPage'));
const NFEPage = lazy(() => import('./pages/cobrancas/NFEPage'));

const ContratosPage = lazy(() => import('./pages/contratos/ContratosPage'));
const ComissoesPage = lazy(() => import('./pages/contratos/ComissoesPage'));

const ViagensPage = lazy(() => import('./pages/viagens/ViagensPage'));
const CaixaEntradaPage = lazy(() => import('./pages/viagens/CaixaEntradaPage'));

const EmprestimosPage = lazy(() => import('./pages/outros/EmprestimosPage'));
const ParcelamentoImpostosPage = lazy(() => import('./pages/outros/ParcelamentoImpostosPage'));
const ApuracaoImpostosPage = lazy(() => import('./pages/outros/ApuracaoImpostosPage'));

const UsuariosPage = lazy(() => import('./pages/admin/UsuariosPage'));
const EmpresasPage = lazy(() => import('./pages/admin/EmpresasPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const PerfisPage = lazy(() => import('./pages/admin/PerfisPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner fullPage />}>
              <Routes>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                </Route>

                <Route path="/" element={<MainLayout />}>
                  <Route index element={
                    <ErrorBoundary moduleName="Dashboard">
                      <DashboardPage />
                    </ErrorBoundary>
                  } />

                  {/* Cadastros */}
                  <Route path="clientes/:id" element={<ErrorBoundary moduleName="Clientes"><ClientePainelPage /></ErrorBoundary>} />
                  <Route path="fornecedores/:id" element={<ErrorBoundary moduleName="Fornecedores"><FornecedorPainelPage /></ErrorBoundary>} />
                  <Route path="fornecedores" element={<ErrorBoundary moduleName="Fornecedores"><FornecedoresPage /></ErrorBoundary>} />
                  <Route path="clientes" element={<ErrorBoundary moduleName="Clientes"><ClientesPage /></ErrorBoundary>} />
                  <Route path="categorias" element={<ErrorBoundary moduleName="Categorias"><CategoriasPage /></ErrorBoundary>} />
                  <Route path="centros-custo" element={<ErrorBoundary moduleName="Centros de Custo"><CentrosCustoPage /></ErrorBoundary>} />
                  <Route path="plano-contas" element={<ErrorBoundary moduleName="Plano de Contas"><PlanoContasPage /></ErrorBoundary>} />
                  <Route path="contas-bancarias" element={<ErrorBoundary moduleName="Contas Bancárias"><ContasBancariasPage /></ErrorBoundary>} />

                  {/* Financeiro */}
                  <Route path="contas-pagar" element={<ErrorBoundary moduleName="Contas a Pagar"><ContasPagarPage /></ErrorBoundary>} />
                  <Route path="contas-receber" element={<ErrorBoundary moduleName="Contas a Receber"><ContasReceberPage /></ErrorBoundary>} />
                  <Route path="fluxo-caixa" element={<ErrorBoundary moduleName="Fluxo de Caixa"><FluxoCaixaPage /></ErrorBoundary>} />
                  <Route path="dre" element={<ErrorBoundary moduleName="DRE"><DREPage /></ErrorBoundary>} />
                  <Route path="conciliacao" element={<ErrorBoundary moduleName="Conciliação"><ConciliacaoPage /></ErrorBoundary>} />
                  <Route path="transferencias" element={<ErrorBoundary moduleName="Transferências"><TransferenciasPage /></ErrorBoundary>} />

                  {/* Cobranças */}
                  <Route path="boletos" element={<ErrorBoundary moduleName="Boletos"><BoletosPage /></ErrorBoundary>} />
                  <Route path="nfe" element={<ErrorBoundary moduleName="NFe"><NFEPage /></ErrorBoundary>} />

                  {/* Contratos */}
                  <Route path="contratos" element={<ErrorBoundary moduleName="Contratos"><ContratosPage /></ErrorBoundary>} />
                  <Route path="comissoes" element={<ErrorBoundary moduleName="Comissões"><ComissoesPage /></ErrorBoundary>} />

                  {/* Viagens */}
                  <Route path="viagens" element={<ErrorBoundary moduleName="Viagens"><ViagensPage /></ErrorBoundary>} />
                  <Route path="caixa-entrada" element={<ErrorBoundary moduleName="Caixa de Entrada"><CaixaEntradaPage /></ErrorBoundary>} />

                  {/* Outros */}
                  <Route path="emprestimos" element={<ErrorBoundary moduleName="Empréstimos"><EmprestimosPage /></ErrorBoundary>} />
                  <Route path="parcelamento-impostos" element={<ErrorBoundary moduleName="Parcelamento Impostos"><ParcelamentoImpostosPage /></ErrorBoundary>} />
                  <Route path="apuracao-impostos" element={<ErrorBoundary moduleName="Apuração Impostos"><ApuracaoImpostosPage /></ErrorBoundary>} />

                  {/* Admin */}
                  <Route path="usuarios" element={<ErrorBoundary moduleName="Usuários"><UsuariosPage /></ErrorBoundary>} />
                  <Route path="empresas" element={<ErrorBoundary moduleName="Empresas"><EmpresasPage /></ErrorBoundary>} />
                  <Route path="audit-log" element={<ErrorBoundary moduleName="Auditoria"><AuditLogPage /></ErrorBoundary>} />
                <Route path="perfis" element={<ErrorBoundary moduleName="Perfis"><PerfisPage /></ErrorBoundary>} />
                </Route>
              </Routes>
            </Suspense>
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
