const Survey = require('../models/Survey');
const { getQuestionStats } = require('../services/statsService');

// @desc 获取整份问卷的统计结果
// @route GET /api/surveys/:share_id/stats
exports.getSurveyStats = async (req, res) => {
  try {
    const { share_id } = req.params;

    // 1. 根据 share_id 查询问卷
    const survey = await Survey.findOne({ share_id });
    if (!survey) {
      return res.status(404).json({ message: '问卷不存在' });
    }

    // 2. 权限校验：只有创建者才能查看统计
    if (survey.owner_id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: '没有权限查看该问卷的统计结果' });
    }

    // 3. 遍历题目，逐题统计
    const statsResults = [];
    for (const question of survey.questions) {
      // 调用 AI 写的服务，注意：question.type 从数据库中读取，不信任前端
      const stats = await getQuestionStats(
        survey._id.toString(), // AI 的服务用的是 survey._id，这里传真实 ObjectId 的字符串
        question.question_id,
        question.type
      );

      statsResults.push({
        question_id: question.question_id,
        title: question.title,
        type: question.type,
        stats: stats
      });
    }

    // 4. 返回结果
    return res.status(200).json({
      message: '统计结果获取成功',
      data: statsResults
    });

  } catch (error) {
    console.error('获取统计失败:', error);
    return res.status(500).json({ message: '获取统计结果失败' });
  }
};

const Response = require('../models/Response');
const mongoose = require('mongoose');

// @desc 跨问卷统计某道题目的结果
// @route GET /api/questions/:question_id/stats
exports.getCrossSurveyStats = async (req, res) => {
  try {
    const { question_id } = req.params;

    // 用聚合管道直接去 Response 集合里找所有包含这个 question_id 的答案
    const stats = await Response.aggregate([
      // 1. 展开所有答卷里的 answers 数组
      { $unwind: '$answers' },
      
      // 2. 只筛选出这道题的答案（因为第一阶段和第二阶段存在同一集合，这里可以直接跨问卷查）
      { $match: { 'answers.question_id': question_id } },
      
      // 3. 根据题型进行不同的统计逻辑
      // 如果是数字题，求平均值；如果是选择题，统计各选项次数
      // 为了简化，我们假设只看选择题的选项分布：
      { $group: { _id: '$answers.value', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: '暂无该题目的答卷数据' });
    }

    res.status(200).json({
      message: '跨问卷题目统计获取成功',
      question_id,
      total_answers: stats.reduce((sum, item) => sum + item.count, 0),
      data: stats
    });
  } catch (error) {
    console.error('跨问卷统计失败:', error);
    res.status(500).json({ message: '跨问卷统计失败', error: error.message });
  }
};