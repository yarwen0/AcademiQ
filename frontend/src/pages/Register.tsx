/**
 * Register page.
 *
 * SECURITY DECISIONS:
 *
 * A02 Crypto:
 *   - Same as Login: access token from the registration response is stored in
 *     memory via AuthContext, never in Web Storage.
 *
 * Input validation:
 *   - University email pattern enforced client-side (must end in .edu / .ac.uk etc.).
 *   - Password strength meter provides real-time feedback to encourage strong passwords.
 *   - Confirm-password check ensures user didn't mistype their password.
 *   - Server is authoritative — if backend rejects a field, we surface that error.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import {
  validateRegisterForm,
  validatePasswordStrength,
} from '../utils/validation';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  university: string;
}

interface FormErrors {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

const strengthColors = [
  'bg-[rgba(59,44,27,0.14)]',
  'bg-[var(--danger)]',
  'bg-[var(--accent)]',
  'bg-[var(--gold)]',
  'bg-[var(--olive)]',
];

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export function RegisterPage() {
  const { setAccessToken, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    university: '',
  });
  const [errors, setErrors] = useState<FormErrors>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strengthResult = validatePasswordStrength(form.password);
  const strengthScore = form.password ? strengthResult.score : 0;

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const { valid, errors: formErrors } = validateRegisterForm(form);
    setErrors(formErrors);
    if (!valid) return;

    setIsSubmitting(true);
    try {
      const { accessToken, user } = await authService.register({
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        displayName: form.displayName,
        university: form.university,
      });

      // A02: Token goes to memory only via AuthContext — never Web Storage.
      setAccessToken(accessToken);
      updateUser(user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(message ?? 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="retro-card p-8">
          <div className="mb-6 text-center">
            <p className="retro-kicker">Enrollment Desk</p>
            <h1 className="retro-title mt-3 text-3xl">
              Create account
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Join your university's academic forum
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-4 border-2 border-[var(--danger)] bg-[#fbebe6] p-3 text-sm text-[var(--danger)]"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Display name"
              type="text"
              placeholder="Jane Smith"
              value={form.displayName}
              onChange={setField('displayName')}
              error={errors.displayName}
              autoComplete="name"
              required
            />

            <Input
              label="University email"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={setField('email')}
              error={errors.email}
              hint="Must be a .edu or academic email address."
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />

            <Input
              label="University / Institution"
              type="text"
              placeholder="MIT, Oxford, etc."
              value={form.university}
              onChange={setField('university')}
              autoComplete="organization"
            />

            {/* Password + strength meter */}
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={setField('password')}
                error={errors.password}
                autoComplete="new-password"
                required
              />
              {/* Strength meter */}
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                          level <= strengthScore
                            ? strengthColors[strengthScore]
                            : 'bg-[rgba(59,44,27,0.14)]'
                        }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs font-medium ${
                      strengthScore >= 4
                        ? 'text-[var(--olive)]'
                        : strengthScore >= 3
                          ? 'text-[var(--gold)]'
                          : 'text-[var(--danger)]'
                    }`}
                  >
                    {strengthLabels[strengthScore]}
                  </p>
                </div>
              )}
            </div>

            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Create account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--ink-soft)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold uppercase tracking-[0.12em] text-[var(--accent)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
