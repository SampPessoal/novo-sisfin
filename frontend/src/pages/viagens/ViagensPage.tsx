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

interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  data: string;
  tipo: string;
}

interface Viagem {
  id?: number;
  destino: string;
  objetivo: string;
  dataInicio: string;
  dataFim: string;
  estimativaDespesas: number;
  valorAdiantamento: number;
  status: string;
  colaborador?: { id: number; nome: string };
  despesas?: Despesa[];
}

interface ListResponse {
  success: boolean;
  data: Viagem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const schema = z.object({
  destino: z.string().min(1, 'Destino é obrigatório'),
  objetivo: z.string().min(1, 'Objetivo é obrigatório'),
  dataInicio: z.string().min(1, 'Data início é obrigatória'),
  dataFim: z.string().min(1, 'Data fim é obrigatória'),
  estimativaDespesas: z.number({ invalid_type_error: 'Valor inválido' }).min(0),
  valorAdiantamento: z.number({ invalid_type_error: 'Valor inválido' }).min(0),
});

type FormData = z.infer<typeof schema>;

const despesaSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  data: z.string().min(1, 'Data é obrigatória'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
});

type DespesaFormData = z.infer<typeof despesaSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ViagensPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Viagem | null>(null);
  const [deleting, setDeleting] = useState<Viagem | null>(null);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [despesaViagem, setDespesaViagem] = useState<Viagem | null>(null);
  const [showDespesasView, setShowDespesasView] = useState<Viagem | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const despesaForm = useForm<DespesaFormData>({
    resolver: zodResolver(despesaSchema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['viagens', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/viagens?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const { data: viagemDetail } = useQuery({
    queryKey: ['viagem-detail', showDespesasView?.id],
    queryFn: async () => {
      const { data: resp } = await get(`/viagens/${showDespesasView!.id}`);
      const body = resp as { data: Viagem };
      return body.data as Viagem;
    },
    enabled: !!showDespesasView,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/viagens', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Viagem criada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao criar viagem.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/viagens/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Viagem atualizada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao atualizar viagem.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/viagens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Viagem excluída com sucesso!');
      setDeleting(null);
    },
    onError: () => toast.error('Erro ao excluir viagem.'),
  });

  const aprovarGestorMutation = useMutation({
    mutationFn: (id: number) => post(`/viagens/${id}/aprovar-gestor`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Aprovação do gestor registrada!');
    },
    onError: () => toast.error('Erro ao aprovar viagem.'),
  });

  const aprovarFinanceiroMutation = useMutation({
    mutationFn: (id: number) => post(`/viagens/${id}/aprovar-financeiro`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Aprovação financeira registrada!');
    },
    onError: () => toast.error('Erro ao aprovar viagem.'),
  });

  const liberarAdiantamentoMutation = useMutation({
    mutationFn: (id: number) => post(`/viagens/${id}/liberar-adiantamento`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Adiantamento liberado!');
    },
    onError: () => toast.error('Erro ao liberar adiantamento.'),
  });

  const addDespesaMutation = useMutation({
    mutationFn: (data: DespesaFormData) => post(`/viagens/${despesaViagem!.id}/despesas`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      queryClient.invalidateQueries({ queryKey: ['viagem-detail'] });
      toast.success('Despesa adicionada!');
      closeDespesaModal();
    },
    onError: () => toast.error('Erro ao adicionar despesa.'),
  });

  const prestacaoContasMutation = useMutation({
    mutationFn: (id: number) => post(`/viagens/${id}/prestacao-contas`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Prestação de contas enviada!');
    },
    onError: () => toast.error('Erro ao enviar prestação de contas.'),
  });

  const concluirMutation = useMutation({
    mutationFn: (id: number) => post(`/viagens/${id}/concluir`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viagens'] });
      toast.success('Viagem concluída!');
    },
    onError: () => toast.error('Erro ao concluir viagem.'),
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ destino: '', objetivo: '', dataInicio: '', dataFim: '', estimativaDespesas: undefined as unknown as number, valorAdiantamento: undefined as unknown as number });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: Viagem) => {
    setEditing(item);
    reset({
      destino: item.destino,
      objetivo: item.objetivo,
      dataInicio: item.dataInicio?.split('T')[0] ?? '',
      dataFim: item.dataFim?.split('T')[0] ?? '',
      estimativaDespesas: item.estimativaDespesas,
      valorAdiantamento: item.valorAdiantamento,
    });
    setShowModal(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditing(null);
  }, []);

  const openDespesaModal = useCallback((viagem: Viagem) => {
    setDespesaViagem(viagem);
    despesaForm.reset({ descricao: '', valor: undefined as unknown as number, data: '', tipo: '' });
    setShowDespesaModal(true);
  }, [despesaForm]);

  const closeDespesaModal = useCallback(() => {
    setShowDespesaModal(false);
    setDespesaViagem(null);
  }, []);

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Viagem>[] = [
    { header: 'Destino', accessor: 'destino' },
    {
      header: 'Colaborador',
      accessor: 'colaborador',
      render: (row) => row.colaborador?.nome ?? '-',
    },
    {
      header: 'Período',
      accessor: 'dataInicio',
      render: (row) => {
        const inicio = row.dataInicio ? format(parseISO(row.dataInicio), 'dd/MM/yyyy', { locale: ptBR }) : '';
        const fim = row.dataFim ? format(parseISO(row.dataFim), 'dd/MM/yyyy', { locale: ptBR }) : '';
        return `${inicio} - ${fim}`;
      },
    },
    {
      header: 'Estimativa',
      accessor: 'estimativaDespesas',
      render: (row) => formatCurrency(row.estimativaDespesas),
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
        <Col><h2 className="mb-0">Viagens</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={openCreate}>+ Nova Viagem</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<Viagem>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar viagens..."
            emptyMessage="Nenhuma viagem encontrada."
            actions={[
              { label: 'Editar', variant: 'outline-primary', onClick: openEdit, icon: '✏️' },
              {
                label: 'Despesas',
                variant: 'outline-info',
                onClick: (row) => setShowDespesasView(row),
              },
              {
                label: 'Aprovar Gestor',
                variant: 'outline-success',
                onClick: (row) => row.id && aprovarGestorMutation.mutate(row.id),
                show: (row) => row.status === 'SOLICITADA',
              },
              {
                label: 'Aprovar Financeiro',
                variant: 'outline-info',
                onClick: (row) => row.id && aprovarFinanceiroMutation.mutate(row.id),
                show: (row) => row.status === 'APROVADA_GESTOR',
              },
              {
                label: 'Liberar Adiantamento',
                variant: 'outline-warning',
                onClick: (row) => row.id && liberarAdiantamentoMutation.mutate(row.id),
                show: (row) => row.status === 'APROVADA_FINANCEIRO',
              },
              {
                label: 'Add Despesa',
                variant: 'outline-secondary',
                onClick: (row) => openDespesaModal(row),
                show: (row) => row.status === 'ADIANTAMENTO_LIBERADO',
              },
              {
                label: 'Prestação Contas',
                variant: 'outline-primary',
                onClick: (row) => row.id && prestacaoContasMutation.mutate(row.id),
                show: (row) => row.status === 'ADIANTAMENTO_LIBERADO',
              },
              {
                label: 'Concluir',
                variant: 'outline-success',
                onClick: (row) => row.id && concluirMutation.mutate(row.id),
                show: (row) => row.status === 'PRESTACAO_ENVIADA',
              },
              {
                label: 'Excluir',
                variant: 'outline-danger',
                onClick: (row) => setDeleting(row),
                icon: '🗑️',
                show: (row) => row.status === 'SOLICITADA',
              },
            ]}
          />
        </Card.Body>
      </Card>

      {showDespesasView && viagemDetail && (
        <Card className="mt-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Despesas - Viagem para {viagemDetail.destino}</strong>
            <Button variant="outline-secondary" size="sm" onClick={() => setShowDespesasView(null)}>Fechar</Button>
          </Card.Header>
          <Card.Body>
            {(viagemDetail.despesas?.length ?? 0) > 0 ? (
              <Table size="sm" striped hover>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {viagemDetail.despesas!.map((d) => (
                    <tr key={d.id}>
                      <td>{d.descricao}</td>
                      <td>{d.tipo}</td>
                      <td>{formatCurrency(d.valor)}</td>
                      <td>{d.data ? format(parseISO(d.data), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-bold">
                    <td colSpan={2}>Total</td>
                    <td>{formatCurrency(viagemDetail.despesas!.reduce((acc, d) => acc + d.valor, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </Table>
            ) : (
              <p className="text-muted mb-0">Nenhuma despesa registrada.</p>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Viagem' : 'Nova Viagem'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Destino *</Form.Label>
                  <Form.Control {...register('destino')} isInvalid={!!errors.destino} />
                  <Form.Control.Feedback type="invalid">{errors.destino?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Objetivo *</Form.Label>
                  <Form.Control {...register('objetivo')} isInvalid={!!errors.objetivo} />
                  <Form.Control.Feedback type="invalid">{errors.objetivo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Data Início *</Form.Label>
                  <Form.Control type="date" {...register('dataInicio')} isInvalid={!!errors.dataInicio} />
                  <Form.Control.Feedback type="invalid">{errors.dataInicio?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Data Fim *</Form.Label>
                  <Form.Control type="date" {...register('dataFim')} isInvalid={!!errors.dataFim} />
                  <Form.Control.Feedback type="invalid">{errors.dataFim?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estimativa de Despesas *</Form.Label>
                  <Controller
                    name="estimativaDespesas"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.estimativaDespesas}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.estimativaDespesas?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Adiantamento *</Form.Label>
                  <Controller
                    name="valorAdiantamento"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.valorAdiantamento}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.valorAdiantamento?.message}</Form.Control.Feedback>
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

      {/* Add Despesa Modal */}
      <Modal show={showDespesaModal} onHide={closeDespesaModal} centered>
        <Form onSubmit={despesaForm.handleSubmit((data) => addDespesaMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Adicionar Despesa - {despesaViagem?.destino}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Descrição *</Form.Label>
              <Form.Control {...despesaForm.register('descricao')} isInvalid={!!despesaForm.formState.errors.descricao} />
              <Form.Control.Feedback type="invalid">{despesaForm.formState.errors.descricao?.message}</Form.Control.Feedback>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor *</Form.Label>
                  <Controller
                    name="valor"
                    control={despesaForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!despesaForm.formState.errors.valor}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{despesaForm.formState.errors.valor?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Data *</Form.Label>
                  <Form.Control type="date" {...despesaForm.register('data')} isInvalid={!!despesaForm.formState.errors.data} />
                  <Form.Control.Feedback type="invalid">{despesaForm.formState.errors.data?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Tipo *</Form.Label>
              <Form.Select {...despesaForm.register('tipo')} isInvalid={!!despesaForm.formState.errors.tipo}>
                <option value="">Selecione...</option>
                <option value="ALIMENTACAO">Alimentação</option>
                <option value="TRANSPORTE">Transporte</option>
                <option value="HOSPEDAGEM">Hospedagem</option>
                <option value="COMBUSTIVEL">Combustível</option>
                <option value="OUTROS">Outros</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">{despesaForm.formState.errors.tipo?.message}</Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeDespesaModal} disabled={addDespesaMutation.isPending}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={addDespesaMutation.isPending}>
              {addDespesaMutation.isPending && <Spinner size="sm" className="me-2" />}
              Adicionar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!deleting}
        title="Excluir Viagem"
        message={`Deseja realmente excluir a viagem para "${deleting?.destino}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
