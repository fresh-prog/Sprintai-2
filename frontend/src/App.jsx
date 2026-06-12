import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuthStore } from './store/authStore.js';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Heavy pages (charts, 3D, Leaflet, MediaPipe) are split into their own
// chunks so the first paint isn't blocked by libraries the user may never hit.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Capture = lazy(() => import('./pages/Capture.jsx'));
const Upload = lazy(() => import('./pages/Upload.jsx'));
const Sessions = lazy(() => import('./pages/Sessions.jsx'));
const SessionDetail = lazy(() => import('./pages/SessionDetail.jsx'));
const Athletes = lazy(() => import('./pages/Athletes.jsx'));
const TalentMap = lazy(() => import('./pages/TalentMap.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

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
          <Suspense fallback={<div className="p-10 text-center text-slate-300">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/capture" element={<Protected><Capture /></Protected>} />
            <Route path="/upload" element={<Protected><Upload /></Protected>} />
            <Route path="/athletes" element={<Protected><Athletes /></Protected>} />
            <Route path="/talent-map" element={<Protected><TalentMap /></Protected>} />
            <Route path="/sessions" element={<Protected><Sessions /></Protected>} />
            <Route path="/sessions/:id" element={<Protected><SessionDetail /></Protected>} />
            <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
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
