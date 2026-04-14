interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <span style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>{icon}</span>
      <h5 className="text-muted fw-semibold">{title}</h5>
      {description && <p className="text-muted small mb-3">{description}</p>}
      {action && (
        <button className="btn btn-primary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
