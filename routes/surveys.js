const express = require('express');
const router = express.Router();
const { createSurvey, getMySurveys, publishSurvey } = require('../controllers/surveyController');
const { getSurveyStats } = require('../controllers/statsController');
const { protect } = require('../middlewares/auth');

// 访问这些路由必须先通过 protect 中间件（验证 Token）
router.post('/', protect, createSurvey);
router.get('/mine', protect, getMySurveys);
router.put('/:share_id/publish', protect, publishSurvey);
router.get('/:share_id/stats', protect, getSurveyStats);

module.exports = router;