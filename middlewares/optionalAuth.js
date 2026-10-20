
const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;

  // 未提供 Token：按匿名用户处理
  if (!header) {
    return next();
  }

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authorization 格式错误',
    });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: 'Token 不能为空',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = decoded.id || decoded.userId || decoded.sub;

    if (!userId || !require('mongoose').isValidObjectId(userId)) {
      return res.status(401).json({
        message: 'Token 中的用户 ID 无效',
      });
    }

    req.user = { id: userId };
    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token 无效或已过期',
    });
  }
};

module.exports = optionalAuth;
