const mongoose = require('mongoose');

const carListingSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread',
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  // Car information
  make: {
    type: String,
    default: null
  },
  model: {
    type: String,
    default: null
  },
  year: {
    type: Number,
    default: null
  },
  miles: {
    type: Number,
    default: null
  },
  listingPrice: {
    type: Number,
    default: null
  },
  tireLifeLeft: {
    type: Boolean,
    default: null
  },
  lowestPrice: {
    type: Number,
    default: null
  },
  docFeeQuoted: {
    type: Number,
    default: null
  },
  docFeeAgreed: {
    type: Number,
    default: null
  },
  docFeeNegotiable: {
    type: Boolean,
    default: null
  },
  titleStatus: {
    type: String,
    enum: ['clean', 'rebuilt', 'check_carfax', null],
    default: null
  },
  carfaxDamageIncidents: {
    type: String,
    enum: ['yes', 'no', 'unsure', 'check_carfax', null],
    default: null
  },
  // Metadata
  conversationComplete: {
    type: Boolean,
    default: false
  },
  extractedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
carListingSchema.index({ phoneNumber: 1 });
carListingSchema.index({ conversationComplete: 1 });

module.exports = mongoose.model('CarListing', carListingSchema);

