const Chat = require("../model/chatModel.js");
const ErrorHander = require("../utils/errorhandler.js");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/customerModel");
const Notification = require("../model/notificationModel");

// ✅ Send Message with Notification
exports.sendMessage = catchAsyncErrors(async (req, res, next) => {
  const { receiverId, message } = req.body;

  const senderId = req.user.id; 

  // Check if Receiver exists
  const receiverUser = await User.findById(receiverId);
  if (!receiverUser) {
    return next(new ErrorHander("Receiver not found", 404));
  }

  // ✅ Store Message in Chat Model
  const chat = await Chat.create({ senderId, receiverId, message });

  // ✅ Create Notification
  await Notification.create({
    senderId,
    receiverId,
    message: "You received a new message", // Notification Message
  });

  res.status(201).json({
    success: true,
    chat,
  });
});

// ✅ Get Chat Between Two Users
exports.getChat = catchAsyncErrors(async (req, res, next) => {
  const { receiverId } = req.params;
  const senderId = req.user.id;

  // Check Receiver Exists
  const receiverUser = await User.findById(receiverId);
  if (!receiverUser) {
    return next(new ErrorHander("Receiver not found", 404));
  }

  // Fetch Chat
  const chat = await Chat.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  }).sort("createdAt");

  res.status(200).json({
    success: true,
    chat,
  });
});

// ✅ Get User Notifications
exports.getUserNotifications = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id || req.user.id; // Fetch user ID from token
  
  if (!userId) {
    return next(new ErrorHander("User not authenticated", 401));
  }

  const notifications = await Notification.find({ receiverId: userId })
    .populate("senderId", "name email avatar")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    notifications,
  });
});
