import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Modal, Spinner, Tab, Nav, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { BsSearch, BsBuilding, BsGeoAlt, BsTelephone, BsBank, BsReceipt } from 'react-icons/bs';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import CNPJCPFInput, { formatCNPJCPF, validateCNPJCPF } from '../../components/CNPJCPFInput';
import PhoneInput from '../../components/PhoneInput';
import FornecedorContatos from '../../components/FornecedorContatos';
import FornecedorEnderecos from '../../components/FornecedorEnderecos';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get, post, put, del } from '../../services/api';

interface Fornecedor {
  id?: number;
  tipo?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpjCpf: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  regimeTributario?: string;
  contribuinteIcms?: string;
  segmento?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  celular?: string;
  whatsapp?: string;
  email?: string;
  emailFinanceiro?: string;
  contatoPrincipal?: string;
  website?: string;
  banco?: string;
  nomeBanco?: string;
  agencia?: string;
  contaBancaria?: string;
  tipoConta?: string;
  chavePix?: string;
  tipoChavePix?: string;
  titularConta?: string;
  retIss?: boolean;
  retIrrf?: boolean;
  retPis?: boolean;
  retCofins?: boolean;
  retCsll?: boolean;
  retInss?: boolean;
  condicaoPagamento?: string;
  observacoes?: string;
  [key: string]: unknown;
}

interface ListResponse {
  success: boolean;
  data: Fornecedor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 5) return digits;
  return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2');
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const BANCOS = [
  { cod: '001', nome: 'Banco do Brasil' }, { cod: '033', nome: 'Santander' },
  { cod: '104', nome: 'Caixa Econômica' }, { cod: '237', nome: 'Bradesco' },
  { cod: '341', nome: 'Itaú Unibanco' }, { cod: '077', nome: 'Banco Inter' },
  { cod: '260', nome: 'Nu Pagamentos (Nubank)' }, { cod: '336', nome: 'C6 Bank' },
  { cod: '212', nome: 'Banco Original' }, { cod: '756', nome: 'Sicoob' },
  { cod: '748', nome: 'Sicredi' }, { cod: '422', nome: 'Safra' },
  { cod: '070', nome: 'BRB' }, { cod: '085', nome: 'AILOS' },
];

