import { useState, useCallback, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  isInvalid?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

function formatDisplay(val: number) {
  if (!val && val !== 0) return '';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CurrencyInput({ value, onChange, label, isInvalid, error, placeholder, disabled }: CurrencyInputProps) {
  const [display, setDisplay] = useState(formatDisplay(value));
  const internalRef = useRef(value);

  useEffect(() => {
    if (value !== internalRef.current) {
      setDisplay(formatDisplay(value));
      internalRef.current = value;
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (!raw) { setDisplay(''); internalRef.current = 0; onChange(0); return; }
    const numVal = parseInt(raw) / 100;
    setDisplay(numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    internalRef.current = numVal;
    onChange(numVal);
  }, [onChange]);

  return (
    <Form.Group>
      {label && <Form.Label>{label}</Form.Label>}
      <div className="input-group">
        <span className="input-group-text">R$</span>
        <Form.Control
          type="text"
          value={display}
          onChange={handleChange}
          placeholder={placeholder || '0,00'}
          isInvalid={isInvalid}
          disabled={disabled}
        />
        {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
      </div>
    </Form.Group>
  );
}
