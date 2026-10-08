import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/rubik/700.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
/* Base theme first: screen styles imported by the components below must win over it. */
import './ui/theme.css';
import { App } from './App';

/** `?lab` opens the card lab — a tuning tool kept out of the main bundle. */
const CardLab = lazy(() => import('./lab/CardLab').then((module) => ({ default: module.CardLab })));

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has('lab') ? (
      <Suspense fallback={null}>
        <CardLab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
