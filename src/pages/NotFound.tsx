import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl">📭</span>
      <h1 className="text-3xl font-bold text-slate-800">Page Not Found</h1>
      <p className="max-w-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="secondary">Back to Forum</Button>
      </Link>
    </div>
  );
}
