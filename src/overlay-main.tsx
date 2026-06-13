import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayApp } from './components/OverlayApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
  <React.StrictMode>
    <OverlayApp />
  </React.StrictMode>
);
