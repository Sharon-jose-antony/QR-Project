import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  return (
    <div className="password-strength mt-2">
      <div className="strength-bars">
        {[1,2,3,4].map(i => (
          <div
            key={i}
            className="strength-bar"
            style={{
              background: i <= score
                ? score === 4 ? 'var(--color-risk-low)'
                : score === 3 ? 'var(--color-risk-medium)'
                : score === 2 ? 'var(--color-risk-high)'
                : 'var(--color-risk-critical)'
                : 'var(--bg-elevated)',
            }}
          />
        ))}
      </div>
      <div className="strength-checks">
        {checks.map((c, i) => (
          <span key={i} className={`strength-check ${c.ok ? 'ok' : ''}`}>
            {c.ok ? <CheckCircle size={10} /> : <span className="dot" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, username, password);
      // Auto-login after register
      await login(email, password);
      toast.success('Account created! Welcome to QRGuard.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page flex items-center justify-center">
      <div className="auth-card glass-card animate-fade-up">
        <div className="auth-header">
          <div className="logo-icon">
            <Shield size={20} />
          </div>
          <h1 style={{ fontSize: '1.5rem' }}>Create your account</h1>
          <p className="text-secondary text-sm">Free forever · No credit card needed</p>
        </div>

        {error && (
          <div className="alert alert-danger mb-4">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label htmlFor="reg-email" className="form-label">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group mb-4">
            <label htmlFor="reg-username" className="form-label">Username</label>
            <input
              id="reg-username"
              type="text"
              className="form-input"
              placeholder="e.g. defender42"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(null); }}
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="^[a-zA-Z0-9_-]+$"
              required
            />
            <span className="form-hint text-xs text-muted">Letters, numbers, _ and - only</span>
          </div>

          <div className="form-group mb-6">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <div className="password-wrap">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && <PasswordStrength password={password} />}
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account…</>
              : 'Create free account'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-sm text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
