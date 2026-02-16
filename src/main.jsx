import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import 'mapbox-gl/dist/mapbox-gl.css';
import App from './App';
import './index.css';
import './styles.css';

const AdminApp = lazy(() => import('./AdminApp'));

function shouldRenderAdminPanel() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const forceAdmin = window.location.search.includes('admin=1');
  return forceAdmin || host === 'painel.muusic.live' || host.startsWith('painel.');
}

const RootComponent = shouldRenderAdminPanel() ? AdminApp : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Carregando...</div>}>
      <RootComponent />
    </Suspense>
  </React.StrictMode>
);
