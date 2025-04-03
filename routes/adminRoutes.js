const express = require("express");
const {
  registeradmin,
  loginadmin,
  logoutadmin,
  forgotPasswordadmin,
  resetPasswordadmin,
  getAgentDetails,
  rejectProperty,
  verifyProperty,
  getBuilderDetails,
  getAllAgentAndBuilder,
  rejectAgentOrBuilder,
  getAllSubscriptions,
  getSubscriptionById,
  getAllLeads,
  getLeadsByProperty,
  getAllVisits,
  approveProperty,
  commentOnProperty,
  getAllUser,
  getAllUsers,
  updateadminDetails,
  updateUserDetails,
  deleteUser,
  verifyOTP,
  verifyRegister,
  sendOTP,
  resendOTP,
  getComplaints,
  resolveComplaint,
  deleteComplaint,
  getComplaintById
} = require("../controller/admincontroller");

const {isAuthenticatedAdmin, authorizeRoles } = require("../middlewares/auth");
const { apiLimiter, authLimiter } = require("../middlewares/rateLimiter");
const multer = require('multer');
const path = require('path');
const upload = require("../utils/multer");
const { getAllProperties } = require("../controller/propertyController");
// Import validation functions
// const { authorizeRoles } = require("../middlewares/auth");

const router = express.Router();
router.route("/signup-admin").post(registeradmin);
router.route("/admin/login").post(loginadmin);
router.route("/admin/logout").get(logoutadmin);
router.route("/verify").post(verifyOTP);
router.route("/verify-admin").post(verifyRegister)
router.route("/resend").post(resendOTP)
router.route("/password/forgot").post(forgotPasswordadmin);
router.route("/password/reset/:token").put(resetPasswordadmin);
router.route("/admin/admin-users").get(isAuthenticatedAdmin, apiLimiter, getAllUser); // List all users
router.route("/admin/users").get(isAuthenticatedAdmin, apiLimiter, getAllUsers); // List all users
router.route("/admin/:id").put(isAuthenticatedAdmin,apiLimiter, upload.single("userProfile"),updateadminDetails) // Update user role
// router.route("/users/:id").delete(isAuthenticatedAdmin, apiLimiter, deleteUser); // Delete user
router.route("/admin/users/:id").put(isAuthenticatedAdmin,apiLimiter, upload.single("userProfile"),updateUserDetails) // Update user role
router.route('/reject/:id').put(isAuthenticatedAdmin, rejectAgentOrBuilder);
router.get('/admin/getAllAgentBuilder', isAuthenticatedAdmin, getAllAgentAndBuilder);
router.get('/admin/agent/:id', isAuthenticatedAdmin, getAgentDetails);
router.get('/admin/builder/:id', isAuthenticatedAdmin, getBuilderDetails);
router.route("/admin/users/:id").delete(isAuthenticatedAdmin, apiLimiter, deleteUser);
//property
router.put('/property/reject/:id', isAuthenticatedAdmin,rejectProperty);
router.put('/property/verify/:id', isAuthenticatedAdmin,verifyProperty);
router.get('/property/all', isAuthenticatedAdmin,getAllProperties);

//plan
router.get('/admin/getAllSubscriptions', getAllSubscriptions);
router.get('/admin/plan/:id', getSubscriptionById);

//enquiry
router.get('/admin/getAllLeads', isAuthenticatedAdmin,getAllLeads);
router.get('/lead/:id',getLeadsByProperty)

//visiters
router.get('/visiters/getall', isAuthenticatedAdmin, getAllVisits);


//aproved property
router.put("/property/approve/:propertyId", isAuthenticatedAdmin, authorizeRoles("admin"), approveProperty);
router.put("/property/comment/:propertyId", isAuthenticatedAdmin, authorizeRoles("admin"), commentOnProperty);


//complaint user
router.get('/admin/complaints/', getComplaints); // Get all complaints
router.put('/complaint/resolve/:id',isAuthenticatedAdmin, resolveComplaint); // Mark a complaint as resolved
router.delete('/complaint/delete/:id', isAuthenticatedAdmin, deleteComplaint); // Delete a complaint
router.get("/complaint/:id", isAuthenticatedAdmin, getComplaintById); // Get complaint by ID

module.exports = router;