import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import CurrencyInput from '../../components/CurrencyInput';
import ConfirmModal from '../../components/ConfirmModal';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get, post, put, del } from '../../services/api';
import SelectLabel from '../../components/SelectLabel';

interface ContaPagar {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataEmissao?: string;
  origemLancamento?: string;
  codigoBarras?: string;
  status: string;
  fornecedor?: { id: number; razaoSocial: string };
  categoria?: { id: number; nome: string };
  centroCusto?: { id: number; nome: string };
  observacoes?: string;
}

interface VencimentosSummary {
  hoje: number;
  semana: number;
  mes: number;
  atrasados: number;
}

interface Fornecedor { id: number; razaoSocial: string }
interface Categoria { id: number; nome: string }
interface CentroCusto { id: number; nome: string }
interface ContaBancaria { id: number; nome: string; banco: string }

interface ListResponse {
  data: ContaPagar[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const cpSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dataVencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  dataEmissao: z.string().optional(),
  origemLancamento: z.string().optional(),
  codigoBarras: z.string().optional(),
  fornecedorId: z.number().optional(),
  categoriaId: z.number().optional(),
  centroCustoId: z.number().optional(),
  observacoes: z.string().optional(),
});

type CPForm = z.infer<typeof cpSchema>;

const paySchema = z.object({
  valorPago: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dataPagamento: z.string().min(1, 'Data de pagamento é obrigatória'),
  contaBancariaId: z.number({ invalid_type_error: 'Selecione uma conta' }).min(1, 'Selecione uma conta bancária'),
  observacoes: z.string().optional(),
});

