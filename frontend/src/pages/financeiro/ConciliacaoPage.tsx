import { useState, useRef } from 'react';
import { Row, Col, Card, Button, Form, Modal, ProgressBar, Spinner, Table } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { get, post } from '../../services/api';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import QueryErrorBanner from '../../components/QueryErrorBanner';

interface Conciliacao {
  id: number;
  contaBancariaId: number;
  dataImportacao: string;
  arquivo: string;
  formato: string;
  totalItens: number;
  itensConciliados: number;
  status: string;
}

interface ConciliacaoItem {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  tipo: string;
  conciliado: boolean;
}

interface ConciliacaoResponse {
  success: boolean;
  data: Conciliacao[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ConciliacaoDetailResponse {
  conciliacao: Conciliacao;
  itens: ConciliacaoItem[];
}

interface ContaBancaria { id: number; nome: string; banco: string }

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return iso;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const tableColumns: Column<Conciliacao>[] = [
  { header: 'ID', accessor: 'id', width: '70px' },
  {
    header: 'Data Importação',
    accessor: 'dataImportacao',
    render: (row) => formatDate(row.dataImportacao),
  },
  { header: 'Arquivo', accessor: 'arquivo' },
  { header: 'Formato', accessor: 'formato', width: '100px' },
  {
    header: 'Total Itens',
    accessor: 'totalItens',
    width: '110px',
    render: (row) => row.totalItens.toLocaleString('pt-BR'),
  },
  {
    header: 'Conciliados',
    accessor: 'itensConciliados',
    width: '200px',
    render: (row) => {
      const pct = row.totalItens > 0
        ? Math.round((row.itensConciliados / row.totalItens) * 100)
        : 0;
      return (
        <div className="d-flex align-items-center gap-2">
          <ProgressBar
            now={pct}
            variant={pct === 100 ? 'success' : pct >= 50 ? 'info' : 'warning'}
            style={{ width: 100, height: 8 }}
          />
          <small className="text-muted text-nowrap">
            {row.itensConciliados}/{row.totalItens}
          </small>
        </div>
      );
    },
  },
  {
    header: 'Status',
    accessor: 'status',
    width: '130px',
    render: (row) => <StatusBadge status={row.status} />,
  },
];

export default function ConciliacaoPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [contaBancariaFilter, setContaBancariaFilter] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importContaBancariaId, setImportContaBancariaId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-conciliacao'],
    queryFn: async () => {
      const { data } = await get<{ data: ContaBancaria[] }>('/contas-bancarias?page=1&pageSize=100');
      return data.data;
    },
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['conciliacoes', page, contaBancariaFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '15');
      if (contaBancariaFilter) params.set('contaBancariaId', contaBancariaFilter);
      const { data } = await get<ConciliacaoResponse>(`/conciliacao?${params}`);
      return data;
    },
  });

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['conciliacao-detail', detailId],
    queryFn: async () => {
      const { data: resp } = await get(`/conciliacao/${detailId}`);
      const body = resp as { data: ConciliacaoDetailResponse };
      return body.data as ConciliacaoDetailResponse;
    },
    enabled: !!detailId,
  });

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return post('/conciliacao/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Arquivo importado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['conciliacoes'] });
      handleCloseImportModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao importar arquivo.';
      toast.error(msg);
    },
  });

  const conciliacoes = response?.data ?? [];

  const pagination: PaginationInfo | undefined = response
    ? {
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      }
    : undefined;

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportContaBancariaId('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportSubmit = () => {
    if (!selectedFile) {
      toast.warn('Selecione um arquivo.');
      return;
    }
    if (!importContaBancariaId) {
      toast.warn('Selecione uma conta bancária.');
      return;
    }
    const formData = new FormData();
    formData.append('arquivo', selectedFile);
    formData.append('contaBancariaId', importContaBancariaId);
    importMutation.mutate(formData);
  };

  const handleViewDetails = (row: Conciliacao) => {
    setDetailId(row.id);
    setShowDetailModal(true);
  };

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <div className="page-header d-flex justify-content-between align-items-center">
        <h2>Conciliação Bancária</h2>
        <Button variant="primary" onClick={() => setShowImportModal(true)}>
          Importar OFX
        </Button>
      </div>

      <Card className="summary-card mb-4">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label>Conta Bancária</Form.Label>
                <Form.Select
                  value={contaBancariaFilter}
                  onChange={(e) => { setContaBancariaFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Todas</option>
                  {(contasBancarias ?? []).map((cb) => (
                    <option key={cb.id} value={cb.id}>{cb.nome} - {cb.banco}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="summary-card">
        <Card.Body>
          <DataTable<Conciliacao>
            columns={tableColumns}
            data={conciliacoes}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            emptyMessage="Nenhuma conciliação encontrada."
            actions={[
              {
                label: 'Detalhes',
                variant: 'outline-primary',
                onClick: handleViewDetails,
                icon: '🔍',
              },
            ]}
          />
        </Card.Body>
      </Card>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={handleCloseImportModal}>
        <Modal.Header closeButton>
          <Modal.Title>Importar Extrato</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Conta Bancária *</Form.Label>
            <Form.Select
              value={importContaBancariaId}
              onChange={(e) => setImportContaBancariaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {(contasBancarias ?? []).map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.nome} - {cb.banco}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Arquivo (OFX ou CSV) *</Form.Label>
            <Form.Control
              type="file"
              accept=".ofx,.csv"
              ref={fileInputRef}
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                setSelectedFile(input.files?.[0] ?? null);
              }}
            />
            <Form.Text className="text-muted">
              Formatos aceitos: .ofx, .csv
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseImportModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleImportSubmit} disabled={importMutation.isPending}>
            {importMutation.isPending ? (
              <><Spinner animation="border" size="sm" className="me-2" />Importando...</>
            ) : (
              'Importar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => { setShowDetailModal(false); setDetailId(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalhes da Conciliação #{detailId}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoadingDetail && (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          )}
          {!isLoadingDetail && detailData && (
            <>
              <Row className="mb-3">
                <Col xs={6}>
                  <strong>Arquivo:</strong> {detailData.conciliacao.arquivo}
                </Col>
                <Col xs={3}>
                  <strong>Formato:</strong> {detailData.conciliacao.formato}
                </Col>
                <Col xs={3}>
                  <strong>Status:</strong> <StatusBadge status={detailData.conciliacao.status} />
                </Col>
              </Row>
              <Table hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th className="text-end">Valor</th>
                    <th className="text-center">Conciliado</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailData.itens ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">Nenhum item encontrado.</td>
                    </tr>
                  ) : (
                    detailData.itens.map((item) => (
                      <tr key={item.id}>
                        <td>{format(parseISO(item.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                        <td>{item.descricao}</td>
                        <td>
                          <span className={`badge bg-${item.tipo === 'CREDITO' ? 'success' : 'danger'}`}>
                            {item.tipo === 'CREDITO' ? 'Crédito' : 'Débito'}
                          </span>
                        </td>
                        <td className={`text-end ${item.tipo === 'CREDITO' ? 'valor-positivo' : 'valor-negativo'}`}>
                          {formatCurrency(item.valor)}
                        </td>
                        <td className="text-center">
                          {item.conciliado ? (
                            <span className="badge bg-success">Sim</span>
                          ) : (
                            <span className="badge bg-secondary">Não</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowDetailModal(false); setDetailId(null); }}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
