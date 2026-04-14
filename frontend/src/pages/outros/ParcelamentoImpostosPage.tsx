import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
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
import { get, post, put, del } from '../../services/api';

interface Parcela {
  id: number;
  numero: number;
  valor: number;
  dataVencimento: string;
  status: string;
}

interface ParcelamentoImposto {
  id?: number;
  tipoImposto: string;
  orgaoCredor: string;
  valorTotal: number;
  numeroParcelas: number;
  dataInicio: string;
  saldoDevedor?: number;
  status: string;
  parcelas?: Parcela[];
}

interface ListResponse {
  success: boolean;
  data: ParcelamentoImposto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const schema = z.object({
  tipoImposto: z.string().min(1, 'Tipo de imposto é obrigatório'),
  orgaoCredor: z.string().min(1, 'Órgão credor é obrigatório'),
  valorTotal: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  numeroParcelas: z.number({ invalid_type_error: 'Número inválido' }).int().positive(),
  dataInicio: z.string().min(1, 'Data início é obrigatória'),
});

type FormData = z.infer<typeof schema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ParcelamentoImpostosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ParcelamentoImposto | null>(null);
  const [deleting, setDeleting] = useState<ParcelamentoImposto | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['parcelamento-impostos', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/parcelamento-impostos?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const { data: parcelamentoDetail } = useQuery({
    queryKey: ['parcelamento-detail', expandedId],
    queryFn: async () => {
      const { data: resp } = await get(`/parcelamento-impostos/${expandedId}`);
      const body = resp as { data: ParcelamentoImposto };
      return body.data as ParcelamentoImposto;
    },
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/parcelamento-impostos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcelamento-impostos'] });
      toast.success('Parcelamento criado com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao criar parcelamento.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/parcelamento-impostos/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcelamento-impostos'] });
      toast.success('Parcelamento atualizado com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao atualizar parcelamento.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/parcelamento-impostos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcelamento-impostos'] });
      toast.success('Parcelamento excluído com sucesso!');
      setDeleting(null);
    },
    onError: () => toast.error('Erro ao excluir parcelamento.'),
  });

  const gerarParcelasMutation = useMutation({
    mutationFn: (id: number) => post(`/parcelamento-impostos/${id}/gerar-parcelas`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcelamento-impostos'] });
      queryClient.invalidateQueries({ queryKey: ['parcelamento-detail'] });
      toast.success('Parcelas geradas com sucesso!');
    },
    onError: () => toast.error('Erro ao gerar parcelas.'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({
      tipoImposto: '',
      orgaoCredor: '',
      valorTotal: undefined as unknown as number,
      numeroParcelas: undefined as unknown as number,
      dataInicio: '',
    });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: ParcelamentoImposto) => {
    setEditing(item);
    reset({
      tipoImposto: item.tipoImposto,
      orgaoCredor: item.orgaoCredor,
      valorTotal: item.valorTotal,
      numeroParcelas: item.numeroParcelas,
      dataInicio: item.dataInicio?.split('T')[0] ?? '',
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

  const columns: Column<ParcelamentoImposto>[] = [
    { header: 'Tipo Imposto', accessor: 'tipoImposto' },
    { header: 'Órgão Credor', accessor: 'orgaoCredor' },
    {
      header: 'Valor Total',
      accessor: 'valorTotal',
      render: (row) => formatCurrency(row.valorTotal),
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

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Parcelamento de Impostos</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Novo Parcelamento</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<ParcelamentoImposto>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar parcelamentos..."
            emptyMessage="Nenhum parcelamento encontrado."
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
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit, icon: '✏️' },
              { label: 'Excluir', variant: 'outline-danger', onClick: (row) => setDeleting(row), icon: '🗑️' },
            ]}
          />
        </Card.Body>
      </Card>

      {expandedId && parcelamentoDetail && (
        <Card className="mt-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Parcelas - {parcelamentoDetail.tipoImposto} ({parcelamentoDetail.orgaoCredor})</strong>
            <Button variant="outline-secondary" size="sm" onClick={() => setExpandedId(null)}>Fechar</Button>
          </Card.Header>
          <Card.Body>
            {(parcelamentoDetail.parcelas?.length ?? 0) > 0 ? (
              <Table size="sm" striped hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelamentoDetail.parcelas!.map((p) => (
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
              <p className="text-muted mb-0">Nenhuma parcela gerada. Clique em "Gerar Parcelas" para criar.</p>
            )}
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Parcelamento' : 'Novo Parcelamento'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Imposto *</Form.Label>
                  <Form.Select {...register('tipoImposto')}>
                    <option value="">Selecione...</option>
                    <option value="ICMS">ICMS</option>
                    <option value="ISS">ISS</option>
                    <option value="PIS">PIS</option>
                    <option value="COFINS">COFINS</option>
                    <option value="IRPJ">IRPJ</option>
                    <option value="CSLL">CSLL</option>
                    <option value="SIMPLES">Simples Nacional</option>
                    <option value="OUTROS">Outros</option>
                  </Form.Select>
                  {errors.tipoImposto && <div className="text-danger small mt-1">{errors.tipoImposto.message}</div>}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Órgão Credor *</Form.Label>
                  <Form.Control {...register('orgaoCredor')} isInvalid={!!errors.orgaoCredor} />
                  <Form.Control.Feedback type="invalid">{errors.orgaoCredor?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Total *</Form.Label>
                  <Controller
                    name="valorTotal"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.valorTotal}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.valorTotal?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Data Início *</Form.Label>
                  <Form.Control type="date" {...register('dataInicio')} isInvalid={!!errors.dataInicio} />
                  <Form.Control.Feedback type="invalid">{errors.dataInicio?.message}</Form.Control.Feedback>
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
        title="Excluir Parcelamento"
        message={`Deseja realmente excluir o parcelamento de "${deleting?.tipoImposto}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
