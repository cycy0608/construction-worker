require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const workersRouter = require('./routes/workers');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的图片 - 本地开发用）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/workers', workersRouter);

// 获取公共URL配置（用于二维码生成）
app.get('/api/config', (req, res) => {
  // Vercel环境：使用请求的host
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const publicUrl = `${proto}://${host}`;
  res.json({ publicUrl });
});

// 生产环境：托管前端静态文件
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

module.exports = app;