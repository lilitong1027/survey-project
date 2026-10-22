const mongoose = require('mongoose');

const questionVersionSchema = new mongoose.Schema({
  // 关联到主表的题目 ID
  question_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Question', 
    required: true 
  },
  // 版本号：v1, v2, v3...
  version: { 
    type: Number, 
    required: true 
  },
  // 父版本 ID：记录这个版本是由哪个旧版本修改而来的，用来画家族树
  parent_version_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'QuestionVersion', 
    default: null 
  },
  
  // ========== 下面这部分直接把第一阶段题目里的内容搬过来 ==========
  title: { type: String, required: true },
  type: { type: String, enum: ['single', 'multiple', 'text', 'number'], required: true },
  options: [
    {
      oid: { type: String, required: true },
      text: { type: String, required: true }
    }
  ],
  required: { type: Boolean, default: false },
  validation: { type: Object, default: {} },
  jump_rules: { type: Array, default: [] },
  // ================================================================

  created_at: { type: Date, default: Date.now }
});

// 确保同一道题的版本号是唯一的
questionVersionSchema.index({ question_id: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('QuestionVersion', questionVersionSchema);