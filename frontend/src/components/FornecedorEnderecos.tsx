import { useState, useCallback } from 'react';
import { Row, Col, Form, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { BsPlusLg, BsPencil, BsTrash, BsCheck2, BsX, BsStarFill, BsSearch } from 'react-icons/bs';
import { get, post, put, del } from '../services/api';

interface Endereco {
  id: number;
  tipo: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  principal: boolean;
  observacoes?: string;
}

const TIPOS = [
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'COBRANCA', label: 'Cobrança' },
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'FILIAL', label: 'Filial' },
  { value: 'CORRESPONDENCIA', label: 'Correspondência' },
];

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const EMPTY: Omit<Endereco, 'id'> = {
  tipo: 'PRINCIPAL', cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '', principal: false, observacoes: '',
};

function formatCEP(v: string) {
  const d = v.replace(/\D/g, '');
  return d.length <= 5 ? d : d.replace(/(\d{5})(\d{0,3})/, '$1-$2');
}

export default function FornecedorEnderecos({ fornecedorId }: { fornecedorId: number }) {
  const qc = useQueryClient();
  const qk = ['fornecedor-enderecos', fornecedorId];
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Endereco, 'id'>>(EMPTY);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const { data: enderecos = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data } = await get<{ data: Endereco[] }>(`/fornecedores/${fornecedorId}/enderecos`);
      return data.data ?? [];
    },
    enabled: !!fornecedorId,
  });

  const buscarCEP = useCallback(async () => {
    const digits = (form.cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await resp.json();
      if (data.erro) { toast.warn('CEP não encontrado'); return; }
      setForm(prev => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      toast.info('Endereço preenchido!');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  }, [form.cep]);

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: number; body: Omit<Endereco, 'id'> }) => {
      if (data.id) return put(`/fornecedores/${fornecedorId}/enderecos/${data.id}`, data.body);
      return post(`/fornecedores/${fornecedorId}/enderecos`, data.body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success('Endereço salvo!');
      cancelEdit();
    },
    onError: () => toast.error('Erro ao salvar endereço.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/fornecedores/${fornecedorId}/enderecos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success('Endereço removido!');
    },
    onError: () => toast.error('Erro ao remover endereço.'),
  });

  const startNew = () => { setForm(EMPTY); setEditingId('new'); };
  const startEdit = (e: Endereco) => {
    setForm({
      tipo: e.tipo, cep: e.cep ?? '', logradouro: e.logradouro ?? '',
      numero: e.numero ?? '', complemento: e.complemento ?? '', bairro: e.bairro ?? '',
      cidade: e.cidade ?? '', estado: e.estado ?? '', principal: e.principal,
      observacoes: e.observacoes ?? '',
    });
    setEditingId(e.id);
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY); };
  const handleSave = () => {
    if (!form.tipo) { toast.warn('Tipo é obrigatório'); return; }
    const id = editingId === 'new' ? undefined : (editingId ?? undefined);
    saveMutation.mutate({ id, body: form });
  };

  const set = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  if (isLoading) return <div className="text-center py-3"><Spinner size="sm" /> Carregando endereços...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Endereços Adicionais</h6>
        {!editingId && (
          <Button variant="outline-primary" size="sm" onClick={startNew}>
            <BsPlusLg className="me-1" /> Adicionar Endereço
          </Button>
        )}
      </div>

      {editingId && (
        <div className="border rounded p-3 mb-3 bg-light">
          <Row className="g-2">
            <Col md={3}>
              <Form.Label className="small fw-medium">Tipo *</Form.Label>
              <Form.Select size="sm" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">CEP</Form.Label>
              <div className="input-group input-group-sm">
                <Form.Control
                  size="sm"
                  value={formatCEP(form.cep ?? '')}
                  onChange={e => set('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                  onBlur={buscarCEP}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <Button variant="outline-secondary" size="sm" onClick={buscarCEP} disabled={buscandoCep}>
                  {buscandoCep ? <Spinner size="sm" /> : <BsSearch />}
                </Button>
              </div>
            </Col>
            <Col md={4} className="d-flex align-items-end pb-3">
              <Form.Check
                type="switch" id="endereco-principal" label="Endereço principal"
                checked={form.principal} onChange={e => set('principal', e.target.checked)}
              />
            </Col>
          </Row>
          <Row className="g-2 mt-1">
            <Col md={6}>
              <Form.Label className="small fw-medium">Logradouro</Form.Label>
              <Form.Control size="sm" value={form.logradouro} onChange={e => set('logradouro', e.target.value)} />
            </Col>
            <Col md={2}>
              <Form.Label className="small fw-medium">Número</Form.Label>
              <Form.Control size="sm" value={form.numero} onChange={e => set('numero', e.target.value)} />
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-medium">Complemento</Form.Label>
              <Form.Control size="sm" value={form.complemento} onChange={e => set('complemento', e.target.value)} />
            </Col>
          </Row>
          <Row className="g-2 mt-1">
            <Col md={4}>
              <Form.Label className="small fw-medium">Bairro</Form.Label>
              <Form.Control size="sm" value={form.bairro} onChange={e => set('bairro', e.target.value)} />
            </Col>
            <Col md={5}>
              <Form.Label className="small fw-medium">Cidade</Form.Label>
              <Form.Control size="sm" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-medium">UF</Form.Label>
              <Form.Select size="sm" value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </Form.Select>
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

      {enderecos.length > 0 && (
        <Table size="sm" hover responsive>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Endereço</th>
              <th>Cidade/UF</th>
              <th>CEP</th>
              <th style={{ width: '100px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {enderecos.map(e => (
              <tr key={e.id}>
                <td>
                  <Badge bg="light" text="dark">{TIPOS.find(t => t.value === e.tipo)?.label ?? e.tipo}</Badge>
                  {e.principal && <BsStarFill className="ms-1 text-warning" title="Principal" />}
                </td>
                <td className="small">
                  {[e.logradouro, e.numero].filter(Boolean).join(', ')}
                  {e.complemento && ` - ${e.complemento}`}
                  {e.bairro && <div className="text-muted">{e.bairro}</div>}
                </td>
                <td className="small">{e.cidade && e.estado ? `${e.cidade}/${e.estado}` : e.cidade || '-'}</td>
                <td className="small">{e.cep ? formatCEP(e.cep) : '-'}</td>
                <td>
                  <div className="d-flex gap-1">
                    <Button variant="outline-primary" size="sm" onClick={() => startEdit(e)} title="Editar"><BsPencil /></Button>
                    <Button variant="outline-danger" size="sm" onClick={() => deleteMutation.mutate(e.id)} title="Remover"><BsTrash /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {enderecos.length === 0 && !editingId && (
        <p className="text-muted text-center small py-2">Nenhum endereço adicional cadastrado.</p>
      )}
    </div>
  );
}
