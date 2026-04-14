import { Form } from 'react-bootstrap';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  isInvalid?: boolean;
  error?: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

export default function PhoneInput({ value, onChange, label, isInvalid, error }: PhoneInputProps) {
  return (
    <Form.Group>
      {label && <Form.Label>{label}</Form.Label>}
      <Form.Control
        type="text"
        value={formatPhone(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
        placeholder="(00) 00000-0000"
        isInvalid={isInvalid}
        maxLength={15}
      />
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
    </Form.Group>
  );
}
