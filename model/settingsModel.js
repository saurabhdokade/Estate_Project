const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Builder",
        required: true
    },
    notifications: {
        type: Boolean,
        default: true
    },
    privacy: {
        type: String,
        enum: ["Public", "Private", "Friends Only"],
        default: "Public"
    },
    language: {
        type: String,
        default: "English"
    },
}, { timestamps: true });

const Settings = mongoose.model("Settings", settingsSchema);
module.exports = Settings;