const schema = z.object({
  tipo: z.string().default('PJ'),
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().optional().default(''),
  cnpjCpf: z.string().min(1, 'CNPJ/CPF é obrigatório').refine(
    (val) => { const d = val.replace(/\D/g, ''); return d.length === 11 || d.length === 14; },
    'CPF deve ter 11 dígitos ou CNPJ 14 dígitos'
  ).refine((val) => validateCNPJCPF(val), 'CNPJ/CPF inválido'),
  inscricaoEstadual: z.string().optional().default(''),
  inscricaoMunicipal: z.string().optional().default(''),
  regimeTributario: z.string().optional().default(''),
  contribuinteIcms: z.string().optional().default(''),
  segmento: z.string().optional().default(''),
  cep: z.string().optional().default(''),
  logradouro: z.string().optional().default(''),
  numero: z.string().optional().default(''),
  complemento: z.string().optional().default(''),
  bairro: z.string().optional().default(''),
  cidade: z.string().optional().default(''),
  estado: z.string().max(2, 'Máximo 2 caracteres').optional().default(''),
  telefone: z.string().optional().default(''),
  celular: z.string().optional().default(''),
  whatsapp: z.string().optional().default(''),
  email: z.string().optional().default(''),
  emailFinanceiro: z.string().optional().default(''),
  contatoPrincipal: z.string().optional().default(''),
  website: z.string().optional().default(''),
  banco: z.string().optional().default(''),
  nomeBanco: z.string().optional().default(''),
  agencia: z.string().optional().default(''),
  contaBancaria: z.string().optional().default(''),
  tipoConta: z.string().optional().default(''),
  chavePix: z.string().optional().default(''),
  tipoChavePix: z.string().optional().default(''),
  titularConta: z.string().optional().default(''),
  retIss: z.boolean().default(false),
  retIrrf: z.boolean().default(false),
  retPis: z.boolean().default(false),
  retCofins: z.boolean().default(false),
  retCsll: z.boolean().default(false),
  retInss: z.boolean().default(false),
  condicaoPagamento: z.string().optional().default(''),
  observacoes: z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

const EMPTY_FORM: FormData = {
  tipo: 'PJ', razaoSocial: '', nomeFantasia: '', cnpjCpf: '', inscricaoEstadual: '',
  inscricaoMunicipal: '', regimeTributario: '', contribuinteIcms: '', segmento: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  telefone: '', celular: '', whatsapp: '', email: '', emailFinanceiro: '',
  contatoPrincipal: '', website: '',
  banco: '', nomeBanco: '', agencia: '', contaBancaria: '', tipoConta: '',
  chavePix: '', tipoChavePix: '', titularConta: '',
  retIss: false, retIrrf: false, retPis: false, retCofins: false, retCsll: false, retInss: false,
  condicaoPagamento: '', observacoes: '',
};

export default function FornecedoresPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [deleting, setDeleting] = useState<Fornecedor | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [activeTab, setActiveTab] = useState('cadastral');

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });

  const tipoPessoa = watch('tipo');

  const buscarCEP = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await resp.json();
      if (data.erro) { toast.warn('CEP não encontrado'); return; }
      if (data.logradouro) setValue('logradouro', data.logradouro);
      if (data.bairro) setValue('bairro', data.bairro);
      if (data.localidade) setValue('cidade', data.localidade);
      if (data.uf) setValue('estado', data.uf);
      toast.info('Endereço preenchido!');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  }, [setValue]);

  const handleBancoChange = useCallback((cod: string) => {
    setValue('banco', cod);
    const b = BANCOS.find(x => x.cod === cod);
    setValue('nomeBanco', b?.nome ?? '');
  }, [setValue]);

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fornecedores', page, search],
    queryFn: async () => {
      const { data: resp } = await get<ListResponse>(`/fornecedores?page=${page}&pageSize=20&search=${search}`);
      return resp;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/fornecedores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor criado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar fornecedor.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/fornecedores/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor atualizado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar fornecedor.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/fornecedores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor excluído com sucesso!');
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir fornecedor.';
      toast.error(msg);
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset(EMPTY_FORM);
    setActiveTab('cadastral');
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Fornecedor) => {
    setEditing(item);
    reset({
      tipo: item.tipo ?? 'PJ',
      razaoSocial: item.razaoSocial ?? '',
      nomeFantasia: item.nomeFantasia ?? '',
      cnpjCpf: item.cnpjCpf ?? '',
      inscricaoEstadual: item.inscricaoEstadual ?? '',
      inscricaoMunicipal: item.inscricaoMunicipal ?? '',
      regimeTributario: item.regimeTributario ?? '',
      contribuinteIcms: item.contribuinteIcms ?? '',
      segmento: item.segmento ?? '',
      cep: item.cep ?? '',
      logradouro: item.logradouro ?? '',
      numero: item.numero ?? '',
      complemento: item.complemento ?? '',
      bairro: item.bairro ?? '',
      cidade: item.cidade ?? '',
      estado: item.estado ?? '',
      telefone: item.telefone ?? '',
      celular: item.celular ?? '',
      whatsapp: item.whatsapp ?? '',
      email: item.email ?? '',
      emailFinanceiro: item.emailFinanceiro ?? '',
      contatoPrincipal: item.contatoPrincipal ?? '',
      website: item.website ?? '',
      banco: item.banco ?? '',
      nomeBanco: item.nomeBanco ?? '',
      agencia: item.agencia ?? '',
      contaBancaria: item.contaBancaria ?? '',
      tipoConta: item.tipoConta ?? '',
      chavePix: item.chavePix ?? '',
      tipoChavePix: item.tipoChavePix ?? '',
      titularConta: item.titularConta ?? '',
      retIss: item.retIss ?? false,
      retIrrf: item.retIrrf ?? false,
      retPis: item.retPis ?? false,
      retCofins: item.retCofins ?? false,
      retCsll: item.retCsll ?? false,
      retInss: item.retInss ?? false,
      condicaoPagamento: item.condicaoPagamento ?? '',
      observacoes: item.observacoes ?? '',
    });
    setActiveTab('cadastral');
    setShowModal(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditing(null);
  }, []);

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Fornecedor>[] = [
    {
      header: 'Razão Social',
      accessor: 'razaoSocial',
      render: (row) => (
        <div>
          <Link to={`/fornecedores/${row.id}`} className="fw-medium">{row.razaoSocial}</Link>
          {row.nomeFantasia && <div className="text-muted small">{row.nomeFantasia}</div>}
        </div>
      ),
    },
    {
      header: 'CNPJ/CPF',
      accessor: 'cnpjCpf',
      render: (row) => (
        <div>
          <span>{formatCNPJCPF(row.cnpjCpf || '')}</span>
          <Badge bg={row.tipo === 'PF' ? 'info' : 'secondary'} className="ms-2" style={{ fontSize: '0.65rem' }}>
            {row.tipo ?? 'PJ'}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Cidade/UF',
      accessor: 'cidade',
      render: (row) => row.cidade && row.estado ? `${row.cidade}/${row.estado}` : row.cidade || '',
    },
    {
      header: 'Contato',
      accessor: 'telefone',
      render: (row) => (
        <div>
          {row.telefone && <div className="small">{formatPhone(row.telefone)}</div>}
          {row.email && <div className="small text-muted">{row.email}</div>}
        </div>
      ),
    },
    {
      header: 'Segmento',
      accessor: 'segmento',
      render: (row) => row.segmento ? <Badge bg="light" text="dark">{row.segmento}</Badge> : '',
    },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Fornecedores</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Fornecedor</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Fornecedor>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar por razão social, CNPJ ou nome fantasia..."
            emptyMessage="Nenhum fornecedor encontrado."
            actions={[
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row) },
            ]}
          />
        </Card.Body>
      </Card>

      {/* ==================== MODAL COM ABAS ==================== */}
      <Modal show={showModal} onHide={closeModal} size="xl" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ minHeight: '450px' }}>
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k ?? 'cadastral')}>
              <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                  <Nav.Link eventKey="cadastral" className="d-flex align-items-center gap-1">
                    <BsBuilding /> Cadastral
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="endereco" className="d-flex align-items-center gap-1">
                    <BsGeoAlt /> Endereço
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="contatos" className="d-flex align-items-center gap-1">
                    <BsTelephone /> Contatos
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="bancario" className="d-flex align-items-center gap-1">
                    <BsBank /> Bancário
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="fiscal" className="d-flex align-items-center gap-1">
                    <BsReceipt /> Fiscal
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>
                {/* ===== ABA CADASTRAL ===== */}
                <Tab.Pane eventKey="cadastral">
                  <Row>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo *</Form.Label>
                        <Form.Select {...register('tipo')}>
                          <option value="PJ">Pessoa Jurídica</option>
                          <option value="PF">Pessoa Física</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>{tipoPessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}</Form.Label>
                        <Form.Control {...register('razaoSocial')} isInvalid={!!errors.razaoSocial} />
                        <Form.Control.Feedback type="invalid">{errors.razaoSocial?.message}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Controller
                          name="cnpjCpf"
                          control={control}
                          render={({ field }) => (
                            <CNPJCPFInput
                              label={tipoPessoa === 'PF' ? 'CPF *' : 'CNPJ *'}
                              value={field.value}
                              onChange={field.onChange}
                              isInvalid={!!errors.cnpjCpf}
                              error={errors.cnpjCpf?.message}
                            />
                          )}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>{tipoPessoa === 'PF' ? 'Apelido' : 'Nome Fantasia'}</Form.Label>
                        <Form.Control {...register('nomeFantasia')} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Inscrição Estadual</Form.Label>
                        <Form.Control {...register('inscricaoEstadual')} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Inscrição Municipal</Form.Label>
                        <Form.Control {...register('inscricaoMunicipal')} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Regime Tributário</Form.Label>
                        <Form.Select {...register('regimeTributario')}>
                          <option value="">Selecione...</option>
                          <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                          <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                          <option value="LUCRO_REAL">Lucro Real</option>
                          <option value="MEI">MEI</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Contribuinte ICMS</Form.Label>
                        <Form.Select {...register('contribuinteIcms')}>
                          <option value="">Selecione...</option>
                          <option value="CONTRIBUINTE">Contribuinte</option>
                          <option value="NAO_CONTRIBUINTE">Não Contribuinte</option>
                          <option value="ISENTO">Isento</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Segmento</Form.Label>
                        <Form.Select {...register('segmento')}>
                          <option value="">Selecione...</option>
                          <option value="Serviços">Serviços</option>
                          <option value="Materiais">Materiais</option>
                          <option value="Aluguel">Aluguel</option>
                          <option value="Energia/Água/Gás">Energia / Água / Gás</option>
                          <option value="Telecomunicações">Telecomunicações</option>
                          <option value="Tecnologia">Tecnologia</option>
                          <option value="Alimentação">Alimentação</option>
                          <option value="Transporte">Transporte</option>
                          <option value="Saúde">Saúde</option>
                          <option value="Seguros">Seguros</option>
                          <option value="Governo">Governo</option>
                          <option value="Outros">Outros</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Condição de Pagamento</Form.Label>
                        <Form.Select {...register('condicaoPagamento')}>
                          <option value="">Selecione...</option>
                          <option value="A_VISTA">À Vista</option>
                          <option value="7">7 dias</option>
                          <option value="15">15 dias</option>
                          <option value="30">30 dias</option>
                          <option value="30_60">30/60 dias</option>
                          <option value="30_60_90">30/60/90 dias</option>
                          <option value="PERSONALIZADO">Personalizado</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>Observações</Form.Label>
                        <Form.Control as="textarea" rows={2} {...register('observacoes')} />
                      </Form.Group>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* ===== ABA ENDEREÇO ===== */}
                <Tab.Pane eventKey="endereco">
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>CEP</Form.Label>
                        <Controller
                          name="cep"
                          control={control}
                          render={({ field }) => (
                            <div className="input-group">
                              <Form.Control
                                type="text"
                                value={formatCEP(field.value ?? '')}
                                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                onBlur={() => buscarCEP(field.value ?? '')}
                                placeholder="00000-000"
                                maxLength={9}
                              />
                              <Button
                                variant="outline-secondary"
                                onClick={() => buscarCEP(field.value ?? '')}
                                disabled={buscandoCep}
                                title="Buscar CEP"
                              >
                                {buscandoCep ? <Spinner size="sm" /> : <BsSearch />}
                              </Button>
                            </div>
                          )}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label>Logradouro</Form.Label>
                        <Form.Control {...register('logradouro')} placeholder="Rua, Avenida, Alameda..." />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Número</Form.Label>
                        <Form.Control {...register('numero')} placeholder="Nº" />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Complemento</Form.Label>
                        <Form.Control {...register('complemento')} placeholder="Sala, Andar..." />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Bairro</Form.Label>
                        <Form.Control {...register('bairro')} />
                      </Form.Group>
                    </Col>
                    <Col md={5}>
                      <Form.Group className="mb-3">
                        <Form.Label>Cidade</Form.Label>
                        <Form.Control {...register('cidade')} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Estado</Form.Label>
                        <Form.Select {...register('estado')}>
                          <option value="">UF</option>
                          {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  {editing?.id && (
                    <>
                      <hr />
                      <FornecedorEnderecos fornecedorId={editing.id} />
                    </>
                  )}
                  {!editing?.id && (
                    <div className="text-muted small text-center py-3 border rounded bg-light mt-2">
                      Salve o fornecedor primeiro para adicionar endereços adicionais.
                    </div>
                  )}
                </Tab.Pane>

                {/* ===== ABA CONTATOS ===== */}
                <Tab.Pane eventKey="contatos">
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nome do Contato Principal</Form.Label>
                        <Form.Control {...register('contatoPrincipal')} placeholder="Responsável pelo contato" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Website</Form.Label>
                        <Form.Control {...register('website')} placeholder="https://www.exemplo.com.br" />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Controller
                          name="telefone"
                          control={control}
                          render={({ field }) => (
                            <PhoneInput label="Telefone Fixo" value={field.value ?? ''} onChange={field.onChange} />
                          )}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Controller
                          name="celular"
                          control={control}
                          render={({ field }) => (
                            <PhoneInput label="Celular" value={field.value ?? ''} onChange={field.onChange} />
                          )}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Controller
                          name="whatsapp"
                          control={control}
                          render={({ field }) => (
                            <PhoneInput label="WhatsApp" value={field.value ?? ''} onChange={field.onChange} />
                          )}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email Principal</Form.Label>
                        <Form.Control type="email" {...register('email')} placeholder="contato@empresa.com.br" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email Financeiro</Form.Label>
                        <Form.Control type="email" {...register('emailFinanceiro')} placeholder="financeiro@empresa.com.br" />
                      </Form.Group>
                    </Col>
                  </Row>

                  {editing?.id && (
                    <>
                      <hr />
                      <FornecedorContatos fornecedorId={editing.id} />
                    </>
                  )}
                  {!editing?.id && (
                    <div className="text-muted small text-center py-3 border rounded bg-light mt-2">
                      Salve o fornecedor primeiro para adicionar contatos adicionais.
                    </div>
                  )}
                </Tab.Pane>

                {/* ===== ABA BANCÁRIO ===== */}
                <Tab.Pane eventKey="bancario">
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Banco</Form.Label>
                        <Form.Select
                          value={watch('banco') ?? ''}
                          onChange={(e) => handleBancoChange(e.target.value)}
                        >
                          <option value="">Selecione o banco...</option>
                          {BANCOS.map(b => (
                            <option key={b.cod} value={b.cod}>{b.cod} - {b.nome}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Agência</Form.Label>
                        <Form.Control {...register('agencia')} placeholder="0000" />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Conta</Form.Label>
                        <Form.Control {...register('contaBancaria')} placeholder="00000-0" />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo</Form.Label>
                        <Form.Select {...register('tipoConta')}>
                          <option value="">-</option>
                          <option value="CC">Corrente</option>
                          <option value="CP">Poupança</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Titular da Conta</Form.Label>
                        <Form.Control {...register('titularConta')} placeholder="Nome conforme cadastro no banco" />
                      </Form.Group>
                    </Col>
                  </Row>
                  <hr />
                  <h6 className="mb-3">Chave PIX</h6>
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo da Chave</Form.Label>
                        <Form.Select {...register('tipoChavePix')}>
                          <option value="">Selecione...</option>
                          <option value="CPF">CPF</option>
                          <option value="CNPJ">CNPJ</option>
                          <option value="EMAIL">E-mail</option>
                          <option value="TELEFONE">Telefone</option>
                          <option value="ALEATORIA">Chave Aleatória</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={9}>
                      <Form.Group className="mb-3">
                        <Form.Label>Chave PIX</Form.Label>
                        <Form.Control {...register('chavePix')} placeholder="Informe a chave PIX" />
                      </Form.Group>
                    </Col>
                  </Row>
                </Tab.Pane>

                {/* ===== ABA FISCAL ===== */}
                <Tab.Pane eventKey="fiscal">
                  <h6 className="mb-3">Retenções Tributárias</h6>
                  <p className="text-muted small mb-3">
                    Marque os tributos que devem ser retidos nos pagamentos a este fornecedor.
                  </p>
                  <Row>
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="retIss"
                        label="Reter ISS"
                        {...register('retIss')}
                        className="mb-3"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="retIrrf"
                        label="Reter IRRF"
                        {...register('retIrrf')}
                        className="mb-3"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="retInss"
                        label="Reter INSS"
                        {...register('retInss')}
                        className="mb-3"
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="retPis"
                        label="Reter PIS"
                        {...register('retPis')}
                        className="mb-3"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="retCofins"
                        label="Reter COFINS"
                        {...register('retCofins')}
                        className="mb-3"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="retCsll"
                        label="Reter CSLL"
                        {...register('retCsll')}
                        className="mb-3"
                      />
                    </Col>
                  </Row>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving && <Spinner size="sm" className="me-2" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!deleting}
        title="Excluir Fornecedor"
        message={`Deseja realmente excluir o fornecedor "${deleting?.razaoSocial}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
