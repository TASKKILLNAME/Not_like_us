const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middlewares/auth');
const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 입력 데이터 로깅
    console.log('Register request received:', { username, email });

    // 필수 입력값 검증
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: '모든 필드를 입력해주세요.',
        missingFields: {
          username: !username,
          email: !email,
          password: !password
        }
      });
    }

    // 이메일 중복 체크
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 사용자 이름 중복 체크
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: '이미 사용 중인 사용자 이름입니다.' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    
    // 특정 에러 타입에 따른 처리
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: '입력 정보를 다시 확인해주세요.',
        details: err.errors 
      });
    }

    // 중복 키 에러 처리
    if (err.code === 11000) {
      return res.status(400).json({ 
        error: '이미 사용 중인 사용자 이름 또는 이메일입니다.' 
      });
    }

    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 로그인
// routes/auth.js의 로그인 라우트 수정
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login request received:', { email }); // 비밀번호는 로그에 남기지 않음

    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('Token generated successfully');

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ error: err.message });
  }
});

// 현재 사용자 정보 조회
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email
    }
  });
});

module.exports = router;