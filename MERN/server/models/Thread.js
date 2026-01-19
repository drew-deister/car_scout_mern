const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  // Conversation state management
  conversationState: {
    type: String,
    enum: ['default', 'waiting', 'complete'],
    default: 'default'
  },
  lastQuestionAsked: {
    type: String,
    default: null
  },
  questionRepeatCount: {
    type: Number,
    default: 0
  },
  // Legacy field - kept for backwards compatibility but not used
  conversationComplete: {
    type: Boolean,
    default: false
  },
  // Legacy field - kept for backwards compatibility but not used
  waitingForDealerResponse: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
threadSchema.index({ lastMessageTime: -1 });

module.exports = mongoose.model('Thread', threadSchema);

