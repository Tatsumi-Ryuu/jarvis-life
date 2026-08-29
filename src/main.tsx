import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

if (import.meta.env.DEV) {
  const devRouteAliases: Record<string, string> = {
    '/dev/design-system': '/dev/design-system',
    '/dev/design-system-confirmed': '/dev/design-system-confirmed',
  };
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const targetHashRoute = devRouteAliases[pathname];

  if (targetHashRoute && window.location.hash !== `#${targetHashRoute}`) {
    window.location.replace(`${window.location.origin}${window.location.pathname}#${targetHashRoute}`);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
