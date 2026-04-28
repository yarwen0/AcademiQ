import type { Role } from '../types';

const roleConfig: Record<
  Role,
  { label: string; className: string }
> = {
  student: {
    label: 'Student',
    className: 'border-2 border-[var(--line)] bg-[#d7e0bd] text-[#38411a]',
  },
  moderator: {
    label: 'Moderator',
    className: 'border-2 border-[var(--line)] bg-[#ead7ac] text-[#6f5316]',
  },
  admin: {
    label: 'Admin',
    className: 'border-2 border-[var(--line)] bg-[#e0b4a8] text-[#6b2317]',
  },
};

export function RoleBadge({ role }: { role: Role }) {
  const { label, className } = roleConfig[role];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  );
}
