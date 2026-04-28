/**
 * Login page.
 *
 * SECURITY DECISIONS:
 *
 * A02 Crypto: On successful login, the access token returned from the server
 *   is stored ONLY in AuthContext (memory). It is never passed to localStorage,
 *   sessionStorage, or any cookie from the client side.
 *
 * A07 Identification/Authentication Failures:
 *   - 5-attempt lockout: the backend returns HTTP 429 with a specific error code.
 *     We detect this and show a friendly error message so the user understands
 *     what happened rather than seeing a generic failure.
 *   - We do NOT implement client-side lockout because the client can be bypassed.
 *     The backend is authoritative for rate limiting.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { validateLoginForm } from '../utils/validation';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface FormErrors {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // Redirect to the page the user originally tried to access, or home.
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const { valid, errors: formErrors } = validateLoginForm(email, password);
    setErrors(formErrors);
    if (!valid) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { code?: string; message?: string } } })
        ?.response?.status;
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      if (status === 429 || code === 'RATE_LIMITED') {
        setIsLockedOut(true);
        setServerError(
          'Too many failed login attempts. Your account is temporarily locked. Please try again later or contact support.',
        );
      } else if (status === 401) {
        setServerError('Incorrect email or password.');
      } else {
        setServerError(message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="retro-card p-8">
          <div className="mb-6 text-center">
            <p className="retro-kicker">Member Access</p>
            <h1 className="retro-title mt-3 text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Sign in to your AcademiQ account
            </p>
          </div>

          {/* Lockout alert */}
          {isLockedOut && (
            <div
              role="alert"
              className="mb-4 border-2 border-[var(--danger)] bg-[#fbebe6] p-3 text-sm text-[var(--danger)]"
            >
              <strong>Account locked.</strong> Too many failed attempts.
              Please wait before trying again.
            </div>
          )}

          {/* Server error */}
          {serverError && !isLockedOut && (
            <div
              role="alert"
              className="mb-4 border-2 border-[var(--danger)] bg-[#fbebe6] p-3 text-sm text-[var(--danger)]"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="University email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              disabled={isLockedOut}
            >
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold uppercase tracking-[0.12em] text-[var(--accent)] hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
