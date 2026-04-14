import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>💼 SISFIN</h1>
          <p>Sistema Financeiro Integrado</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
