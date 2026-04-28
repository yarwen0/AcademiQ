import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from './RoleBadge';
import { Button } from './Button';

export function Navbar() {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[var(--line)] bg-[rgba(239,226,196,0.92)] backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 text-[var(--line)]"
        >
          <span className="flex h-9 w-9 items-center justify-center border-2 border-[var(--line)] bg-[var(--accent)] font-bold uppercase tracking-[0.18em] text-[var(--panel)]">
            AQ
          </span>
          <span>
            <span className="retro-kicker block">Campus Exchange</span>
            <span className="retro-title block text-lg leading-none">AcademiQ</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-[0.16em] md:flex">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)] hover:text-[var(--line)]'
            }
          >
            Forum
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to={`/profile/${user?.id}`}
              className={({ isActive }) =>
                isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)] hover:text-[var(--line)]'
              }
            >
              Profile
            </NavLink>
          )}
          {/* A01: Admin link is only shown to admins — backend also enforces this */}
          {role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)] hover:text-[var(--line)]'
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
                  {user?.displayName}
                </span>
                {role && <RoleBadge role={role} />}
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
