import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Nav, Tab, Badge, Spinner, Table } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import { get, post, put, del } from '../../services/api';

interface RegraComissao {
  id?: number;
  nome: string;
  percentual: number;
  tipo: string;
}

interface Comissao {
  id?: number;
  colaborador?: { id: number; nome: string };
  valor: number;
  referencia: string;
  status: string;
}

interface Meta {
  id?: number;
  nome: string;
  valorMeta: number;
  valorAtingido?: number;
  periodo: string;
  colaboradorId?: number;
  colaborador?: { id: number; nome: string };
  status: string;
}

interface PainelData {
  totalComissoes: number;
  totalPago: number;
  totalPendente: number;
  topColaboradores: Array<{ nome: string; total: number }>;
  porMes: Array<{ mes: string; valor: number }>;
}

interface RegraListResponse {
  success: boolean;
  data: RegraComissao[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ComissaoListResponse {
  success: boolean;
  data: Comissao[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface MetaListResponse {
  success: boolean;
  data: Meta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const regraSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  percentual: z.number({ invalid_type_error: 'Percentual inválido' }).min(0).max(100, 'Máximo 100%'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
});

type RegraFormData = z.infer<typeof regraSchema>;

const metaSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  valorMeta: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  periodo: z.string().min(1, 'Período é obrigatório'),
  colaboradorId: z.number().optional(),
});

type MetaFormData = z.infer<typeof metaSchema>;

const calcularSchema = z.object({
  periodo: z.string().min(1, 'Período é obrigatório'),
});

type CalcularFormData = z.infer<typeof calcularSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ComissoesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('regras');

  const [regraPage, setRegraPage] = useState(1);
  const [regraSearch, setRegraSearch] = useState('');
  const [showRegraModal, setShowRegraModal] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraComissao | null>(null);
  const [deletingRegra, setDeletingRegra] = useState<RegraComissao | null>(null);

  const [comissaoPage, setComissaoPage] = useState(1);
  const [comissaoSearch, setComissaoSearch] = useState('');

  const [metaPage, setMetaPage] = useState(1);
  const [metaSearch, setMetaSearch] = useState('');
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [deletingMeta, setDeletingMeta] = useState<Meta | null>(null);

  const [showCalcularModal, setShowCalcularModal] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RegraFormData>({
    resolver: zodResolver(regraSchema),
  });

  const metaForm = useForm<MetaFormData>({
    resolver: zodResolver(metaSchema),
  });

  const calcularForm = useForm<CalcularFormData>({
    resolver: zodResolver(calcularSchema),
  });

  const { data: regrasResponse, isLoading: regrasLoading } = useQuery({
    queryKey: ['comissoes-regras', regraPage, regraSearch],
    queryFn: async () => {
      const { data } = await get<RegraListResponse>(`/comissoes/regras?page=${regraPage}&pageSize=20&search=${regraSearch}`);
      return data;
    },
  });

  const { data: comissoesResponse, isLoading: comissoesLoading } = useQuery({
    queryKey: ['comissoes', comissaoPage, comissaoSearch],
    queryFn: async () => {
      const { data } = await get<ComissaoListResponse>(`/comissoes?page=${comissaoPage}&pageSize=20&search=${comissaoSearch}`);
      return data;
    },
  });

  const { data: metasResponse, isLoading: metasLoading } = useQuery({
    queryKey: ['comissoes-metas', metaPage, metaSearch],
    queryFn: async () => {
      const { data } = await get<MetaListResponse>(`/comissoes/metas?page=${metaPage}&pageSize=20&search=${metaSearch}`);
      return data;
    },
    enabled: activeTab === 'metas',
  });

  const { data: painelData, isLoading: painelLoading } = useQuery({
    queryKey: ['comissoes-painel'],
    queryFn: async () => {
      const { data: resp } = await get('/comissoes/painel');
      const body = resp as { data: PainelData };
      return body.data as PainelData;
    },
    enabled: activeTab === 'painel',
  });

  const createRegraMutation = useMutation({
    mutationFn: (data: RegraFormData) => post('/comissoes/regras', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-regras'] });
      toast.success('Regra criada com sucesso!');
      closeRegraModal();
    },
    onError: () => toast.error('Erro ao criar regra.'),
  });

  const updateRegraMutation = useMutation({
    mutationFn: (data: RegraFormData) => put(`/comissoes/regras/${editingRegra!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-regras'] });
      toast.success('Regra atualizada com sucesso!');
      closeRegraModal();
    },
    onError: () => toast.error('Erro ao atualizar regra.'),
  });

  const deleteRegraMutation = useMutation({
    mutationFn: (id: number) => del(`/comissoes/regras/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-regras'] });
      toast.success('Regra excluída com sucesso!');
      setDeletingRegra(null);
    },
    onError: () => toast.error('Erro ao excluir regra.'),
  });

  const createMetaMutation = useMutation({
    mutationFn: (data: MetaFormData) => post('/comissoes/metas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-metas'] });
      toast.success('Meta criada com sucesso!');
      closeMetaModal();
    },
    onError: () => toast.error('Erro ao criar meta.'),
  });

  const updateMetaMutation = useMutation({
    mutationFn: (data: MetaFormData) => put(`/comissoes/metas/${editingMeta!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-metas'] });
      toast.success('Meta atualizada com sucesso!');
      closeMetaModal();
    },
    onError: () => toast.error('Erro ao atualizar meta.'),
  });

  const deleteMetaMutation = useMutation({
    mutationFn: (id: number) => del(`/comissoes/metas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-metas'] });
      toast.success('Meta excluída com sucesso!');
      setDeletingMeta(null);
    },
    onError: () => toast.error('Erro ao excluir meta.'),
  });

  const calcularMutation = useMutation({
    mutationFn: (data: CalcularFormData) => post('/comissoes/calcular', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      queryClient.invalidateQueries({ queryKey: ['comissoes-painel'] });
      toast.success('Comissões calculadas com sucesso!');
      setShowCalcularModal(false);
    },
    onError: () => toast.error('Erro ao calcular comissões.'),
  });

  const openCreateRegra = useCallback(() => {
    setEditingRegra(null);
    reset({ nome: '', percentual: undefined as unknown as number, tipo: '' });
    setShowRegraModal(true);
  }, [reset]);

  const openEditRegra = useCallback((item: RegraComissao) => {
    setEditingRegra(item);
    reset({ nome: item.nome, percentual: item.percentual, tipo: item.tipo });
    setShowRegraModal(true);
  }, [reset]);

  const closeRegraModal = useCallback(() => {
    setShowRegraModal(false);
    setEditingRegra(null);
  }, []);

  const openCreateMeta = useCallback(() => {
    setEditingMeta(null);
    metaForm.reset({ nome: '', valorMeta: undefined as unknown as number, periodo: '', colaboradorId: undefined });
    setShowMetaModal(true);
  }, [metaForm]);

  const openEditMeta = useCallback((item: Meta) => {
    setEditingMeta(item);
    metaForm.reset({ nome: item.nome, valorMeta: item.valorMeta, periodo: item.periodo, colaboradorId: item.colaboradorId ?? item.colaborador?.id });
    setShowMetaModal(true);
  }, [metaForm]);

  const closeMetaModal = useCallback(() => {
    setShowMetaModal(false);
    setEditingMeta(null);
  }, []);

  const onRegraSubmit = (data: RegraFormData) => {
    if (editingRegra) updateRegraMutation.mutate(data);
    else createRegraMutation.mutate(data);
  };

  const onMetaSubmit = (data: MetaFormData) => {
    if (editingMeta) updateMetaMutation.mutate(data);
    else createMetaMutation.mutate(data);
  };

  const isSavingRegra = createRegraMutation.isPending || updateRegraMutation.isPending;
  const isSavingMeta = createMetaMutation.isPending || updateMetaMutation.isPending;

  const regraColumns: Column<RegraComissao>[] = [
    { header: 'Nome', accessor: 'nome' },
    {
      header: 'Percentual',
      accessor: 'percentual',
      render: (row) => `${row.percentual}%`,
    },
    { header: 'Tipo', accessor: 'tipo' },
  ];

  const comissaoColumns: Column<Comissao>[] = [
    {
      header: 'Colaborador',
      accessor: 'colaborador',
      render: (row) => row.colaborador?.nome ?? '-',
    },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (row) => formatCurrency(row.valor),
    },
    { header: 'Referência', accessor: 'referencia' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const metaColumns: Column<Meta>[] = [
    { header: 'Nome', accessor: 'nome' },
    {
      header: 'Colaborador',
      accessor: 'colaborador',
      render: (row) => row.colaborador?.nome ?? 'Geral',
    },
    {
      header: 'Meta',
      accessor: 'valorMeta',
      render: (row) => formatCurrency(row.valorMeta),
    },
    {
      header: 'Atingido',
      accessor: 'valorAtingido',
      render: (row) => row.valorAtingido != null ? formatCurrency(row.valorAtingido) : '-',
    },
    { header: 'Período', accessor: 'periodo' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const regraPagination: PaginationInfo | undefined = regrasResponse
    ? { page: regrasResponse.page, pageSize: regrasResponse.pageSize, total: regrasResponse.total, totalPages: regrasResponse.totalPages }
    : undefined;

  const comissaoPagination: PaginationInfo | undefined = comissoesResponse
    ? { page: comissoesResponse.page, pageSize: comissoesResponse.pageSize, total: comissoesResponse.total, totalPages: comissoesResponse.totalPages }
    : undefined;

  const metaPagination: PaginationInfo | undefined = metasResponse
    ? { page: metasResponse.page, pageSize: metasResponse.pageSize, total: metasResponse.total, totalPages: metasResponse.totalPages }
    : undefined;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Comissões</h2></Col>
        <Col xs="auto">
          <Button variant="success" onClick={() => { calcularForm.reset({ periodo: '' }); setShowCalcularModal(true); }}>
            Calcular Comissões
          </Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? 'regras')}>
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link eventKey="regras">Regras de Comissão</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="comissoes">Comissões Geradas</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="metas">Metas</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="painel">Painel</Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="regras">
                <div className="d-flex justify-content-end mb-3">
                  <Button variant="primary" onClick={openCreateRegra}>+ Nova Regra</Button>
                </div>
                <DataTable<RegraComissao>
                  columns={regraColumns}
                  data={regrasResponse?.data ?? []}
                  loading={regrasLoading}
                  pagination={regraPagination}
                  onPageChange={setRegraPage}
                  onSearch={setRegraSearch}
                  searchPlaceholder="Pesquisar regras..."
                  emptyMessage="Nenhuma regra encontrada."
                  actions={[
                    { label: 'Editar', variant: 'outline-primary', onClick: openEditRegra, icon: '✏️' },
                    { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeletingRegra(row), icon: '🗑️' },
                  ]}
                />
              </Tab.Pane>

              <Tab.Pane eventKey="comissoes">
                <DataTable<Comissao>
                  columns={comissaoColumns}
                  data={comissoesResponse?.data ?? []}
                  loading={comissoesLoading}
                  pagination={comissaoPagination}
                  onPageChange={setComissaoPage}
                  onSearch={setComissaoSearch}
                  searchPlaceholder="Pesquisar comissões..."
                  emptyMessage="Nenhuma comissão encontrada."
                />
              </Tab.Pane>

              <Tab.Pane eventKey="metas">
                <div className="d-flex justify-content-end mb-3">
                  <Button variant="primary" onClick={openCreateMeta}>+ Nova Meta</Button>
                </div>
                <DataTable<Meta>
                  columns={metaColumns}
                  data={metasResponse?.data ?? []}
                  loading={metasLoading}
                  pagination={metaPagination}
                  onPageChange={setMetaPage}
                  onSearch={setMetaSearch}
                  searchPlaceholder="Pesquisar metas..."
                  emptyMessage="Nenhuma meta encontrada."
                  actions={[
                    { label: 'Editar', variant: 'outline-primary', onClick: openEditMeta, icon: '✏️' },
                    { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeletingMeta(row), icon: '🗑️' },
                  ]}
                />
              </Tab.Pane>

              <Tab.Pane eventKey="painel">
                {painelLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" />
                  </div>
                ) : painelData ? (
                  <>
                    <Row className="mb-4">
                      <Col md={4}>
                        <Card className="text-center border-primary">
                          <Card.Body>
                            <h6 className="text-muted">Total Comissões</h6>
                            <h3 className="text-primary mb-0">{formatCurrency(painelData.totalComissoes)}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="text-center border-success">
                          <Card.Body>
                            <h6 className="text-muted">Total Pago</h6>
                            <h3 className="text-success mb-0">{formatCurrency(painelData.totalPago)}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="text-center border-warning">
                          <Card.Body>
                            <h6 className="text-muted">Total Pendente</h6>
                            <h3 className="text-warning mb-0">{formatCurrency(painelData.totalPendente)}</h3>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Card>
                          <Card.Header>Top Colaboradores</Card.Header>
                          <Card.Body>
                            {painelData.topColaboradores.length > 0 ? (
                              <Table size="sm" striped>
                                <thead>
                                  <tr><th>Colaborador</th><th>Total</th></tr>
                                </thead>
                                <tbody>
                                  {painelData.topColaboradores.map((c, i) => (
                                    <tr key={i}>
                                      <td>{c.nome}</td>
                                      <td>{formatCurrency(c.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : (
                              <p className="text-muted mb-0">Sem dados.</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card>
                          <Card.Header>Comissões por Mês</Card.Header>
                          <Card.Body>
                            {painelData.porMes.length > 0 ? (
                              <Table size="sm" striped>
                                <thead>
                                  <tr><th>Mês</th><th>Valor</th></tr>
                                </thead>
                                <tbody>
                                  {painelData.porMes.map((m, i) => (
                                    <tr key={i}>
                                      <td>{m.mes}</td>
                                      <td>{formatCurrency(m.valor)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : (
                              <p className="text-muted mb-0">Sem dados.</p>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </>
                ) : (
                  <p className="text-muted">Sem dados disponíveis.</p>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>

      {/* Regra Modal */}
      <Modal show={showRegraModal} onHide={closeRegraModal} centered>
        <Form onSubmit={handleSubmit(onRegraSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editingRegra ? 'Editar Regra' : 'Nova Regra'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control {...register('nome')} isInvalid={!!errors.nome} />
              <Form.Control.Feedback type="invalid">{errors.nome?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Percentual (%) *</Form.Label>
              <Controller
                name="percentual"
                control={control}
                render={({ field }) => (
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    isInvalid={!!errors.percentual}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">{errors.percentual?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo *</Form.Label>
              <Form.Control {...register('tipo')} isInvalid={!!errors.tipo} />
              <Form.Control.Feedback type="invalid">{errors.tipo?.message}</Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeRegraModal} disabled={isSavingRegra}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={isSavingRegra}>
              {isSavingRegra && <Spinner size="sm" className="me-2" />}
              {editingRegra ? 'Salvar' : 'Criar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Meta Modal */}
      <Modal show={showMetaModal} onHide={closeMetaModal} centered>
        <Form onSubmit={metaForm.handleSubmit(onMetaSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editingMeta ? 'Editar Meta' : 'Nova Meta'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control {...metaForm.register('nome')} isInvalid={!!metaForm.formState.errors.nome} />
              <Form.Control.Feedback type="invalid">{metaForm.formState.errors.nome?.message}</Form.Control.Feedback>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor da Meta *</Form.Label>
                  <Controller
                    name="valorMeta"
                    control={metaForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!metaForm.formState.errors.valorMeta}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{metaForm.formState.errors.valorMeta?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Período *</Form.Label>
                  <Form.Control
                    type="month"
                    {...metaForm.register('periodo')}
                    isInvalid={!!metaForm.formState.errors.periodo}
                  />
                  <Form.Control.Feedback type="invalid">{metaForm.formState.errors.periodo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeMetaModal} disabled={isSavingMeta}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={isSavingMeta}>
              {isSavingMeta && <Spinner size="sm" className="me-2" />}
              {editingMeta ? 'Salvar' : 'Criar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Calcular Modal */}
      <Modal show={showCalcularModal} onHide={() => setShowCalcularModal(false)} centered>
        <Form onSubmit={calcularForm.handleSubmit((data) => calcularMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Calcular Comissões</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Período *</Form.Label>
              <Form.Control
                type="month"
                {...calcularForm.register('periodo')}
                isInvalid={!!calcularForm.formState.errors.periodo}
              />
              <Form.Control.Feedback type="invalid">{calcularForm.formState.errors.periodo?.message}</Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCalcularModal(false)} disabled={calcularMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="success" type="submit" disabled={calcularMutation.isPending}>
              {calcularMutation.isPending && <Spinner size="sm" className="me-2" />}
              Calcular
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!deletingRegra}
        title="Excluir Regra"
        message={`Deseja realmente excluir a regra "${deletingRegra?.nome}"?`}
        onConfirm={() => deletingRegra?.id && deleteRegraMutation.mutate(deletingRegra.id)}
        onCancel={() => setDeletingRegra(null)}
        loading={deleteRegraMutation.isPending}
      />

      <ConfirmModal
        show={!!deletingMeta}
        title="Excluir Meta"
        message={`Deseja realmente excluir a meta "${deletingMeta?.nome}"?`}
        onConfirm={() => deletingMeta?.id && deleteMetaMutation.mutate(deletingMeta.id)}
        onCancel={() => setDeletingMeta(null)}
        loading={deleteMetaMutation.isPending}
      />
    </>
  );
}
