const Question = require('../models/Question');
const QuestionVersion = require('../models/QuestionVersion');

// @desc 创建新题目并存入题库 (生成 v1)
// @route POST /api/questions
exports.createQuestion = async (req, res) => {
  try {
    const { title, type, options, required, validation, jump_rules } = req.body;

    // 1. 创建题目主记录
    const question = await Question.create({
      owner_id: req.user.id,
      current_version: 1
    });

    // 2. 创建 v1 版本的具体内容快照
    const versionContent = await QuestionVersion.create({
      question_id: question._id,
      version: 1,
      title,
      type,
      options,
      required,
      validation,
      jump_rules
    });

    res.status(201).json({
      message: '题目创建成功 (v1)',
      question,
      versionData: versionContent
    });
  } catch (error) {
    res.status(500).json({ message: '创建题目失败', error: error.message });
  }
};

// @desc 修改题目（不覆盖原版，生成新版本 v2/v3...）
// @route PUT /api/questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, options, required, validation, jump_rules } = req.body;

    // 1. 查找原题目
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ message: '题目不存在' });

    // 2. 权限校验（只有创建者或被共享者能修改）
    if (question.owner_id.toString() !== req.user.id) {
       return res.status(403).json({ message: '无权修改此题目' });
    }

    // 3. 查出上一个版本的具体内容（为了找 parent_version_id）
    const currentVersionContent = await QuestionVersion.findOne({
      question_id: id,
      version: question.current_version
    });

    // 4. 计算新版本号
    const newVersion = question.current_version + 1;

    // 5. 生成新版本快照
    const newVersionContent = await QuestionVersion.create({
      question_id: id,
      version: newVersion,
      parent_version_id: currentVersionContent._id, // 记录它是由哪个版本改来的
      title,
      type,
      options,
      required,
      validation,
      jump_rules
    });

    // 6. 更新主记录的最新版本号
    question.current_version = newVersion;
    await question.save();

    res.json({
      message: `题目已成功升级至 v${newVersion}，旧版本依然保留`,
      newVersionData: newVersionContent
    });
  } catch (error) {
    res.status(500).json({ message: '修改题目失败', error: error.message });
  }
};

// @desc 获取我的题库列表
// @route GET /api/questions/mine
exports.getMyQuestions = async (req, res) => {
  try {
    // 查找属于我的，或者共享给我的题目
    const questions = await Question.find({
      $or: [
        { owner_id: req.user.id },
        { shared_with: req.user.id }
      ],
      is_deleted: false
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: '获取题库失败', error: error.message });
  }
};

const Survey = require('../models/Survey');

// @desc 查看某道题被哪些问卷使用了
// @route GET /api/questions/:id/used-in
exports.getQuestionUsage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询所有包含了这个 question_id 引用的问卷
    const surveys = await Survey.find({ 
      'question_refs.question_id': id 
    }).select('title share_id status owner_id');
    
    res.json({
      message: '查询成功',
      used_count: surveys.length,
      surveys
    });
  } catch (error) {
    res.status(500).json({ message: '查询失败', error: error.message });
  }
};

// @desc 共享题目给其他用户
// @route POST /api/questions/:id/share
exports.shareQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_user_id } = req.body; // 要分享给谁

    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ message: '题目不存在' });
    
    // 只能分享自己的题
    if (question.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ message: '无权分享此题目' });
    }

    // 使用 $addToSet 防止重复添加
    await Question.findByIdAndUpdate(id, {
      $addToSet: { shared_with: target_user_id }
    });

    res.json({ message: '题目共享成功' });
  } catch (error) {
    res.status(500).json({ message: '共享失败', error: error.message });
  }
};