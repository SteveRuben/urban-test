import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css';
import App from './App.tsx'
// Import Firebase configuration (this initializes Firebase)
import './config/firebase';
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider> 
    <App />
    </HelmetProvider>
  </StrictMode>,
)
