import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './router';
import { ToastProvider } from './components/Toast/Toast';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </Router>
  );
}

export default App;
