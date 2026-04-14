import { Card } from 'react-bootstrap';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  subtitle?: string;
  trend?: { value: number; label: string };
}

const variantColors: Record<string, string> = {
  primary: '#4299e1',
  success: '#38a169',
  danger: '#e53e3e',
  warning: '#d69e2e',
  info: '#3182ce',
};

export default function StatCard({ title, value, icon, variant = 'primary', subtitle, trend }: StatCardProps) {
  return (
    <Card className="summary-card h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="card-title">{title}</div>
            <div className="card-value" style={{ color: variantColors[variant] }}>{value}</div>
            {subtitle && <div className="text-muted small mt-1">{subtitle}</div>}
            {trend && (
              <div className={`small mt-1 ${trend.value >= 0 ? 'text-success' : 'text-danger'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </div>
            )}
          </div>
          {icon && <span style={{ fontSize: '2rem', opacity: 0.6 }}>{icon}</span>}
        </div>
      </Card.Body>
    </Card>
  );
}
