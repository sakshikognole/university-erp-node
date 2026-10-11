const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  present: { type: Boolean, default: false },
});

const attendanceSchema = new mongoose.Schema(
  {
    venue: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    students: [attendanceRecordSchema],
    submittedBy: { type: String, default: 'faculty' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
