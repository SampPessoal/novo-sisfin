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
import ConfirmModal from '../../components/ConfirmModal';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get, post, put, del } from '../../services/api';
import SelectLabel from '../../components/SelectLabel';

interface ContaReceber {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: string;
  cliente?: { id: number; razaoSocial: string };
  categoria?: { id: number; nome: string };
  centroCusto?: { id: number; nome: string };
  observacoes?: string;
}

interface InadimplenciaSummary {
  de0a30: number;
  de31a60: number;
  de61a90: number;
  acima90: number;
}

interface Cliente { id: number; razaoSocial: string }
interface Categoria { id: number; nome: string }
interface CentroCusto { id: number; nome: string }
interface ContaBancaria { id: number; nome: string; banco: string }

interface ListResponse {
  data: ContaReceber[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const crSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dataVencimento: z.string().min(1, 'Data de vencimento é obrigatória'),
  clienteId: z.number().optional(),
  categoriaId: z.number().optional(),
  centroCustoId: z.number().optional(),
  observacoes: z.string().optional(),
});

type CRForm = z.infer<typeof crSchema>;

const receiveSchema = z.object({
  valorRecebido: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dataRecebimento: z.string().min(1, 'Data de recebimento é obrigatória'),
  contaBancariaId: z.number({ invalid_type_error: 'Selecione uma conta' }).min(1, 'Selecione uma conta bancária'),
  observacoes: z.string().optional(),
});

