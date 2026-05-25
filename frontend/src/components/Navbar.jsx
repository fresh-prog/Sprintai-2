import { Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function Navbar() {
  const { user, logout } = useAuthStore();

  const linkClass = ({ isActive }) =>
    `px-3 py-1 rounded-lg text-sm ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-200'}`;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-3">
        <Link to="/" className="font-bold text-lg text-brand-700">SprintAI</Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
              <NavLink to="/capture" className={linkClass}>Capture</NavLink>
              <NavLink to="/sessions" className={linkClass}>Sessions</NavLink>
              {user.role === 'ADMIN' && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
              <span className="text-sm text-slate-500 ml-3">{user.displayName}</span>
              <button onClick={logout} className="btn-secondary text-sm">Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>Login</NavLink>
              <NavLink to="/register" className={linkClass}>Register</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
