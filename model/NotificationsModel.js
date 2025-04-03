const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  pushNotification: { type: Boolean, default: true },
  emailAlerts: { type: Boolean, default: true },
  smsNotification: { type: Boolean, default: true },
});

module.exports = mongoose.model("Notification", NotificationSchema);