type ReceiveForm = z.infer<typeof receiveSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ContasReceberPage() {
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
  const [confirmDelete, setConfirmDelete] = useState<ContaReceber | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingCR, setReceivingCR] = useState<ContaReceber | null>(null);

  const pageSize = 15;

  const { data: listData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contas-receber', page, search, statusFilter, dataInicio, dataFim, sortField, sortDir],
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
      const { data } = await get<ListResponse>(`/contas-receber?${params}`);
      return data;
    },
  });

  const { data: inadimplencia } = useQuery({
    queryKey: ['contas-receber-inadimplencia'],
    queryFn: async () => {
      const { data: resp } = await get('/contas-receber/inadimplencia');
      const body = resp as { data: InadimplenciaSummary };
      return body.data as InadimplenciaSummary;
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data: resp } = await get('/clientes?all=true');
      const body = resp as { data: Cliente[] };
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
      const { data: resp } = await get('/centros-custo?page=1&pageSize=100');
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
  } = useForm<CRForm>({
    resolver: zodResolver(crSchema),
  });

  const receiveForm = useForm<ReceiveForm>({
    resolver: zodResolver(receiveSchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: CRForm) => {
      if (editingId) return put(`/contas-receber/${editingId}`, formData);
      return post('/contas-receber', formData);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-inadimplencia'] });
      handleCloseForm();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar conta a receber.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => del(`/contas-receber/${id}`),
    onSuccess: () => {
      toast.success('Conta excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-inadimplencia'] });
      setConfirmDelete(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir conta.';
      toast.error(msg);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReceiveForm }) =>
      post(`/contas-receber/${id}/receber`, data),
    onSuccess: () => {
      toast.success('Recebimento registrado!');
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-inadimplencia'] });
      handleCloseReceiveModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao registrar recebimento.';
      toast.error(msg);
    },
  });

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    reset({ descricao: '', valor: undefined, dataVencimento: '', observacoes: '' });
  }, [reset]);

  const handleEdit = useCallback((cr: ContaReceber) => {
    setEditingId(cr.id);
    reset({
      descricao: cr.descricao,
      valor: cr.valor,
      dataVencimento: cr.dataVencimento?.split('T')[0] ?? '',
      clienteId: cr.cliente?.id,
      categoriaId: cr.categoria?.id,
      centroCustoId: cr.centroCusto?.id,
      observacoes: cr.observacoes ?? '',
    });
    setShowForm(true);
  }, [reset]);

  const handleOpenReceiveModal = useCallback((cr: ContaReceber) => {
    setReceivingCR(cr);
    receiveForm.reset({
      valorRecebido: cr.valor,
      dataRecebimento: format(new Date(), 'yyyy-MM-dd'),
      contaBancariaId: undefined,
      observacoes: '',
    });
    setShowReceiveModal(true);
  }, [receiveForm]);

  const handleCloseReceiveModal = useCallback(() => {
    setShowReceiveModal(false);
    setReceivingCR(null);
    receiveForm.reset();
  }, [receiveForm]);

  const handleExport = async (tipo: 'excel' | 'pdf') => {
    try {
      const ext = tipo === 'excel' ? 'xlsx' : 'pdf';
      const resp = await get(`/contas-receber/export/${tipo}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contas-receber.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Erro ao exportar ${tipo.toUpperCase()}.`);
    }
  };

  const columns: Column<ContaReceber>[] = [
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Cliente',
      accessor: 'cliente',
      render: (row) =>
        row.cliente ? (
          <Link to={`/clientes/${row.cliente.id}`}>{row.cliente.razaoSocial}</Link>
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
      render: (row) => <span className="valor-positivo">{formatCurrency(row.valor)}</span>,
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

  const inadimplenciaCards = [
    { label: '0-30 dias', value: inadimplencia?.de0a30 ?? 0, color: '#ecc94b' },
    { label: '31-60 dias', value: inadimplencia?.de31a60 ?? 0, color: '#ed8936' },
    { label: '61-90 dias', value: inadimplencia?.de61a90 ?? 0, color: '#e53e3e' },
    { label: '> 90 dias', value: inadimplencia?.acima90 ?? 0, color: '#9b2c2c' },
  ];

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <div className="page-header">
        <h2>Contas a Receber</h2>
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

      {/* Inadimplencia summary */}
      <Row className="g-3 mb-4">
        {inadimplenciaCards.map((card) => (
          <Col key={card.label} xs={6} lg={3}>
            <Card className="summary-card">
              <Card.Body>
                <div className="card-title">Inadimpl. {card.label}</div>
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
              <option value="RECEBIDO">Recebido</option>
              <option value="VENCIDO">Vencido</option>
              <option value="CANCELADO">Cancelado</option>
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
              placeholder="Pesquisar por descrição ou cliente..."
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
            label: 'Receber',
            variant: 'outline-success',
            onClick: (row) => handleOpenReceiveModal(row),
            icon: '💰',
            show: (row) => row.status === 'PENDENTE' || row.status === 'VENCIDO',
          },
          {
            label: 'Excluir',
            variant: 'outline-danger',
            onClick: (row) => setConfirmDelete(row),
            icon: '🗑️',
            show: (row) => row.status !== 'RECEBIDO',
          },
        ]}
      />

      {/* Form Modal */}
      <Modal show={showForm} onHide={handleCloseForm} size="lg">
        <Form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>{editingId ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</Modal.Title>
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
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Valor *</Form.Label>
                  <Controller
                    name="valor"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.valor}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.valor?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Data de Vencimento *</Form.Label>
                  <Form.Control type="date" {...register('dataVencimento')} isInvalid={!!errors.dataVencimento} />
                  <Form.Control.Feedback type="invalid">{errors.dataVencimento?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <SelectLabel label="Cliente" href="/clientes" />
                  <Controller
                    name="clienteId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(clientes ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.razaoSocial}</option>
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
                        {(centrosCusto ?? []).map((cc: CentroCusto) => (
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

      {/* Receive Modal */}
      <Modal show={showReceiveModal} onHide={handleCloseReceiveModal}>
        <Form onSubmit={receiveForm.handleSubmit((data) => receivingCR && receiveMutation.mutate({ id: receivingCR.id, data }))}>
          <Modal.Header closeButton>
            <Modal.Title>Registrar Recebimento</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {receivingCR && (
              <div className="mb-3 p-2 bg-light rounded">
                <strong>{receivingCR.descricao}</strong>
                <br />
                <small className="text-muted">Valor original: {formatCurrency(receivingCR.valor)}</small>
              </div>
            )}
            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Valor Recebido *</Form.Label>
                  <Controller
                    name="valorRecebido"
                    control={receiveForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!receiveForm.formState.errors.valorRecebido}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{receiveForm.formState.errors.valorRecebido?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Data do Recebimento *</Form.Label>
                  <Form.Control
                    type="date"
                    {...receiveForm.register('dataRecebimento')}
                    isInvalid={!!receiveForm.formState.errors.dataRecebimento}
                  />
                  <Form.Control.Feedback type="invalid">{receiveForm.formState.errors.dataRecebimento?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Conta Bancária *</Form.Label>
                  <Controller
                    name="contaBancariaId"
                    control={receiveForm.control}
                    render={({ field }) => (
                      <Form.Select
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        isInvalid={!!receiveForm.formState.errors.contaBancariaId}
                      >
                        <option value="">Selecione...</option>
                        {(contasBancarias ?? []).map((cb) => (
                          <option key={cb.id} value={cb.id}>{cb.nome} - {cb.banco}</option>
                        ))}
                      </Form.Select>
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{receiveForm.formState.errors.contaBancariaId?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Observações</Form.Label>
                  <Form.Control as="textarea" rows={2} {...receiveForm.register('observacoes')} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseReceiveModal}>Cancelar</Button>
            <Button type="submit" variant="success" disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? (
                <><Spinner animation="border" size="sm" className="me-2" />Recebendo...</>
              ) : (
                'Confirmar Recebimento'
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
