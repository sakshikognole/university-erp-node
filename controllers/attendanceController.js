const Attendance = require('../models/Attendance');

// Dummy student roster — used when no real DB records exist
const DUMMY_STUDENTS = [
  { rollNo: 'CS2401', name: 'Aarav Sharma' },
  { rollNo: 'CS2402', name: 'Priya Patel' },
  { rollNo: 'CS2403', name: 'Rohan Mehta' },
  { rollNo: 'CS2404', name: 'Sneha Iyer' },
  { rollNo: 'CS2405', name: 'Karan Verma' },
  { rollNo: 'CS2406', name: 'Ananya Singh' },
  { rollNo: 'CS2407', name: 'Vikram Nair' },
  { rollNo: 'CS2408', name: 'Pooja Reddy' },
  { rollNo: 'CS2409', name: 'Arjun Gupta' },
  { rollNo: 'CS2410', name: 'Divya Krishnan' },
  { rollNo: 'CS2411', name: 'Nikhil Joshi' },
  { rollNo: 'CS2412', name: 'Riya Desai' },
  { rollNo: 'CS2413', name: 'Manish Tiwari' },
  { rollNo: 'CS2414', name: 'Kavya Pillai' },
  { rollNo: 'CS2415', name: 'Siddharth Rao' },
  { rollNo: 'CS2416', name: 'Deepika Bhatt' },
  { rollNo: 'CS2417', name: 'Aditya Kumar' },
  { rollNo: 'CS2418', name: 'Swati Mishra' },
  { rollNo: 'CS2419', name: 'Rahul Choudhary' },
  { rollNo: 'CS2420', name: 'Neha Agarwal' },
];

// Dummy session meta — returned with the student roster so the frontend
// can pre-fill the attendance header fields.
const DUMMY_SESSION = {
  venue: 'Lecture Hall – A101',
  date: new Date().toISOString().slice(0, 10),   // today in YYYY-MM-DD
  time: '10:00 AM',
  subjectName: 'Data Structures & Algorithms',
};

// GET /api/attendance/session
// Returns the dummy session details and the full student roster (all absent by default)
exports.getSession = (req, res) => {
  return res.status(200).json({
    session: DUMMY_SESSION,
    students: DUMMY_STUDENTS.map((s) => ({ ...s, present: false })),
  });
};

// POST /api/attendance/submit
// Accepts { venue, date, time, subjectName, students: [{rollNo, name, present}] }
// Saves the record and returns present students for confirmation / export
exports.submitAttendance = async (req, res) => {
  try {
    const { venue, date, time, subjectName, students } = req.body;

    if (!venue || !date || !time || !subjectName) {
      return res.status(400).json({ message: 'venue, date, time, and subjectName are required.' });
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'At least one student record is required.' });
    }

    const record = await Attendance.create({
      venue: venue.trim(),
      date: date.trim(),
      time: time.trim(),
      subjectName: subjectName.trim(),
      students,
      submittedBy: req.user?.email || 'faculty@university.edu',
    });

    const presentStudents = record.students.filter((s) => s.present);

    return res.status(201).json({
      message: 'Attendance submitted successfully.',
      attendanceId: record._id,
      totalStudents: record.students.length,
      presentCount: presentStudents.length,
      absentCount: record.students.length - presentStudents.length,
      presentStudents: presentStudents.map((s) => ({ rollNo: s.rollNo, name: s.name })),
    });
  } catch (error) {
    console.error('Submit Attendance Error:', error);
    return res.status(500).json({ message: 'Server error while submitting attendance.' });
  }
};

// GET /api/attendance
// Returns all saved attendance records (most recent first)
exports.getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find().sort({ createdAt: -1 });
    return res.status(200).json(records);
  } catch (error) {
    console.error('Get Attendance Error:', error);
    return res.status(500).json({ message: 'Error fetching attendance records.' });
  }
};

// GET /api/attendance/:id
// Returns a single attendance record by MongoDB _id
exports.getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    return res.status(200).json(record);
  } catch (error) {
    console.error('Get Attendance By Id Error:', error);
    return res.status(500).json({ message: 'Error fetching attendance record.' });
  }
};
