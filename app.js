require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

//  1. 引入路由文件
const authRoutes = require('./routes/auth'); 
const surveyRoutes = require('./routes/surveys');
const responseRoutes = require('./routes/responses');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件：解析 JSON 请求体
app.use(express.json());

// 2. 挂载路由
app.use('/api/auth', authRoutes); 
app.use('/api/surveys', surveyRoutes);
app.use('/api/surveys', responseRoutes);


// 测试路由
app.get('/', (req, res) => {
  res.json({ message: '问卷系统 API 正在运行...' });
});

// 封装启动函数
const startServer = async () => {
  try {
    // 先连接数据库
    await connectDB();
    
    // 连上之后，再启动服务器
    app.listen(PORT, () => {
      console.log(`服务器正在运行，请访问 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
};

startServer();