import { type ReactNode } from 'react';
import { Button } from 'react-bootstrap';

interface FilterBarProps {
  children: ReactNode;
  onClear?: () => void;
  actions?: ReactNode;
}

export default function FilterBar({ children, onClear, actions }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="d-flex flex-wrap gap-2 align-items-end">
        {children}
        <div className="d-flex gap-2 ms-auto">
          {onClear && (
            <Button variant="outline-secondary" size="sm" onClick={onClear}>
              Limpar
            </Button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
