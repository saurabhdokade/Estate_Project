const Chat = require("../model/chatModel.js");
const ErrorHander = require("../utils/errorhandler.js");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/customerModel");
const Notification = require("../model/notificationModel");
const Property = require("../model/propertyModel.js")
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


// exports.getNotifications = catchAsyncErrors(async (req, res, next) => {
//   console.log("User ID:", req.user?.id); // Debugging

//   if (!req.user || !req.user.id) {
//       return next(new ErrorHander("Unauthorized access. User ID missing.", 401));
//   }

//   const userId = req.user.id;
//   const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

//   res.status(200).json({
//       success: true,
//       notifications,
//   });
// });

// exports.getNotifications = catchAsyncErrors(async (req, res, next) => {
//   if (!req.user || !req.user.id) {
//       return next(new ErrorHander("Unauthorized access. User ID missing.", 401));
//   }

//   const userId = req.user.id;
//   const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

//   console.log("Fetched Notifications:", notifications); // 🔍 Debug: Check if propertyId exists

//   // Fetch Property Details for Each Notification
//   const notificationsWithDetails = await Promise.all(
//       notifications.map(async (notification) => {
//           if (!notification.propertyId) {
//               console.log(`❌ Missing propertyId in notification: ${notification._id}`);
//               return { ...notification.toObject(), propertyDetails: null };
//           }

//           const property = await Property.findById(notification.propertyId);
//           if (!property) {
//               console.log(`❌ Property not found for ID: ${notification.propertyId}`);
//           }

//           return {
//               ...notification.toObject(),
//               propertyDetails: property || null,
//           };
//       })
//   );

//   res.status(200).json({
//       success: true,
//       notifications: notificationsWithDetails,
//   });
// });


exports.getNotifications = catchAsyncErrors(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next(new ErrorHander("Unauthorized access. User ID missing.", 401));
  }

  const userId = req.user.id;
  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    notifications, // ✅ Only Basic Notifications (No Property Details)
  });
});


exports.getNotificationDetails = catchAsyncErrors(async (req, res, next) => {
  const { notificationId } = req.params;

  if (!notificationId) {
    return next(new ErrorHandler("Notification ID is required", 400));
  }

  // ✅ Find Notification by ID
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return next(new ErrorHandler("Notification not found", 404));
  }

  let propertyDetails = null;
  if (notification.propertyId) {
    // ✅ Fetch Property Details if propertyId exists
    propertyDetails = await Property.findById(notification.propertyId);
  }

  res.status(200).json({
    success: true,
    notification,
    propertyDetails,
  });
});
