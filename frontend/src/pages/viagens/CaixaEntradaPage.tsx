import { useState, useCallback, useRef } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner, Badge, Alert } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import { get, post } from '../../services/api';
import SelectLabel from '../../components/SelectLabel';

interface PreLancamento {
  id?: number;
  dataDocumento: string;
  descricao: string;
  valor: number;
  origem: string;
  status: string;
  categoriaId?: number;
  centroCustoId?: number;
  tipoDespesa?: string;
  dadosOCR?: string;
  confiancaOCR?: number;
}

interface Categoria {
  id: number;
  nome: string;
}

interface CentroCusto {
  id: number;
  nome: string;
}

interface ListResponse {
  success: boolean;
  data: PreLancamento[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const classificarSchema = z.object({
  categoriaId: z.number({ required_error: 'Categoria é obrigatória' }),
  centroCustoId: z.number({ required_error: 'Centro de custo é obrigatório' }),
  tipoDespesa: z.string().min(1, 'Tipo de despesa é obrigatório'),
  descricao: z.string().optional(),
});

type ClassificarFormData = z.infer<typeof classificarSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function CaixaEntradaPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showClassificarModal, setShowClassificarModal] = useState(false);
  const [classificandoItem, setClassificandoItem] = useState<PreLancamento | null>(null);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrItem, setOcrItem] = useState<PreLancamento | null>(null);
  const [rejeitando, setRejeitando] = useState<PreLancamento | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classificarForm = useForm<ClassificarFormData>({
    resolver: zodResolver(classificarSchema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['caixa-entrada', page, search],
    queryFn: async () => {
      const { data } = await get<ListResponse>(`/caixa-entrada?page=${page}&pageSize=20&search=${search}`);
      return data;
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias-select'],
    queryFn: async () => {
      const { data: resp } = await get('/categorias?all=true');
      const body = resp as { data: Categoria[] };
      return body.data ?? [];
    },
    enabled: showClassificarModal,
  });

  const { data: centrosCusto } = useQuery({
    queryKey: ['centros-custo-select'],
    queryFn: async () => {
      const { data: resp } = await get('/centros-custo?all=true');
      const body = resp as { data: CentroCusto[] };
      return body.data ?? [];
    },
    enabled: showClassificarModal,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return post('/caixa-entrada/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-entrada'] });
      toast.success('Documento enviado com sucesso!');
      closeUploadModal();
    },
    onError: () => toast.error('Erro ao enviar documento.'),
  });

  const classificarMutation = useMutation({
    mutationFn: (data: ClassificarFormData) => post(`/caixa-entrada/${classificandoItem!.id}/classificar`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-entrada'] });
      toast.success('Lançamento classificado com sucesso!');
      closeClassificarModal();
    },
    onError: () => toast.error('Erro ao classificar lançamento.'),
  });

  const aprovarMutation = useMutation({
    mutationFn: (id: number) => post(`/caixa-entrada/${id}/aprovar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-entrada'] });
      toast.success('Lançamento aprovado com sucesso!');
    },
    onError: () => toast.error('Erro ao aprovar lançamento.'),
  });

  const rejeitarMutation = useMutation({
    mutationFn: (id: number) => post(`/caixa-entrada/${id}/rejeitar`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-entrada'] });
      toast.success('Lançamento rejeitado.');
      setRejeitando(null);
    },
    onError: () => toast.error('Erro ao rejeitar lançamento.'),
  });

  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const openClassificarModal = useCallback((item: PreLancamento) => {
    setClassificandoItem(item);
    classificarForm.reset({
      categoriaId: item.categoriaId ?? (undefined as unknown as number),
      centroCustoId: item.centroCustoId ?? (undefined as unknown as number),
      tipoDespesa: item.tipoDespesa ?? '',
      descricao: item.descricao ?? '',
    });
    setShowClassificarModal(true);
  }, [classificarForm]);

  const closeClassificarModal = useCallback(() => {
    setShowClassificarModal(false);
    setClassificandoItem(null);
  }, []);

  const handleUpload = () => {
    if (uploadFile) uploadMutation.mutate(uploadFile);
  };

  const columns: Column<PreLancamento>[] = [
    {
      header: 'Data Documento',
      accessor: 'dataDocumento',
      render: (row) => row.dataDocumento ? format(parseISO(row.dataDocumento), 'dd/MM/yyyy', { locale: ptBR }) : '-',
    },
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (row) => formatCurrency(row.valor),
    },
    { header: 'Origem', accessor: 'origem' },
    {
      header: 'OCR',
      accessor: 'confiancaOCR',
      render: (row) => {
        if (!row.dadosOCR) return <span className="text-muted">-</span>;
        const conf = row.confiancaOCR ?? 0;
        const variant = conf >= 80 ? 'success' : conf >= 50 ? 'warning' : 'danger';
        return (
          <Badge
            bg={variant}
            role="button"
            onClick={() => { setOcrItem(row); setShowOCRModal(true); }}
          >
            {conf}%
          </Badge>
        );
      },
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
        <Col><h2 className="mb-0">Caixa de Entrada</h2></Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => setShowUploadModal(true)}>+ Upload Documento</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<PreLancamento>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar lançamentos..."
            emptyMessage="Nenhum pré-lançamento encontrado."
            actions={[
              {
                label: 'Classificar',
                variant: 'outline-primary',
                onClick: (row) => openClassificarModal(row),
                show: (row) => row.status === 'PENDENTE',
              },
              {
                label: 'Aprovar',
                variant: 'outline-success',
                onClick: (row) => row.id && aprovarMutation.mutate(row.id),
                show: (row) => row.status === 'PENDENTE' || row.status === 'CLASSIFICADO',
              },
              {
                label: 'Rejeitar',
                variant: 'outline-danger',
                onClick: (row) => setRejeitando(row),
                show: (row) => row.status === 'PENDENTE' || row.status === 'CLASSIFICADO',
              },
            ]}
          />
        </Card.Body>
      </Card>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={closeUploadModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload de Documento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Selecione o arquivo</Form.Label>
            <Form.Control
              type="file"
              ref={fileInputRef}
              accept=".pdf,.png,.jpg,.jpeg,.xml"
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                setUploadFile(input.files?.[0] ?? null);
              }}
            />
            <Form.Text className="text-muted">
              Formatos aceitos: PDF, PNG, JPG, XML
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeUploadModal} disabled={uploadMutation.isPending}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpload} disabled={!uploadFile || uploadMutation.isPending}>
            {uploadMutation.isPending && <Spinner size="sm" className="me-2" />}
            Enviar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Classificar Modal */}
      <Modal show={showClassificarModal} onHide={closeClassificarModal} centered>
        <Form onSubmit={classificarForm.handleSubmit((data) => classificarMutation.mutate(data))}>
          <Modal.Header closeButton>
            <Modal.Title>Classificar Lançamento</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {classificandoItem?.dadosOCR && (
              <Alert variant="info" className="mb-3">
                <small><strong>Dados OCR detectados:</strong> {classificandoItem.dadosOCR}</small>
              </Alert>
            )}
            <Form.Group className="mb-3">
              <SelectLabel label="Categoria" href="/categorias" linkText="Nova" required />
              <Form.Select
                {...classificarForm.register('categoriaId', { valueAsNumber: true })}
                isInvalid={!!classificarForm.formState.errors.categoriaId}
              >
                <option value="">Selecione...</option>
                {(categorias ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{classificarForm.formState.errors.categoriaId?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <SelectLabel label="Centro de Custo" href="/centros-custo" required />
              <Form.Select
                {...classificarForm.register('centroCustoId', { valueAsNumber: true })}
                isInvalid={!!classificarForm.formState.errors.centroCustoId}
              >
                <option value="">Selecione...</option>
                {(centrosCusto ?? []).map((cc) => (
                  <option key={cc.id} value={cc.id}>{cc.nome}</option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{classificarForm.formState.errors.centroCustoId?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo de Despesa *</Form.Label>
              <Form.Select
                {...classificarForm.register('tipoDespesa')}
                isInvalid={!!classificarForm.formState.errors.tipoDespesa}
              >
                <option value="">Selecione...</option>
                <option value="FIXA">Fixa</option>
                <option value="VARIAVEL">Variável</option>
                <option value="INVESTIMENTO">Investimento</option>
                <option value="OPERACIONAL">Operacional</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">{classificarForm.formState.errors.tipoDespesa?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control as="textarea" rows={2} {...classificarForm.register('descricao')} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeClassificarModal} disabled={classificarMutation.isPending}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={classificarMutation.isPending}>
              {classificarMutation.isPending && <Spinner size="sm" className="me-2" />}
              Classificar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* OCR Data Modal */}
      <Modal show={showOCRModal} onHide={() => setShowOCRModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Dados OCR</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {ocrItem && (
            <>
              <p><strong>Confiança:</strong> {ocrItem.confiancaOCR}%</p>
              <pre className="bg-light p-3 rounded" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                {ocrItem.dadosOCR}
              </pre>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOCRModal(false)}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        show={!!rejeitando}
        title="Rejeitar Lançamento"
        message={`Deseja realmente rejeitar o lançamento "${rejeitando?.descricao}"?`}
        onConfirm={() => rejeitando?.id && rejeitarMutation.mutate(rejeitando.id)}
        onCancel={() => setRejeitando(null)}
        loading={rejeitarMutation.isPending}
      />
    </>
  );
}
