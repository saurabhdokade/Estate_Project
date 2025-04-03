const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UsersAuth",
        required: true
    },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" }, // 🔥 Store property ID

    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    agentImage: { type: String }, // New field for agent image
    agentTitle: { type: String }, // New field for agent title
    agentDescription: { type: String }, // New field for agent description
}, { timestamps: true });

module.exports = mongoose.model("NotificationComplaint", notificationSchema);
