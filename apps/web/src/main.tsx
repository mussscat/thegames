import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CardLab } from './lab/CardLab';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('lab') ? <CardLab /> : <App />}
  </StrictMode>,
);
