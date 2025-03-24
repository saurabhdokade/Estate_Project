const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recentlyViewed: [
    {
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
      viewedAt: { type: Date, default: Date.now }
    }
  ],
  savedProperties: [
    {
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
      savedAt: { type: Date, default: Date.now }
    }
  ],
  contactedProperties: [
    {
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
      contactedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

const UserActivity = mongoose.model("UserActivity", userActivitySchema);
module.exports = UserActivity;
