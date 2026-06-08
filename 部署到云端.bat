@echo off
chcp 65001 >nul
title 部署到Render

echo ============================================
echo   部署工地人员管理系统到 Render 云端
echo ============================================
echo.
echo 请确保你已经：
echo 1. 注册了 GitHub 账号: https://github.com/signup
echo 2. 注册了 Render 账号: https://render.com/ （用GitHub登录）
echo.
echo 按任意键继续...
pause >nul

echo.
echo 正在初始化 Git 仓库...
cd /d "%~dp0"
git init
git add .
git commit -m "工地临时人员管理系统"

echo.
echo 请在 GitHub 上创建一个新仓库：
echo 1. 打开 https://github.com/new
echo 2. 仓库名输入: construction-worker
echo 3. 不要勾选任何选项，点击 Create repository
echo 4. 复制仓库地址（类似 https://github.com/你的用户名/construction-worker.git）
echo.
set /p REPO_URL="请输入仓库地址: "

git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
echo ============================================
echo   代码已推送到 GitHub！
echo ============================================
echo.
echo 下一步：
echo 1. 打开 https://render.com/
echo 2. 点击 New - Web Service
echo 3. 连接你的 GitHub 仓库 construction-worker
echo 4. Render 会自动识别 render.yaml 配置
echo 5. 点击 Deploy，等待几分钟
echo 6. 部署成功后获得免费域名，如 xxx.onrender.com
echo 7. 二维码页面: https://xxx.onrender.com/qrcode
echo 8. 管理后台: https://xxx.onrender.com/admin
echo.
echo 部署后就是真正的24小时在线，电脑关机也能用！
echo.
pause