import { useState, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Modal, Spinner, Alert, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import DataTable, { type Column, type PaginationInfo } from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import FileUpload from '../../components/FileUpload';
import { get, post, put, del } from '../../services/api';

interface PlanoConta {
  id?: number;
  codigo: string;
  descricao: string;
  tipo?: string;
  natureza?: 'DEVEDORA' | 'CREDORA';
  paiId?: number | null;
}

interface ListResponse {
  success: boolean;
  data: PlanoConta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const tipoLabels: Record<string, string> = {
  ANALITICA: 'Analítica',
  SINTETICA: 'Sintética',
};

const naturezaLabels: Record<string, string> = {
  DEVEDORA: 'Devedora',
  CREDORA: 'Credora',
};

const schema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  tipo: z.enum(['ANALITICA', 'SINTETICA']).optional(),
  natureza: z.enum(['DEVEDORA', 'CREDORA']).optional(),
  paiId: z.coerce.number().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function PlanoContasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ importados: number; ignorados: number; erros: string[] } | null>(null);
  const [editing, setEditing] = useState<PlanoConta | null>(null);
  const [deleting, setDeleting] = useState<PlanoConta | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['plano-contas', page, search],
    queryFn: async () => {
      const { data: resp } = await get<ListResponse>(`/plano-contas?page=${page}&pageSize=20&search=${search}`);
      return resp;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => post('/plano-contas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
      toast.success('Conta criada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao criar conta.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => put(`/plano-contas/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
      toast.success('Conta atualizada com sucesso!');
      closeModal();
    },
    onError: () => toast.error('Erro ao atualizar conta.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/plano-contas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
      toast.success('Conta excluída com sucesso!');
      setDeleting(null);
    },
    onError: () => toast.error('Erro ao excluir conta.'),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data: resp } = await post('/plano-contas/importar', formData);
      return resp;
    },
    onSuccess: (rawData) => {
      const wrapper = rawData as Record<string, unknown>;
      const result = (wrapper.data ?? wrapper) as { importados: number; ignorados: number; erros: string[] };
      setImportResult(result);
      toast.success(`Importação concluída: ${result.importados} importados, ${result.ignorados} ignorados`);
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao importar arquivo.';
      toast.error(msg);
    },
  });

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    reset({ codigo: '', descricao: '', tipo: 'ANALITICA', natureza: 'DEVEDORA', paiId: null });
    setShowModal(true);
  }, [reset]);

  const openEdit = useCallback((item: PlanoConta) => {
    setEditing(item);
    reset({
      codigo: item.codigo,
      descricao: item.descricao,
      tipo: item.tipo as 'ANALITICA' | 'SINTETICA' | undefined,
      natureza: item.natureza,
      paiId: item.paiId ?? null,
    });
    setShowModal(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditing(null);
  }, []);

  const onSubmit = (data: FormData) => {
    const payload = { ...data, paiId: data.paiId || null };
    if (editing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns: Column<PlanoConta>[] = [
    { header: 'Código', accessor: 'codigo', width: '150px' },
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Tipo',
      accessor: 'tipo',
      width: '140px',
      render: (row) => row.tipo ? tipoLabels[row.tipo] ?? row.tipo : '',
    },
    {
      header: 'Natureza',
      accessor: 'natureza',
      width: '140px',
      render: (row) => row.natureza ? naturezaLabels[row.natureza] ?? row.natureza : '',
    },
  ];

  const pagination: PaginationInfo | undefined = response
    ? { page: response.page, pageSize: response.pageSize, total: response.total, totalPages: response.totalPages }
    : undefined;

  return (
    <>
      <Row className="mb-3 align-items-center">
        <Col><h2 className="mb-0">Plano de Contas</h2></Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => setShowImportModal(true)}>Importar</Button>
          <Button variant="primary" onClick={openCreate}>+ Nova Conta</Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <DataTable<PlanoConta>
            columns={columns}
            data={response?.data ?? []}
            loading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onSearch={setSearch}
            searchPlaceholder="Pesquisar plano de contas..."
            emptyMessage="Nenhuma conta encontrada."
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
            <Modal.Title>{editing ? 'Editar Conta' : 'Nova Conta'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Código *</Form.Label>
                  <Form.Control {...register('codigo')} isInvalid={!!errors.codigo} />
                  <Form.Control.Feedback type="invalid">{errors.codigo?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Descrição *</Form.Label>
                  <Form.Control {...register('descricao')} isInvalid={!!errors.descricao} />
                  <Form.Control.Feedback type="invalid">{errors.descricao?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select {...register('tipo')}>
                    <option value="ANALITICA">Analítica</option>
                    <option value="SINTETICA">Sintética</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Natureza</Form.Label>
                  <Form.Select {...register('natureza')}>
                    <option value="DEVEDORA">Devedora</option>
                    <option value="CREDORA">Credora</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>ID da Conta Pai</Form.Label>
              <Form.Control type="number" {...register('paiId')} placeholder="Deixe vazio para conta raiz" />
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
        title="Excluir Conta"
        message={`Deseja realmente excluir a conta "${deleting?.descricao}"?`}
        onConfirm={() => deleting?.id && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
        loading={deleteMutation.isPending}
      />

      <Modal show={showImportModal} onHide={closeImportModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Importar Plano de Contas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">
            Envie um arquivo Excel (.xlsx) ou PDF contendo o plano de contas.
            O Excel deve ter colunas: <strong>Código</strong>, <strong>Nome</strong>, <strong>Tipo</strong>, <strong>Natureza</strong>.
          </p>

          {!importResult && (
            <FileUpload
              onFileSelect={(file) => setImportFile(file)}
              accept=".xlsx,.xls,.pdf"
              label="Arraste um arquivo Excel ou PDF, ou clique para selecionar"
              maxSizeMB={10}
            />
          )}

          {importResult && (
            <div className="mt-3">
              <Alert variant="success">
                <Alert.Heading>Importação concluída</Alert.Heading>
                <div className="d-flex gap-3 mb-2">
                  <span>Importados: <Badge bg="success">{importResult.importados}</Badge></span>
                  <span>Ignorados: <Badge bg="secondary">{importResult.ignorados}</Badge></span>
                  {importResult.erros.length > 0 && (
                    <span>Erros: <Badge bg="danger">{importResult.erros.length}</Badge></span>
                  )}
                </div>
              </Alert>
              {importResult.erros.length > 0 && (
                <Alert variant="warning" className="mt-2">
                  <Alert.Heading className="h6">Erros encontrados</Alert.Heading>
                  <ul className="mb-0 small">
                    {importResult.erros.slice(0, 20).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.erros.length > 20 && (
                      <li>... e mais {importResult.erros.length - 20} erros</li>
                    )}
                  </ul>
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeImportModal}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button
              variant="primary"
              disabled={!importFile || importMutation.isPending}
              onClick={() => importFile && importMutation.mutate(importFile)}
            >
              {importMutation.isPending && <Spinner size="sm" className="me-2" />}
              Importar
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}
