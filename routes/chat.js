const express = require('express');
const auth = require('../middlewares/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');
const router = express.Router();

// 채팅방 목록 조회
router.get('/rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('createdBy', 'username')
      .sort('-createdAt');
    res.json(rooms);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 새 채팅방 생성
router.post('/rooms', auth, async (req, res) => {
  try {
    const room = new Room({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user._id,
      participants: [req.user._id]
    });
    await room.save();
    
    await room.populate('createdBy', 'username');
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 채팅방 메시지 조회
router.get('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate('sender', 'username')
      .sort('-createdAt')
      .limit(50);
    res.json(messages.reverse());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
);
// routes/chat.js에 추가
// 초대 가능한 사용자 목록 조회
router.get('/rooms/:roomId/invitable-users', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
    }

    // 현재 참여자가 아닌 모든 사용자 조회
    const users = await User.find({
      _id: { $nin: room.participants }
    }, 'username email');

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 초대
router.post('/rooms/:roomId/invite', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
    }

    // 중복 제거하며 새로운 참여자 추가
    room.participants = [...new Set([...room.participants, ...userIds])];
    await room.save();

    // 소켓으로 초대된 사용자들에게 알림
    userIds.forEach(userId => {
      io.to(userId).emit('room_invitation', {
        roomId: room._id,
        roomName: room.name
      });
    });

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;