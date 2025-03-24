const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User Model
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property', // Reference to Property Model
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  message: {
    type: String,
    default: "I am interested in this property."
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled',"Rescheduled"],
    default: 'Pending'
  },
  shareWithDealer: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
