import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Capture from './pages/Capture.jsx';
import Upload from './pages/Upload.jsx';
import Sessions from './pages/Sessions.jsx';
import SessionDetail from './pages/SessionDetail.jsx';
import Athletes from './pages/Athletes.jsx';
import Admin from './pages/Admin.jsx';

function Protected({ children, admin = false }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="p-10 text-center text-slate-300">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

// On `/`, show the marketing landing for guests and the dashboard for users.
function Home() {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="p-10 text-center text-slate-300">Loading…</div>;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => { bootstrap(); }, [bootstrap]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <PageContainer>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/capture" element={<Protected><Capture /></Protected>} />
            <Route path="/upload" element={<Protected><Upload /></Protected>} />
            <Route path="/athletes" element={<Protected><Athletes /></Protected>} />
            <Route path="/sessions" element={<Protected><Sessions /></Protected>} />
            <Route path="/sessions/:id" element={<Protected><SessionDetail /></Protected>} />
            <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}

// Marketing pages get a full-bleed container; app pages get the padded layout.
function PageContainer({ children }) {
  const { pathname } = useLocation();
  const isFullBleed = pathname === '/' || pathname === '/login' || pathname === '/register';
  if (isFullBleed) return children;
  return <div className="max-w-7xl w-full mx-auto p-6">{children}</div>;
}
