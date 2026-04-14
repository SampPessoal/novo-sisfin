import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Badge, Spinner } from 'react-bootstrap';
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

interface NFE {
  id?: number;
  numero: string;
  serie: string;
  tipo: string;
  valorTotal: number;
  descricao?: string;
  dataEmissao: string;
  status: string;
  contaReceberId?: number;
}

interface ContaReceber {
  id: number;
  descricao: string;
  valor: number;
}

interface ListResponse {
  success: boolean;
  data: NFE[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const emitirSchema = z.object({
  tipo: z.enum(['NFE', 'NFSE'], { required_error: 'Tipo é obrigatório' }),
  valorTotal: z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  contaReceberId: z.number().optional(),
});

type EmitirFormData = z.infer<typeof emitirSchema>;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'EMITIDA', label: 'Emitida' },
  { value: 'CANCELADA', label: 'Cancelada' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'REJEITADA', label: 'Rejeitada' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function NFEPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelando, setCancelando] = useState<NFE | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<EmitirFormData>({
    resolver: zodResolver(emitirSchema),
    defaultValues: { tipo: 'NFE' },
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['nfe', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await get<ListResponse>(`/nfe?${params.toString()}`);
      return data;
    },
  });

  const { data: contasReceber } = useQuery({
    queryKey: ['contas-receber-select-nfe'],
    queryFn: async () => {
      const { data: resp } = await get('/contas-receber?all=true');
      const body = resp as { data: ContaReceber[] };
      return body.data ?? [];
    },
    enabled: showModal,
  });

  const emitirMutation = useMutation({
    mutationFn: (data: EmitirFormData) => post('/nfe/emitir', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe'] });
      toast.success('NF-e emitida com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao emitir NF-e.'),
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => post(`/nfe/${id}/cancelar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe'] });
      toast.success('NF-e cancelada com sucesso!');
      setCancelando(null);
    },
    onError: () => toast.error('Erro ao cancelar NF-e.'),
  });

  const handleDownloadXML = useCallback(async (nfe: NFE) => {
    try {
      const { data } = await get<Blob>(`/nfe/${nfe.id}/xml`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nfe_${nfe.numero}.xml`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar XML.');
    }
  }, []);

  const handleDownloadPDF = useCallback(async (nfe: NFE) => {
    try {
      const { data } = await get<Blob>(`/nfe/${nfe.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nfe_${nfe.numero}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar PDF.');
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    reset();
  }, [reset]);

  const onSubmit = (data: EmitirFormData) => {
    emitirMutation.mutate(data);
  };

  const columns: Column<NFE>[] = [
    { header: 'Número', accessor: 'numero', width: '100px' },
    { header: 'Série', accessor: 'serie', width: '80px' },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (row) => (
        <Badge bg={row.tipo === 'NFE' ? 'primary' : 'info'}>
          {row.tipo}
        </Badge>
      ),
    },
    {
      header: 'Valor Total',
      accessor: 'valorTotal',
      render: (row) => formatCurrency(row.valorTotal),
    },
    {
      header: 'Data Emissão',
      accessor: 'dataEmissao',
      render: (row) => row.dataEmissao ? format(parseISO(row.dataEmissao), 'dd/MM/yyyy', { locale: ptBR }) : '-',
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
        <Col><h2 className="mb-0">Notas Fiscais Eletrônicas</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowModal(true)}>+ Emitir NF-e</Button>
        </Col>
      </Row>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={4}>
              <Form.Label className="small mb-1">Status</Form.Label>
              <Form.Select size="sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => { setStatusFilter(''); setPage(1); }}
              >
                Limpar Filtros
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <DataTable<NFE>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar notas fiscais..."
            emptyMessage="Nenhuma nota fiscal encontrada."
            actions={[
              {
                label: 'XML',
                variant: 'outline-secondary',
                onClick: (row) => handleDownloadXML(row),
                show: (row) => row.status === 'EMITIDA',
              },
              {
                label: 'PDF',
                variant: 'outline-info',
                onClick: (row) => handleDownloadPDF(row),
                show: (row) => row.status === 'EMITIDA',
              },
              {
                label: 'Cancelar',
                variant: 'outline-danger',
                onClick: (row) => setCancelando(row),
                show: (row) => row.status === 'EMITIDA',
              },
            ]}
          />
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header closeButton>
            <Modal.Title>Emitir NF-e</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Select {...register('tipo')} isInvalid={!!errors.tipo}>
                    <option value="NFE">NF-e</option>
                    <option value="NFSE">NFS-e</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{errors.tipo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
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
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Descrição *</Form.Label>
              <Form.Control as="textarea" rows={2} {...register('descricao')} isInvalid={!!errors.descricao} />
              <Form.Control.Feedback type="invalid">{errors.descricao?.message}</Form.Control.Feedback>
            </Form.Group>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={emitirMutation.isPending}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={emitirMutation.isPending}>
              {emitirMutation.isPending && <Spinner size="sm" className="me-2" />}
              Emitir
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!cancelando}
        title="Cancelar NF-e"
        message={`Deseja realmente cancelar a NF-e nº ${cancelando?.numero}?`}
        onConfirm={() => cancelando?.id && cancelarMutation.mutate(cancelando.id)}
        onCancel={() => setCancelando(null)}
        loading={cancelarMutation.isPending}
      />
    </>
  );
}
