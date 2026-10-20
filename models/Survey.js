
const mongoose = require('mongoose');

const { Schema } = mongoose;

// 1. 题目选项 Schema
const optionSchema = new Schema(
  {
    option_id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// 2. 题目校验规则 Schema
const validationSchema = new Schema(
  {
    // 多选题：最少/最多选择数量
    min_selections: {
      type: Number,
      min: 0,
    },
    max_selections: {
      type: Number,
      min: 1,
    },

    // 文本题：最少/最多字符数
    min_length: {
      type: Number,
      min: 0,
    },
    max_length: {
      type: Number,
      min: 1,
    },

    // 数字题：允许的最小值/最大值
    min_value: {
      type: Number,
    },
    max_value: {
      type: Number,
    },
  },
  { _id: false }
);

// 3. 跳转规则 Schema
const jumpRuleSchema = new Schema(
  {
    // 条件运算符
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'includes',
        'not_includes',
        'gt',
        'gte',
        'lt',
        'lte',
        'answered',
        'not_answered',
      ],
      required: true,
    },

    // 条件比较值：可以是字符串、数字或数组
    // 例如：A、100、["A", "B"]
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // jump：跳转到指定题目
    // end：结束问卷
    action: {
      type: String,
      enum: ['jump', 'end'],
      default: 'jump',
      required: true,
    },

    // 目标题目的 question_id
    target_question_id: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

// 4. 单道题目 Schema
const questionSchema = new Schema(
  {
    // 稳定的题目 ID，不依赖数组下标
    question_id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      required: true,
    },

    // 题目类型
    type: {
      type: String,
      enum: ['single', 'multiple', 'text', 'number'],
      required: true,
    },

    // 题目标题
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // 是否必答
    required: {
      type: Boolean,
      default: false,
    },

    // 仅 single / multiple 使用
    options: {
      type: [optionSchema],
      default: [],
    },

    // 各题型对应的校验规则
    validation: {
      type: validationSchema,
      default: () => ({}),
    },

    // 跳转规则，按数组顺序依次匹配
    jump_rules: {
      type: [jumpRuleSchema],
      default: [],
    },
  },
  { _id: false }
);

// 5. 问卷主 Schema
const surveySchema = new Schema(
  {
    // 问卷所属用户
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 问卷标题
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // 问卷说明
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },

    // 是否允许匿名填写
    allow_anonymous: {
      type: Boolean,
      default: true,
    },

    // 问卷状态
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },

    // 截止时间；null 表示没有截止时间
    deadline: {
      type: Date,
      default: null,
    },

    // 对外分享 ID
    share_id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    // 问卷题目
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// 6. 保存前校验问卷内部结构
surveySchema.pre('validate', function () {
  const questions = this.questions || [];
  const questionIds = new Set();

  // 检查题目 ID 是否重复，以及各题型配置
  for (const question of questions) {
    if (questionIds.has(question.question_id)) {
      question.invalidate(
        'question_id',
        '同一问卷内 question_id 不能重复'
      );
    }
    questionIds.add(question.question_id);

    const rules = question.validation || {};

    if (
      ['single', 'multiple'].includes(question.type) &&
      (!question.options || question.options.length === 0)
    ) {
      question.invalidate(
        'options',
        '单选题和多选题必须至少有一个选项'
      );
    }

    if (
      question.type === 'multiple' &&
      rules.min_selections != null &&
      rules.max_selections != null &&
      rules.min_selections > rules.max_selections
    ) {
      question.invalidate(
        'validation',
        '多选题最少选择数量不能大于最多选择数量'
      );
    }

    if (
      rules.min_length != null &&
      rules.max_length != null &&
      rules.min_length > rules.max_length
    ) {
      question.invalidate(
        'validation',
        '最小字数不能大于最大字数'
      );
    }

    if (
      rules.min_value != null &&
      rules.max_value != null &&
      rules.min_value > rules.max_value
    ) {
      question.invalidate(
        'validation',
        '最小数值不能大于最大数值'
      );
    }

    // 检查同一道选择题中的选项 ID 是否重复
    const optionIds = new Set();
    for (const option of question.options || []) {
      if (optionIds.has(option.option_id)) {
        question.invalidate(
          'options',
          '同一道题中的 option_id 不能重复'
        );
      }
      optionIds.add(option.option_id);
    }
  }

  // 检查跳转目标是否存在
  for (const question of questions) {
    for (const rule of question.jump_rules || []) {
      if (rule.action === 'jump') {
        if (!rule.target_question_id) {
          question.invalidate(
            'jump_rules',
            'jump 规则必须指定 target_question_id'
          );
        } else if (!questionIds.has(rule.target_question_id)) {
          question.invalidate(
            'jump_rules',
            `跳转目标 ${rule.target_question_id} 不存在`
          );
        }
      } else if (rule.action === 'end') {
        rule.target_question_id = null;
      }
    }
  }
});

// 7. 导出模型
module.exports = mongoose.model('Survey', surveySchema);
