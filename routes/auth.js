const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController'); // 确保路径是 ../controllers

router.post('/register', register);
router.post('/login', login);

module.exports = router;