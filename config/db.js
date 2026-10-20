const mongoose = require('mongoose');

const connectDB = async () => {
  // 不在这里 try-catch，让错误抛给调用者 (app.js)
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB 连接成功: ${conn.connection.host}`);
};

module.exports = connectDB;