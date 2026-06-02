import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Automatically handle Vite production chunk loading errors gracefully
window.addEventListener('vite:preloadError', () => {
  console.warn('Vite preload error detected! Force-reloading the platform to load fresh assets...');
  window.location.reload();
});

// Intercept general script loading errors for /assets/ resources
window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement;
  if (target && target.tagName === 'SCRIPT') {
    const src = (target as HTMLScriptElement).src || '';
    if (src.includes('/assets/')) {
      console.warn('Vite asset script load failure! Force-reloading the platform...');
      window.location.reload();
    }
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

