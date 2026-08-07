import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App';

import { ThemeProvider } from './context/ThemeContext';
import { WallpaperProvider } from './context/WallpaperContext';
import { AuthProvider } from './context/AuthContext';
import { KeyboardProvider } from './context/KeyboardContext';
import { UnreadProvider } from './context/UnreadContext';

import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
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
