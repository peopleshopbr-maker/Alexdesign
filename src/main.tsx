import { StudioIntelligenceProvider } from './context/StudioIntelligenceContext';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StudioIntelligenceProvider>
    <App />
  </StudioIntelligenceProvider>
);