type PayForm = z.infer<typeof paySchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ContasPagarPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [sortField, setSortField] = useState('dataVencimento');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContaPagar | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingCP, setPayingCP] = useState<ContaPagar | null>(null);

  const pageSize = 15;

  const { data: listData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contas-pagar', page, search, statusFilter, dataInicio, dataFim, sortField, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      params.set('sortBy', sortField);
      params.set('sortDir', sortDir);
      const { data } = await get<ListResponse>(`/contas-pagar?${params}`);
      return data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['contas-pagar-summary'],
    queryFn: async () => {
      const { data: resp } = await get('/contas-pagar/vencimentos');
      const body = resp as { data: VencimentosSummary };
      return body.data as VencimentosSummary;
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ['fornecedores-select'],
    queryFn: async () => {
      const { data: resp } = await get('/fornecedores?all=true');
      const body = resp as { data: Fornecedor[] };
      return body.data ?? [];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias-select'],
    queryFn: async () => {
      const { data: resp } = await get('/categorias?all=true');
      const body = resp as { data: Categoria[] };
      return body.data ?? [];
    },
  });

  const { data: centrosCusto } = useQuery({
    queryKey: ['centros-custo-select'],
    queryFn: async () => {
      const { data: resp } = await get('/centros-custo?all=true');
      const body = resp as { data: CentroCusto[] };
      return body.data ?? [];
    },
  });

  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-select'],
    queryFn: async () => {
      const { data } = await get<{ data: ContaBancaria[] }>('/contas-bancarias?page=1&pageSize=100');
      return data.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CPForm>({
    resolver: zodResolver(cpSchema),
  });

  const payForm = useForm<PayForm>({
    resolver: zodResolver(paySchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: CPForm) => {
      if (editingId) {
        return put(`/contas-pagar/${editingId}`, formData);
      }
      return post('/contas-pagar', formData);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-summary'] });
      handleCloseForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar conta a pagar.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => del(`/contas-pagar/${id}`),
    onSuccess: () => {
      toast.success('Conta excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-summary'] });
      setConfirmDelete(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir conta.';
      toast.error(msg);
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PayForm }) =>
      post(`/contas-pagar/${id}/pagar`, data),
    onSuccess: () => {
      toast.success('Pagamento registrado!');
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-summary'] });
      handleClosePayModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao registrar pagamento.';
      toast.error(msg);
    },
  });

  const aproveMutation = useMutation({
    mutationFn: async (id: number) => post(`/contas-pagar/${id}/aprovar`),
    onSuccess: () => {
      toast.success('Conta aprovada!');
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao aprovar conta.';
      toast.error(msg);
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: async (id: number) => post(`/contas-pagar/${id}/rejeitar`),
    onSuccess: () => {
      toast.success('Conta rejeitada!');
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao rejeitar conta.';
      toast.error(msg);
    },
  });

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    reset({ descricao: '', valor: undefined, dataVencimento: '', dataEmissao: '', origemLancamento: '', codigoBarras: '', observacoes: '' });
  }, [reset]);

  const handleEdit = useCallback((cp: ContaPagar) => {
    setEditingId(cp.id);
    reset({
      descricao: cp.descricao,
      valor: cp.valor,
      dataVencimento: cp.dataVencimento?.split('T')[0] ?? '',
      dataEmissao: cp.dataEmissao?.split('T')[0] ?? '',
      origemLancamento: cp.origemLancamento ?? '',
      codigoBarras: cp.codigoBarras ?? '',
      fornecedorId: cp.fornecedor?.id,
      categoriaId: cp.categoria?.id,
      centroCustoId: cp.centroCusto?.id,
      observacoes: cp.observacoes ?? '',
    });
    setShowForm(true);
  }, [reset]);

  const handleOpenPayModal = useCallback((cp: ContaPagar) => {
    setPayingCP(cp);
    payForm.reset({
      valorPago: cp.valor,
      dataPagamento: format(new Date(), 'yyyy-MM-dd'),
      contaBancariaId: undefined,
      observacoes: '',
    });
    setShowPayModal(true);
  }, [payForm]);

  const handleClosePayModal = useCallback(() => {
    setShowPayModal(false);
    setPayingCP(null);
    payForm.reset();
  }, [payForm]);

  const handleExport = async (tipo: 'excel' | 'pdf') => {
    try {
      const ext = tipo === 'excel' ? 'xlsx' : 'pdf';
      const resp = await get(`/contas-pagar/export/${tipo}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contas-pagar.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Erro ao exportar ${tipo.toUpperCase()}.`);
    }
  };

  const columns: Column<ContaPagar>[] = [
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Fornecedor',
      accessor: 'fornecedor',
      render: (row) =>
        row.fornecedor ? (
          <Link to={`/fornecedores/${row.fornecedor.id}`}>{row.fornecedor.razaoSocial}</Link>
        ) : '-',
    },
    {
      header: 'Vencimento',
      accessor: 'dataVencimento',
      render: (row) => format(parseISO(row.dataVencimento), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (row) => <span className="valor-negativo">{formatCurrency(row.valor)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const pagination: PaginationInfo | undefined = listData
    ? { page: listData.page, pageSize: listData.pageSize, total: listData.total, totalPages: listData.totalPages }
    : undefined;

  const summaryCards = [
    { label: 'Hoje', value: summary?.hoje ?? 0, color: '#e53e3e' },
    { label: 'Semana', value: summary?.semana ?? 0, color: '#ed8936' },
    { label: 'Mês', value: summary?.mes ?? 0, color: '#4299e1' },
    { label: 'Atrasados', value: summary?.atrasados ?? 0, color: '#9b2c2c' },
  ];

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <div className="page-header">
        <h2>Contas a Pagar</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-success" size="sm" onClick={() => handleExport('excel')}>
            Exportar Excel
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => handleExport('pdf')}>
            Exportar PDF
          </Button>
          <Button variant="primary" onClick={() => { reset(); setShowForm(true); }}>
            + Nova Conta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Row className="g-3 mb-4">
        {summaryCards.map((card) => (
          <Col key={card.label} xs={6} lg={3}>
            <Card className="summary-card">
              <Card.Body>
                <div className="card-title">Venc. {card.label}</div>
                <div className="card-value" style={{ color: card.color }}>
                  {formatCurrency(card.value)}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <div className="filter-bar">
        <Row className="g-2 align-items-end">
          <Col xs={12} md={3}>
            <Form.Label className="small fw-medium">Status</Form.Label>
            <Form.Select size="sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="VENCIDO">Vencido</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={2}>
            <Form.Label className="small fw-medium">De</Form.Label>
            <Form.Control type="date" size="sm" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPage(1); }} />
          </Col>
          <Col xs={6} md={2}>
            <Form.Label className="small fw-medium">Até</Form.Label>
            <Form.Control type="date" size="sm" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPage(1); }} />
          </Col>
          <Col xs={12} md={5}>
            <Form.Label className="small fw-medium">Buscar</Form.Label>
            <Form.Control
              type="text"
              size="sm"
              placeholder="Pesquisar por descrição ou fornecedor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </Col>
        </Row>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={listData?.data ?? []}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onSort={(field, dir) => { setSortField(field); setSortDir(dir); }}
        actions={[
          { label: 'Editar', variant: 'outline-primary', onClick: handleEdit, icon: '✏️' },
          {
            label: 'Pagar',
            variant: 'outline-success',
            onClick: (row) => handleOpenPayModal(row),
            icon: '💵',
            show: (row) => row.status === 'PENDENTE' || row.status === 'VENCIDO',
          },
          {
            label: 'Aprovar',
            variant: 'outline-info',
            onClick: (row) => aproveMutation.mutate(row.id),
            icon: '✅',
            show: (row) => row.status === 'PENDENTE',
          },
          {
            label: 'Rejeitar',
            variant: 'outline-warning',
            onClick: (row) => rejeitarMutation.mutate(row.id),
            icon: '❌',
            show: (row) => row.status === 'PENDENTE',
          },
          {
            label: 'Excluir',
            variant: 'outline-danger',
            onClick: (row) => setConfirmDelete(row),
            icon: '🗑️',
            show: (row) => row.status !== 'PAGO',
          },
        ]}
      />

      {/* Form Modal */}
      <Modal show={showForm} onHide={handleCloseForm} size="lg">
        <Form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Descrição *</Form.Label>
                  <Form.Control {...register('descricao')} isInvalid={!!errors.descricao} />
                  <Form.Control.Feedback type="invalid">{errors.descricao?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Controller
                  name="valor"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      label="Valor *"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      isInvalid={!!errors.valor}
                      error={errors.valor?.message}
                    />
                  )}
                />
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Data de Vencimento *</Form.Label>
                  <Form.Control type="date" {...register('dataVencimento')} isInvalid={!!errors.dataVencimento} />
                  <Form.Control.Feedback type="invalid">{errors.dataVencimento?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Data de Emissão</Form.Label>
                  <Form.Control type="date" {...register('dataEmissao')} />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Origem do Lançamento</Form.Label>
                  <Form.Select {...register('origemLancamento')}>
                    <option value="">Selecione...</option>
                    <option value="MANUAL">Manual</option>
                    <option value="CONTRATO">Contrato</option>
                    <option value="VIAGEM">Viagem</option>
                    <option value="RECORRENTE">Recorrente</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={8}>
                <Form.Group>
                  <Form.Label>Código de Barras</Form.Label>
                  <Form.Control {...register('codigoBarras')} placeholder="Digite o código de barras..." />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <SelectLabel label="Fornecedor" href="/fornecedores" />
                  <Controller
                    name="fornecedorId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(fornecedores ?? []).map((f) => (
                          <option key={f.id} value={f.id}>{f.razaoSocial}</option>
                        ))}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <SelectLabel label="Categoria" href="/categorias" linkText="Nova" />
                  <Controller
                    name="categoriaId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(categorias ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <SelectLabel label="Centro de Custo" href="/centros-custo" />
                  <Controller
                    name="centroCustoId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(centrosCusto ?? []).map((cc) => (
                          <option key={cc.id} value={cc.id}>{cc.nome}</option>
                        ))}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Observações</Form.Label>
                  <Form.Control as="textarea" rows={3} {...register('observacoes')} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseForm}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <><Spinner animation="border" size="sm" className="me-2" />Salvando...</>
              ) : (
                'Salvar'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Payment Modal */}
      <Modal show={showPayModal} onHide={handleClosePayModal}>
        <Form onSubmit={payForm.handleSubmit((data) => payingCP && payMutation.mutate({ id: payingCP.id, data }))}>
          <Modal.Header closeButton>
            <Modal.Title>Registrar Pagamento</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {payingCP && (
              <div className="mb-3 p-2 bg-light rounded">
                <strong>{payingCP.descricao}</strong>
                <br />
                <small className="text-muted">Valor original: {formatCurrency(payingCP.valor)}</small>
              </div>
            )}
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Controller
                  name="valorPago"
                  control={payForm.control}
                  render={({ field }) => (
                    <CurrencyInput
                      label="Valor Pago *"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      isInvalid={!!payForm.formState.errors.valorPago}
                      error={payForm.formState.errors.valorPago?.message}
                    />
                  )}
                />
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Data do Pagamento *</Form.Label>
                  <Form.Control
                    type="date"
                    {...payForm.register('dataPagamento')}
                    isInvalid={!!payForm.formState.errors.dataPagamento}
                  />
                  <Form.Control.Feedback type="invalid">{payForm.formState.errors.dataPagamento?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Conta Bancária *</Form.Label>
                  <Controller
                    name="contaBancariaId"
                    control={payForm.control}
                    render={({ field }) => (
                      <Form.Select
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        isInvalid={!!payForm.formState.errors.contaBancariaId}
                      >
                        <option value="">Selecione...</option>
                        {(contasBancarias ?? []).map((cb) => (
                          <option key={cb.id} value={cb.id}>{cb.nome} - {cb.banco}</option>
                        ))}
                      </Form.Select>
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{payForm.formState.errors.contaBancariaId?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Observações</Form.Label>
                  <Form.Control as="textarea" rows={2} {...payForm.register('observacoes')} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClosePayModal}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={payMutation.isPending}>
              {payMutation.isPending ? (
                <><Spinner animation="border" size="sm" className="me-2" />Pagando...</>
              ) : (
                'Confirmar Pagamento'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        show={!!confirmDelete}
        title="Excluir Conta"
        message={`Deseja realmente excluir "${confirmDelete?.descricao}"?`}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
