import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App';

import { ThemeProvider } from './context/ThemeContext';
import { WallpaperProvider } from './context/WallpaperContext';
import { AuthProvider } from './context/AuthContext';

import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

function registerAutoRefresh() {
  const buildId = import.meta.env.VITE_BUILD_ID || `${Date.now()}`;
  const lastKnown = sessionStorage.getItem('app-build-id');

  if (lastKnown && lastKnown !== buildId) {
    window.location.reload();
  }

  sessionStorage.setItem('app-build-id', buildId);

  window.addEventListener('focus', () => {
    const currentBuild = sessionStorage.getItem('app-build-id');
    if (currentBuild && currentBuild !== buildId) {
      window.location.reload();
    }
  });
}

registerAutoRefresh();

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <WallpaperProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </WallpaperProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);