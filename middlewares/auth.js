const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/customerModel");
const Agent = require("../model/agentModel")
const Builder = require("../model/builderModel");
const Admin = require("../model/adminModel")
exports.isAuthenticatedUser = catchAsyncErrors(async(req,res,next) => {
    const { token } = req.cookies;
       
 if(!token) {
     return next(new ErrorHander("Please Login to access this resource", 401));
 };

 const decodedData = jwt.verify(token,process.env.JWT_SECRET);

 req.user = await User.findById(decodedData.id);

 next();
});
exports.isAuthenticatedAgent = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHander("Please Login as an Agent to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  req.agent = await Agent.findById(decodedData.id);

  next();
});

exports.isAuthenticatedBuilder = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHander("Please Login as a Builder to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  const builder = await Builder.findById(decodedData.id);

  if (!builder) {
    return next(new ErrorHander("Builder not found", 404));
  }

  req.builder = builder;

  next();
});


exports.isAuthenticatedAgentOrBuilder = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHander("Please Login to access this resource", 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  // Check if the user is an Agent or a Builder
  const agent = await Agent.findById(decodedData.id);
  const builder = await Builder.findById(decodedData.id);

  if (!agent && !builder) {
    return next(new ErrorHander("User not found", 404));
  }

  // Assign user role to req.user
  req.user = agent || builder;

  next();
});

exports.isAuthenticatedAdmin = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHander('Please login to access this resource', 401));
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  const user = await Admin.findById(decodedData.id);

  if (!user || user.role !== 'admin') {
    return next(new ErrorHander('Unauthorized Access. Only Admin can access this', 403));
  }

  req.user = user;

  next();
});



exports.authorizeRoles = (...roles) =>{

    return(req,res,next)=>{
       if(!roles.includes(req.user.role)){
       return next(new ErrorHander(
            `Role: ${req.user.role} is not allowed to access this resource`,
            403
          )
         )
       }
       
      next();
    }
}

exports.authorizeRolesAgent = (...roles) =>{

  return(req,res,next)=>{
     if(!roles.includes(req.user.role)){
     return next(new ErrorHander(
          `Role: ${req.agent.role} is not allowed to access this resource`,
          403
        )
       )
     }
     
    next();
  }
}