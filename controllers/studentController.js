const mongoose = require('mongoose');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const { validateStudentFields } = require('../utils/studentValidation');

// ---------------------------------------------------------------------------
// Helper: build a 400 response from a validation-errors object.
// Returns an array of "Field: message" strings plus the first-field message
// as the top-level message for backward compatibility.
// ---------------------------------------------------------------------------
function buildValidationError(res, errors) {
  const messages = Object.entries(errors).map(([field, msg]) => ({ field, message: msg }));
  return res.status(400).json({
    message: messages[0].message, // first error as top-level (keeps existing frontend pattern)
    errors: messages,
  });
}

// ---------------------------------------------------------------------------
// GET /api/super-admin/students
// Supports optional server-side filtering via query params:
//   ?degree=BCA&class=First+Year&yearOfEnrollment=2024&division=A&search=John
// Client-side filtering still works because the full list is also returned
// when no params are provided (backward compatible).
// ---------------------------------------------------------------------------
exports.getStudents = async (req, res) => {
  try {
    const { degree, class: cls, yearOfEnrollment, division, search } = req.query;

    const filter = {};

    if (degree)           filter.degree           = { $regex: degree.trim(), $options: 'i' };
    if (cls)              filter.class             = { $regex: cls.trim(),    $options: 'i' };
    if (yearOfEnrollment) filter.yearOfEnrollment  = yearOfEnrollment.trim();
    if (division)         filter.division          = { $regex: division.trim(), $options: 'i' };
    if (search) {
      const q = search.trim();
      filter.$or = [
        { name:             { $regex: q, $options: 'i' } },
        { prn:              { $regex: q, $options: 'i' } },
        { class:            { $regex: q, $options: 'i' } },
        { degree:           { $regex: q, $options: 'i' } },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(students);
  } catch (error) {
    console.error('Get Students Error:', error);
    return res.status(500).json({ message: 'Error fetching students from database' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/super-admin/students/:id
// ---------------------------------------------------------------------------
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    let student = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      student = await Student.findOne({ prn: id.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error('Get Student Error:', error);
    return res.status(500).json({ message: 'Error fetching student details' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/super-admin/students
// ---------------------------------------------------------------------------
exports.createStudent = async (req, res) => {
  try {
    const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = req.body;

    // ── Field-level validation (DEF-001 to DEF-009, Section 5 Division) ──
    const { errors, isValid } = validateStudentFields({
      name,
      prn,
      class: studentClass,
      division,
      degree,
      yearOfEnrollment,
    });

    if (!isValid) {
      return buildValidationError(res, errors);
    }

    const cleanPrn = prn.trim().toUpperCase();

    const existingStudent = await Student.findOne({ prn: cleanPrn });
    if (existingStudent) {
      return res.status(409).json({
        message: `A student with PRN '${cleanPrn}' already exists`,
      });
    }

    const newStudent = await Student.create({
      name: name.trim(),
      prn: cleanPrn,
      class: studentClass.trim(),
      division: division.trim(),
      degree: degree.trim(),
      yearOfEnrollment: yearOfEnrollment.trim(),
      customFields: customFields || [],
    });

    await AuditLog.create({
      action: 'STUDENT_CREATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${newStudent.name} (${newStudent.prn})`,
      status: 'SUCCESS',
      details: `Created new student ${newStudent.prn}`,
    });

    return res.status(201).json({
      message: `Student '${newStudent.name}' added successfully`,
      student: newStudent,
    });
  } catch (error) {
    console.error('Create Student Error:', error);
    return res.status(500).json({ message: 'Server error creating student' });
  }
};

// ---------------------------------------------------------------------------
// PUT /api/super-admin/students/:id
// ---------------------------------------------------------------------------
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prn, class: studentClass, division, degree, yearOfEnrollment, customFields } = req.body;

    // ── Field-level validation (DEF-010 to DEF-014, Section 5 Division) ──
    const { errors, isValid } = validateStudentFields({
      name,
      prn,
      class: studentClass,
      division,
      degree,
      yearOfEnrollment,
    });

    if (!isValid) {
      return buildValidationError(res, errors);
    }

    let student = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      student = await Student.findById(id);
    }
    if (!student) {
      student = await Student.findOne({ prn: id.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const cleanPrn = prn.trim().toUpperCase();

    // If PRN changed, enforce uniqueness
    if (cleanPrn !== student.prn) {
      const existingStudent = await Student.findOne({ prn: cleanPrn });
      if (existingStudent && existingStudent._id.toString() !== student._id.toString()) {
        return res.status(409).json({
          message: `A student with PRN '${cleanPrn}' already exists`,
        });
      }
      student.prn = cleanPrn;
    }

    student.name            = name.trim();
    student.class           = studentClass.trim();
    student.division        = division.trim();
    student.degree          = degree.trim();
    student.yearOfEnrollment = yearOfEnrollment.trim();
    if (Array.isArray(customFields)) {
      student.customFields = customFields;
    }

    await student.save();

    await AuditLog.create({
      action: 'STUDENT_UPDATED',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${student.name} (${student.prn})`,
      status: 'SUCCESS',
      details: `Updated student record for ${student.prn}`,
    });

    return res.status(200).json({
      message: `Student '${student.name}' updated successfully`,
      student,
    });
  } catch (error) {
    console.error('Update Student Error:', error);
    return res.status(500).json({ message: 'Server error updating student' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/super-admin/students/bulk  (DEF-015)
//
// Strategy: validate ALL rows first → if ANY row has errors reject the
// entire upload and return row-specific error messages → only insert when
// every row is valid.
// ---------------------------------------------------------------------------
exports.bulkUploadStudents = async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required and must not be empty' });
    }

    // ── Phase 1: validate every row ──────────────────────────────────────
    const rowErrors = []; // { row, prn, messages: [] }

    // Also catch duplicate PRNs within the file itself
    const seenPrns = new Map(); // prn → first row index (1-based)

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNum = i + 2; // row 1 is header in CSV; data starts at row 2
      const { name, prn, class: studentClass, division, degree, yearOfEnrollment } = studentData;

      const { errors } = validateStudentFields({
        name,
        prn,
        class: studentClass,
        division,
        degree,
        yearOfEnrollment,
      });

      const messages = Object.values(errors);

      // In-file duplicate PRN check
      if (prn && prn.trim()) {
        const cleanPrn = prn.trim().toUpperCase();
        if (seenPrns.has(cleanPrn)) {
          messages.push(`Duplicate PRN '${cleanPrn}' — already appears in Row ${seenPrns.get(cleanPrn)} of this file.`);
        } else {
          seenPrns.set(cleanPrn, rowNum);
        }
      }

      if (messages.length > 0) {
        rowErrors.push({ row: rowNum, prn: prn || '(empty)', messages });
      }
    }

    // ── Phase 2: if any row has errors, reject the entire batch ──────────
    if (rowErrors.length > 0) {
      const formattedErrors = rowErrors.map((re) => ({
        row: re.row,
        prn: re.prn,
        errors: re.messages,
        // Flat label for frontend display e.g. "Row 4: Name is invalid."
        label: `Row ${re.row} (PRN: ${re.prn}): ${re.messages.join(' | ')}`,
      }));

      return res.status(400).json({
        message: `Bulk upload rejected — ${rowErrors.length} row(s) contain validation errors. No records were inserted.`,
        validationFailed: true,
        rowErrors: formattedErrors,
      });
    }

    // ── Phase 3: check existing PRNs in the database ─────────────────────
    const dbPrnErrors = [];
    for (let i = 0; i < students.length; i++) {
      const cleanPrn = students[i].prn.trim().toUpperCase();
      const existing = await Student.findOne({ prn: cleanPrn });
      if (existing) {
        dbPrnErrors.push({
          row: i + 2,
          prn: cleanPrn,
          errors: [`PRN '${cleanPrn}' already exists in the database.`],
          label: `Row ${i + 2} (PRN: ${cleanPrn}): PRN already exists in the database.`,
        });
      }
    }

    if (dbPrnErrors.length > 0) {
      return res.status(400).json({
        message: `Bulk upload rejected — ${dbPrnErrors.length} PRN(s) already exist in the database. No records were inserted.`,
        validationFailed: true,
        rowErrors: dbPrnErrors,
      });
    }

    // ── Phase 4: all rows valid — insert atomically ───────────────────────
    const toInsert = students.map((s) => ({
      name:            s.name.trim(),
      prn:             s.prn.trim().toUpperCase(),
      class:           s.class.trim(),
      division:        (s.division || '').trim(),
      degree:          s.degree.trim(),
      yearOfEnrollment: s.yearOfEnrollment.trim(),
      customFields:    s.customFields || [],
    }));

    const inserted = await Student.insertMany(toInsert, { ordered: true });

    await AuditLog.create({
      action: 'BULK_STUDENT_UPLOAD',
      performedBy: req.user?.email || 'superadmin@university.edu',
      target: `${inserted.length} students`,
      status: 'SUCCESS',
      details: `Bulk upload: ${inserted.length} students created successfully`,
    });

    return res.status(201).json({
      message: `Bulk upload completed: ${inserted.length} student${inserted.length !== 1 ? 's' : ''} created successfully`,
      created: inserted.length,
      failed: 0,
      details: inserted.map((s) => ({ prn: s.prn, status: 'SUCCESS', reason: 'Created successfully' })),
    });
  } catch (error) {
    console.error('Bulk Upload Students Error:', error);
    return res.status(500).json({ message: 'Server error during bulk upload' });
  }
};
