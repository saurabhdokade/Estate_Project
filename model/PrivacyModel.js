const mongoose = require("mongoose");

const PrivacySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  profileVisibility: { type: Boolean, default: true },
  directMessage: { type: Boolean, default: true },
  contactInfoVisibility: { type: Boolean, default: true },
});

module.exports = mongoose.model("Privacy", PrivacySchema);
