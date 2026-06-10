import { Routes, Route, Navigate } from 'react-router-dom';
import QrCodePage from './pages/QrCodePage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

function AdminGuard({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/qrcode" replace />} />
      <Route path="/qrcode" element={<QrCodePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
    </Routes>
  );
}