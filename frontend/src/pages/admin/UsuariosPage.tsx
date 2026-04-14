import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get, post, put, del } from '../../services/api';

interface Usuario {
  id?: number;
  nome: string;
  email: string;
  telefone?: string;
  ativo: boolean;
}

interface ListResponse {
  success: boolean;
  data: Usuario[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const createSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().optional().default(''),
});

const editSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;
type FormData = CreateFormData | EditFormData;

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState<Usuario | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(editing ? editSchema : createSchema) as never,
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['usuarios', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/usuarios?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/usuarios', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário criado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar usuário.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data };
      if (!payload.senha) delete (payload as Record<string, unknown>).senha;
      return put(`/usuarios/${editing!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário atualizado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar usuário.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário excluído com sucesso!');
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir usuário.';
      toast.error(msg);
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ nome: '', email: '', senha: '', telefone: '' });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Usuario) => {
    setEditing(item);
    reset({
      nome: item.nome,
      email: item.email,
      senha: '',
      telefone: item.telefone ?? '',
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

  const columns: Column<Usuario>[] = [
    { header: 'Nome', accessor: 'nome' },
    { header: 'Email', accessor: 'email' },
    { header: 'Telefone', accessor: 'telefone' },
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
        <Col><h2 className="mb-0">Usuários</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Usuário</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Usuario>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar usuários..."
            emptyMessage="Nenhum usuário encontrado."
            actions={[
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit, icon: '✏️' },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row), icon: '🗑️' },
            ]}
          />
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Usuário' : 'Novo Usuário'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control {...register('nome')} isInvalid={!!errors.nome} />
              <Form.Control.Feedback type="invalid">{errors.nome?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" {...register('email')} isInvalid={!!errors.email} />
              <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{editing ? 'Senha (deixe vazio para manter)' : 'Senha *'}</Form.Label>
              <Form.Control type="password" {...register('senha')} isInvalid={!!errors.senha} />
              <Form.Control.Feedback type="invalid">{errors.senha?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Telefone</Form.Label>
              <Form.Control {...register('telefone')} />
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
        title="Excluir Usuário"
        message={`Deseja realmente excluir o usuário "${deleting?.nome}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
