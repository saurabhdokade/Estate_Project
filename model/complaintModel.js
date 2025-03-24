const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Complaint', complaintSchema);
