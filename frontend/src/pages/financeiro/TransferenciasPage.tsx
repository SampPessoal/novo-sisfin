import { useState } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { get, post, del } from '../../services/api';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import QueryErrorBanner from '../../components/QueryErrorBanner';

interface ContaBancariaOption {
  id: number;
  nomeBanco: string;
  agencia: string;
  conta: string;
}

interface Transferencia {
  id: number;
  contaOrigemId: number;
  contaDestinoId: number;
  valor: number;
  data: string;
  descricao: string | null;
  status: string;
  contaOrigem: ContaBancariaOption;
  contaDestino: ContaBancariaOption;
}

interface TransferenciaResponse {
  success: boolean;
  data: Transferencia[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatConta(cb: ContaBancariaOption) {
  return `${cb.nomeBanco} - ${cb.conta}`;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const tableColumns: Column<Transferencia>[] = [
  {
    header: 'Data',
    accessor: 'data',
    width: '110px',
    render: (row) => formatDate(row.data),
  },
  {
    header: 'Conta Origem',
    accessor: 'contaOrigem',
    render: (row) => formatConta(row.contaOrigem),
  },
  {
    header: 'Conta Destino',
    accessor: 'contaDestino',
    render: (row) => formatConta(row.contaDestino),
  },
  {
    header: 'Valor',
    accessor: 'valor',
    width: '140px',
    render: (row) => <span className="fw-medium">{formatCurrency(Number(row.valor))}</span>,
  },
  {
    header: 'Descrição',
    accessor: 'descricao',
    render: (row) => row.descricao || '—',
  },
  {
    header: 'Status',
    accessor: 'status',
    width: '130px',
    render: (row) => <StatusBadge status={row.status} />,
  },
];

export default function TransferenciasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    contaOrigemId: '',
    contaDestinoId: '',
    valor: '',
    data: new Date().toISOString().slice(0, 10),
    descricao: '',
  });

  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-transf'],
    queryFn: async () => {
      const { data } = await get<{ data: ContaBancariaOption[] }>('/contas-bancarias?page=1&pageSize=200');
      return data.data;
    },
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['transferencias', page, statusFilter, dataInicio, dataFim],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '15');
      params.set('sortBy', 'data');
      params.set('sortOrder', 'desc');
      if (statusFilter) params.set('status', statusFilter);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const { data } = await get<TransferenciaResponse>(`/transferencias?${params}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => post('/transferencias', payload),
    onSuccess: () => {
      toast.success('Transferência criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      handleCloseModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar transferência.';
      toast.error(msg);
    },
  });

  const confirmarMutation = useMutation({
    mutationFn: async (id: number) => post(`/transferencias/${id}/confirmar`),
    onSuccess: () => {
      toast.success('Transferência confirmada!');
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao confirmar.';
      toast.error(msg);
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: async (id: number) => post(`/transferencias/${id}/cancelar`),
    onSuccess: () => {
      toast.success('Transferência cancelada!');
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao cancelar.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => del(`/transferencias/${id}`),
    onSuccess: () => {
      toast.success('Transferência excluída!');
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir.';
      toast.error(msg);
    },
  });

  const transferencias = response?.data ?? [];
  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ contaOrigemId: '', contaDestinoId: '', valor: '', data: new Date().toISOString().slice(0, 10), descricao: '' });
  };

  const handleSubmit = () => {
    if (!formData.contaOrigemId) { toast.warn('Selecione a conta de origem.'); return; }
    if (!formData.contaDestinoId) { toast.warn('Selecione a conta de destino.'); return; }
    if (!formData.valor || Number(formData.valor) <= 0) { toast.warn('Informe um valor válido.'); return; }
    if (formData.contaOrigemId === formData.contaDestinoId) { toast.warn('Conta de origem e destino devem ser diferentes.'); return; }

    createMutation.mutate({
      contaOrigemId: parseInt(formData.contaOrigemId),
      contaDestinoId: parseInt(formData.contaDestinoId),
      valor: parseFloat(formData.valor),
      data: formData.data,
      descricao: formData.descricao || null,
    });
  };

  const contasDestinoDisponiveis = (contasBancarias ?? []).filter(
    (cb) => String(cb.id) !== formData.contaOrigemId,
  );

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <div className="page-header d-flex justify-content-between align-items-center">
        <h2>Transferências Bancárias</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Nova Transferência
        </Button>
      </div>

      <Card className="summary-card mb-4">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Data Início</Form.Label>
                <Form.Control
                  type="date"
                  value={dataInicio}
                  onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Data Fim</Form.Label>
                <Form.Control
                  type="date"
                  value={dataFim}
                  onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Button
                variant="outline-secondary"
                onClick={() => { setStatusFilter(''); setDataInicio(''); setDataFim(''); setPage(1); }}
              >
                Limpar Filtros
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="summary-card">
        <Card.Body>
          <DataTable<Transferencia>
            columns={tableColumns}
            data={transferencias}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            emptyMessage="Nenhuma transferência encontrada."
            actions={[
              {
                label: 'Confirmar',
                variant: 'outline-success',
                icon: '✅',
                onClick: (row) => {
                  if (window.confirm('Confirmar esta transferência?')) confirmarMutation.mutate(row.id);
                },
                show: (row) => row.status === 'PENDENTE',
              },
              {
                label: 'Cancelar',
                variant: 'outline-warning',
                icon: '❌',
                onClick: (row) => {
                  if (window.confirm('Cancelar esta transferência?')) cancelarMutation.mutate(row.id);
                },
                show: (row) => row.status === 'PENDENTE',
              },
              {
                label: 'Excluir',
                variant: 'outline-danger',
                icon: '🗑️',
                onClick: (row) => {
                  if (window.confirm('Excluir esta transferência?')) deleteMutation.mutate(row.id);
                },
                show: (row) => row.status === 'PENDENTE',
              },
            ]}
          />
        </Card.Body>
      </Card>

      {/* New Transfer Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Nova Transferência</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Conta Origem *</Form.Label>
            <Form.Select
              value={formData.contaOrigemId}
              onChange={(e) => setFormData((prev) => ({
                ...prev,
                contaOrigemId: e.target.value,
                contaDestinoId: e.target.value === prev.contaDestinoId ? '' : prev.contaDestinoId,
              }))}
            >
              <option value="">Selecione...</option>
              {(contasBancarias ?? []).map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.nomeBanco} - Ag {cb.agencia} / CC {cb.conta}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Conta Destino *</Form.Label>
            <Form.Select
              value={formData.contaDestinoId}
              onChange={(e) => setFormData((prev) => ({ ...prev, contaDestinoId: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {contasDestinoDisponiveis.map((cb) => (
                <option key={cb.id} value={cb.id}>{cb.nomeBanco} - Ag {cb.agencia} / CC {cb.conta}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Valor (R$) *</Form.Label>
            <Form.Control
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={formData.valor}
              onChange={(e) => setFormData((prev) => ({ ...prev, valor: e.target.value }))}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Data *</Form.Label>
            <Form.Control
              type="date"
              value={formData.data}
              onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descrição</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Descrição opcional..."
              value={formData.descricao}
              onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <><Spinner animation="border" size="sm" className="me-2" />Salvando...</>
            ) : (
              'Salvar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
