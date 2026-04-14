import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Modal, Form, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { get, post, put, del } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

interface Permissao {
  id: number;
  modulo: string;
  acao: string;
  descricao: string;
}

interface Perfil {
  id: number;
  nome: string;
  descricao: string | null;
  sistema: boolean;
  ativo: boolean;
  permissoes: Array<{ permissao: Permissao }>;
  _count: { usuarios: number };
}

export default function PerfisPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<number>>(new Set());

  const { data: perfis, isLoading } = useQuery({
    queryKey: ['perfis'],
    queryFn: async () => {
      const { data } = await get('/perfis');
      return (data as any).data as Perfil[];
    },
  });

  const { data: permissoes } = useQuery({
    queryKey: ['permissoes'],
    queryFn: async () => {
      const { data } = await get('/perfis/permissoes');
      return (data as any).data as Permissao[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { nome: string; descricao: string; permissaoIds: number[] }) => {
      if (editingPerfil) {
        return put(`/perfis/${editingPerfil.id}`, data);
      }
      return post('/perfis', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] });
      toast.success(editingPerfil ? 'Perfil atualizado' : 'Perfil criado');
      closeModal();
    },
    onError: () => toast.error('Erro ao salvar perfil'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/perfis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] });
      toast.success('Perfil removido');
    },
    onError: () => toast.error('Erro ao remover perfil'),
  });

  const openCreate = () => {
    setEditingPerfil(null);
    setFormNome('');
    setFormDescricao('');
    setSelectedPerms(new Set());
    setShowModal(true);
  };

  const openEdit = (perfil: Perfil) => {
    setEditingPerfil(perfil);
    setFormNome(perfil.nome);
    setFormDescricao(perfil.descricao || '');
    setSelectedPerms(new Set(perfil.permissoes.map((p) => p.permissao.id)));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPerfil(null);
  };

  const togglePerm = (id: number) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (modulo: string) => {
    const moduloPerms = (permissoes || []).filter((p) => p.modulo === modulo);
    const allSelected = moduloPerms.every((p) => selectedPerms.has(p.id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      moduloPerms.forEach((p) => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const permsByModule = (permissoes || []).reduce<Record<string, Permissao[]>>((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {});

  if (isLoading) return <Spinner animation="border" />;

  return (
    <>
      <PageHeader
        title="Perfis e Permissões"
        subtitle="Gerencie os perfis de acesso e suas permissões"
        actions={<Button variant="primary" onClick={openCreate}>Novo Perfil</Button>}
      />

      {!perfis?.length ? (
        <EmptyState title="Nenhum perfil cadastrado" action={{ label: 'Criar Perfil', onClick: openCreate }} />
      ) : (
        <div className="data-table-container">
          <Table hover responsive>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Permissões</th>
                <th>Usuários</th>
                <th>Tipo</th>
                <th style={{ width: 120 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((perfil) => (
                <tr key={perfil.id}>
                  <td className="fw-semibold">{perfil.nome}</td>
                  <td className="text-muted small">{perfil.descricao}</td>
                  <td><Badge bg="secondary">{perfil.permissoes.length}</Badge></td>
                  <td><Badge bg="info">{perfil._count.usuarios}</Badge></td>
                  <td>
                    {perfil.sistema
                      ? <Badge bg="warning" text="dark">Sistema</Badge>
                      : <Badge bg="primary">Customizado</Badge>}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button variant="outline-primary" size="sm" onClick={() => openEdit(perfil)}>
                        {perfil.sistema ? 'Ver' : 'Editar'}
                      </Button>
                      {!perfil.sistema && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => { if (confirm('Remover este perfil?')) deleteMutation.mutate(perfil.id); }}
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingPerfil ? (editingPerfil.sistema ? 'Visualizar Perfil' : 'Editar Perfil') : 'Novo Perfil'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingPerfil?.sistema && (
            <Alert variant="info" className="mb-3">Perfis do sistema são somente leitura.</Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Nome</Form.Label>
            <Form.Control
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              disabled={!!editingPerfil?.sistema}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Descrição</Form.Label>
            <Form.Control
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              disabled={!!editingPerfil?.sistema}
            />
          </Form.Group>

          <h6 className="mt-4 mb-3">Permissões</h6>
          {Object.entries(permsByModule).map(([modulo, perms]) => {
            const allSelected = perms.every((p) => selectedPerms.has(p.id));
            const someSelected = perms.some((p) => selectedPerms.has(p.id));
            return (
              <div key={modulo} className="mb-3 p-2 rounded" style={{ background: 'var(--bs-gray-100)' }}>
                <Form.Check
                  type="checkbox"
                  label={<strong className="text-uppercase small">{modulo.replace(/_/g, ' ')}</strong>}
                  checked={allSelected}
                  ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => toggleModule(modulo)}
                  disabled={!!editingPerfil?.sistema}
                />
                <div className="ms-4 d-flex flex-wrap gap-2 mt-1">
                  {perms.map((p) => (
                    <Form.Check
                      key={p.id}
                      type="checkbox"
                      label={<span className="small">{p.descricao || p.acao}</span>}
                      checked={selectedPerms.has(p.id)}
                      onChange={() => togglePerm(p.id)}
                      disabled={!!editingPerfil?.sistema}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </Modal.Body>
        {!editingPerfil?.sistema && (
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({
                nome: formNome,
                descricao: formDescricao,
                permissaoIds: Array.from(selectedPerms),
              })}
              disabled={saveMutation.isPending || !formNome.trim()}
            >
              {saveMutation.isPending ? <Spinner size="sm" /> : 'Salvar'}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </>
  );
}
