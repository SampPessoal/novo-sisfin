import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb } from 'react-bootstrap';

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'fornecedores': 'Fornecedores',
  'clientes': 'Clientes',
  'categorias': 'Categorias',
  'centros-custo': 'Centros de Custo',
  'plano-contas': 'Plano de Contas',
  'contas-bancarias': 'Contas Bancárias',
  'contas-pagar': 'Contas a Pagar',
  'contas-receber': 'Contas a Receber',
  'fluxo-caixa': 'Fluxo de Caixa',
  'dre': 'DRE',
  'conciliacao': 'Conciliação',
  'boletos': 'Boletos',
  'nfe': 'Notas Fiscais',
  'contratos': 'Contratos',
  'comissoes': 'Comissões',
  'viagens': 'Viagens',
  'caixa-entrada': 'Caixa de Entrada',
  'emprestimos': 'Empréstimos',
  'parcelamento-impostos': 'Parc. Impostos',
  'apuracao-impostos': 'Apuração Impostos',
  'usuarios': 'Usuários',
  'empresas': 'Empresas',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <Breadcrumb className="mb-3">
      <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Início</Breadcrumb.Item>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        const label = ROUTE_LABELS[seg] || seg;
        return isLast
          ? <Breadcrumb.Item key={path} active>{label}</Breadcrumb.Item>
          : <Breadcrumb.Item key={path} linkAs={Link} linkProps={{ to: path }}>{label}</Breadcrumb.Item>;
      })}
    </Breadcrumb>
  );
}
