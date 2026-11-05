import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.addEventListener('focusin', event => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.type === 'number') {
    requestAnimationFrame(() => input.select());
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
