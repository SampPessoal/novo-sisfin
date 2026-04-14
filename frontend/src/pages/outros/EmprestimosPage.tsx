import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Badge, Spinner, Table } from 'react-bootstrap';
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

interface Parcela {
  id: number;
  numero: number;
  valor: number;
  valorAmortizacao: number;
  valorJuros: number;
  dataVencimento: string;
  status: string;
}

interface Emprestimo {
  id?: number;
  tipo: string;
  credorDevedor: string;
  valorPrincipal: number;
  taxaJuros: number;
  sistemaAmortizacao: string;
  numeroParcelas: number;
  dataContratacao: string;
  saldoDevedor?: number;
  status: string;
  parcelas?: Parcela[];
}

interface ListResponse {
  success: boolean;
  data: Emprestimo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const schema = z.object({
  tipo: z.enum(['EMPRESTIMO', 'FINANCIAMENTO'], { required_error: 'Tipo é obrigatório' }),
  credorDevedor: z.string().min(1, 'Credor/Devedor é obrigatório'),
  valorPrincipal: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  taxaJuros: z.number({ invalid_type_error: 'Taxa inválida' }).min(0),
  sistemaAmortizacao: z.enum(['PRICE', 'SAC'], { required_error: 'Sistema é obrigatório' }),
  numeroParcelas: z.number({ invalid_type_error: 'Número inválido' }).int().positive(),
  dataContratacao: z.string().min(1, 'Data é obrigatória'),
});

type FormData = z.infer<typeof schema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function EmprestimosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Emprestimo | null>(null);
  const [deleting, setDeleting] = useState<Emprestimo | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [liquidando, setLiquidando] = useState<Emprestimo | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['emprestimos', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/emprestimos?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const { data: emprestimoDetail } = useQuery({
    queryKey: ['emprestimo-detail', expandedId],
    queryFn: async () => {
      const { data: resp } = await get(`/emprestimos/${expandedId}`);
      const body = resp as { data: Emprestimo };
      return body.data as Emprestimo;
    },
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/emprestimos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
      toast.success('Empréstimo criado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar empréstimo.';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/emprestimos/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
      toast.success('Empréstimo atualizado com sucesso!');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar empréstimo.';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/emprestimos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
      toast.success('Empréstimo excluído com sucesso!');
      setDeleting(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao excluir empréstimo.';
      toast.error(msg);
    },
  });

  const gerarParcelasMutation = useMutation({
    mutationFn: (id: number) => post(`/emprestimos/${id}/gerar-parcelas`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
      queryClient.invalidateQueries({ queryKey: ['emprestimo-detail'] });
      toast.success('Parcelas geradas com sucesso!');
    },
    onError: () => toast.error('Erro ao gerar parcelas.'),
  });

  const liquidarMutation = useMutation({
    mutationFn: (id: number) => post(`/emprestimos/${id}/liquidar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos'] });
      queryClient.invalidateQueries({ queryKey: ['emprestimo-detail'] });
      toast.success('Empréstimo liquidado com sucesso!');
      setLiquidando(null);
    },
    onError: () => toast.error('Erro ao liquidar empréstimo.'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({
      tipo: 'EMPRESTIMO',
      credorDevedor: '',
      valorPrincipal: undefined as unknown as number,
      taxaJuros: undefined as unknown as number,
      sistemaAmortizacao: 'PRICE',
      numeroParcelas: undefined as unknown as number,
      dataContratacao: '',
    });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Emprestimo) => {
    setEditing(item);
    reset({
      tipo: item.tipo as 'EMPRESTIMO' | 'FINANCIAMENTO',
      credorDevedor: item.credorDevedor,
      valorPrincipal: item.valorPrincipal,
      taxaJuros: item.taxaJuros,
      sistemaAmortizacao: item.sistemaAmortizacao as 'PRICE' | 'SAC',
      numeroParcelas: item.numeroParcelas,
      dataContratacao: item.dataContratacao?.split('T')[0] ?? '',
    });
    setShowModal(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditing(null);
  }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Emprestimo>[] = [
    { header: 'Credor/Devedor', accessor: 'credorDevedor' },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (row) => (
        <Badge bg={row.tipo === 'EMPRESTIMO' ? 'primary' : 'info'}>
          {row.tipo === 'EMPRESTIMO' ? 'Empréstimo' : 'Financiamento'}
        </Badge>
      ),
    },
    {
      header: 'Valor Principal',
      accessor: 'valorPrincipal',
      render: (row) => formatCurrency(row.valorPrincipal),
    },
    {
      header: 'Taxa Juros',
      accessor: 'taxaJuros',
      render: (row) => `${row.taxaJuros}%`,
    },
    { header: 'Parcelas', accessor: 'numeroParcelas', width: '100px' },
    {
      header: 'Saldo Devedor',
      accessor: 'saldoDevedor',
      render: (row) => row.saldoDevedor != null ? formatCurrency(row.saldoDevedor) : '-',
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

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Empréstimos e Financiamentos</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Empréstimo</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Emprestimo>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar empréstimos..."
            emptyMessage="Nenhum empréstimo encontrado."
            actions={[
              {
                label: 'Parcelas',
                variant: 'outline-info',
                onClick: (row) => row.id && toggleExpand(row.id),
              },
              {
                label: 'Gerar Parcelas',
                variant: 'outline-success',
                onClick: (row) => row.id && gerarParcelasMutation.mutate(row.id),
                show: (row) => row.status === 'ATIVO' || row.status === 'ABERTO',
              },
              {
                label: 'Liquidar',
                variant: 'outline-warning',
                onClick: (row) => setLiquidando(row),
                show: (row) => row.status === 'ATIVO' || row.status === 'ABERTO',
              },
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit, icon: '✏️' },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row), icon: '🗑️' },
            ]}
          />
        </Card.Body>
      </Card>

      {expandedId && emprestimoDetail && (
        <Card className="mt-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Parcelas - {emprestimoDetail.credorDevedor}</strong>
            <Button variant="outline-secondary" size="sm" onClick={() => setExpandedId(null)}>Fechar</Button>
          </Card.Header>
          <Card.Body>
            {(emprestimoDetail.parcelas?.length ?? 0) > 0 ? (
              <Table size="sm" striped hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Valor</th>
                    <th>Amortização</th>
                    <th>Juros</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emprestimoDetail.parcelas!.map((p) => (
                    <tr key={p.id}>
                      <td>{p.numero}</td>
                      <td>{formatCurrency(p.valor)}</td>
                      <td>{formatCurrency(p.valorAmortizacao)}</td>
                      <td>{formatCurrency(p.valorJuros)}</td>
                      <td>{p.dataVencimento ? format(parseISO(p.dataVencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-muted mb-0">Nenhuma parcela gerada. Clique em "Gerar Parcelas" para criar.</p>
            )}
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Empréstimo' : 'Novo Empréstimo'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Select {...register('tipo')} isInvalid={!!errors.tipo}>
                    <option value="EMPRESTIMO">Empréstimo</option>
                    <option value="FINANCIAMENTO">Financiamento</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.tipo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Credor/Devedor *</Form.Label>
                  <Form.Control {...register('credorDevedor')} isInvalid={!!errors.credorDevedor} />
                  <Form.Control.Feedback type="invalid">{errors.credorDevedor?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Principal *</Form.Label>
                  <Controller
                    name="valorPrincipal"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.valorPrincipal}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.valorPrincipal?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Taxa de Juros (%) *</Form.Label>
                  <Controller
                    name="taxaJuros"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.taxaJuros}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.taxaJuros?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Sistema de Amortização *</Form.Label>
                  <Form.Select {...register('sistemaAmortizacao')} isInvalid={!!errors.sistemaAmortizacao}>
                    <option value="PRICE">PRICE</option>
                    <option value="SAC">SAC</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.sistemaAmortizacao?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Número de Parcelas *</Form.Label>
                  <Controller
                    name="numeroParcelas"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        isInvalid={!!errors.numeroParcelas}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.numeroParcelas?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Data de Contratação *</Form.Label>
                  <Form.Control type="date" {...register('dataContratacao')} isInvalid={!!errors.dataContratacao} />
                  <Form.Control.Feedback type="invalid">{errors.dataContratacao?.message}</Form.Control.Feedback>
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
        title="Excluir Empréstimo"
        message={`Deseja realmente excluir o empréstimo de "${deleting?.credorDevedor}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        show={!!liquidando}
        title="Liquidar Empréstimo"
        message={`Deseja realmente liquidar o empréstimo de "${liquidando?.credorDevedor}"? Esta ação quitará todas as parcelas pendentes.`}
        confirmLabel="Liquidar"
        variant="warning"
        onConfirm={() => liquidando?.id && liquidarMutation.mutate(liquidando.id)}
        onCancel={() => setLiquidando(null)}
        loading={liquidarMutation.isPending}
      />
    </>
  );
}
