const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  // 题目的创建者
  owner_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // 共享名单（共享给哪些用户使用）
  shared_with: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  // 记录当前题目最新的版本号（用于前端提示和增量修改）
  current_version: { 
    type: Number, 
    default: 1 
  },
  // 软删除标记（如果题目在题库里被删了，但不影响已引用的问卷）
  is_deleted: {
    type: Boolean,
    default: false
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Question', questionSchema);