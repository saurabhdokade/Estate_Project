const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/customerModel");
const Agent = require("../model/agentModel")
const Builder = require("../model/builderModel");
const Admin = require("../model/adminModel")

// exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
//   const token = req.cookies.token; // Token from cookies

//   if (!token) {
//     return next(new ErrorHander("Unauthorized access. Token required.", 401));
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded.userId); // Find user by ID in MongoDB

//     if (!req.user) {
//       return next(new ErrorHander("User not found.", 404));
//     }

//     next();
//   } catch (error) {
//     return next(new ErrorHander("Invalid or expired token.", 401));
//   }
// });

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const token = req.header("Authorization"); // Token from Authorization header

  if (!token || !token.startsWith("Bearer ")) {
    return next(new ErrorHander("Unauthorized access. Token required.", 401));
  }

  try {
    const tokenValue = token.split(" ")[1]; // Extract token after "Bearer"
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId); // Find user by ID in MongoDB

    if (!req.user) {
      return next(new ErrorHander("User not found.", 404));
    }

    next();
  } catch (error) {
    return next(new ErrorHander("Invalid or expired token.", 401));
  }
});



// exports.isAuthenticatedBuilder = catchAsyncErrors(async (req, res, next) => {
//   const { token } = req.cookies;

//   if (!token) {
//     return next(new ErrorHander("Please Login as a Builder to access this resource", 401));
//   }

//   const decodedData = jwt.verify(token, process.env.JWT_SECRET);

//   const builder = await Builder.findById(decodedData.id);

//   if (!builder) {
//     return next(new ErrorHander("Builder not found", 404));
//   }

//   req.builder = builder;

//   next();
// });

exports.isAuthenticatedBuilder = catchAsyncErrors(async (req, res, next) => {
  const token = req.header("Authorization"); // Get token from Authorization header

  if (!token || !token.startsWith("Bearer ")) {
    return next(new ErrorHander("Please Login as a Builder to access this resource", 401));
  }

  try {
    const tokenValue = token.split(" ")[1]; // Extract actual token
    const decodedData = jwt.verify(tokenValue, process.env.JWT_SECRET);

    const builder = await Builder.findById(decodedData.id);

    if (!builder) {
      return next(new ErrorHander("Builder not found", 404));
    }

    req.builder = builder;
    next();
  } catch (error) {
    return next(new ErrorHander("Invalid or expired token.", 401));
  }
});

// Authenticate Agent
// exports.isAuthenticatedAgent = catchAsyncErrors(async (req, res, next) => {
//   const token = req.cookies.token; // Token from cookies

//   if (!token) {
//     return next(new ErrorHander("Unauthorized access. Token required.", 401));
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.agent = await Agent.findById(decoded.userId); // Find agent by ID in MongoDB

//     if (!req.agent) {
//       return next(new ErrorHander("Agent not found.", 404));
//     }

//     next();
//   } catch (error) {
//     return next(new ErrorHander("Invalid or expired token.", 401));
//   }
// });

exports.isAuthenticatedAgent = catchAsyncErrors(async (req, res, next) => {
  const token = req.header("Authorization"); // Get token from Authorization header

  if (!token || !token.startsWith("Bearer ")) {
    return next(new ErrorHander("Unauthorized access. Token required.", 401));
  }

  try {
    const tokenValue = token.split(" ")[1]; // Extract actual token
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    req.agent = await Agent.findById(decoded.userId); // Find agent by ID in MongoDB

    if (!req.agent) {
      return next(new ErrorHander("Agent not found.", 404));
    }

    next();
  } catch (error) {
    return next(new ErrorHander("Invalid or expired token.", 401));
  }
});



// exports.isAuthenticatedAgentOrBuilder = catchAsyncErrors(async (req, res, next) => {
//   const token = req.header("Authorization");// Token from cookies

//   if (!token) {
//     return next(new ErrorHander("Unauthorized access. Token required.", 401));
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Check if the user is an Agent or a Builder
//     const agent = await Agent.findById(decoded.userId);
//     const builder = await Builder.findById(decoded.userId);

//     if (!agent && !builder) {
//       return next(new ErrorHander("User not found", 404));
//     }

//     // Assign user role to req.user
//     req.user = agent || builder;

//     next();
//   } catch (error) {
//     return next(new ErrorHander("Invalid or expired token.", 401));
//   }
// });

exports.isAuthenticatedAgentOrBuilder = catchAsyncErrors(async (req, res, next) => {
  const token = req.header("Authorization"); // Get token from Authorization header

  if (!token || !token.startsWith("Bearer ")) {
    return next(new ErrorHander("Unauthorized access. Token required.", 401));
  }

  try {
    const tokenValue = token.split(" ")[1]; // Extract actual token
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    // Check if the user is an Agent or a Builder
    const agent = await Agent.findById(decoded.userId);
    const builder = await Builder.findById(decoded.userId);

    if (!agent && !builder) {
      return next(new ErrorHander("User not found", 404));
    }

    // Assign user role to req.user
    req.user = agent || builder;
    req.role = agent ? "Agent" : "Builder"; // Assign role for further authorization if needed

    next();
  } catch (error) {
    return next(new ErrorHander("Invalid or expired token.", 401));
  }
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