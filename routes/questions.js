const express = require('express');
const router = express.Router();
const { createQuestion, updateQuestion, getMyQuestions } = require('../controllers/questionController');
const { protect } = require('../middlewares/auth');
const { getCrossSurveyStats } = require('../controllers/statsController'); 

// 所有的题库操作都必须登录
router.post('/', protect, createQuestion);
router.put('/:id', protect, updateQuestion);
router.get('/mine', protect, getMyQuestions);
router.get('/:question_id/stats', protect, getCrossSurveyStats);
router.get('/:id/used-in', protect, getQuestionUsage);
router.post('/:id/share', protect, shareQuestion);

module.exports = router;