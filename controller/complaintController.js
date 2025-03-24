const Complaint = require('../model/complaintModel');
const sendEmail = require('../utils/sendEmail');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHander  = require('../utils/errorhandler');

// 📌 Create Complaint
exports.createComplaint = catchAsyncErrors(async (req, res, next) => {
    const { name, email, description } = req.body;

    if (!name || !email || !description) {
        return next(new ErrorHander("All fields are required.", 400));
    }

    const complaint = await Complaint.create({ name, email, description });

    res.status(201).json({
        success: true,
        message: "Complaint registered successfully.",
        complaint
    });
});
