import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      addToast('success', 'Welcome back!', 'Logged in successfully');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5 px-3">
      <div className="card shadow-sm border-0" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="card-body p-4 p-sm-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div
              className="bg-primary rounded-3 d-inline-flex align-items-center justify-content-center text-white mb-3"
              style={{ width: '48px', height: '48px' }}
            >
              <i className="bi bi-calendar2-check-fill fs-4" aria-hidden="true" />
            </div>
            <h4 className="fw-bold text-dark mb-1">Leave Management System</h4>
            <p className="text-muted small">Exelon Circuits Pvt. Ltd. Enterprise Portal</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
              <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true" />
              <div>{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary" htmlFor="emailInput">
                Work Email Address
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-secondary">
                  <i className="bi bi-envelope" aria-hidden="true" />
                </span>
                <input
                  id="emailInput"
                  type="email"
                  className="form-control border-start-0 ps-0"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary" htmlFor="passwordInput">
                Password
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-secondary">
                  <i className="bi bi-lock" aria-hidden="true" />
                </span>
                <input
                  id="passwordInput"
                  type="password"
                  className="form-control border-start-0 ps-0"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold mb-3 shadow-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Signing In...
                </>
              ) : (
                'Sign In to LMS'
              )}
            </button>
          </form>

          {/* Demo Credentials Section */}
          <div className="pt-3 border-top mt-4">
            <p className="text-muted small fw-medium text-uppercase text-center mb-2" style={{ fontSize: '11px' }}>
              Quick Fill Demo Credentials
            </p>
            <div className="d-grid gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-between text-start"
                onClick={() => fillCredentials('melroy.pinto@exeloncircuits.com', 'Exelon@12345')}
              >
                <span>
                  <i className="bi bi-shield-lock me-2 text-primary" aria-hidden="true" />
                  <span className="fw-semibold">Director / Admin:</span> melroy.pinto@exeloncircuits.com
                </span>
                <span className="badge bg-secondary-subtle text-secondary small">Click to fill</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-between text-start"
                onClick={() => fillCredentials('goutham.kumar@exeloncircuits.com', 'Exelon@12345')}
              >
                <span>
                  <i className="bi bi-person-gear me-2 text-info" aria-hidden="true" />
                  <span className="fw-semibold">Manager / Lead:</span> goutham.kumar@exeloncircuits.com
                </span>
                <span className="badge bg-secondary-subtle text-secondary small">Click to fill</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-between text-start"
                onClick={() => fillCredentials('pratheeksha.karkera@exeloncircuits.com', 'Exelon@12345')}
              >
                <span>
                  <i className="bi bi-person me-2 text-success" aria-hidden="true" />
                  <span className="fw-semibold">Employee:</span> pratheeksha.karkera@exeloncircuits.com
                </span>
                <span className="badge bg-secondary-subtle text-secondary small">Click to fill</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
