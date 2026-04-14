import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import { get, post, put, del } from '../../services/api';

interface ContaBancaria {
  id?: number;
  banco: string;
  nomeBanco: string;
  agencia: string;
  conta: string;
  tipoConta?: 'CORRENTE' | 'POUPANCA';
  saldoInicial?: number;
}

interface ListResponse {
  success: boolean;
  data: ContaBancaria[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const formatCurrency = (value: number | undefined | null): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const tipoContaLabels: Record<string, string> = {
  CORRENTE: 'Corrente',
  POUPANCA: 'Poupança',
};

const schema = z.object({
  banco: z.string().min(1, 'Banco é obrigatório'),
  nomeBanco: z.string().min(1, 'Nome do banco é obrigatório'),
  agencia: z.string().min(1, 'Agência é obrigatória'),
  conta: z.string().min(1, 'Conta é obrigatória'),
  tipoConta: z.enum(['CORRENTE', 'POUPANCA']).optional().default('CORRENTE'),
  saldoInicial: z.coerce.number().default(0),
});

type FormData = z.infer<typeof schema>;

export default function ContasBancariasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ContaBancaria | null>(null);
  const [deleting, setDeleting] = useState<ContaBancaria | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['contas-bancarias', page, search],
    queryFn: async () => {
      const { data: resp } = await get<ListResponse>(`/contas-bancarias?page=${page}&pageSize=20&search=${search}`);
      return resp;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/contas-bancarias', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success('Conta bancária criada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao criar conta bancária.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/contas-bancarias/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success('Conta bancária atualizada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao atualizar conta bancária.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/contas-bancarias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      toast.success('Conta bancária excluída com sucesso!');
      setDeleting(null);
    },
    onError: () => toast.error('Erro ao excluir conta bancária.'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ banco: '', nomeBanco: '', agencia: '', conta: '', tipoConta: 'CORRENTE', saldoInicial: 0 });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: ContaBancaria) => {
    setEditing(item);
    reset({
      banco: item.banco,
      nomeBanco: item.nomeBanco,
      agencia: item.agencia,
      conta: item.conta,
      tipoConta: item.tipoConta ?? 'CORRENTE',
      saldoInicial: item.saldoInicial ?? 0,
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

  const columns: Column<ContaBancaria>[] = [
    { header: 'Banco', accessor: 'nomeBanco' },
    { header: 'Agência', accessor: 'agencia', width: '120px' },
    { header: 'Conta', accessor: 'conta', width: '140px' },
    {
      header: 'Tipo',
      accessor: 'tipoConta',
      width: '120px',
      render: (row) => row.tipoConta ? tipoContaLabels[row.tipoConta] ?? row.tipoConta : '',
    },
    {
      header: 'Saldo Inicial',
      accessor: 'saldoInicial',
      width: '160px',
      render: (row) => formatCurrency(row.saldoInicial),
    },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Contas Bancárias</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Nova Conta Bancária</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<ContaBancaria>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar contas bancárias..."
            emptyMessage="Nenhuma conta bancária encontrada."
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
            <Modal.Title>{editing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Código do Banco *</Form.Label>
                  <Form.Control {...register('banco')} isInvalid={!!errors.banco} />
                  <Form.Control.Feedback type="invalid">{errors.banco?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome do Banco *</Form.Label>
                  <Form.Control {...register('nomeBanco')} isInvalid={!!errors.nomeBanco} />
                  <Form.Control.Feedback type="invalid">{errors.nomeBanco?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Agência *</Form.Label>
                  <Form.Control {...register('agencia')} isInvalid={!!errors.agencia} />
                  <Form.Control.Feedback type="invalid">{errors.agencia?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Conta *</Form.Label>
                  <Form.Control {...register('conta')} isInvalid={!!errors.conta} />
                  <Form.Control.Feedback type="invalid">{errors.conta?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Conta</Form.Label>
                  <Form.Select {...register('tipoConta')}>
                    <option value="CORRENTE">Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Saldo Inicial</Form.Label>
              <Form.Control type="number" step="0.01" {...register('saldoInicial')} />
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
        title="Excluir Conta Bancária"
        message={`Deseja realmente excluir a conta "${deleting?.nomeBanco} - Ag: ${deleting?.agencia} / Cc: ${deleting?.conta}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
