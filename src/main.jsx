import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import BuilderApp from './BuilderApp.jsx';
import { store } from './store/builderStore.js';
import './style.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BuilderApp />
    </Provider>
  </React.StrictMode>,
);
