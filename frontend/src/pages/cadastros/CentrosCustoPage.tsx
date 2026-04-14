import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import { get, post, put, del } from '../../services/api';

interface CentroCusto {
  id?: number;
  codigo: string;
  nome: string;
  ativo?: boolean;
}

interface ListResponse {
  success: boolean;
  data: CentroCusto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const schema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
});

type FormData = z.infer<typeof schema>;

export default function CentrosCustoPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CentroCusto | null>(null);
  const [deleting, setDeleting] = useState<CentroCusto | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['centros-custo', page, search],
    queryFn: async () => {
      const { data: resp } = await get<ListResponse>(`/centros-custo?page=${page}&pageSize=20&search=${search}`);
      return resp;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/centros-custo', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      toast.success('Centro de custo criado com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao criar centro de custo.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/centros-custo/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      toast.success('Centro de custo atualizado com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao atualizar centro de custo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/centros-custo/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      toast.success('Centro de custo excluído com sucesso!');
      setDeleting(null);
    },
    onError: () => toast.error('Erro ao excluir centro de custo.'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ codigo: '', nome: '' });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: CentroCusto) => {
    setEditing(item);
    reset({ codigo: item.codigo, nome: item.nome });
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

  const columns: Column<CentroCusto>[] = [
    { header: 'Código', accessor: 'codigo', width: '150px' },
    { header: 'Nome', accessor: 'nome' },
    {
      header: 'Status',
      accessor: 'ativo',
      width: '120px',
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

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Centros de Custo</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Centro de Custo</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<CentroCusto>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar centros de custo..."
            emptyMessage="Nenhum centro de custo encontrado."
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
            <Modal.Title>{editing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Código *</Form.Label>
              <Form.Control {...register('codigo')} isInvalid={!!errors.codigo} />
              <Form.Control.Feedback type="invalid">{errors.codigo?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nome *</Form.Label>
              <Form.Control {...register('nome')} isInvalid={!!errors.nome} />
              <Form.Control.Feedback type="invalid">{errors.nome?.message}</Form.Control.Feedback>
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
        title="Excluir Centro de Custo"
        message={`Deseja realmente excluir o centro de custo "${deleting?.nome}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
