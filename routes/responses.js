const express = require('express');
const router = express.Router();
const { submitResponse } = require('../controllers/responseController');
const optionalAuth = require('../middlewares/optionalAuth');

// 注意：AI 建议的路径是 /api/surveys/:survey_id/responses
// 沿用这个设计，但把参数名改为 share_id
router.post('/:share_id/responses', optionalAuth, submitResponse);

module.exports = router;