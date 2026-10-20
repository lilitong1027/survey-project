
const mongoose = require('mongoose');
const Survey = require('../models/Survey');
const Response = require('../models/Response');

const { validateAnswer } = require('../services/validationService');
const { calculateJumpPath } = require('../services/jumpService');

const submitResponse = async (req, res) => {
  try {
     const { share_id } = req.params; 
    const { answers } = req.body;

    // 1. 检查 share_id 是否存在
if (!share_id) { // ✅ 直接用 share_id 判断是否为空
  return res.status(400).json({
    message: '无效的问卷分享 ID',
  });
}

    // 2. 检查答案数据格式
    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: 'answers 必须是数组',
      });
    }

    // 3. 查询问卷
    const survey = await Survey.findOne({ share_id: share_id });

    if (!survey) {
      return res.status(404).json({
        message: '问卷不存在',
      });
    }

    if (survey.status !== 'published') {
      return res.status(403).json({
        message: '该问卷当前不可填写',
      });
    }

    if (
      survey.deadline &&
      new Date(survey.deadline).getTime() <= Date.now()
    ) {
      return res.status(403).json({
        message: '问卷已超过截止时间',
      });
    }

    // 4. 获取当前用户身份
    // auth 中间件设置的 req.user.id；匿名用户没有 req.user
    const respondentId = req.user?.id || null;

    if (!respondentId && !survey.allow_anonymous) {
      return res.status(401).json({
        message: '请先登录后再填写该问卷',
      });
    }

    // 5. 构建题目 ID -> 答案的映射
    const answersByQuestion = new Map();

    for (const item of answers) {
      if (
        !item ||
        typeof item.question_id !== 'string' ||
        !item.question_id
      ) {
        return res.status(400).json({
          message: '每条答案都必须包含 question_id',
        });
      }

      if (answersByQuestion.has(item.question_id)) {
        return res.status(400).json({
          message: `题目 ${item.question_id} 存在重复答案`,
        });
      }

      if (!Object.prototype.hasOwnProperty.call(item, 'value')) {
        return res.status(400).json({
          message: `题目 ${item.question_id} 缺少 value 字段`,
        });
      }

      answersByQuestion.set(item.question_id, item.value);
    }

    // 6. 计算后端认可的实际答题路径
    let jumpPath;

    try {
      jumpPath = calculateJumpPath(
        survey,
        answersByQuestion
      );
    } catch (error) {
      return res.status(400).json({
        message: '答题路径无效',
        error: error.message,
      });
    }

    // 7. 只校验实际经过的题目
    const questionMap = new Map(
      survey.questions.map((question) => [
        question.question_id,
        question,
      ])
    );

    const validatedAnswers = [];

    for (const questionId of jumpPath) {
      const question = questionMap.get(questionId);

      const hasAnswer = answersByQuestion.has(questionId);
      const value = hasAnswer
        ? answersByQuestion.get(questionId)
        : null;

      const result = validateAnswer(question, value);

      if (!result.valid) {
        return res.status(400).json({
          message: '答案校验失败',
          question_id: questionId,
          error: result.message,
        });
      }

      // 选填题可以不提交；这里仅保存实际提交的答案
      if (hasAnswer) {
        validatedAnswers.push({
          question_id: questionId,
          value,
        });
      }
    }

    // 8. 保存答卷
    const response = await Response.create({
      survey_id: survey._id,
      respondent_id: respondentId,
      answers: validatedAnswers,
      jump_path: jumpPath,
    });

    return res.status(201).json({
      message: '答卷提交成功',
      data: {
        response_id: response._id,
        survey_id: response.survey_id,
        submitted_at: response.submitted_at,
        jump_path: response.jump_path,
      },
    });
  } catch (error) {
    console.error('Submit response error:', error);

    return res.status(500).json({
      message: '提交答卷失败，请稍后重试',
    });
  }
};

module.exports = {
  submitResponse,
};
