const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  reasonToBuy: {
    type: String,
    enum: ["Investment", "Self Use"],
    required: true,
  },
  isPropertyDealer: {
    type: Boolean,
    required: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: false,
  },
  message: {
    type: String,
    default: "I am interested in this property",
  },
  termsAccepted: {
    type: Boolean,
    required: true,
  },
});

module.exports = mongoose.model("Lead", leadSchema);
