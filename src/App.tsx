import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import TopNavigation from '@/components/TopNavigation';
import CallModal from '@/components/CallModal';
import useIsMobile from '@/hooks/useIsMobile';

const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordScreen = lazy(() => import('@/pages/ForgotPasswordScreen'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const StatusPage = lazy(() => import('@/pages/StatusPage'));
const NotesPage = lazy(() => import('@/pages/NotesPage'));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'));

const GroupChatPage = lazy(() => import('@/components/GroupChatPage'));
const SecretChatPage = lazy(() => import('@/pages/SecretChatPage'));

/** Order of the main mobile tabs — used for swipe navigation + slide direction. */
const TAB_PATHS = ['/', '/documents', '/settings'];

function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-7 h-7 border-[2.5px] border-[var(--accent-primary)]/20 border-t-[var(--accent-primary)] rounded-full animate-spin" />
    </div>
  );
}

const pageVariants: Variants = {
  enter: (d: number) => ({ opacity: 1, x: d >= 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -56 : 56 }),
};

const pageTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

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
      <GroupChatPageLoader />
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const currentTabIndex = TAB_PATHS.indexOf(location.pathname);
  const prevTabIndexRef = useRef(currentTabIndex >= 0 ? currentTabIndex : 0);

  let direction = 1;
  if (currentTabIndex >= 0 && prevTabIndexRef.current >= 0 && currentTabIndex < prevTabIndexRef.current) {
    direction = -1;
  }

  useEffect(() => {
    if (currentTabIndex >= 0) prevTabIndexRef.current = currentTabIndex;
  }, [currentTabIndex]);

  const isChatOpen = location.pathname === '/' && location.search.includes('c=');
  const swipeEnabled = isMobile && currentTabIndex >= 0 && !isChatOpen;

  const handleSwipe = useCallback(
    (dir: 1 | -1) => {
      if (currentTabIndex < 0) return;
      const next = currentTabIndex + dir;
      if (next < 0 || next >= TAB_PATHS.length) return;
      navigate(TAB_PATHS[next]);
    },
    [currentTabIndex, navigate],
  );

  if (user) {
    return (
      <div className="app-frame">
        {!isChatOpen && <TopNavigation />}
        <main className="app-page">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={location.pathname}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              drag={swipeEnabled ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              dragMomentum={false}
              style={{ touchAction: 'pan-y' }}
              onDragEnd={(_, info) => {
                if (!swipeEnabled) return;
                const w = window.innerWidth || 1;
                const threshold = w * 0.15;
                const swipedLeft = info.offset.x < -threshold || info.velocity.x < -400;
                const swipedRight = info.offset.x > threshold || info.velocity.x > 400;
                if (swipedLeft) handleSwipe(1);
                else if (swipedRight) handleSwipe(-1);
              }}
              className="relative h-full w-full"
            >
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/notes"
                  element={
                    <ProtectedRoute>
                      <NotesPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/status"
                  element={
                    <ProtectedRoute>
                      <StatusPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <DocumentsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/secret"
                  element={
                    <ProtectedRoute>
                      <SecretChatPage />
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
                    <Navigate to="/" replace />
                  }
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>

        <Route
          path="/login"
          element={
            <PageTransition><AuthPage /></PageTransition>
          }
        />

        <Route
          path="/register"
          element={
            <PageTransition><AuthPage /></PageTransition>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PageTransition><ForgotPasswordScreen /></PageTransition>
          }
        />

        <Route
          path="*"
          element={
            <Navigate to="/login" replace />
          }
        />

      </Routes>
    </AnimatePresence>
  );
}

function PageTransition({ children, fast }: { children: React.ReactNode; fast?: boolean }) {
  const t = fast ? pageTransitionFast : pageTransitionFade;
  return (
    <motion.div
      initial={t.initial}
      animate={t.animate}
      exit={t.exit}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

const pageTransitionFast = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

const pageTransitionFade = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.995 },
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />

      {user && <CallModal />}
    </Suspense>
  );
}
