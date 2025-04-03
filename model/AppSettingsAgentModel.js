const mongoose = require("mongoose");

const AppSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  locationPermission: { type: Boolean, default: false },
  language: { 
    type: String, 
    enum: ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati", "Punjabi", "Malayalam", "Urdu"], 
    default: "English" 
  },
});

module.exports = mongoose.model("AppSettingsAgent", AppSettingsSchema);
