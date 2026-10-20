const mongoose = require('mongoose');
const Response = require('../models/Response');

/**
 * 统计单道题目的结果
 *
 * @param {String} surveyId
 * @param {String} questionId
 * @param {String} questionType
 */
const getQuestionStats = async (
  surveyId,
  questionId,
  questionType
) => {
  if (!mongoose.isValidObjectId(surveyId)) {
    throw new Error('无效的 survey_id');
  }

  const surveyObjectId = new mongoose.Types.ObjectId(surveyId);

  // =========================================================
  // 1. 单选题
  // value:
  // "opt_yes"
  //
  // 返回：
  // [
  //   { _id: "opt_yes", count: 5 },
  //   { _id: "opt_no", count: 3 }
  // ]
  // =========================================================
  if (questionType === 'single') {
    return await Response.aggregate([
      // 找到指定问卷
      {
        $match: {
          survey_id: surveyObjectId,
        },
      },

      // 展开 answers
      {
        $unwind: '$answers',
      },

      // 只保留指定题目
      {
        $match: {
          'answers.question_id': questionId,
        },
      },

      // 按答案 value 分组
      {
        $group: {
          _id: '$answers.value',
          count: {
            $sum: 1,
          },
        },
      },

      // 按数量从高到低排序
      {
        $sort: {
          count: -1,
        },
      },
    ]);
  }

  // =========================================================
  // 2. 多选题
  //
  // value:
  // ["opt_a", "opt_b"]
  //
  // 需要：
  // $unwind answers
  // $unwind answers.value
  //
  // 最终：
  // [
  //   { _id: "opt_a", count: 10 },
  //   { _id: "opt_b", count: 7 }
  // ]
  // =========================================================
  if (questionType === 'multiple') {
    return await Response.aggregate([
      {
        $match: {
          survey_id: surveyObjectId,
        },
      },

      {
        $unwind: '$answers',
      },

      {
        $match: {
          'answers.question_id': questionId,
        },
      },

      // 展开多选题的 value 数组
      {
        $unwind: '$answers.value',
      },

      // 每个选项分组统计
      {
        $group: {
          _id: '$answers.value',
          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);
  }

  // =========================================================
  // 3. 数字题
  //
  // value:
  // 50000
  // 60000
  // 70000
  //
  // 返回：
  // {
  //   average: 60000
  // }
  // =========================================================
  if (questionType === 'number') {
    const result = await Response.aggregate([
      {
        $match: {
          survey_id: surveyObjectId,
        },
      },

      {
        $unwind: '$answers',
      },

      {
        $match: {
          'answers.question_id': questionId,
          'answers.value': {
            $type: 'number',
          },
        },
      },

      {
        $group: {
          _id: null,

          average: {
            $avg: '$answers.value',
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 0,
          average: 1,
          count: 1,
        },
      },
    ]);

    return result[0] || {
      average: null,
      count: 0,
    };
  }

  // =========================================================
  // 4. 文本题
  //
  // value:
  // "非常满意"
  // "一般"
  // "很好"
  //
  // 返回：
  // [
  //   "非常满意",
  //   "一般",
  //   "很好"
  // ]
  // =========================================================
  if (questionType === 'text') {
    const result = await Response.aggregate([
      {
        $match: {
          survey_id: surveyObjectId,
        },
      },

      {
        $unwind: '$answers',
      },

      {
        $match: {
          'answers.question_id': questionId,

          'answers.value': {
            $type: 'string',
          },
        },
      },

      {
        $project: {
          _id: 0,
          value: '$answers.value',
        },
      },

      {
        $sort: {
          value: 1,
        },
      },
    ]);

    return result.map((item) => item.value);
  }

  throw new Error(`不支持的题目类型：${questionType}`);
};

module.exports = {
  getQuestionStats,
};