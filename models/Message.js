// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileType: {
    type: String,
    trim: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);