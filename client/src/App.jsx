import { Routes, Route, Navigate } from 'react-router-dom';
import QrCodePage from './pages/QrCodePage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/qrcode" replace />} />
      <Route path="/qrcode" element={<QrCodePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/qrcode" replace />} />
    </Routes>
  );
}