import { lazy, Suspense, useCallback } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import ProtectedRoute from '@/components/ProtectedRoute';
import CallModal from '@/components/CallModal';

const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordScreen = lazy(() => import('@/pages/ForgotPasswordScreen'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const StatusPage = lazy(() => import('@/pages/StatusPage'));
const NotesPage = lazy(() => import('@/pages/NotesPage'));

const GroupChatPage = lazy(() => import('@/components/GroupChatPage'));
const SecretChatPage = lazy(() => import('@/pages/SecretChatPage'));

function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#050505' }}
    >
      <div className="w-7 h-7 border-[2.5px] border-white/20 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );
}

const pageTransition = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.995 },
};

const pageTransitionFast = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

function PageTransition({ children, fast }: { children: React.ReactNode; fast?: boolean }) {
  const t = fast ? pageTransitionFast : pageTransition;
  return (
    <motion.div
      initial={t.initial}
      animate={t.animate}
      exit={t.exit}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function GroupChatPageLoader() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (!groupId) {
    return <Navigate to="/" replace />;
  }

  return (
    <GroupChatPage
      groupId={groupId}
      onBack={handleBack}
    />
  );
}

function GroupChatRoute() {
  return (
    <ProtectedRoute>
      <PageTransition><GroupChatPageLoader /></PageTransition>
    </ProtectedRoute>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  useViewportHeight();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>

          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : (
                <PageTransition><AuthPage /></PageTransition>
              )
            }
          />

          <Route
            path="/register"
            element={
              user ? <Navigate to="/" replace /> : (
                <PageTransition><AuthPage /></PageTransition>
              )
            }
          />

          <Route
            path="/forgot-password"
            element={
              user ? <Navigate to="/" replace /> : (
                <PageTransition><ForgotPasswordScreen /></PageTransition>
              )
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PageTransition><HomePage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <PageTransition><NotesPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PageTransition fast><ProfilePage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <PageTransition fast><SettingsPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/status"
            element={
              <ProtectedRoute>
                <PageTransition fast><StatusPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <PageTransition><SecretChatPage /></PageTransition>
              </ProtectedRoute>
            }
          />

          <Route
            path="/group/:groupId"
            element={<GroupChatRoute />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to={user ? "/" : "/login"}
                replace
              />
            }
          />

        </Routes>
      </AnimatePresence>

      {user && <CallModal />}

    </Suspense>
  );
}
