import { useState, useCallback, useRef } from 'react';
import { Row, Col, Card, Button, Form, Modal, Badge, Spinner, Table, Accordion, ProgressBar, Alert } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { FiUpload, FiDownload, FiTrash2, FiFile, FiFileText, FiImage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import api, { get, post, put, del } from '../../services/api';
import SelectLabel from '../../components/SelectLabel';

interface Parcela {
  id: number;
  numero: number;
  valor: number;
  dataVencimento: string;
  status: string;
}

interface Aditivo {
  id: number;
  descricao: string;
  novoValor?: number;
  novaVigencia?: string;
  dataCriacao: string;
}

interface Arquivo {
  id: number;
  contratoId: number;
  nome: string;
  url: string;
  criadoEm: string;
}

interface ContaPagar {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  valorPago?: number;
  status: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  fornecedor?: { id: number; razaoSocial: string };
  categoria?: { id: number; nome: string };
}

interface ContasPagarResumo {
  total: number;
  pagas: number;
  pendentes: number;
  canceladas: number;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
}

interface Contrato {
  id?: number;
  tipo: string;
  numero: string;
  descricao: string;
  clienteId?: number;
  fornecedorId?: number;
  cliente?: { id: number; razaoSocial: string };
  fornecedor?: { id: number; razaoSocial: string };
  valor: number;
  vigenciaInicio: string;
  vigenciaFim: string;
  indiceReajuste?: string;
  percentualReajuste?: number;
  clausulas?: string;
  status: string;
  parcelas?: Parcela[];
  aditivos?: Aditivo[];
  arquivos?: Arquivo[];
}

interface ListResponse {
  success: boolean;
  data: Contrato[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const schema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA'], { required_error: 'Tipo é obrigatório' }),
  numero: z.string().min(1, 'Número é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  clienteId: z.number().optional(),
  fornecedorId: z.number().optional(),
  valor: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  vigenciaInicio: z.string().min(1, 'Data início é obrigatória'),
  vigenciaFim: z.string().min(1, 'Data fim é obrigatória'),
  indiceReajuste: z.string().optional(),
  percentualReajuste: z.number().optional(),
  clausulas: z.string().optional(),
  status: z.string().optional().default('ABERTO'),
});

type FormData = z.infer<typeof schema>;

const aditivoSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  novoValor: z.number().optional(),
  novaVigencia: z.string().optional(),
});

type AditivoFormData = z.infer<typeof aditivoSchema>;

const provisionarSchema = z.object({
  recorrencia: z.string().min(1, 'Recorrência é obrigatória'),
  valorMensal: z.number().optional(),
  categoriaId: z.number().optional(),
  centroCustoId: z.number().optional(),
  diaVencimento: z.number().min(1).max(31).optional(),
});

