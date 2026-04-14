import { Badge } from 'react-bootstrap';

const STATUS_MAP: Record<string, { variant: string; label: string }> = {
  PENDENTE: { variant: 'warning', label: 'Pendente' },
  PAGO: { variant: 'success', label: 'Pago' },
  RECEBIDO: { variant: 'success', label: 'Recebido' },
  APROVADO: { variant: 'success', label: 'Aprovado' },
  CONCLUIDA: { variant: 'success', label: 'Concluída' },
  VENCIDO: { variant: 'danger', label: 'Vencido' },
  CANCELADO: { variant: 'danger', label: 'Cancelado' },
  CANCELADA: { variant: 'danger', label: 'Cancelada' },
  CONFIRMADA: { variant: 'success', label: 'Confirmada' },
  REJEITADO: { variant: 'danger', label: 'Rejeitado' },
  AGUARDANDO_APROVACAO: { variant: 'info', label: 'Aguardando Aprovação' },
  ABERTO: { variant: 'primary', label: 'Aberto' },
  PARCIAL: { variant: 'info', label: 'Parcial' },
  EMITIDO: { variant: 'primary', label: 'Emitido' },
  REGISTRADO: { variant: 'info', label: 'Registrado' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const mapped = STATUS_MAP[status] ?? { variant: 'secondary', label: status };
  return <Badge bg={mapped.variant}>{mapped.label}</Badge>;
}
