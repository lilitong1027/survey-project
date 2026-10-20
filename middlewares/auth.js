const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 检查请求头中是否带了 Bearer Token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 拿到 Token（去掉 "Bearer " 前缀）
      token = req.headers.authorization.split(' ')[1];
      
      // 验证 Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 根据 Token 里的 id 查用户，挂载到 req.user 上（不返回密码）
      req.user = await User.findById(decoded.id).select('-password');
      
      next(); // 放行，交给下一个处理函数
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: '无效的 Token，未授权' });
    }
  } else {
    res.status(401).json({ message: '没有 Token，未授权' });
  }
};

module.exports = { protect };