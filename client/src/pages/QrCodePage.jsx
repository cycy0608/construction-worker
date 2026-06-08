import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, MessagePlugin } from 'tdesign-react';
import QRCode from 'qrcode';

export default function QrCodePage() {
  const navigate = useNavigate();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [registerUrl, setRegisterUrl] = useState('');

  useEffect(() => {
    // 先获取公共URL（外网地址或局域网地址）
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        const url = data.publicUrl + '/register';
        setRegisterUrl(url);

        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, url, {
          width: 260,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        }, (err) => {
          if (err) {
            console.error('二维码生成失败:', err);
            return;
          }
          setQrDataUrl(canvas.toDataURL());
        });
      })
      .catch(() => {
        // 降级：使用当前页面地址
        const url = window.location.origin + '/register';
        setRegisterUrl(url);
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, url, { width: 260, margin: 2 }, (err) => {
          if (!err) setQrDataUrl(canvas.toDataURL());
        });
      });
  }, []);

  return (
    <div className="qrcode-container">
      <div className="qrcode-title">工地临时人员进场登记</div>
      <div className="qrcode-subtitle">请使用手机扫描二维码进行登记</div>

      <div className="qrcode-box">
        {qrDataUrl && <img src={qrDataUrl} alt="登记二维码" style={{ width: 260, height: 260 }} />}
      </div>

      <div className="qrcode-hint" style={{ marginTop: 24, wordBreak: 'break-all' }}>
        登记链接：{registerUrl}
      </div>
      <div className="qrcode-hint" style={{ marginTop: 8 }}>
        扫一扫，填写身份信息、班组、体检情况，确认安全须知即可进场
      </div>

      <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
        <Button theme="default" onClick={() => navigate('/register')}>
          模拟手机登记
        </Button>
        <Button theme="primary" onClick={() => navigate('/admin')}>
          进入管理后台
        </Button>
      </div>
    </div>
  );
}