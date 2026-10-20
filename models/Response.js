
const mongoose = require('mongoose');

const { Schema } = mongoose;

const answerSchema = new Schema(
  {
    question_id: {
      type: String,
      required: true,
    },

    // single: String
    // multiple: String[]
    // text: String
    // number: Number
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },

    answered_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const responseSchema = new Schema(
  {
    survey_id: {
      type: Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
      index: true,
    },

    respondent_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    // 由后端计算，按实际作答顺序记录 question_id
    jump_path: {
      type: [String],
      default: [],
    },

    submitted_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// 方便统计某份问卷的答卷数量
responseSchema.index({ survey_id: 1, submitted_at: -1 });

// 方便查询某个用户的答卷
responseSchema.index({ respondent_id: 1, submitted_at: -1 });

module.exports = mongoose.model('Response', responseSchema);
