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
  // Store extracted data from URLs
  extractedUrlData: {
    type: {
      make: String,
      model: String,
      year: Number,
      miles: Number,
      listingPrice: Number,
      tireAge: Number,
      lowestPrice: Number,
      dockFee: Number,
      url: String,
      extractedAt: Date
    },
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
threadSchema.index({ lastMessageTime: -1 });

module.exports = mongoose.model('Thread', threadSchema);

