import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import DisplayPage from './pages/DisplayPage';
import AdminPage from './pages/AdminPage';
import ServiceConfigPage from './pages/ServiceConfigPage';
import AdminLayout from './components/AdminLayout';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/config" element={<ServiceConfigPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
