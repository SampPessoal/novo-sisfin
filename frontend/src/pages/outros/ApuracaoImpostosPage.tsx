import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { get, post } from '../../services/api';

interface ApuracaoImposto {
  id?: number;
  competencia: string;
  tipoImposto: string;
  baseCalculo: number;
  aliquota: number;
  valorDevido: number;
  valorPagar: number;
  deducoes?: number;
  creditosAcumulados?: number;
  observacoes?: string;
  status: string;
}

interface ListResponse {
  success: boolean;
  data: ApuracaoImposto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const createSchema = z.object({
  competencia: z.string().min(1, 'Competência é obrigatória'),
  tipoImposto: z.string().min(1, 'Tipo de imposto é obrigatório'),
  baseCalculo: z.number({ invalid_type_error: 'Valor inválido' }).min(0),
  aliquota: z.number({ invalid_type_error: 'Alíquota inválida' }).min(0).max(100),
  deducoes: z.number().optional(),
  creditosAcumulados: z.number().optional(),
  observacoes: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;

const calcularSchema = z.object({
  competencia: z.string().min(1, 'Competência é obrigatória'),
  tipoImposto: z.string().min(1, 'Tipo de imposto é obrigatório'),
});

type CalcularFormData = z.infer<typeof calcularSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function ApuracaoImpostosPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCalcularModal, setShowCalcularModal] = useState(false);
  const [detailItem, setDetailItem] = useState<ApuracaoImposto | null>(null);

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  const calcularForm = useForm<CalcularFormData>({
    resolver: zodResolver(calcularSchema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['apuracao-impostos', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/apuracao-impostos?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFormData) => post('/apuracao-impostos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracao-impostos'] });
      toast.success('Apuração criada com sucesso!');
      closeCreateModal();
    },
    onError: () => toast.error('Erro ao criar apuração.'),
  });

  const calcularMutation = useMutation({
    mutationFn: (data: CalcularFormData) => post('/apuracao-impostos/calcular', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracao-impostos'] });
      toast.success('Imposto calculado com sucesso!');
      setShowCalcularModal(false);
    },
    onError: () => toast.error('Erro ao calcular imposto.'),
  });

  const openCreateModal = useCallback(() => {
    createForm.reset({
      competencia: '',
      tipoImposto: '',
      baseCalculo: undefined as unknown as number,
      aliquota: undefined as unknown as number,
      deducoes: undefined,
      creditosAcumulados: undefined,
      observacoes: '',
    });
    setShowCreateModal(true);
  }, [createForm]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const openCalcularModal = useCallback(() => {
    calcularForm.reset({ competencia: '', tipoImposto: '' });
    setShowCalcularModal(true);
  }, [calcularForm]);

  const columns: Column<ApuracaoImposto>[] = [
    { header: 'Competência', accessor: 'competencia' },
    { header: 'Tipo Imposto', accessor: 'tipoImposto' },
    {
      header: 'Base de Cálculo',
      accessor: 'baseCalculo',
      render: (row) => formatCurrency(row.baseCalculo),
    },
    {
      header: 'Alíquota',
      accessor: 'aliquota',
      render: (row) => `${row.aliquota}%`,
    },
    {
      header: 'Valor Devido',
      accessor: 'valorDevido',
      render: (row) => formatCurrency(row.valorDevido),
    },
    {
      header: 'Valor a Pagar',
      accessor: 'valorPagar',
      render: (row) => formatCurrency(row.valorPagar),
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
        <Col><h2 className="mb-0">Apuração de Impostos</h2></Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="success" onClick={openCalcularModal}>Calcular Imposto</Button>
          <Button variant="primary" onClick={openCreateModal}>+ Nova Apuração</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<ApuracaoImposto>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar apurações..."
            emptyMessage="Nenhuma apuração encontrada."
            actions={[
              {
                label: 'Detalhes',
                variant: 'outline-info',
                onClick: (row) => setDetailItem(row),
              },
            ]}
          />
        </Card.Body>
      </Card>

      {detailItem && (
        <Card className="mt-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Detalhes da Apuração - {detailItem.tipoImposto} ({detailItem.competencia})</strong>
            <Button variant="outline-secondary" size="sm" onClick={() => setDetailItem(null)}>Fechar</Button>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <p className="mb-1"><strong>Competência:</strong> {detailItem.competencia}</p>
                <p className="mb-1"><strong>Tipo Imposto:</strong> {detailItem.tipoImposto}</p>
                <p className="mb-1"><strong>Status:</strong> <StatusBadge status={detailItem.status} /></p>
              </Col>
              <Col md={4}>
                <p className="mb-1"><strong>Base de Cálculo:</strong> {formatCurrency(detailItem.baseCalculo)}</p>
                <p className="mb-1"><strong>Alíquota:</strong> {detailItem.aliquota}%</p>
                <p className="mb-1"><strong>Valor Devido:</strong> {formatCurrency(detailItem.valorDevido)}</p>
              </Col>
              <Col md={4}>
                <p className="mb-1"><strong>Deduções:</strong> {detailItem.deducoes != null ? formatCurrency(detailItem.deducoes) : '-'}</p>
                <p className="mb-1"><strong>Créditos Acumulados:</strong> {detailItem.creditosAcumulados != null ? formatCurrency(detailItem.creditosAcumulados) : '-'}</p>
                <p className="mb-1"><strong>Valor a Pagar:</strong> <span className="fw-bold text-danger">{formatCurrency(detailItem.valorPagar)}</span></p>
              </Col>
            </Row>
            {detailItem.observacoes && (
              <div className="mt-3">
                <strong>Observações:</strong>
                <p className="mb-0 mt-1">{detailItem.observacoes}</p>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={closeCreateModal} size="lg" centered>
        <Form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Nova Apuração</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Competência *</Form.Label>
                  <Form.Control
                    type="month"
                    {...createForm.register('competencia')}
                    isInvalid={!!createForm.formState.errors.competencia}
                  />
                  <Form.Control.Feedback type="invalid">{createForm.formState.errors.competencia?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Imposto *</Form.Label>
                  <Form.Select
                    {...createForm.register('tipoImposto')}
                    isInvalid={!!createForm.formState.errors.tipoImposto}
                  >
                    <option value="">Selecione...</option>
                    <option value="ICMS">ICMS</option>
                    <option value="ISS">ISS</option>
                    <option value="PIS">PIS</option>
                    <option value="COFINS">COFINS</option>
                    <option value="IRPJ">IRPJ</option>
                    <option value="CSLL">CSLL</option>
                    <option value="SIMPLES">Simples Nacional</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{createForm.formState.errors.tipoImposto?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base de Cálculo *</Form.Label>
                  <Controller
                    name="baseCalculo"
                    control={createForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!createForm.formState.errors.baseCalculo}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{createForm.formState.errors.baseCalculo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Alíquota (%) *</Form.Label>
                  <Controller
                    name="aliquota"
                    control={createForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        isInvalid={!!createForm.formState.errors.aliquota}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">{createForm.formState.errors.aliquota?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Deduções</Form.Label>
                  <Controller
                    name="deducoes"
                    control={createForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Créditos Acumulados</Form.Label>
                  <Controller
                    name="creditosAcumulados"
                    control={createForm.control}
                    render={({ field }) => (
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control as="textarea" rows={2} {...createForm.register('observacoes')} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeCreateModal} disabled={createMutation.isPending}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Spinner size="sm" className="me-2" />}
              Criar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Calcular Modal */}
      <Modal show={showCalcularModal} onHide={() => setShowCalcularModal(false)} centered>
        <Form onSubmit={calcularForm.handleSubmit((data) => calcularMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Calcular Imposto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Competência *</Form.Label>
              <Form.Control
                type="month"
                {...calcularForm.register('competencia')}
                isInvalid={!!calcularForm.formState.errors.competencia}
              />
              <Form.Control.Feedback type="invalid">{calcularForm.formState.errors.competencia?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo de Imposto *</Form.Label>
              <Form.Select
                {...calcularForm.register('tipoImposto')}
                isInvalid={!!calcularForm.formState.errors.tipoImposto}
              >
                <option value="">Selecione...</option>
                <option value="ICMS">ICMS</option>
                <option value="ISS">ISS</option>
                <option value="PIS">PIS</option>
                <option value="COFINS">COFINS</option>
                <option value="IRPJ">IRPJ</option>
                <option value="CSLL">CSLL</option>
                <option value="SIMPLES">Simples Nacional</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">{calcularForm.formState.errors.tipoImposto?.message}</Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCalcularModal(false)} disabled={calcularMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="success" type="submit" disabled={calcularMutation.isPending}>
              {calcularMutation.isPending && <Spinner size="sm" className="me-2" />}
              Calcular
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
