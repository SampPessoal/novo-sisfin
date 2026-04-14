import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import CNPJCPFInput, { formatCNPJCPF } from '../../components/CNPJCPFInput';
import { get, post, put, del } from '../../services/api';

interface Empresa {
  id?: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  regimeTributario: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  logoUrl?: string;
  ativo: boolean;
}

interface ListResponse {
  success: boolean;
  data: Empresa[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const REGIME_LABELS: Record<string, string> = {
  SIMPLES: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
  MEI: 'MEI',
};

const schema = z.object({
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().optional().default(''),
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  regimeTributario: z.enum(['SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI'], { required_error: 'Regime é obrigatório' }),
  inscricaoEstadual: z.string().optional().default(''),
  inscricaoMunicipal: z.string().optional().default(''),
  endereco: z.string().optional().default(''),
  cidade: z.string().optional().default(''),
  estado: z.string().max(2, 'Máximo 2 caracteres').optional().default(''),
  cep: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  logoUrl: z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

export default function EmpresasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState<Empresa | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['empresas', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/empresas?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/empresas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Empresa criada com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar empresa.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/empresas/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Empresa atualizada com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar empresa.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/empresas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Empresa excluída com sucesso!');
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir empresa.';
      toast.error(msg);
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({
      razaoSocial: '', nomeFantasia: '', cnpj: '', regimeTributario: 'SIMPLES',
      inscricaoEstadual: '', inscricaoMunicipal: '', endereco: '',
      cidade: '', estado: '', cep: '', telefone: '', email: '', logoUrl: '',
    });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Empresa) => {
    setEditing(item);
    reset({
      razaoSocial: item.razaoSocial,
      nomeFantasia: item.nomeFantasia ?? '',
      cnpj: item.cnpj,
      regimeTributario: item.regimeTributario as 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI',
      inscricaoEstadual: item.inscricaoEstadual ?? '',
      inscricaoMunicipal: item.inscricaoMunicipal ?? '',
      endereco: item.endereco ?? '',
      cidade: item.cidade ?? '',
      estado: item.estado ?? '',
      cep: item.cep ?? '',
      telefone: item.telefone ?? '',
      email: item.email ?? '',
      logoUrl: item.logoUrl ?? '',
    });
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

  const columns: Column<Empresa>[] = [
    { header: 'Razão Social', accessor: 'razaoSocial' },
    { header: 'CNPJ', accessor: 'cnpj', render: (row) => formatCNPJCPF(row.cnpj || '') },
    {
      header: 'Regime Tributário',
      accessor: 'regimeTributario',
      render: (row) => (
        <Badge bg="info">{REGIME_LABELS[row.regimeTributario] ?? row.regimeTributario}</Badge>
      ),
    },
    {
      header: 'Cidade/UF',
      accessor: 'cidade',
      render: (row) => row.cidade && row.estado ? `${row.cidade}/${row.estado}` : row.cidade || '',
    },
    {
      header: 'Ativo',
      accessor: 'ativo',
      render: (row) => (
        <Badge bg={row.ativo ? 'success' : 'secondary'}>
          {row.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Empresas</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Nova Empresa</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Empresa>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar empresas..."
            emptyMessage="Nenhuma empresa encontrada."
            actions={[
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit, icon: '✏️' },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row), icon: '🗑️' },
            ]}
          />
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Empresa' : 'Nova Empresa'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Razão Social *</Form.Label>
                  <Form.Control {...register('razaoSocial')} isInvalid={!!errors.razaoSocial} />
                  <Form.Control.Feedback type="invalid">{errors.razaoSocial?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Controller
                    name="cnpj"
                    control={control}
                    render={({ field }) => (
                      <CNPJCPFInput
                        label="CNPJ *"
                        value={field.value}
                        onChange={field.onChange}
                        isInvalid={!!errors.cnpj}
                        error={errors.cnpj?.message}
                      />
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome Fantasia</Form.Label>
                  <Form.Control {...register('nomeFantasia')} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Regime Tributário *</Form.Label>
                  <Form.Select {...register('regimeTributario')} isInvalid={!!errors.regimeTributario}>
                    <option value="SIMPLES">Simples Nacional</option>
                    <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                    <option value="LUCRO_REAL">Lucro Real</option>
                    <option value="MEI">MEI</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.regimeTributario?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control {...register('telefone')} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Endereço</Form.Label>
                  <Form.Control {...register('endereco')} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>CEP</Form.Label>
                  <Form.Control {...register('cep')} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Cidade</Form.Label>
                  <Form.Control {...register('cidade')} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Control {...register('estado')} maxLength={2} isInvalid={!!errors.estado} />
                  <Form.Control.Feedback type="invalid">{errors.estado?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" {...register('email')} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Logo URL</Form.Label>
                  <Form.Control {...register('logoUrl')} placeholder="https://..." />
                </Form.Group>
              </Col>
            </Row>
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
        title="Excluir Empresa"
        message={`Deseja realmente excluir a empresa "${deleting?.razaoSocial}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
