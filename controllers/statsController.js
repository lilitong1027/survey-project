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