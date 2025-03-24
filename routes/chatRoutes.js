const express = require("express");
const router = express.Router();
const { sendMessage, getChat,getUserNotifications } = require("../controller/chatController");
const { isAuthenticatedUser } = require("../middlewares/auth");

// Routes
router.route("/send").post(isAuthenticatedUser , sendMessage);
router.route("/:receiverId").get(isAuthenticatedUser,getChat);

//notifications
router.route("/user/get-notifications").get(isAuthenticatedUser, getUserNotifications);


module.exports = router;
