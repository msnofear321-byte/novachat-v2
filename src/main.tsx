import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App';

import ErrorBoundary from './components/ErrorBoundary';

import { ThemeProvider } from './context/ThemeContext';
import { WallpaperProvider } from './context/WallpaperContext';
import { AuthProvider } from './context/AuthContext';
import { UnreadProvider } from './context/UnreadContext';
import { KeyboardProvider } from './context/KeyboardContext';

import './index.css';

function registerAutoRefresh() {
  const buildId = import.meta.env.VITE_BUILD_ID || 'novachat-stable';
  const storedBuildId = sessionStorage.getItem('app-build-id');

  if (storedBuildId && storedBuildId !== buildId) {
    sessionStorage.setItem('app-build-id', buildId);
    window.location.reload();
    return;
  }

  sessionStorage.setItem('app-build-id', buildId);
}

registerAutoRefresh();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <WallpaperProvider>
            <AuthProvider>
              <UnreadProvider>
                <KeyboardProvider>
                  <App />
                </KeyboardProvider>
              </UnreadProvider>
            </AuthProvider>
          </WallpaperProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
