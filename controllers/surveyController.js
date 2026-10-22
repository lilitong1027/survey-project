const Survey = require('../models/Survey');
const crypto = require('crypto'); // 用于生成短 ID

// @desc 创建新问卷
// @route POST /api/surveys
exports.createSurvey = async (req, res) => {
  try {
    // 新增接收 question_refs，同时兼容旧的 legacy_questions
    const { title, description, allow_anonymous, question_refs, legacy_questions } = req.body;

    // 生成 8 位短分享 ID
    const share_id = crypto.randomBytes(4).toString('hex');

    const survey = await Survey.create({
      owner_id: req.user._id, // 绑定当前登录用户
      title,
      description,
      allow_anonymous,
      // 👇 第二阶段新逻辑：如果传了引用，就用新逻辑
      question_refs: question_refs || [],
      // 👇 兼容第一阶段旧逻辑：没传引用，就存旧数据
      legacy_questions: legacy_questions || [],
      share_id,
      status: 'draft' // 默认草稿状态
    });

    res.status(201).json({
      message: '问卷创建成功',
      survey
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '创建失败', error: error.message });
  }
};

// @desc 获取当前登录用户的问卷列表
// @route GET /api/surveys/mine
exports.getMySurveys = async (req, res) => {
  try {
    // 只查当前用户创建的问卷，按创建时间倒序排列
    const surveys = await Survey.find({ owner_id: req.user._id })
      .sort({ created_at: -1 });

    res.json(surveys);
  } catch (error) {
    res.status(500).json({ message: '获取列表失败', error: error.message });
  }
};
// @desc 发布问卷 (将状态从 draft 改为 published)
// @route PUT /api/surveys/:share_id/publish
exports.publishSurvey = async (req, res) => {
  try {
    const { share_id } = req.params;

    // 找到当前用户的问卷
    const survey = await Survey.findOne({ share_id, owner_id: req.user.id });
    if (!survey) {
      return res.status(404).json({ message: '问卷不存在或无权操作' });
    }

    // 更新状态为已发布
    survey.status = 'published';
    await survey.save();

    res.json({ message: '问卷已成功发布', status: survey.status });
  } catch (error) {
    res.status(500).json({ message: '发布失败', error: error.message });
  }
};