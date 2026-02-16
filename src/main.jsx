import React from 'react';
import ReactDOM from 'react-dom/client';
import 'mapbox-gl/dist/mapbox-gl.css';
import App from './App';
import AdminApp from './AdminApp';
import './index.css';
import './styles.css';
import './styles/admin.css';

function shouldRenderAdminPanel() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const forceAdmin = window.location.search.includes('admin=1');
  return forceAdmin || host === 'painel.muusic.live' || host.startsWith('painel.');
}

const RootComponent = shouldRenderAdminPanel() ? AdminApp : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