type ProvisionarFormData = z.infer<typeof provisionarSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ContratosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [deleting, setDeleting] = useState<Contrato | null>(null);
  const [showAditivoModal, setShowAditivoModal] = useState(false);
  const [aditivoContrato, setAditivoContrato] = useState<Contrato | null>(null);
  const [showProvisionarModal, setShowProvisionarModal] = useState(false);
  const [provisionarContrato, setProvisionarContrato] = useState<Contrato | null>(null);
  const [confirmCancelarProv, setConfirmCancelarProv] = useState<Contrato | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<'parcelas' | 'contas-pagar' | 'aditivos' | 'arquivos'>('contas-pagar');
  const [uploading, setUploading] = useState(false);
  const [deletingArquivo, setDeletingArquivo] = useState<Arquivo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const aditivoForm = useForm<AditivoFormData>({
    resolver: zodResolver(aditivoSchema),
  });

  const provisionarForm = useForm<ProvisionarFormData>({
    resolver: zodResolver(provisionarSchema),
    defaultValues: { recorrencia: 'MENSAL' },
  });

  // --- Queries ---

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['contratos', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await get<ListResponse>(`/contratos?${params}`);
      return data;
    },
  });

  const { data: expandedContrato } = useQuery({
    queryKey: ['contrato-detail', expandedId],
    queryFn: async () => {
      const { data: resp } = await get(`/contratos/${expandedId}`);
      const body = resp as { data: Contrato };
      return body.data as Contrato;
    },
    enabled: !!expandedId,
  });

  const { data: contasPagarData } = useQuery({
    queryKey: ['contrato-contas-pagar', expandedId],
    queryFn: async () => {
      const { data: resp } = await get(`/contratos/${expandedId}/contas-pagar`);
      const body = resp as { data: { contas: ContaPagar[]; resumo: ContasPagarResumo } };
      return body.data;
    },
    enabled: !!expandedId,
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data: resp } = await get('/clientes?all=true');
      const body = resp as { data: { id: number; razaoSocial: string }[] };
      return body.data ?? [];
    },
  });

  const { data: fornecedores } = useQuery({
    queryKey: ['fornecedores-select'],
    queryFn: async () => {
      const { data: resp } = await get('/fornecedores?all=true');
      const body = resp as { data: { id: number; razaoSocial: string }[] };
      return body.data ?? [];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias-select'],
    queryFn: async () => {
      const { data: resp } = await get('/categorias?all=true');
      const body = resp as { data: { id: number; nome: string }[] };
      return body.data ?? [];
    },
  });

  const { data: centrosCusto } = useQuery({
    queryKey: ['centros-custo-select'],
    queryFn: async () => {
      const { data: resp } = await get('/centros-custo?all=true');
      const body = resp as { data: { id: number; nome: string }[] };
      return body.data ?? [];
    },
  });

  // --- Mutations ---

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['contratos'] });
    queryClient.invalidateQueries({ queryKey: ['contrato-detail'] });
    queryClient.invalidateQueries({ queryKey: ['contrato-contas-pagar'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/contratos', data),
    onSuccess: () => { invalidateAll(); toast.success('Contrato criado com sucesso!'); closeModal(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar contrato.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/contratos/${editing!.id}`, data),
    onSuccess: () => { invalidateAll(); toast.success('Contrato atualizado com sucesso!'); closeModal(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar contrato.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/contratos/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Contrato cancelado com sucesso!'); setDeleting(null); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao cancelar contrato.';
      toast.error(msg);
    },
  });

  const gerarParcelasMutation = useMutation({
    mutationFn: (id: number) => post(`/contratos/${id}/parcelas`),
    onSuccess: () => { invalidateAll(); toast.success('Parcelas geradas com sucesso!'); },
    onError: () => toast.error('Erro ao gerar parcelas.'),
  });

  const aditivoMutation = useMutation({
    mutationFn: (data: AditivoFormData) => post(`/contratos/${aditivoContrato!.id}/aditivo`, data),
    onSuccess: () => { invalidateAll(); toast.success('Aditivo registrado com sucesso!'); closeAditivoModal(); },
    onError: () => toast.error('Erro ao registrar aditivo.'),
  });

  const provisionarMutation = useMutation({
    mutationFn: (data: ProvisionarFormData) => post(`/contratos/${provisionarContrato!.id}/provisionar`, data),
    onSuccess: (resp) => {
      invalidateAll();
      const body = resp as { data: { data: { totalGerado: number } } };
      const total = body?.data?.data?.totalGerado;
      toast.success(`Provisionamento criado! ${total ? `${total} parcelas geradas no Contas a Pagar.` : ''}`);
      closeProvisionarModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao provisionar.';
      toast.error(msg);
    },
  });

  const cancelarProvMutation = useMutation({
    mutationFn: (contratoId: number) => post(`/contratos/${contratoId}/cancelar-provisionamento`),
    onSuccess: (resp) => {
      invalidateAll();
      const body = resp as { data: { data: { canceladas: number } } };
      const n = body?.data?.data?.canceladas ?? 0;
      toast.success(`${n} conta(s) a pagar cancelada(s).`);
      setConfirmCancelarProv(null);
    },
    onError: () => toast.error('Erro ao cancelar provisionamento.'),
  });

  // --- File handlers ---

  const handleFileUpload = useCallback(async (file: File) => {
    if (!expandedId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      await api.post(`/contratos/${expandedId}/arquivos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['contrato-detail', expandedId] });
      toast.success('Arquivo enviado com sucesso!');
    } catch {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [expandedId, queryClient]);

  const deleteArquivoMutation = useMutation({
    mutationFn: (arquivo: Arquivo) => del(`/contratos/${arquivo.contratoId}/arquivos/${arquivo.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato-detail'] });
      toast.success('Arquivo excluído com sucesso!');
      setDeletingArquivo(null);
    },
    onError: () => toast.error('Erro ao excluir arquivo.'),
  });

  const handleDownload = useCallback(async (arquivo: Arquivo) => {
    try {
      const { data: resp } = await get(`/contratos/${arquivo.contratoId}/arquivos/${arquivo.id}`);
      const body = resp as { data: Arquivo & { signedUrl: string } };
      window.open(body.data.signedUrl, '_blank');
    } catch {
      toast.error('Erro ao baixar arquivo.');
    }
  }, []);

  // --- Modal handlers ---

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({
      tipo: 'DESPESA', numero: '', descricao: '',
      valor: undefined as unknown as number,
      vigenciaInicio: '', vigenciaFim: '',
      indiceReajuste: '', percentualReajuste: undefined,
      clausulas: '', status: 'ABERTO',
    });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Contrato) => {
    setEditing(item);
    reset({
      tipo: item.tipo as 'RECEITA' | 'DESPESA',
      numero: item.numero,
      descricao: item.descricao,
      clienteId: item.clienteId ?? item.cliente?.id,
      fornecedorId: item.fornecedorId ?? item.fornecedor?.id,
      valor: item.valor,
      vigenciaInicio: item.vigenciaInicio?.split('T')[0] ?? '',
      vigenciaFim: item.vigenciaFim?.split('T')[0] ?? '',
      indiceReajuste: item.indiceReajuste ?? '',
      percentualReajuste: item.percentualReajuste,
      clausulas: item.clausulas ?? '',
      status: item.status,
    });
    setShowModal(true);
  }, [reset]);

  const closeModal = useCallback(() => { setShowModal(false); setEditing(null); }, []);

  const openAditivoModal = useCallback((contrato: Contrato) => {
    setAditivoContrato(contrato);
    aditivoForm.reset({ descricao: '', novoValor: undefined, novaVigencia: '' });
    setShowAditivoModal(true);
  }, [aditivoForm]);

  const closeAditivoModal = useCallback(() => { setShowAditivoModal(false); setAditivoContrato(null); }, []);

  const openProvisionarModal = useCallback((contrato: Contrato) => {
    setProvisionarContrato(contrato);
    provisionarForm.reset({
      recorrencia: 'MENSAL',
      valorMensal: contrato.valor,
      diaVencimento: contrato.vigenciaInicio ? new Date(contrato.vigenciaInicio).getDate() : 1,
    });
    setShowProvisionarModal(true);
  }, [provisionarForm]);

  const closeProvisionarModal = useCallback(() => { setShowProvisionarModal(false); setProvisionarContrato(null); }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setDetailTab('contas-pagar');
  }, []);

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // --- Table config ---

  const columns: Column<Contrato>[] = [
    { header: 'Número', accessor: 'numero', width: '100px' },
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (row) => <Badge bg={row.tipo === 'RECEITA' ? 'success' : 'danger'}>{row.tipo}</Badge>,
    },
    {
      header: 'Parte',
      accessor: 'fornecedor',
      render: (row) => row.fornecedor?.razaoSocial || row.cliente?.razaoSocial || '-',
    },
    {
      header: 'Valor Mensal',
      accessor: 'valor',
      render: (row) => formatCurrency(row.valor),
    },
    {
      header: 'Vigência',
      accessor: 'vigenciaInicio',
      render: (row) => {
        const inicio = row.vigenciaInicio ? format(parseISO(row.vigenciaInicio), 'dd/MM/yy', { locale: ptBR }) : '';
        const fim = row.vigenciaFim ? format(parseISO(row.vigenciaFim), 'dd/MM/yy', { locale: ptBR }) : '';
        return `${inicio} a ${fim}`;
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  const resumo = contasPagarData?.resumo;
  const contasPagar = contasPagarData?.contas ?? [];
  const hasProvisionamento = (resumo?.total ?? 0) > 0;

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Contratos</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Contrato</Button>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-3">
        <Card.Body className="py-2">
          <Row className="g-2 align-items-end">
            <Col xs={12} md={3}>
              <Form.Label className="small fw-medium mb-1">Status</Form.Label>
              <Form.Select size="sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">Todos</option>
                <option value="ATIVO">Ativo</option>
                <option value="ABERTO">Aberto</option>
                <option value="ENCERRADO">Encerrado</option>
                <option value="CANCELADO">Cancelado</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabela */}
      <Card>
        <Card.Body>
          <DataTable<Contrato>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar contratos..."
            emptyMessage="Nenhum contrato encontrado."
            actions={[
              {
                label: 'Detalhes',
                variant: 'outline-info',
                onClick: (row) => row.id && toggleExpand(row.id),
              },
              {
                label: 'Provisionar CP',
                variant: 'outline-success',
                onClick: (row) => openProvisionarModal(row),
                show: (row) => row.status === 'ABERTO' || row.status === 'ATIVO',
              },
              {
                label: 'Aditivo',
                variant: 'outline-warning',
                onClick: (row) => openAditivoModal(row),
                show: (row) => row.status === 'ABERTO' || row.status === 'ATIVO',
              },
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit },
              { label: 'Cancelar', variant: 'outline-danger', onClick: (row) => setDeleting(row), show: (row) => row.status !== 'CANCELADO' },
            ]}
          />
        </Card.Body>
      </Card>

      {/* Painel de Detalhes */}
      {expandedId && expandedContrato && (
        <Card className="mt-3">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>Contrato #{expandedContrato.numero}</strong>
                <span className="ms-2 text-muted">{expandedContrato.descricao}</span>
              </div>
              <Button variant="outline-secondary" size="sm" onClick={() => setExpandedId(null)}>Fechar</Button>
            </div>
            <div className="d-flex gap-2">
              {(['contas-pagar', 'parcelas', 'aditivos', 'arquivos'] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={detailTab === tab ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === 'contas-pagar' && 'Contas a Pagar'}
                  {tab === 'parcelas' && `Parcelas (${expandedContrato.parcelas?.length ?? 0})`}
                  {tab === 'aditivos' && `Aditivos (${expandedContrato.aditivos?.length ?? 0})`}
                  {tab === 'arquivos' && `Arquivos (${expandedContrato.arquivos?.length ?? 0})`}
                </Button>
              ))}
            </div>
          </Card.Header>
          <Card.Body>
            {/* === ABA CONTAS A PAGAR === */}
            {detailTab === 'contas-pagar' && (
              <>
                {resumo && hasProvisionamento && (
                  <Row className="g-3 mb-3">
                    <Col xs={6} lg={3}>
                      <Card className="border-0 bg-light text-center py-2">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <FiDollarSign className="text-primary" />
                          <div>
                            <small className="text-muted d-block">Valor Total</small>
                            <strong>{formatCurrency(resumo.valorTotal)}</strong>
                          </div>
                        </div>
                      </Card>
                    </Col>
                    <Col xs={6} lg={3}>
                      <Card className="border-0 bg-light text-center py-2">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <FiCheckCircle className="text-success" />
                          <div>
                            <small className="text-muted d-block">Pago ({resumo.pagas})</small>
                            <strong className="text-success">{formatCurrency(resumo.valorPago)}</strong>
                          </div>
                        </div>
                      </Card>
                    </Col>
                    <Col xs={6} lg={3}>
                      <Card className="border-0 bg-light text-center py-2">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <FiClock className="text-warning" />
                          <div>
                            <small className="text-muted d-block">Pendente ({resumo.pendentes})</small>
                            <strong className="text-warning">{formatCurrency(resumo.valorPendente)}</strong>
                          </div>
                        </div>
                      </Card>
                    </Col>
                    <Col xs={6} lg={3}>
                      <Card className="border-0 bg-light text-center py-2">
                        <div className="d-flex align-items-center justify-content-center gap-2">
                          <FiCalendar className="text-info" />
                          <div>
                            <small className="text-muted d-block">Total Parcelas</small>
                            <strong>{resumo.total}</strong>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                )}

                {hasProvisionamento && resumo && resumo.pendentes > 0 && (
                  <div className="mb-3">
                    <ProgressBar>
                      <ProgressBar variant="success" now={(resumo.pagas / resumo.total) * 100} label={`${resumo.pagas} pagas`} key="pagas" />
                      <ProgressBar variant="warning" now={(resumo.pendentes / resumo.total) * 100} label={`${resumo.pendentes} pend.`} key="pendentes" />
                      {resumo.canceladas > 0 && (
                        <ProgressBar variant="danger" now={(resumo.canceladas / resumo.total) * 100} label={`${resumo.canceladas} canc.`} key="canceladas" />
                      )}
                    </ProgressBar>
                  </div>
                )}

                <div className="d-flex gap-2 mb-3">
                  {!hasProvisionamento && (
                    <Button variant="success" size="sm" onClick={() => openProvisionarModal(expandedContrato)}>
                      <FiDollarSign className="me-1" /> Provisionar no Contas a Pagar
                    </Button>
                  )}
                  {hasProvisionamento && resumo && resumo.pendentes > 0 && (
                    <Button variant="outline-danger" size="sm" onClick={() => setConfirmCancelarProv(expandedContrato)}>
                      <FiXCircle className="me-1" /> Cancelar Pendentes
                    </Button>
                  )}
                </div>

                {hasProvisionamento ? (
                  <Table size="sm" striped hover responsive>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Descrição</th>
                        <th style={{ width: 130 }}>Vencimento</th>
                        <th style={{ width: 140 }}>Valor</th>
                        <th style={{ width: 130 }}>Pagamento</th>
                        <th style={{ width: 140 }}>Valor Pago</th>
                        <th style={{ width: 110 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasPagar.map((cp) => (
                        <tr key={cp.id}>
                          <td>{cp.parcelaAtual ?? '-'}/{cp.totalParcelas ?? '-'}</td>
                          <td>{cp.descricao}</td>
                          <td>{format(parseISO(cp.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}</td>
                          <td>{formatCurrency(cp.valor)}</td>
                          <td>{cp.dataPagamento ? format(parseISO(cp.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                          <td>{cp.valorPago != null ? formatCurrency(cp.valorPago) : '-'}</td>
                          <td><StatusBadge status={cp.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info" className="mb-0">
                    Este contrato ainda não possui contas a pagar provisionadas. Clique em <strong>"Provisionar no Contas a Pagar"</strong> para gerar automaticamente as parcelas durante a vigência do contrato.
                  </Alert>
                )}
              </>
            )}

            {/* === ABA PARCELAS === */}
            {detailTab === 'parcelas' && (
              <>
                <div className="mb-3">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => expandedContrato.id && gerarParcelasMutation.mutate(expandedContrato.id)}
                    disabled={gerarParcelasMutation.isPending}
                  >
                    {gerarParcelasMutation.isPending ? <Spinner size="sm" /> : 'Gerar Parcelas'}
                  </Button>
                </div>
                {(expandedContrato.parcelas?.length ?? 0) > 0 ? (
                  <Table size="sm" striped hover>
                    <thead><tr><th>#</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
                    <tbody>
                      {expandedContrato.parcelas!.map((p) => (
                        <tr key={p.id}>
                          <td>{p.numero}</td>
                          <td>{formatCurrency(p.valor)}</td>
                          <td>{p.dataVencimento ? format(parseISO(p.dataVencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                          <td><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p className="text-muted mb-0">Nenhuma parcela gerada.</p>
                )}
              </>
            )}

            {/* === ABA ADITIVOS === */}
            {detailTab === 'aditivos' && (
              <>
                <div className="mb-3">
                  <Button variant="outline-warning" size="sm" onClick={() => openAditivoModal(expandedContrato)}>
                    + Registrar Aditivo
                  </Button>
                </div>
                {(expandedContrato.aditivos?.length ?? 0) > 0 ? (
                  <Table size="sm" striped hover>
                    <thead><tr><th>Descrição</th><th>Novo Valor</th><th>Nova Vigência</th><th>Data</th></tr></thead>
                    <tbody>
                      {expandedContrato.aditivos!.map((a) => (
                        <tr key={a.id}>
                          <td>{a.descricao}</td>
                          <td>{a.novoValor != null ? formatCurrency(a.novoValor) : '-'}</td>
                          <td>{a.novaVigencia ? format(parseISO(a.novaVigencia), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                          <td>{a.dataCriacao ? format(parseISO(a.dataCriacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p className="text-muted mb-0">Nenhum aditivo registrado.</p>
                )}
              </>
            )}

            {/* === ABA ARQUIVOS === */}
            {detailTab === 'arquivos' && (
              <>
                <div className="mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="d-none"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                  />
                  <Button variant="outline-primary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <><Spinner size="sm" className="me-1" /> Enviando...</> : <><FiUpload className="me-1" /> Anexar Arquivo</>}
                  </Button>
                  {uploading && <ProgressBar animated now={100} className="mt-2" style={{ height: 4 }} />}
                </div>
                {(expandedContrato.arquivos?.length ?? 0) > 0 ? (
                  <Table size="sm" striped hover>
                    <thead><tr><th style={{ width: 30 }}></th><th>Nome</th><th style={{ width: 140 }}>Data</th><th style={{ width: 120 }}>Ações</th></tr></thead>
                    <tbody>
                      {expandedContrato.arquivos!.map((arq) => {
                        const ext = arq.nome.split('.').pop()?.toLowerCase() ?? '';
                        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                        const Icon = isImg ? FiImage : ext === 'pdf' ? FiFileText : FiFile;
                        return (
                          <tr key={arq.id}>
                            <td><Icon size={16} /></td>
                            <td>{arq.nome}</td>
                            <td>{arq.criadoEm ? format(parseISO(arq.criadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</td>
                            <td>
                              <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleDownload(arq)} title="Baixar"><FiDownload /></Button>
                              <Button variant="outline-danger" size="sm" onClick={() => setDeletingArquivo(arq)} title="Excluir"><FiTrash2 /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <p className="text-muted mb-0">Nenhum arquivo anexado.</p>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      )}

      {/* === MODAL CRIAR/EDITAR === */}
      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Contrato' : 'Novo Contrato'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Select {...register('tipo')} isInvalid={!!errors.tipo}>
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.tipo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Número *</Form.Label>
                  <Form.Control {...register('numero')} isInvalid={!!errors.numero} placeholder="CT-001" />
                  <Form.Control.Feedback type="invalid">{errors.numero?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Mensal *</Form.Label>
                  <Controller
                    name="valor"
                    control={control}
                    render={({ field }) => (
                      <Form.Control type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} isInvalid={!!errors.valor} />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.valor?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select {...register('status')}>
                    <option value="ABERTO">Aberto</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="ENCERRADO">Encerrado</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Descrição *</Form.Label>
              <Form.Control {...register('descricao')} isInvalid={!!errors.descricao} placeholder="Ex: Aluguel sede, Contrato de TI, etc." />
              <Form.Control.Feedback type="invalid">{errors.descricao?.message}</Form.Control.Feedback>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <SelectLabel label="Fornecedor" href="/fornecedores" />
                  <Controller
                    name="fornecedorId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(fornecedores ?? []).map((f) => <option key={f.id} value={f.id}>{f.razaoSocial}</option>)}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <SelectLabel label="Cliente" href="/clientes" />
                  <Controller
                    name="clienteId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vigência Início *</Form.Label>
                  <Form.Control type="date" {...register('vigenciaInicio')} isInvalid={!!errors.vigenciaInicio} />
                  <Form.Control.Feedback type="invalid">{errors.vigenciaInicio?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vigência Fim *</Form.Label>
                  <Form.Control type="date" {...register('vigenciaFim')} isInvalid={!!errors.vigenciaFim} />
                  <Form.Control.Feedback type="invalid">{errors.vigenciaFim?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Índice de Reajuste</Form.Label>
                  <Form.Select {...register('indiceReajuste')}>
                    <option value="">Nenhum</option>
                    <option value="IGPM">IGP-M</option>
                    <option value="IPCA">IPCA</option>
                    <option value="INPC">INPC</option>
                    <option value="SELIC">SELIC</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Percentual de Reajuste (%)</Form.Label>
                  <Controller
                    name="percentualReajuste"
                    control={control}
                    render={({ field }) => (
                      <Form.Control type="number" step="0.01" min="0" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Cláusulas / Observações</Form.Label>
              <Form.Control as="textarea" rows={3} {...register('clausulas')} placeholder="Condições gerais, multas, rescisão..." />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving && <Spinner size="sm" className="me-2" />}
              {editing ? 'Salvar' : 'Criar Contrato'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* === MODAL PROVISIONAR === */}
      <Modal show={showProvisionarModal} onHide={closeProvisionarModal} centered>
        <Form onSubmit={provisionarForm.handleSubmit((data) => provisionarMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Provisionar Contas a Pagar</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {provisionarContrato && (
              <Alert variant="info" className="mb-3">
                <strong>{provisionarContrato.numero}</strong> - {provisionarContrato.descricao}<br />
                <small>
                  Vigência: {provisionarContrato.vigenciaInicio ? format(parseISO(provisionarContrato.vigenciaInicio), 'dd/MM/yyyy') : ''} a {provisionarContrato.vigenciaFim ? format(parseISO(provisionarContrato.vigenciaFim), 'dd/MM/yyyy') : ''}
                  {' | '}Valor: {formatCurrency(provisionarContrato.valor)}
                </small>
              </Alert>
            )}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Recorrência *</Form.Label>
                  <Form.Select {...provisionarForm.register('recorrencia')}>
                    <option value="MENSAL">Mensal</option>
                    <option value="QUINZENAL">Quinzenal</option>
                    <option value="BIMESTRAL">Bimestral</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Dia do Vencimento</Form.Label>
                  <Controller
                    name="diaVencimento"
                    control={provisionarForm.control}
                    render={({ field }) => (
                      <Form.Control type="number" min="1" max="31" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor da Parcela</Form.Label>
                  <Controller
                    name="valorMensal"
                    control={provisionarForm.control}
                    render={({ field }) => (
                      <Form.Control type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    )}
                  />
                  <Form.Text className="text-muted">Deixe vazio para usar o valor do contrato</Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <SelectLabel label="Categoria" href="/categorias" linkText="Nova" />
                  <Controller
                    name="categoriaId"
                    control={provisionarForm.control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(categorias ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <SelectLabel label="Centro de Custo" href="/centros-custo" />
                  <Controller
                    name="centroCustoId"
                    control={provisionarForm.control}
                    render={({ field }) => (
                      <Form.Select {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}>
                        <option value="">Selecione...</option>
                        {(centrosCusto ?? []).map((cc) => <option key={cc.id} value={cc.id}>{cc.nome}</option>)}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeProvisionarModal} disabled={provisionarMutation.isPending}>Cancelar</Button>
            <Button variant="success" type="submit" disabled={provisionarMutation.isPending}>
              {provisionarMutation.isPending && <Spinner size="sm" className="me-2" />}
              Gerar Contas a Pagar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* === MODAL ADITIVO === */}
      <Modal show={showAditivoModal} onHide={closeAditivoModal} centered>
        <Form onSubmit={aditivoForm.handleSubmit((data) => aditivoMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Registrar Aditivo - {aditivoContrato?.numero}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Descrição *</Form.Label>
              <Form.Control as="textarea" rows={2} {...aditivoForm.register('descricao')} isInvalid={!!aditivoForm.formState.errors.descricao} />
              <Form.Control.Feedback type="invalid">{aditivoForm.formState.errors.descricao?.message}</Form.Control.Feedback>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Novo Valor</Form.Label>
                  <Controller
                    name="novoValor"
                    control={aditivoForm.control}
                    render={({ field }) => (
                      <Form.Control type="number" step="0.01" min="0" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    )}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nova Vigência Fim</Form.Label>
                  <Form.Control type="date" {...aditivoForm.register('novaVigencia')} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAditivoModal} disabled={aditivoMutation.isPending}>Cancelar</Button>
            <Button variant="warning" type="submit" disabled={aditivoMutation.isPending}>
              {aditivoMutation.isPending && <Spinner size="sm" className="me-2" />}
              Registrar Aditivo
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* === MODAIS DE CONFIRMAÇÃO === */}
      <ConfirmModal
        show={!!deleting}
        title="Cancelar Contrato"
        message={`Deseja realmente cancelar o contrato "${deleting?.numero} - ${deleting?.descricao}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        show={!!deletingArquivo}
        title="Excluir Arquivo"
        message={`Deseja realmente excluir o arquivo "${deletingArquivo?.nome}"?`}
        onConfirm={() => deletingArquivo && deleteArquivoMutation.mutate(deletingArquivo)}
        onCancel={() => setDeletingArquivo(null)}
        loading={deleteArquivoMutation.isPending}
      />

      <ConfirmModal
        show={!!confirmCancelarProv}
        title="Cancelar Provisionamento"
        message={`Deseja cancelar todas as contas a pagar PENDENTES do contrato "${confirmCancelarProv?.numero}"? Contas já pagas não serão afetadas.`}
        onConfirm={() => confirmCancelarProv?.id && cancelarProvMutation.mutate(confirmCancelarProv.id)}
        onCancel={() => setConfirmCancelarProv(null)}
        loading={cancelarProvMutation.isPending}
      />
    </>
  );
}
