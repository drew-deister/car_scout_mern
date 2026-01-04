const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread',
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  externalMessageId: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);

