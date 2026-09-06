const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    prn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    class: {
      type: String,
      required: true,
      trim: true,
    },
    division: {
      type: String,
      default: '',
      trim: true,
    },
    degree: {
      type: String,
      required: true,
      trim: true,
    },
    yearOfEnrollment: {
      type: String,
      required: true,
      trim: true,
    },
    customFields: {
      type: [
        {
          key: { type: String, trim: true },
          value: { type: String, trim: true },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', studentSchema);
