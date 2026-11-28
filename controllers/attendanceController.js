const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/session
//
// Returns session meta + a live student roster.
// Query params (all optional):
//   ?department=<departmentName>   — filter students by their `degree` field
//   ?date=<YYYY-MM-DD>             — pre-fill session date (defaults to today)
//   ?subjectName=<text>            — pre-fill subject
//   ?venue=<text>                  — pre-fill venue
//   ?time=<HH:MM>                  — pre-fill time
//
// If no department is specified, returns ALL students (super-admin use-case).
// ─────────────────────────────────────────────────────────────────────────────
exports.getSession = async (req, res) => {
  try {
    const { department, date, subjectName, venue, time } = req.query;

    // Build student query
    const query = {};
    if (department && department.trim()) {
      // The student's `degree` field holds their department/programme
      query.degree = { $regex: department.trim(), $options: 'i' };
    }

    const studentDocs = await Student.find(query).sort({ name: 1 }).lean();

    const students = studentDocs.map((s) => ({
      rollNo: s.prn,
      prn:    s.prn,
      name:   s.name,
      present: false,
    }));

    // Collect distinct departments for the UI dropdown
    const allStudents = await Student.find({}, { degree: 1 }).lean();
    const departments = [...new Set(
      allStudents.map((s) => (s.degree || '').trim()).filter(Boolean)
    )].sort();

    return res.status(200).json({
      session: {
        venue:       venue       || '',
        date:        date        || new Date().toISOString().slice(0, 10),
        time:        time        || '',
        subjectName: subjectName || '',
        department:  department  || '',
      },
      students,
      departments,
    });
  } catch (error) {
    console.error('Get Session Error:', error);
    return res.status(500).json({ message: 'Error fetching session data.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/submit
// Accepts { venue, date, time, subjectName, department, students: [{rollNo, prn, name, present}] }
// ─────────────────────────────────────────────────────────────────────────────
exports.submitAttendance = async (req, res) => {
  try {
    const { venue, date, time, subjectName, department, students } = req.body;

    if (!venue || !date || !time || !subjectName) {
      return res.status(400).json({ message: 'venue, date, time, and subjectName are required.' });
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'At least one student record is required.' });
    }

    const record = await Attendance.create({
      venue:       venue.trim(),
      date:        date.trim(),
      time:        time.trim(),
      subjectName: subjectName.trim(),
      department:  (department || '').trim(),
      students:    students.map((s) => ({
        rollNo:  (s.rollNo || s.prn || '').trim(),
        prn:     (s.prn    || s.rollNo || '').trim(),
        name:    (s.name   || '').trim(),
        present: Boolean(s.present),
      })),
      submittedBy: req.user?.email || 'faculty@university.edu',
    });

    const presentStudents = record.students.filter((s) => s.present);

    return res.status(201).json({
      message: 'Attendance submitted successfully.',
      attendanceId:   record._id,
      totalStudents:  record.students.length,
      presentCount:   presentStudents.length,
      absentCount:    record.students.length - presentStudents.length,
      presentStudents: presentStudents.map((s) => ({ rollNo: s.rollNo, name: s.name })),
    });
  } catch (error) {
    console.error('Submit Attendance Error:', error);
    return res.status(500).json({ message: 'Server error while submitting attendance.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance
// Returns all saved attendance records (most recent first).
// Optional ?prn=<PRN> filter — returns only records where that student appears.
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllAttendance = async (req, res) => {
  try {
    const { prn } = req.query;

    let records;

    if (prn) {
      // Student-specific: only return records that contain this student
      const cleanPrn = prn.trim().toUpperCase();
      records = await Attendance.find({
        $or: [
          { 'students.rollNo': cleanPrn },
          { 'students.rollNo': cleanPrn.toLowerCase() },
          { 'students.prn':    cleanPrn },
          { 'students.prn':    cleanPrn.toLowerCase() },
        ],
      }).sort({ createdAt: -1 });

      // Filter each record's student array to include only this student
      // (keeps the response small and prevents exposing other students' data)
      records = records.map((rec) => {
        const recObj = rec.toObject();
        recObj.students = recObj.students.filter(
          (s) =>
            (s.rollNo || '').toUpperCase() === cleanPrn ||
            (s.prn    || '').toUpperCase() === cleanPrn
        );
        return recObj;
      });
    } else {
      records = await Attendance.find().sort({ createdAt: -1 });
    }

    return res.status(200).json(records);
  } catch (error) {
    console.error('Get Attendance Error:', error);
    return res.status(500).json({ message: 'Error fetching attendance records.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/:id
// ─────────────────────────────────────────────────────────────────────────────
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
