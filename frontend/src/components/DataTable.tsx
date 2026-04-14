import { useState, useCallback, type ReactNode } from 'react';
import { Table, Pagination, Form, Spinner, Button, InputGroup, Dropdown } from 'react-bootstrap';

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  exportKey?: string;
  exportFormat?: (row: T) => string | number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Action<T> {
  label: string;
  icon?: ReactNode;
  variant?: string;
  onClick: (row: T) => void;
  show?: (row: T) => boolean;
}

interface BulkAction<T> {
  label: string;
  variant?: string;
  onClick: (rows: T[]) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onSearch?: (term: string) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  actions?: Action<T>[];
  bulkActions?: BulkAction<T>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  selectable?: boolean;
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  title?: string;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => (acc as Record<string, unknown>)?.[part], obj);
}

export default function DataTable<T extends { id?: unknown }>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSearch,
  onSort,
  actions,
  bulkActions,
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum registro encontrado.',
  selectable = false,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  title,
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleSort = (field: string) => {
    const newDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDir(newDir);
    onSort?.(field, newDir);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const toggleRow = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)));
    }
  }, [data, selectedRows.size]);

  const selectedData = Array.from(selectedRows).map((i) => data[i]).filter(Boolean);

  const hasExport = onExportCSV || onExportExcel || onExportPDF;

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const { page, totalPages, total, pageSize } = pagination;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === page} onClick={() => onPageChange?.(i)}>
          {i}
        </Pagination.Item>
      );
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          Mostrando {start}-{end} de {total} registros
        </small>
        <Pagination className="mb-0" size="sm">
          <Pagination.First onClick={() => onPageChange?.(1)} disabled={page === 1} />
          <Pagination.Prev onClick={() => onPageChange?.(page - 1)} disabled={page === 1} />
          {startPage > 1 && <Pagination.Ellipsis disabled />}
          {items}
          {endPage < totalPages && <Pagination.Ellipsis disabled />}
          <Pagination.Next onClick={() => onPageChange?.(page + 1)} disabled={page === totalPages} />
          <Pagination.Last onClick={() => onPageChange?.(totalPages)} disabled={page === totalPages} />
        </Pagination>
      </div>
    );
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <tr key={i}>
        {selectable && <td><div className="skeleton" style={{ width: 16, height: 16 }} /></td>}
        {columns.map((_, j) => (
          <td key={j}>
            <div className="skeleton skeleton-row" style={{ width: `${60 + Math.random() * 30}%` }} />
          </td>
        ))}
        {actions && (
          <td>
            <div className="skeleton skeleton-row" style={{ width: '80px' }} />
          </td>
        )}
      </tr>
    ));

  return (
    <div className="data-table-container">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          {title && <h6 className="mb-0 fw-bold">{title}</h6>}
          {onSearch && (
            <InputGroup style={{ maxWidth: 300 }}>
              <InputGroup.Text>🔍</InputGroup.Text>
              <Form.Control
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </InputGroup>
          )}
        </div>

        <div className="d-flex gap-2 align-items-center">
          {selectedRows.size > 0 && bulkActions && (
            <div className="d-flex gap-1 align-items-center">
              <span className="text-muted small">{selectedRows.size} selecionado(s)</span>
              {bulkActions.map((ba) => (
                <Button
                  key={ba.label}
                  variant={ba.variant ?? 'outline-primary'}
                  size="sm"
                  onClick={() => ba.onClick(selectedData)}
                >
                  {ba.label}
                </Button>
              ))}
            </div>
          )}

          {hasExport && (
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm">
                Exportar
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {onExportExcel && <Dropdown.Item onClick={onExportExcel}>Excel (.xlsx)</Dropdown.Item>}
                {onExportPDF && <Dropdown.Item onClick={onExportPDF}>PDF</Dropdown.Item>}
                {onExportCSV && <Dropdown.Item onClick={onExportCSV}>CSV</Dropdown.Item>}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <Table hover>
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 40 }}>
                  <Form.Check
                    type="checkbox"
                    checked={data.length > 0 && selectedRows.size === data.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.accessor)}
                  style={{ width: col.width, cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  onClick={() => col.sortable !== false && handleSort(String(col.accessor))}
                >
                  {col.header}
                  {sortField === String(col.accessor) && (
                    <span className="ms-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              {actions && <th style={{ width: '150px' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              renderSkeletonRows()
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0) + (selectable ? 1 : 0)} className="text-center py-4 text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={(row.id as string | number) ?? idx} className={selectedRows.has(idx) ? 'table-active' : ''}>
                  {selectable && (
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => toggleRow(idx)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={String(col.accessor)}>
                      {col.render ? col.render(row) : String(getNestedValue(row as unknown, String(col.accessor)) ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td>
                      <div className="d-flex gap-1">
                        {actions
                          .filter((a) => !a.show || a.show(row))
                          .map((action) => (
                            <Button
                              key={action.label}
                              variant={action.variant ?? 'outline-secondary'}
                              size="sm"
                              onClick={() => action.onClick(row)}
                              title={action.label}
                            >
                              {action.icon ?? action.label}
                            </Button>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {!loading && renderPagination()}

      {loading && (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" className="me-2" />
          <span className="text-muted">Carregando...</span>
        </div>
      )}
    </div>
  );
}
