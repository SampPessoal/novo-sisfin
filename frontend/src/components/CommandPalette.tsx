import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Form } from 'react-bootstrap';

interface CommandItem {
  id: string;
  label: string;
  path: string;
  section: string;
  icon: string;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', section: 'Navegação', icon: '📊' },
  { id: 'cp', label: 'Contas a Pagar', path: '/contas-pagar', section: 'Financeiro', icon: '📤', keywords: ['pagar', 'cp', 'despesa'] },
  { id: 'cr', label: 'Contas a Receber', path: '/contas-receber', section: 'Financeiro', icon: '📥', keywords: ['receber', 'cr', 'receita'] },
  { id: 'fluxo', label: 'Fluxo de Caixa', path: '/fluxo-caixa', section: 'Financeiro', icon: '📊', keywords: ['fluxo', 'caixa'] },
  { id: 'dre', label: 'DRE', path: '/dre', section: 'Financeiro', icon: '📈', keywords: ['resultado', 'demonstrativo'] },
  { id: 'conciliacao', label: 'Conciliação', path: '/conciliacao', section: 'Financeiro', icon: '🔄', keywords: ['conciliar', 'extrato'] },
  { id: 'transferencias', label: 'Transferências', path: '/transferencias', section: 'Financeiro', icon: '🔀' },
  { id: 'fornecedores', label: 'Fornecedores', path: '/fornecedores', section: 'Cadastros', icon: '🏢' },
  { id: 'clientes', label: 'Clientes', path: '/clientes', section: 'Cadastros', icon: '👥' },
  { id: 'categorias', label: 'Categorias', path: '/categorias', section: 'Cadastros', icon: '📂' },
  { id: 'centros-custo', label: 'Centros de Custo', path: '/centros-custo', section: 'Cadastros', icon: '🏷️' },
  { id: 'plano-contas', label: 'Plano de Contas', path: '/plano-contas', section: 'Cadastros', icon: '📋' },
  { id: 'contas-bancarias', label: 'Contas Bancárias', path: '/contas-bancarias', section: 'Cadastros', icon: '🏦' },
  { id: 'boletos', label: 'Boletos/PIX', path: '/boletos', section: 'Cobranças', icon: '🧾' },
  { id: 'nfe', label: 'Notas Fiscais', path: '/nfe', section: 'Cobranças', icon: '📄' },
  { id: 'contratos', label: 'Contratos', path: '/contratos', section: 'Contratos', icon: '📝' },
  { id: 'comissoes', label: 'Comissões', path: '/comissoes', section: 'Contratos', icon: '💰' },
  { id: 'viagens', label: 'Viagens', path: '/viagens', section: 'Viagens', icon: '✈️' },
  { id: 'caixa-entrada', label: 'Caixa de Entrada', path: '/caixa-entrada', section: 'Viagens', icon: '📬' },
  { id: 'emprestimos', label: 'Empréstimos', path: '/emprestimos', section: 'Outros', icon: '💳' },
  { id: 'parc-impostos', label: 'Parc. Impostos', path: '/parcelamento-impostos', section: 'Outros', icon: '🧮' },
  { id: 'apuracao', label: 'Apuração Impostos', path: '/apuracao-impostos', section: 'Outros', icon: '📑' },
  { id: 'usuarios', label: 'Usuários', path: '/usuarios', section: 'Admin', icon: '👤' },
  { id: 'empresas', label: 'Empresas', path: '/empresas', section: 'Admin', icon: '🏗️' },
  { id: 'perfis', label: 'Perfis e Permissões', path: '/perfis', section: 'Admin', icon: '🔐' },
  { id: 'audit', label: 'Auditoria', path: '/audit-log', section: 'Admin', icon: '📋' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? COMMANDS.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.includes(q))
        );
      })
    : COMMANDS;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setSearch('');
        setSelectedIndex(0);
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const executeCommand = (item: CommandItem) => {
    navigate(item.path);
    setOpen(false);
    setSearch('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      executeCommand(filtered[selectedIndex]);
    }
  };

  const sections = [...new Set(filtered.map((c) => c.section))];

  return (
    <Modal show={open} onHide={() => setOpen(false)} centered className="command-palette-modal">
      <div className="command-palette">
        <div className="command-palette-input-wrapper">
          <span className="command-palette-search-icon">🔍</span>
          <Form.Control
            ref={inputRef}
            type="text"
            placeholder="Buscar módulo, página ou ação..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
            className="command-palette-input"
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>
        <div className="command-palette-results">
          {sections.map((section) => (
            <div key={section}>
              <div className="command-palette-section">{section}</div>
              {filtered
                .filter((c) => c.section === section)
                .map((item) => {
                  const globalIdx = filtered.indexOf(item);
                  return (
                    <div
                      key={item.id}
                      className={`command-palette-item ${globalIdx === selectedIndex ? 'active' : ''}`}
                      onClick={() => executeCommand(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <span className="command-palette-item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-muted py-4">Nenhum resultado encontrado</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
