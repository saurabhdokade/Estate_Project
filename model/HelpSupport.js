const mongoose = require("mongoose");

const HelpSupportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: ["FAQ", "Support"], required: true },
    question: { type: String, required: true },
    answer: { type: String },
    status: { type: String, enum: ["Open", "Resolved"], default: "Open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpSupport", HelpSupportSchema);
