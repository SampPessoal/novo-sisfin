import { useState } from 'react';
import { Form } from 'react-bootstrap';

interface CNPJCPFInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  isInvalid?: boolean;
  error?: string;
}

export function formatCNPJCPF(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
      d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    );
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) =>
    e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
  );
}

export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let rest = sum % 11;
  if (rest < 2) { if (parseInt(digits[12]) !== 0) return false; }
  else { if (parseInt(digits[12]) !== 11 - rest) return false; }
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  rest = sum % 11;
  if (rest < 2) return parseInt(digits[13]) === 0;
  return parseInt(digits[13]) === 11 - rest;
}

export function validateCNPJCPF(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) return validateCPF(digits);
  return validateCNPJ(digits);
}

export default function CNPJCPFInput({ value, onChange, label, isInvalid, error }: CNPJCPFInputProps) {
  const [validationError, setValidationError] = useState('');
  const digits = value.replace(/\D/g, '');
  const isComplete = digits.length === 11 || digits.length === 14;

  const handleBlur = () => {
    if (!digits) { setValidationError(''); return; }
    if (digits.length > 0 && digits.length < 11) {
      setValidationError('Documento incompleto');
    } else if (digits.length === 11 && !validateCPF(digits)) {
      setValidationError('CPF inválido');
    } else if (digits.length > 11 && digits.length < 14) {
      setValidationError('Documento incompleto');
    } else if (digits.length === 14 && !validateCNPJ(digits)) {
      setValidationError('CNPJ inválido');
    } else {
      setValidationError('');
    }
  };

  const displayError = error || validationError;
  const showInvalid = isInvalid || !!validationError;
  const showValid = isComplete && !displayError && !showInvalid;

  return (
    <Form.Group>
      {label && <Form.Label>{label}</Form.Label>}
      <Form.Control
        type="text"
        value={formatCNPJCPF(value)}
        onChange={(e) => { onChange(e.target.value.replace(/\D/g, '').slice(0, 14)); setValidationError(''); }}
        onBlur={handleBlur}
        placeholder="000.000.000-00 ou 00.000.000/0001-00"
        isInvalid={showInvalid}
        isValid={showValid}
        maxLength={18}
      />
      {displayError && <Form.Control.Feedback type="invalid">{displayError}</Form.Control.Feedback>}
    </Form.Group>
  );
}
