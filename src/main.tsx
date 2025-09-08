import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

/** Mounts the React application into the document root. */
function mountApp(): void {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found.');
  }
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

mountApp();
