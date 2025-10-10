import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './store/contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SuspenseWrapper } from './components/common/SuspenseWrapper';
import App from './App.tsx';
import './index.css';

console.log(localStorage.getItem('accessToken'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SuspenseWrapper>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </SuspenseWrapper>
  </StrictMode>
);
