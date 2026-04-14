import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import { get, post, put, del } from '../../services/api';

interface Categoria {
  id?: number;
  nome: string;
  tipo: 'CP' | 'CR' | 'AMBOS';
  grupoDRE?: string;
  ativo?: boolean;
}

interface ListResponse {
  success: boolean;
  data: Categoria[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const tipoLabels: Record<string, string> = {
  CP: 'Contas a Pagar',
  CR: 'Contas a Receber',
  AMBOS: 'Ambos',
};

const tipoBadgeVariant: Record<string, string> = {
  CP: 'danger',
  CR: 'success',
  AMBOS: 'info',
};

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['CP', 'CR', 'AMBOS'], { required_error: 'Tipo é obrigatório' }),
  grupoDRE: z.string().optional().default(''),
});

type FormData = z.infer<typeof schema>;

export default function CategoriasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [deleting, setDeleting] = useState<Categoria | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['categorias', page, search],
    queryFn: async () => {
      const { data: resp } = await get<ListResponse>(`/categorias?page=${page}&pageSize=20&search=${search}`);
      return resp;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/categorias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria criada com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar categoria.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/categorias/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria atualizada com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar categoria.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/categorias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria excluída com sucesso!');
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir categoria.';
      toast.error(msg);
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ nome: '', tipo: 'CP', grupoDRE: '' });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Categoria) => {
    setEditing(item);
    reset({
      nome: item.nome,
      tipo: item.tipo,
      grupoDRE: item.grupoDRE ?? '',
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

  const columns: Column<Categoria>[] = [
    { header: 'Nome', accessor: 'nome' },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (row) => (
        <Badge bg={tipoBadgeVariant[row.tipo] ?? 'secondary'}>
          {tipoLabels[row.tipo] ?? row.tipo}
        </Badge>
      ),
    },
    { header: 'Grupo DRE', accessor: 'grupoDRE' },
    {
      header: 'Status',
      accessor: 'ativo',
      render: (row) => (
        <Badge bg={row.ativo !== false ? 'success' : 'secondary'}>
          {row.ativo !== false ? 'Ativo' : 'Inativo'}
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
        <Col><h2 className="mb-0">Categorias</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Nova Categoria</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Categoria>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar categorias..."
            emptyMessage="Nenhuma categoria encontrada."
            actions={[
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row) },
            ]}
          />
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Categoria' : 'Nova Categoria'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control {...register('nome')} isInvalid={!!errors.nome} />
              <Form.Control.Feedback type="invalid">{errors.nome?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo *</Form.Label>
              <Form.Select {...register('tipo')} isInvalid={!!errors.tipo}>
                <option value="CP">Contas a Pagar</option>
                <option value="CR">Contas a Receber</option>
                <option value="AMBOS">Ambos</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.tipo?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Grupo DRE</Form.Label>
              <Form.Control {...register('grupoDRE')} />
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
        title="Excluir Categoria"
        message={`Deseja realmente excluir a categoria "${deleting?.nome}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
