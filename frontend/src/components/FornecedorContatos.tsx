import { useState } from 'react';
import { Row, Col, Form, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { BsPlusLg, BsPencil, BsTrash, BsCheck2, BsX, BsStarFill } from 'react-icons/bs';
import PhoneInput from './PhoneInput';
import { get, post, put, del } from '../services/api';

interface Contato {
  id: number;
  nome: string;
  departamento?: string;
  cargo?: string;
  telefone?: string;
  celular?: string;
  whatsapp?: string;
  email?: string;
  principal: boolean;
  observacoes?: string;
}

const DEPARTAMENTOS = [
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'DIRETORIA', label: 'Diretoria' },
  { value: 'COMPRAS', label: 'Compras' },
  { value: 'JURIDICO', label: 'Jurídico' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
];

const EMPTY: Omit<Contato, 'id'> = {
  nome: '', departamento: '', cargo: '', telefone: '', celular: '',
  whatsapp: '', email: '', principal: false, observacoes: '',
};

export default function FornecedorContatos({ fornecedorId }: { fornecedorId: number }) {
  const qc = useQueryClient();
  const qk = ['fornecedor-contatos', fornecedorId];
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Contato, 'id'>>(EMPTY);

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data } = await get<{ data: Contato[] }>(`/fornecedores/${fornecedorId}/contatos`);
      return data.data ?? [];
    },
    enabled: !!fornecedorId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: number; body: Omit<Contato, 'id'> }) => {
      if (data.id) return put(`/fornecedores/${fornecedorId}/contatos/${data.id}`, data.body);
      return post(`/fornecedores/${fornecedorId}/contatos`, data.body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success('Contato salvo!');
      cancelEdit();
    },
    onError: () => toast.error('Erro ao salvar contato.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/fornecedores/${fornecedorId}/contatos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success('Contato removido!');
    },
    onError: () => toast.error('Erro ao remover contato.'),
  });

  const startNew = () => { setForm(EMPTY); setEditingId('new'); };
  const startEdit = (c: Contato) => {
    setForm({
      nome: c.nome, departamento: c.departamento ?? '', cargo: c.cargo ?? '',
      telefone: c.telefone ?? '', celular: c.celular ?? '', whatsapp: c.whatsapp ?? '',
      email: c.email ?? '', principal: c.principal, observacoes: c.observacoes ?? '',
    });
    setEditingId(c.id);
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY); };
  const handleSave = () => {
    if (!form.nome.trim()) { toast.warn('Nome é obrigatório'); return; }
    const id = editingId === 'new' ? undefined : (editingId ?? undefined);
    saveMutation.mutate({ id, body: form });
  };

  const set = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  if (isLoading) return <div className="text-center py-3"><Spinner size="sm" /> Carregando contatos...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Contatos Adicionais</h6>
        {!editingId && (
          <Button variant="outline-primary" size="sm" onClick={startNew}>
            <BsPlusLg className="me-1" /> Adicionar Contato
          </Button>
        )}
      </div>

      {editingId && (
        <div className="border rounded p-3 mb-3 bg-light">
          <Row className="g-2">
            <Col md={4}>
              <Form.Label className="small fw-medium">Nome *</Form.Label>
              <Form.Control size="sm" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">Departamento</Form.Label>
              <Form.Select size="sm" value={form.departamento} onChange={e => set('departamento', e.target.value)}>
                <option value="">Selecione...</option>
                {DEPARTAMENTOS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">Cargo</Form.Label>
              <Form.Control size="sm" value={form.cargo} onChange={e => set('cargo', e.target.value)} />
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Form.Check
                type="switch" id="contato-principal" label="Principal"
                checked={form.principal} onChange={e => set('principal', e.target.checked)}
              />
            </Col>
          </Row>
          <Row className="g-2 mt-1">
            <Col md={3}>
              <Form.Label className="small fw-medium">Telefone</Form.Label>
              <PhoneInput value={form.telefone ?? ''} onChange={v => set('telefone', v)} />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">Celular</Form.Label>
              <PhoneInput value={form.celular ?? ''} onChange={v => set('celular', v)} />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">WhatsApp</Form.Label>
              <PhoneInput value={form.whatsapp ?? ''} onChange={v => set('whatsapp', v)} />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">Email</Form.Label>
              <Form.Control size="sm" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </Col>
          </Row>
          <div className="mt-2 d-flex gap-2 justify-content-end">
            <Button variant="outline-secondary" size="sm" onClick={cancelEdit} disabled={saveMutation.isPending}>
              <BsX /> Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Spinner size="sm" /> : <BsCheck2 />} Salvar
            </Button>
          </div>
        </div>
      )}

      {contatos.length > 0 && (
        <Table size="sm" hover responsive>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Departamento</th>
              <th>Telefone / Celular</th>
              <th>Email</th>
              <th style={{ width: '100px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contatos.map(c => (
              <tr key={c.id}>
                <td>
                  {c.nome}
                  {c.principal && <BsStarFill className="ms-1 text-warning" title="Principal" />}
                  {c.cargo && <div className="text-muted small">{c.cargo}</div>}
                </td>
                <td>{c.departamento && <Badge bg="light" text="dark">{DEPARTAMENTOS.find(d => d.value === c.departamento)?.label ?? c.departamento}</Badge>}</td>
                <td className="small">{c.telefone || c.celular || '-'}</td>
                <td className="small">{c.email || '-'}</td>
                <td>
                  <div className="d-flex gap-1">
                    <Button variant="outline-primary" size="sm" onClick={() => startEdit(c)} title="Editar"><BsPencil /></Button>
                    <Button variant="outline-danger" size="sm" onClick={() => deleteMutation.mutate(c.id)} title="Remover"><BsTrash /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {contatos.length === 0 && !editingId && (
        <p className="text-muted text-center small py-2">Nenhum contato adicional cadastrado.</p>
      )}
    </div>
  );
}
