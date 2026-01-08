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
      tireLifeLeft: Boolean,
      lowestPrice: Number,
      docFeeQuoted: Number,
      docFeeAgreed: Number,
      docFeeNegotiable: Boolean,
      titleStatus: String,
      carfaxDamageIncidents: String,
      url: String,
      extractedAt: Date
    },
    default: null
  },
  conversationComplete: {
    type: Boolean,
    default: false
  },
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

