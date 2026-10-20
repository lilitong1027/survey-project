# 基于 Node.js + MongoDB 的在线问卷系统

## 项目简介
本项目是一个支持动态跳转、复杂校验和自动统计的在线问卷系统（类似问卷星）。支持用户注册登录、创建问卷、分享链接填写、以及基于 MongoDB 聚合管道的统计功能。

## 环境依赖
- Node.js (v18+)
- MongoDB (本地默认 27017 端口)

## 快速启动
1. 安装依赖：`npm install`
2. 配置环境变量：根目录创建 `.env` 文件，填入：
   `PORT=3000`
   `MONGO_URI=mongodb://127.0.0.1:27017/survey_system`
   `JWT_SECRET=your_secret_key`
3. 启动服务：`npm run dev`

## 文档导航
- [项目报告](docs/report.md)
- [AI 使用日志](docs/ai-log.md)
- [测试用例](docs/test-cases.md)