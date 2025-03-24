const Settings = require("../model/settingsModel");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

// Get user settings
exports.getUserSettings = catchAsyncErrors(async (req, res, next) => {
    const settings = await Settings.findOne({ userId: req.user.id });

    if (!settings) {
        return res.status(404).json({ success: false, message: "Settings not found" });
    }

    res.status(200).json({ success: true, settings });
});

// Update user settings
exports.updateUserSettings = catchAsyncErrors(async (req, res, next) => {
    let settings = await Settings.findOne({ userId: req.user.id });

    if (!settings) {
        settings = new Settings({ userId: req.user.id, ...req.body });
    } else {
        settings.notifications = req.body.notifications ?? settings.notifications;
        settings.privacy = req.body.privacy ?? settings.privacy;
        settings.language = req.body.language ?? settings.language;
    }

    await settings.save();

    res.status(200).json({ success: true, message: "Settings updated", settings });
});
