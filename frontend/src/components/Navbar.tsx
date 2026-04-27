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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-indigo-600"
        >
          <span className="text-2xl">📚</span>
          AcademiQ
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
            }
          >
            Forum
          </NavLink>
          {isAuthenticated && (
            <NavLink
              to={`/profile/${user?.id}`}
              className={({ isActive }) =>
                isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
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
                isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
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
                <span className="text-sm font-medium text-slate-700">
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
