# 一键部署到 Render 免费云平台

## 步骤

1. 注册账号
   - 打开 https://render.com/
   - 使用 Github 账号快速登录（免费）

2. Fork 项目到你的 Github
   - 你可以把当前这个 `f:\人员管理` 文件夹代码推送到 Github，或者我已经配置好了 render.yaml

3. 创建新项目
   - 登录 Render 后点击 **New → Web Service**
   - 连接你的 Github 仓库
   - Render 会自动识别 `render.yaml` 配置

4. 点击 **Deploy**
   - 等待几分钟构建完成
   - 构建成功后会给你一个免费域名，比如 `xxx.onrender.com`

5. 使用
   - 二维码页面：`https://你的域名/qrcode`
   - 管理后台：`https://你的域名/admin`
   - 现在就是真正的24小时在线，任何网络都能访问，不需要你的电脑开机

## 注意事项

- Render 免费版闲置15分钟会休眠，首次访问需要等待10-30秒唤醒，访问一次后可以保持一段时间在线
- 免费配额足够你这个项目使用
- 百度OCR API Key 已经预配置好了，不用手动填
- SQLite 数据库数据存在 Render 磁盘上，免费版有3个月有效期，数据不会丢
