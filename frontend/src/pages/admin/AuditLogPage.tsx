import { useState } from 'react';
import { Row, Col, Card, Form, Badge } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get } from '../../services/api';

interface AuditEntry {
  id: number;
  usuarioId: number;
  acao: string;
  entidade: string;
  entidadeId: number | null;
  ip: string | null;
  criadoEm: string;
  usuario: { id: number; nome: string };
}

interface ListResponse {
  success: boolean;
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACAO_COLORS: Record<string, string> = {
  CRIAR: 'success',
  ATUALIZAR: 'warning',
  EXCLUIR: 'danger',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entidade, setEntidade] = useState('');
  const [acao, setAcao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', '20');
  queryParams.set('sortBy', 'criadoEm');
  queryParams.set('sortOrder', 'desc');
  if (search) queryParams.set('search', search);
  if (entidade) queryParams.set('entidade', entidade);
  if (acao) queryParams.set('acao', acao);
  if (dataInicio) queryParams.set('dataInicio', dataInicio);
  if (dataFim) queryParams.set('dataFim', dataFim);

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-log', page, search, entidade, acao, dataInicio, dataFim],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/audit-log?${queryParams.toString()}`);
      return data;
    },
  });

  const columns: Column<AuditEntry>[] = [
    {
      header: 'Data/Hora',
      accessor: 'criadoEm',
      render: (row) => new Date(row.criadoEm).toLocaleString('pt-BR'),
      width: '170px',
    },
    {
      header: 'Usuário',
      accessor: 'usuario',
      render: (row) => row.usuario?.nome ?? '—',
    },
    {
      header: 'Ação',
      accessor: 'acao',
      render: (row) => (
        <Badge bg={ACAO_COLORS[row.acao] ?? 'secondary'}>{row.acao}</Badge>
      ),
      width: '110px',
    },
    { header: 'Entidade', accessor: 'entidade', width: '150px' },
    {
      header: 'ID Entidade',
      accessor: 'entidadeId',
      render: (row) => row.entidadeId ?? '—',
      width: '100px',
    },
    {
      header: 'IP',
      accessor: 'ip',
      render: (row) => row.ip ?? '—',
      width: '130px',
    },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Auditoria</h2></Col>
      </Row>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small mb-1">Data Início</Form.Label>
                <Form.Control type="date" size="sm" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPage(1); }} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small mb-1">Data Fim</Form.Label>
                <Form.Control type="date" size="sm" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPage(1); }} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small mb-1">Entidade</Form.Label>
                <Form.Control size="sm" placeholder="Ex: ContaPagar" value={entidade} onChange={(e) => { setEntidade(e.target.value); setPage(1); }} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small mb-1">Ação</Form.Label>
                <Form.Select size="sm" value={acao} onChange={(e) => { setAcao(e.target.value); setPage(1); }}>
                  <option value="">Todas</option>
                  <option value="CRIAR">CRIAR</option>
                  <option value="ATUALIZAR">ATUALIZAR</option>
                  <option value="EXCLUIR">EXCLUIR</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <DataTable<AuditEntry>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar por usuário..."
            emptyMessage="Nenhum registro de auditoria encontrado."
          />
        </Card.Body>
      </Card>
    </>
  );
}
