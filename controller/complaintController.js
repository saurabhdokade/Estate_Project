const Complaint = require('../model/complaintModel');
const sendEmail = require('../utils/sendEmail');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHander  = require('../utils/errorhandler');

// // 📌 Create Complaint
// exports.createComplaint = catchAsyncErrors(async (req, res, next) => {
//     const { name, email, description } = req.body;

//     if (!name || !email || !description) {
//         return next(new ErrorHander("All fields are required.", 400));
//     }

//     const complaint = await Complaint.create({ name, email, description });

//     res.status(201).json({
//         success: true,
//         message: "Complaint registered successfully.",
//         complaint
//     });
// });

// exports.createComplaint = catchAsyncErrors(async (req, res, next) => {
//     const { description } = req.body;
//     const userId = req.user.id;  // Get user ID from authenticated user
//     const name = req.user.name;  // Fetch user's name
//     const email = req.user.email; // Fetch user's email

//     if (!description) {
//         return next(new ErrorHander("Description is required.", 400));
//     }

//     const complaint = await Complaint.create({ 
//         userId, 
//         name, 
//         email, 
//         description 
//     });

//     res.status(201).json({
//         success: true,
//         message: "Complaint registered successfully.",
//         complaint:{
//             _id: complaint._id,
//             userId: complaint.userId,
//             name: complaint.name,   // Explicitly include
//             email: complaint.email, // Explicitly include
//             description: complaint.description,
//             status: complaint.status,
//             createdAt: complaint.createdAt
//         }
//     });
// });


exports.createComplaint = catchAsyncErrors(async (req, res, next) => {
    const { description } = req.body;
    const userId = req.user.id;  // Get authenticated user ID

    if (!description) {
        return next(new ErrorHander("Description is required.", 400));
    }

    // Step 1: Create the complaint with only userId
    const complaint = await Complaint.create({ 
        userId, 
        description 
    });

    // Step 2: Populate user details (name and email)
    const populatedComplaint = await Complaint.findById(complaint._id)
        .populate("userId", "name email");  // Fetch only name and email

    // Step 3: Check if user details are populated
    if (!populatedComplaint.userId) {
        return next(new ErrorHander("User details not found!", 500));
    }

    res.status(201).json({
        success: true,
        message: "Complaint registered successfully.",
        complaint: {
            _id: populatedComplaint._id,
            userId: populatedComplaint.userId._id,
            name: populatedComplaint.userId.name,   // ✅ Populated Name
            email: populatedComplaint.userId.email, // ✅ Populated Email
            description: populatedComplaint.description,
            status: populatedComplaint.status,
            createdAt: populatedComplaint.createdAt
        }
    });
});
