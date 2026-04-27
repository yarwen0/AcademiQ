import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl">🚫</span>
      <h1 className="text-3xl font-bold text-slate-800">Access Denied</h1>
      <p className="max-w-sm text-slate-500">
        You don&apos;t have permission to view this page. If you believe this is
        a mistake, please contact a moderator.
      </p>
      <Link to="/">
        <Button variant="secondary">Go to Forum</Button>
      </Link>
    </div>
  );
}
