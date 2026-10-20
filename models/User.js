const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少需要 6 位'],
    select: false, // 关键：查询时默认不返回密码
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// 保存前对密码进行哈希加密
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// 实例方法：验证输入密码是否匹配
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;