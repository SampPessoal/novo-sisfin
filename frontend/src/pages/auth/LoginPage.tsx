import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido').min(1, 'E-mail é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  codigo2FA: z.string().optional(),
  empresaId: z.number().optional(),
  lembrar: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

interface EmpresaOption {
  id: number;
  razaoSocial: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaOption[] | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '', lembrar: false },
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);

    try {
      const result = await login(data.email, data.senha, data.empresaId);

      if (result.require2FA) {
        setRequire2FA(true);
        setLoading(false);
        return;
      }

      if (result.empresas) {
        setEmpresas(result.empresas);
        setLoading(false);
        return;
      }

      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      const message =
        axiosErr?.response?.data?.error ??
        axiosErr?.response?.data?.message ??
        'Erro ao realizar login. Verifique suas credenciais.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-3">
        <Form.Label>E-mail</Form.Label>
        <Form.Control
          type="email"
          placeholder="seu@email.com"
          {...register('email')}
          isInvalid={!!errors.email}
          autoFocus
        />
        <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Senha</Form.Label>
        <Form.Control
          type="password"
          placeholder="••••••••"
          {...register('senha')}
          isInvalid={!!errors.senha}
        />
        <Form.Control.Feedback type="invalid">{errors.senha?.message}</Form.Control.Feedback>
      </Form.Group>

      {require2FA && (
        <Form.Group className="mb-3">
          <Form.Label>Código 2FA</Form.Label>
          <Form.Control
            type="text"
            placeholder="000000"
            maxLength={6}
            {...register('codigo2FA')}
          />
        </Form.Group>
      )}

      {empresas && (
        <Form.Group className="mb-3">
          <Form.Label>Selecione a Empresa</Form.Label>
          <Form.Select
            onChange={(e) => setValue('empresaId', Number(e.target.value))}
            isInvalid={!!errors.empresaId}
          >
            <option value="">Selecione...</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.razaoSocial}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      <Form.Group className="mb-3">
        <Form.Check type="checkbox" label="Lembrar-me" {...register('lembrar')} />
      </Form.Group>

      <Button type="submit" variant="primary" className="w-100" disabled={loading}>
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </Form>
  );
}
