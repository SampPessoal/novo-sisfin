import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import CNPJCPFInput, { formatCNPJCPF } from '../../components/CNPJCPFInput';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get, post, put, del } from '../../services/api';

interface Cliente {
  id?: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpjCpf: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
}

interface ListResponse {
  success: boolean;
  data: Cliente[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const schema = z.object({
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().optional().default(''),
  cnpjCpf: z.string().min(1, 'CNPJ/CPF é obrigatório'),
  inscricaoEstadual: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
  endereco: z.string().optional().default(''),
  cidade: z.string().optional().default(''),
  estado: z.string().max(2, 'Máximo 2 caracteres').optional().default(''),
  cep: z.string().optional().default(''),
  observacoes: z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState<Cliente | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clientes', page, search],
    queryFn: async () => {
      const { data: resp } = await get<ListResponse>(`/clientes?page=${page}&pageSize=20&search=${search}`);
      return resp;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/clientes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente criado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar cliente.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/clientes/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente atualizado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar cliente.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/clientes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente excluído com sucesso!');
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir cliente.';
      toast.error(msg);
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ razaoSocial: '', nomeFantasia: '', cnpjCpf: '', inscricaoEstadual: '', email: '', telefone: '', endereco: '', cidade: '', estado: '', cep: '', observacoes: '' });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Cliente) => {
    setEditing(item);
    reset({
      razaoSocial: item.razaoSocial,
      nomeFantasia: item.nomeFantasia ?? '',
      cnpjCpf: item.cnpjCpf,
      inscricaoEstadual: item.inscricaoEstadual ?? '',
      email: item.email ?? '',
      telefone: item.telefone ?? '',
      endereco: item.endereco ?? '',
      cidade: item.cidade ?? '',
      estado: item.estado ?? '',
      cep: item.cep ?? '',
      observacoes: item.observacoes ?? '',
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

  const columns: Column<Cliente>[] = [
    {
      header: 'Razão Social',
      accessor: 'razaoSocial',
      render: (row) => <Link to={`/clientes/${row.id}`}>{row.razaoSocial}</Link>,
    },
    { header: 'CNPJ/CPF', accessor: 'cnpjCpf', render: (row) => formatCNPJCPF(row.cnpjCpf || '') },
    {
      header: 'Cidade/UF',
      accessor: 'cidade',
      render: (row) => row.cidade && row.estado ? `${row.cidade}/${row.estado}` : row.cidade || '',
    },
    { header: 'Telefone', accessor: 'telefone' },
    { header: 'Email', accessor: 'email' },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Clientes</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Cliente</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Cliente>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar clientes..."
            emptyMessage="Nenhum cliente encontrado."
            actions={[
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row) },
            ]}
          />
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Cliente' : 'Novo Cliente'}</Modal.Title>
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
                    name="cnpjCpf"
                    control={control}
                    render={({ field }) => (
                      <CNPJCPFInput
                        label="CNPJ/CPF *"
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
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome Fantasia</Form.Label>
                  <Form.Control {...register('nomeFantasia')} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Inscrição Estadual</Form.Label>
                  <Form.Control {...register('inscricaoEstadual')} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" {...register('email')} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control {...register('telefone')} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Endereço</Form.Label>
              <Form.Control {...register('endereco')} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cidade</Form.Label>
                  <Form.Control {...register('cidade')} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Control {...register('estado')} maxLength={2} isInvalid={!!errors.estado} />
                  <Form.Control.Feedback type="invalid">{errors.estado?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>CEP</Form.Label>
                  <Form.Control {...register('cep')} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control as="textarea" rows={3} {...register('observacoes')} />
            </Form.Group>
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
        title="Excluir Cliente"
        message={`Deseja realmente excluir o cliente "${deleting?.razaoSocial}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
