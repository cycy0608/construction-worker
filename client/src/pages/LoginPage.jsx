import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, MessagePlugin } from 'tdesign-react';
import { verifyPassword } from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      MessagePlugin.warning('请输入密码');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyPassword(password);
      if (res.data.success) {
        localStorage.setItem('admin_token', res.data.token);
        localStorage.setItem('admin_login_time', String(Date.now()));
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      MessagePlugin.error(err.response?.data?.error || '密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5', padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '40px 32px',
        width: '100%', maxWidth: 360, boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>管理后台登录</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>工地临时人员管理系统</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Input
            type="password"
            placeholder="请输入管理员密码"
            value={password}
            onChange={setPassword}
            onKeyDown={handleKeyDown}
            size="large"
            clearable
          />
        </div>

        <Button
          theme="primary"
          block
          size="large"
          loading={loading}
          onClick={handleLogin}
        >
          登录
        </Button>
      </div>
    </div>
  );
}