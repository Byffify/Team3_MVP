import React from 'react';
import { createRoot } from 'react-dom/client';
import Landing from './Landing';
import './styles.css';

function redirectLegacyRoute(): boolean {
  if (!/^#(?:new|vehicle\/)/.test(location.hash)) return false;
  location.replace(`/app.html${location.hash}`);
  return true;
}
window.addEventListener('hashchange', redirectLegacyRoute);
import.meta.hot?.dispose(() => window.removeEventListener('hashchange', redirectLegacyRoute));
if (!redirectLegacyRoute()) {
  createRoot(document.getElementById('root')!).render(<React.StrictMode><Landing /></React.StrictMode>);
}
