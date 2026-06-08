const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

(async () => {
  const tunnel = await localtunnel({ port: 3001 });

  // 写入URL文件供服务器读取
  fs.writeFileSync(path.join(__dirname, '.tunnel-url'), tunnel.url);

  console.log('');
  console.log('========================================');
  console.log('  外网穿透已启动');
  console.log('========================================');
  console.log(`  外网访问地址: ${tunnel.url}`);
  console.log(`  登记页面:     ${tunnel.url}/register`);
  console.log(`  二维码页:     ${tunnel.url}/qrcode`);
  console.log(`  管理后台:     ${tunnel.url}/admin`);
  console.log('========================================');
  console.log('');
  console.log('提示：这个地址从任何网络都能访问，不依赖局域网');
  console.log('      二维码页面已自动更新为外网地址');
  console.log('      电脑关机后此地址会失效');

  tunnel.on('close', () => {
    console.log('隧道已关闭');
    try { fs.unlinkSync(path.join(__dirname, '.tunnel-url')); } catch (e) {}
  });
})();