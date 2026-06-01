import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function Navbar() {
  const { user, logout } = useAuthStore();

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      isActive
        ? 'bg-sprint-orange text-navy-900'
        : 'text-slate-300 hover:text-white hover:bg-white/5'
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/80 backdrop-blur">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <Logo />
          <span className="font-display text-2xl tracking-wider text-white group-hover:text-sprint-orange transition">
            SPRINT AI
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {user ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/capture"   className={linkClass}>Capture</NavLink>
              <NavLink to="/upload"    className={linkClass}>Upload</NavLink>
              <NavLink to="/sessions"  className={linkClass}>Sessions</NavLink>
              <NavLink to="/athletes"  className={linkClass}>Athletes</NavLink>
              {user.role === 'ADMIN' && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
              <span className="text-sm text-slate-400 ml-3 hidden sm:inline">
                {user.displayName}
              </span>
              <button onClick={logout} className="btn-ghost text-sm ml-2">Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>Login</NavLink>
              <Link to="/register" className="btn-primary text-sm">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="15" stroke="#1ec5c5" strokeWidth="1.5" />
      {/* Stylized sprinter mark */}
      <path
        d="M9 22 L13 16 L11 13 L16 11 L19 14 L17 18 L22 22"
        stroke="#f5a623"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="9" r="2" fill="#f5a623" />
    </svg>
  );
}
