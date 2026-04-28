import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'border-2 border-[var(--line)] bg-[var(--accent)] text-[var(--panel)] shadow-[3px_3px_0_rgba(59,44,27,0.18)] hover:bg-[var(--accent-strong)] disabled:bg-[color:color-mix(in_srgb,var(--accent)_55%,white)]',
  secondary:
    'border-2 border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] shadow-[3px_3px_0_rgba(59,44,27,0.12)] hover:bg-[var(--paper-strong)] disabled:opacity-50',
  danger:
    'border-2 border-[var(--line)] bg-[var(--danger)] text-[var(--panel)] shadow-[3px_3px_0_rgba(59,44,27,0.18)] hover:bg-[#6f2519] disabled:bg-[color:color-mix(in_srgb,var(--danger)_55%,white)]',
  ghost:
    'border-2 border-transparent bg-transparent text-[var(--ink-soft)] hover:border-[rgba(59,44,27,0.28)] hover:bg-[rgba(248,241,220,0.5)] disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-none font-semibold uppercase tracking-[0.16em]',
        'transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
}
