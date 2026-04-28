import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-none border-2 px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[rgba(109,90,68,0.75)]',
            'transition-colors duration-150 focus:outline-none',
            error
              ? 'border-[var(--danger)] bg-[#fbebe6]'
              : 'border-[var(--line)] bg-[rgba(255,252,242,0.72)] hover:bg-[rgba(255,252,242,0.96)]',
            className,
          ].join(' ')}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--ink-soft)]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
