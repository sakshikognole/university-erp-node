const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    staffId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfJoining: {
      type: Date,
      required: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    bankDetails: {
      bankName: {
        type: String,
        default: '',
        trim: true,
      },
      accountHolderName: {
        type: String,
        default: '',
        trim: true,
      },
      accountNumber: {
        type: String,
        default: '',
        trim: true,
      },
      ifscCode: {
        type: String,
        default: '',
        trim: true,
        uppercase: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Staff', staffSchema);
