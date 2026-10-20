const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 生成 JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc 注册新用户
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.create({ username, password });

    res.status(201).json({
      message: '注册成功',
      user: {
        id: user._id,
        username: user.username,
        created_at: user.created_at,
        token: generateToken(user._id)
      },
    });
  } catch (error) {
    // 采纳 AI 建议：专门处理重复用户名和校验错误
    if (error.code === 11000) {
      return res.status(409).json({ message: '用户名已存在' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: '服务器内部错误' });
  }
};

// @desc 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 关键：AI 加了 select: false，这里必须显式查询密码
    const user = await User.findOne({ username }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};