import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

// Styles: Bootstrap CSS, Bootstrap Icons, and LMS Design System
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
