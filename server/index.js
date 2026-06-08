require('dotenv').config();
const app = require('./app');
const os = require('os');

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

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