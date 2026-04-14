import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.875rem' }}>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex gap-2 align-items-center">{actions}</div>}
    </div>
  );
}
