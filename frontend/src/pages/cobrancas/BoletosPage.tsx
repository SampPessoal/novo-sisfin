import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner } from 'react-bootstrap';
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
import { get, post } from '../../services/api';

interface Boleto {
  id?: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  tipo: string;
  status: string;
  asaasId?: string;
  linkPagamento?: string;
  contaReceberId?: number;
}

interface ContaReceber {
  id: number;
  descricao: string;
  valor: number;
}

interface ListResponse {
  success: boolean;
  data: Boleto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const cobrancaSchema = z.object({
  valor: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  dataVencimento: z.string().min(1, 'Vencimento é obrigatório'),
  tipo: z.enum(['BOLETO', 'PIX', 'CARTAO'], { required_error: 'Tipo é obrigatório' }),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  contaReceberId: z.number({ required_error: 'Selecione uma conta a receber' }).optional(),
});

type CobrancaFormData = z.infer<typeof cobrancaSchema>;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function BoletosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [cancelando, setCancelando] = useState<Boleto | null>(null);

  const { handleSubmit, control, register, reset, formState: { errors } } = useForm<CobrancaFormData>({
    resolver: zodResolver(cobrancaSchema),
    defaultValues: { tipo: 'BOLETO' },
  });

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (dataInicio) params.set('dataInicio', dataInicio);
    if (dataFim) params.set('dataFim', dataFim);
    return params.toString();
  }, [page, search, statusFilter, dataInicio, dataFim]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['boletos', page, search, statusFilter, dataInicio, dataFim],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/boletos?${buildQueryString()}`);
      return data;
    },
  });

  const { data: contasReceber } = useQuery({
    queryKey: ['contas-receber-select'],
    queryFn: async () => {
      const { data: resp } = await get('/contas-receber?all=true&status=PENDENTE');
      const body = resp as { data: ContaReceber[] };
      return body.data ?? [];
    },
    enabled: showModal,
  });

  const gerarCobrancaMutation = useMutation({
    mutationFn: (data: CobrancaFormData) => post('/boletos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast.success('Cobrança gerada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao gerar cobrança.'),
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => post(`/boletos/${id}/cancelar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast.success('Cobrança cancelada com sucesso!');
      setCancelando(null);
    },
    onError: () => toast.error('Erro ao cancelar cobrança.'),
  });

  const handleCopyLink = useCallback(async (boleto: Boleto) => {
    try {
      const { data: resp } = await get(`/boletos/${boleto.id}/link`);
      const body = resp as { data: { link: string } };
      await navigator.clipboard.writeText(body.data.link);
      toast.success('Link de pagamento copiado!');
    } catch {
      toast.error('Erro ao obter link de pagamento.');
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    reset();
  }, [reset]);

  const onSubmit = (data: CobrancaFormData) => {
    gerarCobrancaMutation.mutate(data);
  };

  const columns: Column<Boleto>[] = [
    { header: 'ID', accessor: 'id', width: '80px' },
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (row) => formatCurrency(row.valor),
    },
    {
      header: 'Vencimento',
      accessor: 'dataVencimento',
      render: (row) => row.dataVencimento ? format(parseISO(row.dataVencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-',
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (row) => row.tipo || '-',
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
        <Col><h2 className="mb-0">Boletos / Cobranças</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowModal(true)}>+ Gerar Cobrança</Button>
        </Col>
      </Row>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={3}>
              <Form.Label className="small mb-1">Status</Form.Label>
              <Form.Select size="sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small mb-1">Data Início</Form.Label>
              <Form.Control size="sm" type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPage(1); }} />
            </Col>
            <Col md={3}>
              <Form.Label className="small mb-1">Data Fim</Form.Label>
              <Form.Control size="sm" type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPage(1); }} />
            </Col>
            <Col md={3}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => { setStatusFilter(''); setDataInicio(''); setDataFim(''); setPage(1); }}
              >
                Limpar Filtros
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <DataTable<Boleto>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar cobranças..."
            emptyMessage="Nenhuma cobrança encontrada."
            actions={[
              {
                label: 'Link Pagamento',
                variant: 'outline-primary',
                onClick: (row) => handleCopyLink(row),
                show: (row) => row.status !== 'CANCELADO',
              },
              {
                label: 'Cancelar',
                variant: 'outline-danger',
                onClick: (row) => setCancelando(row),
                show: (row) => row.status === 'PENDENTE' || row.status === 'VENCIDO',
              },
            ]}
          />
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>Gerar Cobrança</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor *</Form.Label>
                  <Controller
                    name="valor"
                    control={control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!errors.valor}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{errors.valor?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vencimento *</Form.Label>
                  <Form.Control type="date" {...register('dataVencimento')} isInvalid={!!errors.dataVencimento} />
                  <Form.Control.Feedback type="invalid">{errors.dataVencimento?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Select {...register('tipo')} isInvalid={!!errors.tipo}>
                    <option value="BOLETO">Boleto</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartão</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.tipo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Conta a Receber</Form.Label>
                  <Controller
                    name="contaReceberId"
                    control={control}
                    render={({ field }) => (
                      <Form.Select
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      >
                        <option value="">Selecione...</option>
                        {(contasReceber ?? []).map((cr) => (
                          <option key={cr.id} value={cr.id}>
                            {cr.descricao} - {formatCurrency(cr.valor)}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Descrição *</Form.Label>
              <Form.Control {...register('descricao')} isInvalid={!!errors.descricao} />
              <Form.Control.Feedback type="invalid">{errors.descricao?.message}</Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={gerarCobrancaMutation.isPending}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={gerarCobrancaMutation.isPending}>
              {gerarCobrancaMutation.isPending && <Spinner size="sm" className="me-2" />}
              Gerar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!cancelando}
        title="Cancelar Cobrança"
        message={`Deseja realmente cancelar a cobrança "${cancelando?.descricao}"?`}
        onConfirm={() => cancelando?.id && cancelarMutation.mutate(cancelando.id)}
        onCancel={() => setCancelando(null)}
        loading={cancelarMutation.isPending}
      />
    </>
  );
}
