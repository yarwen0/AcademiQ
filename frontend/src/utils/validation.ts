/**
 * validation.ts — Reusable client-side validation rules.
 *
 * All forms validate on the client before submitting.
 * Server-side validation is the authoritative layer; client validation
 * is a UX improvement, not a security control.
 */

export interface ValidationResult {
  valid: boolean;
  error: string;
}

const ok = (): ValidationResult => ({ valid: true, error: '' });
const fail = (error: string): ValidationResult => ({ valid: false, error });

// ---- Individual rules ----

export function validateRequired(value: string, fieldName = 'Field'): ValidationResult {
  return value.trim().length > 0 ? ok() : fail(`${fieldName} is required.`);
}

/**
 * University email validation:
 *   - Must be a valid email format.
 *   - Must end with .edu (or common academic TLDs like .ac.uk, .edu.au).
 *   - Regex is intentionally conservative — the backend is authoritative.
 */
export function validateUniversityEmail(email: string): ValidationResult {
  if (!email) return fail('Email is required.');

  const emailFormatResult = validateEmailFormat(email);
  if (!emailFormatResult.valid) return emailFormatResult;

  const academicTLDs = /\.(edu|ac\.uk|edu\.au|edu\.ca|ac\.nz|ac\.in)$/i;
  if (!academicTLDs.test(email)) {
    return fail('Must be a university email (e.g. name@university.edu).');
  }

  return ok();
}

export function validateEmailFormat(email: string): ValidationResult {
  if (!email) return fail('Email is required.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return fail('Enter a valid email address.');

  return ok();
}

/**
 * Password strength validation.
 * Returns a score (0–4) alongside validation result.
 * Requirements: ≥8 chars, uppercase, lowercase, digit, special char.
 */
export interface PasswordStrength extends ValidationResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const passed = checks.filter(Boolean).length as 0 | 1 | 2 | 3 | 4;

  const labels: PasswordStrength['label'][] = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const label = labels[Math.min(passed, 4)];

  if (passed < 3) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
      score: passed as 0 | 1 | 2 | 3 | 4,
      label,
    };
  }

  return { valid: true, error: '', score: passed as 0 | 1 | 2 | 3 | 4, label };
}

export function validateConfirmPassword(
  password: string,
  confirm: string,
): ValidationResult {
  return password === confirm ? ok() : fail('Passwords do not match.');
}

export function validateDisplayName(name: string): ValidationResult {
  if (!name.trim()) return fail('Display name is required.');
  if (name.trim().length < 2) return fail('Display name must be at least 2 characters.');
  if (name.trim().length > 50) return fail('Display name must be 50 characters or fewer.');
  // Prevent HTML/script injection in display names
  if (/<[^>]+>/.test(name)) return fail('Display name contains invalid characters.');
  return ok();
}

export function validateThreadTitle(title: string): ValidationResult {
  if (!title.trim()) return fail('Title is required.');
  if (title.trim().length < 5) return fail('Title must be at least 5 characters.');
  if (title.trim().length > 200) return fail('Title must be 200 characters or fewer.');
  return ok();
}

export function validateThreadContent(content: string): ValidationResult {
  if (!content.trim()) return fail('Post content is required.');
  if (content.trim().length < 20) return fail('Post must be at least 20 characters.');
  if (content.trim().length > 50000) return fail('Post is too long (max 50,000 characters).');
  return ok();
}

export function validateCommentContent(content: string): ValidationResult {
  if (!content.trim()) return fail('Comment cannot be empty.');
  if (content.trim().length > 10000) return fail('Comment is too long (max 10,000 characters).');
  return ok();
}

// ---- Composite form validators ----

export interface LoginFormErrors {
  email: string;
  password: string;
}

export function validateLoginForm(
  email: string,
  password: string,
): { valid: boolean; errors: LoginFormErrors } {
  const emailResult = validateEmailFormat(email);
  const passwordResult = validateRequired(password, 'Password');

  return {
    valid: emailResult.valid && passwordResult.valid,
    errors: {
      email: emailResult.error,
      password: passwordResult.error,
    },
  };
}

export interface RegisterFormErrors {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export function validateRegisterForm(fields: {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}): { valid: boolean; errors: RegisterFormErrors } {
  const emailResult = validateUniversityEmail(fields.email);
  const passwordResult = validatePasswordStrength(fields.password);
  const confirmResult = validateConfirmPassword(fields.password, fields.confirmPassword);
  const nameResult = validateDisplayName(fields.displayName);

  return {
    valid:
      emailResult.valid &&
      passwordResult.valid &&
      confirmResult.valid &&
      nameResult.valid,
    errors: {
      email: emailResult.error,
      password: passwordResult.error,
      confirmPassword: confirmResult.error,
      displayName: nameResult.error,
    },
  };
}
