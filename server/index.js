require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const workersRouter = require('./routes/workers');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 绕过localtunnel的提醒页面
app.use((req, res, next) => {
  res.setHeader('Bypass-Tunnel-Reminder', 'true');
  next();
});

// 静态文件服务（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/workers', workersRouter);

// 获取公共URL配置（用于二维码生成）
const fs = require('fs');
app.get('/api/config', (req, res) => {
  try {
    const tunnelUrl = fs.readFileSync(path.join(__dirname, '.tunnel-url'), 'utf-8').trim();
    res.json({ publicUrl: tunnelUrl });
  } catch (e) {
    // 没有隧道，返回局域网地址
    const localIP = getLocalIP();
    res.json({ publicUrl: `http://${localIP}:${PORT}` });
  }
});

// 生产环境：托管前端静态文件
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

// 获取本机局域网IP（优先选择192.168.x.x）
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push(iface.address);
      }
    }
  }
  // 优先选择常见的局域网IP段
  const preferred = candidates.find(ip => ip.startsWith('192.168.'));
  if (preferred) return preferred;
  const second = candidates.find(ip => ip.startsWith('10.'));
  if (second) return second;
  const third = candidates.find(ip => ip.startsWith('172.'));
  if (third) return third;
  return candidates[0] || 'localhost';
}

app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log('========================================');
  console.log('  工地临时人员管理系统已启动');
  console.log('========================================');
  console.log(`  本机访问: http://localhost:${PORT}`);
  console.log(`  局域网访问: http://${localIP}:${PORT}`);
  console.log('----------------------------------------');
  console.log(`  二维码展示: http://${localIP}:${PORT}/qrcode`);
  console.log(`  人员登记:   http://${localIP}:${PORT}/register`);
  console.log(`  管理后台:   http://${localIP}:${PORT}/admin`);
  console.log('========================================');
  if (!process.env.BAIDU_OCR_API_KEY) {
    console.log('⚠ 百度OCR未配置，身份证识别功能暂不可用');
  }
  console.log('');
  console.log('提示：手机扫码登记请使用"局域网访问"地址');
  console.log('      请确保手机和电脑连接同一个WiFi');
});