import { Link } from 'react-router-dom';
import { Form } from 'react-bootstrap';
import { BsPlusCircle } from 'react-icons/bs';

interface SelectLabelProps {
  label: string;
  href: string;
  linkText?: string;
  required?: boolean;
}

export default function SelectLabel({ label, href, linkText = 'Novo', required }: SelectLabelProps) {
  return (
    <Form.Label className="d-flex align-items-center justify-content-between">
      {label}{required && ' *'}
      <Link
        to={href}
        target="_blank"
        title={`Cadastrar ${label.toLowerCase()}`}
        className="text-primary d-inline-flex align-items-center gap-1 small text-decoration-none"
      >
        <BsPlusCircle /> {linkText}
      </Link>
    </Form.Label>
  );
}
