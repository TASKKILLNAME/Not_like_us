const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Message = require('./models/Message');

// 에러 추적을 위한 코드 추가
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

// 환경변수 설정
dotenv.config();

// Express 앱 생성
const app = express();
const server = http.createServer(app);

// CORS 설정과 함께 Socket.IO 설정
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우트 import
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

// 라우트 설정
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.send('Chat Server is running');
});

// 소켓 연결 처리
// server.js 수정
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join_room', async (roomId) => {
    socket.join(roomId);
    
    // 참가자 목록 업데이트
    const room = await Room.findById(roomId);
    if (room && !room.participants.includes(socket.userId)) {
      room.participants.push(socket.userId);
      await room.save();
    }
    
    // 참가자 목록 브로드캐스트
    const updatedRoom = await Room.findById(roomId).populate('participants', 'username');
    io.to(roomId).emit('room_users_updated', updatedRoom.participants);
  });

  socket.on('send_message', async (data) => {
    try {
      const { roomId, message } = data;

      const newMessage = new Message({
        room: roomId,
        sender: socket.userId,
        text: message.text,
      });
      await newMessage.save();

      // populate sender 정보와 함께 전송
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'username');

      io.to(roomId).emit('receive_message', populatedMessage);
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  socket.on('typing_status', (data) => {
    const { roomId, isTyping } = data;
    socket.to(roomId).emit('typing_status', {
      userId: socket.userId,
      isTyping
    });
  });

  socket.on('mark_as_read', async (data) => {
    const { messageId, roomId } = data;
    try {
      const message = await Message.findById(messageId);
      if (message) {
        const alreadyRead = message.readBy.some(read => 
          read.user.toString() === socket.userId.toString()
        );
        
        if (!alreadyRead) {
          message.readBy.push({ user: socket.userId });
          await message.save();
          io.to(roomId).emit('message_read', {
            messageId,
            userId: socket.userId
          });
        }
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });

  socket.on('leave_room', async (roomId) => {
    socket.leave(roomId);
    
    // 참가자 목록에서 제거
    const room = await Room.findById(roomId);
    if (room) {
      room.participants = room.participants.filter(
        participantId => participantId.toString() !== socket.userId.toString()
      );
      await room.save();
      
      // 업데이트된 참가자 목록 브로드캐스트
      const updatedRoom = await Room.findById(roomId).populate('participants', 'username');
      io.to(roomId).emit('room_users_updated', updatedRoom.participants);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// 서버 시작
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;