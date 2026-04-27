import type { Role } from '../types';

const roleConfig: Record<
  Role,
  { label: string; className: string }
> = {
  student: {
    label: 'Student',
    className: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
  moderator: {
    label: 'Moderator',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  admin: {
    label: 'Admin',
    className: 'bg-red-100 text-red-700 border border-red-200',
  },
};

export function RoleBadge({ role }: { role: Role }) {
  const { label, className } = roleConfig[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
